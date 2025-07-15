import type { Context } from "hono";
import neo4jGraphRAGService from "../services/neo4jGraphRAGService";
import driver from "../config/neo4j";
import fetch from 'node-fetch';
import { extractVendorFromCpe } from '../scripts/ingest-nvd';

// ✅ Move outside to avoid strict-mode issue
function parseGraphTraversalToGraphData(cveId: string, risk: string, mitigation: string | null) {
  return {
    nodes: [
      { id: "Vulnerability", label: "Vulnerability" },
      { id: cveId, label: cveId },
      { id: "Risk", label: `Risk: ${risk || "Unknown"}` },
      { id: "Mitigation", label: `Mitigation: ${mitigation || "Not Provided"}` }
    ],
    links: [
      { source: "Vulnerability", target: cveId, label: "has_identifier" },
      { source: cveId, target: "Risk", label: "has_severity" },
      { source: cveId, target: "Mitigation", label: "has_mitigation" }
    ]
  };
}

async function saveToGraph({
  id,
  description,
  cvssScore,
  baseSeverity,
  vectorString,
  version,
  references,
  mitigations,
  cpes
}: {
  id: string;
  description: string;
  cvssScore: number | null;
  baseSeverity: string | null;
  vectorString: string | null;
  version: string | null;
  references: string[];
  mitigations: string[];
  cpes: string[];
}) {
  const session = driver.session();
  try {
    await session.writeTransaction(async tx => {
      await tx.run(`
        MERGE (v:Vulnerability {cve_id: $id})
        ON CREATE SET 
          v.description = $description, 
          v.first_seen = datetime(),
          v.created = datetime()
        ON MATCH SET 
          v.description = $description, 
          v.last_updated = datetime()
      `, { id, description });
      if (cvssScore !== null && version) {
        await tx.run(`
          MATCH (v:Vulnerability {cve_id: $id})
          MERGE (cvss:CVSS {
            score: $cvssScore, 
            version: $version
          })
          ON CREATE SET 
            cvss.vector_string = $vectorString,
            cvss.created = datetime()
          ON MATCH SET 
            cvss.vector_string = $vectorString,
            cvss.updated = datetime()
          MERGE (v)-[:HAS_CVSS_SCORE]->(cvss)
        `, { id, cvssScore, version, vectorString });
      }
      if (baseSeverity) {
        await tx.run(`
          MATCH (v:Vulnerability {cve_id: $id})
          MERGE (s:Severity {level: $baseSeverity})
          MERGE (v)-[:HAS_BASE_SEVERITY]->(s)
        `, { id, baseSeverity });
      }
      for (const url of references) {
        await tx.run(`
          MATCH (v:Vulnerability {cve_id: $id})
          MERGE (r:Reference {url: $url})
          MERGE (v)-[:HAS_REFERENCE]->(r)
        `, { id, url });
      }
      for (const mitigation of mitigations) {
        await tx.run(`
          MATCH (v:Vulnerability {cve_id: $id})
          MERGE (m:Mitigation {description: $mitigation})
          MERGE (v)-[:HAS_MITIGATION]->(m)
        `, { id, mitigation });
      }
      for (const cpe of cpes) {
        const vendor = extractVendorFromCpe(cpe);
        await tx.run(`
          MATCH (v:Vulnerability {cve_id: $id})
          MERGE (c:Component {cpe: $cpe})
          MERGE (v)-[:AFFECTS_COMPONENT]->(c)
        `, { id, cpe });
        if (vendor) {
          await tx.run(`
            MATCH (c:Component {cpe: $cpe})
            MERGE (vend:Vendor {name: $vendor})
            MERGE (c)-[:FROM_VENDOR]->(vend)
          `, { vendor, cpe });
        }
      }
    });
  } catch (err) {
    console.error(`Error saving CVE ${id}:`, err);
    
    // Check if it's a database limit error
    if (err instanceof Error && err.message && err.message.includes('exceeded the logical size limit')) {
      console.error(`Database limit exceeded for CVE ${id}. Consider upgrading Neo4j tier or cleaning up data.`);
      throw new Error('DATABASE_LIMIT_EXCEEDED');
    }
  } finally {
    await session.close();
  }
}

export class GraphRAGController {
  async query(c: Context) {
    try {
      const { question } = await c.req.json();
      if (!question || typeof question !== "string") {
        return c.json({ status: "error", message: "Invalid question format" }, 400);
      }

      console.log("🔍 Processing GraphRAG query:", question);

      // Use the new Neo4j GraphRAG service
      const result = await neo4jGraphRAGService.query(question);
      
      return c.json({
        status: "success",
        question,
        answer: result.answer,
        sources: result.sources,
        reasoning: result.reasoning,
        confidence: result.confidence,
        graph_traversal: result.graph_traversal
      });

    } catch (err) {
      console.error("❌ GraphRAG Error:", err);
      
      // Handle specific database errors
      if (err instanceof Error) {
        if (err.message.includes('Connection was closed by server')) {
          return c.json({ 
            status: "database_error", 
            message: "Database connection issue. Please try again.",
            details: "The Neo4j database connection was closed. This may be due to capacity limits or server issues."
          }, 503);
        }
        
        if (err.message.includes('exceeded the logical size limit')) {
          return c.json({ 
            status: "database_limit", 
            message: "Database has reached its capacity limit.",
            details: "Your Neo4j database has exceeded the 400,000 relationships limit. Please upgrade your Neo4j tier or clean up existing data."
          }, 507);
        }
      }
      
      return c.json({ status: "error", message: (err as Error).message }, 500);
    }
  }

  // New: /explain endpoint for reasoning, graph traversal, sources, confidence
  async explain(c: Context) {
    try {
      const { input } = await c.req.json();
      if (!input || typeof input !== "string") {
        return c.json({ status: "error", message: "Invalid input format" }, 400);
      }
      
      console.log("🔍 Processing GraphRAG explain:", input);

      // Use the new Neo4j GraphRAG service
      const result = await neo4jGraphRAGService.explain(input);
      
      return c.json(result);

    } catch (err) {
      console.error("❌ GraphRAG Explain Error:", err);
      return c.json({ status: "error", message: (err as Error).message }, 500);
    }
  }
}

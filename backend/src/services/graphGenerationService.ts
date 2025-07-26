import { driver } from "../config/neo4j";
import { OpenAIService } from "./openai";
import type {
  GraphData,
  GraphNode,
  GraphLink,
} from "../../types/graphVisualization";

export class GraphGenerationService {
  private static instance: GraphGenerationService;
  private openai = OpenAIService.getInstance();

  private constructor() {}

  public static getInstance(): GraphGenerationService {
    if (!GraphGenerationService.instance) {
      GraphGenerationService.instance = new GraphGenerationService();
    }
    return GraphGenerationService.instance;
  }

  /**
   * Generate graph data from chat message context
   */
  async generateGraphFromMessage(
    messageId: string,
    chatId: string,
    question: string,
    answer: string,
    reasoning?: string,
    sources?: string[],
    jargons?: Record<string, string>,
    cveInfo?: {
      cve_id?: string;
      cve_desc?: string;
      mitigation?: string;
    }
  ): Promise<GraphData> {
    try {
      console.log(
        "[GraphGenerationService] Generating graph for message:",
        messageId
      );

      // Extract entities and relationships from the answer
      const entities = await this.extractEntities(
        answer,
        reasoning,
        jargons,
        cveInfo
      );

      // Query knowledge graph for related data
      const kgData = await this.queryKnowledgeGraph(entities, sources);

      // Generate graph structure
      const graphData = await this.buildGraphStructure(
        messageId,
        chatId,
        entities,
        kgData,
        question,
        answer
      );

      console.log(
        "[GraphGenerationService] Generated graph with",
        graphData.nodes.length,
        "nodes and",
        graphData.links.length,
        "links"
      );

      return graphData;
    } catch (error) {
      console.error("[GraphGenerationService] Error generating graph:", error);
      throw new Error(
        `Failed to generate graph: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Extract entities and relationships from text using LLM
   */
  private async extractEntities(
    answer: string,
    reasoning?: string,
    jargons?: Record<string, string>,
    cveInfo?: {
      cve_id?: string;
      cve_desc?: string;
      mitigation?: string;
    }
  ): Promise<{
    vulnerabilities: string[];
    mitigations: string[];
    sources: string[];
    problems: string[];
    affected: string[];
    risks: string[];
  }> {
    const prompt = `
You are a cybersecurity expert analyzing text to extract entities for a knowledge graph. 
Extract the following types of entities from the provided text:

1. Vulnerabilities (security weaknesses, attack vectors)
2. Mitigations (solutions, countermeasures, fixes)
3. Sources (references, databases, tools)
4. Problems (issues, challenges, threats)
5. Affected (systems, components, users impacted)
6. Risks (risk levels, severity, impact)

Text to analyze:
Answer: ${answer}
${reasoning ? `Reasoning: ${reasoning}` : ""}
${jargons ? `Technical Terms: ${JSON.stringify(jargons)}` : ""}
${cveInfo ? `CVE Info: ${JSON.stringify(cveInfo)}` : ""}

Return a JSON object with arrays of extracted entities:
{
  "vulnerabilities": ["entity1", "entity2"],
  "mitigations": ["entity1", "entity2"],
  "sources": ["entity1", "entity2"],
  "problems": ["entity1", "entity2"],
  "affected": ["entity1", "entity2"],
  "risks": ["entity1", "entity2"]
}

Only include relevant entities. If a category has no relevant entities, use an empty array.
`;

    try {
      const response = await this.openai.chat([
        {
          role: "system",
          content:
            "You are a cybersecurity entity extraction expert. Return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ]);

      const extracted = JSON.parse(response);
      return {
        vulnerabilities: extracted.vulnerabilities || [],
        mitigations: extracted.mitigations || [],
        sources: extracted.sources || [],
        problems: extracted.problems || [],
        affected: extracted.affected || [],
        risks: extracted.risks || [],
      };
    } catch (error) {
      console.error(
        "[GraphGenerationService] Error extracting entities:",
        error
      );
      return {
        vulnerabilities: [],
        mitigations: [],
        sources: [],
        problems: [],
        affected: [],
        risks: [],
      };
    }
  }

  /**
   * Query Neo4j knowledge graph for related data
   */
  private async queryKnowledgeGraph(
    entities: any,
    sources?: string[]
  ): Promise<any> {
    const session = driver.session();
    try {
      const results: any = {};

      // Query for vulnerabilities
      if (entities.vulnerabilities.length > 0) {
        const vulnQuery = `
          MATCH (v:Vulnerability)
          WHERE any(name IN $names WHERE toLower(v.name) CONTAINS toLower(name))
          OPTIONAL MATCH (v)-[:HAS_CVE]->(c:CVE)
          OPTIONAL MATCH (v)-[:HAS_MITIGATION]->(m:Mitigation)
          RETURN v, collect(DISTINCT c) as cves, collect(DISTINCT m) as mitigations
        `;
        const vulnResult = await session.run(vulnQuery, {
          names: entities.vulnerabilities,
        });
        results.vulnerabilities = vulnResult.records.map((record) => ({
          vulnerability: record.get("v").properties,
          cves: record.get("cves").map((cve: any) => cve.properties),
          mitigations: record
            .get("mitigations")
            .map((mit: any) => mit.properties),
        }));
      }

      // Query for CVEs
      const cveQuery = `
        MATCH (c:CVE)
        WHERE any(id IN $ids WHERE toLower(c.cveId) CONTAINS toLower(id))
        OPTIONAL MATCH (c)-[:BELONGS_TO]->(v:Vulnerability)
        OPTIONAL MATCH (c)-[:HAS_MITIGATION]->(m:Mitigation)
        RETURN c, collect(DISTINCT v) as vulnerabilities, collect(DISTINCT m) as mitigations
      `;
      const cveResult = await session.run(cveQuery, {
        ids: entities.vulnerabilities,
      });
      results.cves = cveResult.records.map((record) => ({
        cve: record.get("c").properties,
        vulnerabilities: record
          .get("vulnerabilities")
          .map((vuln: any) => vuln.properties),
        mitigations: record
          .get("mitigations")
          .map((mit: any) => mit.properties),
      }));

      // Query for mitigations
      if (entities.mitigations.length > 0) {
        const mitQuery = `
          MATCH (m:Mitigation)
          WHERE any(desc IN $descriptions WHERE toLower(m.description) CONTAINS toLower(desc))
          OPTIONAL MATCH (m)-[:MITIGATES]->(v:Vulnerability)
          RETURN m, collect(DISTINCT v) as vulnerabilities
        `;
        const mitResult = await session.run(mitQuery, {
          descriptions: entities.mitigations,
        });
        results.mitigations = mitResult.records.map((record) => ({
          mitigation: record.get("m").properties,
          vulnerabilities: record
            .get("vulnerabilities")
            .map((vuln: any) => vuln.properties),
        }));
      }

      return results;
    } finally {
      await session.close();
    }
  }

  /**
   * Build the final graph structure
   */
  private async buildGraphStructure(
    messageId: string,
    chatId: string,
    entities: any,
    kgData: any,
    question: string,
    answer: string
  ): Promise<GraphData> {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // Add main problem node
    const problemNode: GraphNode = {
      id: "main-problem",
      label: question.substring(0, 50) + (question.length > 50 ? "..." : ""),
      type: "problem",
      description: question,
      source: "user-question",
    };
    nodes.push(problemNode);
    nodeMap.set(problemNode.id, problemNode);

    // Add vulnerability nodes
    entities.vulnerabilities.forEach((vuln: string, index: number) => {
      const nodeId = `vuln-${index}`;
      const node: GraphNode = {
        id: nodeId,
        label: vuln,
        type: "vulnerability",
        description: vuln,
        severity: this.extractSeverity(vuln, kgData),
        cvss: this.extractCVSS(vuln, kgData),
      };
      nodes.push(node);
      nodeMap.set(nodeId, node);

      // Link to main problem
      links.push({
        id: `link-${problemNode.id}-${nodeId}`,
        source: problemNode.id,
        target: nodeId,
        type: "causes",
        strength: 8,
      });
    });

    // Add CVE nodes from knowledge graph
    if (kgData.cves) {
      kgData.cves.forEach((cveData: any, index: number) => {
        const cve = cveData.cve;
        const nodeId = `cve-${cve.cveId}`;
        const node: GraphNode = {
          id: nodeId,
          label: cve.cveId,
          type: "cve",
          description: cve.description,
          severity: cve.severity,
          cvss: cve.cvss,
          source: "NVD",
        };
        nodes.push(node);
        nodeMap.set(nodeId, node);

        // Link to related vulnerabilities
        cveData.vulnerabilities.forEach((vuln: any) => {
          const vulnNodeId = `kg-vuln-${vuln.name}`;
          if (!nodeMap.has(vulnNodeId)) {
            const vulnNode: GraphNode = {
              id: vulnNodeId,
              label: vuln.name,
              type: "vulnerability",
              description: vuln.description,
              source: "Knowledge Graph",
            };
            nodes.push(vulnNode);
            nodeMap.set(vulnNodeId, vulnNode);
          }
          links.push({
            id: `link-${nodeId}-${vulnNodeId}`,
            source: nodeId,
            target: vulnNodeId,
            type: "affects",
            strength: 9,
          });
        });
      });
    }

    // Add mitigation nodes
    entities.mitigations.forEach((mit: string, index: number) => {
      const nodeId = `mit-${index}`;
      const node: GraphNode = {
        id: nodeId,
        label: mit,
        type: "mitigation",
        description: mit,
        source: "extracted",
      };
      nodes.push(node);
      nodeMap.set(nodeId, node);
    });

    // Add source nodes
    entities.sources.forEach((src: string, index: number) => {
      const nodeId = `src-${index}`;
      const node: GraphNode = {
        id: nodeId,
        label: src,
        type: "source",
        description: src,
        source: "extracted",
      };
      nodes.push(node);
      nodeMap.set(nodeId, node);
    });

    // Add affected entities
    entities.affected.forEach((aff: string, index: number) => {
      const nodeId = `aff-${index}`;
      const node: GraphNode = {
        id: nodeId,
        label: aff,
        type: "affected",
        description: aff,
        source: "extracted",
      };
      nodes.push(node);
      nodeMap.set(nodeId, node);
    });

    // Add risk nodes
    entities.risks.forEach((risk: string, index: number) => {
      const nodeId = `risk-${index}`;
      const node: GraphNode = {
        id: nodeId,
        label: risk,
        type: "risk",
        description: risk,
        severity: this.extractSeverity(risk),
        source: "extracted",
      };
      nodes.push(node);
      nodeMap.set(nodeId, node);
    });

    // Create mitigation links
    entities.mitigations.forEach((mit: string, mitIndex: number) => {
      const mitNodeId = `mit-${mitIndex}`;
      entities.vulnerabilities.forEach((vuln: string, vulnIndex: number) => {
        const vulnNodeId = `vuln-${vulnIndex}`;
        links.push({
          id: `link-${mitNodeId}-${vulnNodeId}`,
          source: mitNodeId,
          target: vulnNodeId,
          type: "mitigates",
          strength: 7,
          description: `${mit} mitigates ${vuln}`,
        });
      });
    });

    // Create source reference links
    entities.sources.forEach((src: string, srcIndex: number) => {
      const srcNodeId = `src-${srcIndex}`;
      links.push({
        id: `link-${srcNodeId}-${problemNode.id}`,
        source: srcNodeId,
        target: problemNode.id,
        type: "references",
        strength: 5,
        description: `${src} references the problem`,
      });
    });

    return {
      nodes,
      links,
      metadata: {
        title: `Knowledge Graph for: ${question.substring(0, 100)}`,
        description: `Graph visualization of cybersecurity entities and relationships`,
        createdAt: Date.now(),
        messageId,
        chatId,
      },
    };
  }

  /**
   * Extract severity from text or knowledge graph data
   */
  private extractSeverity(
    text: string,
    kgData?: any
  ): "Critical" | "High" | "Medium" | "Low" | "Info" | undefined {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("critical") || lowerText.includes("severe"))
      return "Critical";
    if (lowerText.includes("high")) return "High";
    if (lowerText.includes("medium") || lowerText.includes("moderate"))
      return "Medium";
    if (lowerText.includes("low") || lowerText.includes("minor")) return "Low";
    if (lowerText.includes("info") || lowerText.includes("informational"))
      return "Info";
    return undefined;
  }

  /**
   * Extract CVSS score from knowledge graph data
   */
  private extractCVSS(text: string, kgData?: any): number | undefined {
    // Look for CVSS scores in the text
    const cvssMatch = text.match(/CVSS[:\s]*(\d+\.\d+)/i);
    if (cvssMatch) {
      return parseFloat(cvssMatch[1]);
    }
    return undefined;
  }
}

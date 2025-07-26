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
   * Generate graph data from chat message context with enhanced KG integration
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
        "[GraphGenerationService] Generating enhanced graph for message:",
        messageId
      );

      // Extract entities and relationships from the answer using enhanced LLM
      const entities = await this.extractEntitiesEnhanced(
        answer,
        reasoning,
        jargons,
        cveInfo,
        question
      );

      // Validate and clean entity data
      const cleanedEntities = this.validateEntityData(entities);

      // Query knowledge graph for comprehensive related data
      const kgData = await this.queryKnowledgeGraphEnhanced(
        cleanedEntities,
        sources,
        cveInfo
      );

      // Generate relationships between entities
      const relationships = await this.generateRelationships(
        cleanedEntities,
        kgData,
        answer,
        question
      );

      // Build comprehensive graph structure optimized for D3
      const graphData = await this.buildGraphStructureEnhanced(
        messageId,
        chatId,
        cleanedEntities,
        kgData,
        relationships,
        question,
        answer
      );

      // Log comprehensive graph summary
      console.log(this.generateGraphSummary(graphData));

      console.log(
        "[GraphGenerationService] Generated enhanced graph with",
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
   * Enhanced entity extraction with better LLM prompts
   */
  private async extractEntitiesEnhanced(
    answer: string,
    reasoning?: string,
    jargons?: Record<string, string>,
    cveInfo?: {
      cve_id?: string;
      cve_desc?: string;
      mitigation?: string;
    },
    question?: string
  ): Promise<{
    vulnerabilities: Array<{
      name: string;
      description?: string;
      severity?: string;
      cvss?: number;
    }>;
    mitigations: Array<{
      name: string;
      description?: string;
      type?: string;
      effectiveness?: number;
    }>;
    sources: Array<{
      name: string;
      type?: string;
      url?: string;
      reliability?: number;
    }>;
    problems: Array<{
      name: string;
      description?: string;
      category?: string;
      impact?: string;
    }>;
    affected: Array<{
      name: string;
      type?: string;
      description?: string;
      impact?: string;
    }>;
    risks: Array<{
      name: string;
      level?: string;
      probability?: number;
      impact?: string;
    }>;
    cves: Array<{
      cveId: string;
      description?: string;
      severity?: string;
      cvss?: number;
    }>;
  }> {
    const prompt = `
You are a cybersecurity expert analyzing text to extract detailed entities for a knowledge graph visualization. 
Extract the following types of entities from the provided text with detailed attributes:

Context:
Question: ${question || "N/A"}
Answer: ${answer}
${reasoning ? `Reasoning: ${reasoning}` : ""}
${jargons ? `Technical Terms: ${JSON.stringify(jargons)}` : ""}
${cveInfo ? `CVE Info: ${JSON.stringify(cveInfo)}` : ""}

Extract entities with the following structure:

1. Vulnerabilities: security weaknesses, attack vectors, exploits
   - Include: name, description, severity (Critical/High/Medium/Low/Info), CVSS score if mentioned

2. Mitigations: solutions, countermeasures, fixes, security controls
   - Include: name, description, type (preventive/detective/corrective), effectiveness (1-10)

3. Sources: references, databases, tools, frameworks
   - Include: name, type (database/tool/framework/standard), URL if mentioned, reliability score (1-10)

4. Problems: issues, challenges, threats, security concerns
   - Include: name, description, category, impact level

5. Affected: systems, components, users, assets impacted
   - Include: name, type (system/component/user/asset), description, impact level

6. Risks: risk assessments, probability, impact analysis
   - Include: name, level (Critical/High/Medium/Low), probability (1-10), impact description

7. CVEs: Common Vulnerabilities and Exposures
   - Include: CVE ID, description, severity, CVSS score

Return a JSON object with detailed entity arrays. Only include relevant entities with meaningful attributes.
If a category has no relevant entities, use an empty array.

Example format:
{
  "vulnerabilities": [
    {"name": "SQL Injection", "description": "Database injection attack", "severity": "High", "cvss": 8.5}
  ],
  "mitigations": [
    {"name": "Input Validation", "description": "Validate all user inputs", "type": "preventive", "effectiveness": 9}
  ],
  "sources": [
    {"name": "OWASP Top 10", "type": "standard", "reliability": 9}
  ],
  "problems": [
    {"name": "Data Breach Risk", "description": "Risk of sensitive data exposure", "category": "data_security", "impact": "High"}
  ],
  "affected": [
    {"name": "User Database", "type": "system", "description": "Database containing user information", "impact": "Critical"}
  ],
  "risks": [
    {"name": "Unauthorized Access", "level": "High", "probability": 7, "impact": "Data compromise"}
  ],
  "cves": [
    {"cveId": "CVE-2023-1234", "description": "SQL injection vulnerability", "severity": "High", "cvss": 8.5}
  ]
}
`;

    try {
      const response = await this.openai.chat([
        {
          role: "system",
          content:
            "You are a cybersecurity entity extraction expert. Return only valid JSON with detailed entity attributes.",
        },
        {
          role: "user",
          content: prompt,
        },
      ]);

      // Clean the response to handle potential markdown formatting
      let cleanedResponse = response.trim();

      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
      }

      // Remove any trailing backticks or markdown artifacts
      cleanedResponse = cleanedResponse.replace(/`+$/, "").trim();

      console.log(
        "[GraphGenerationService] Cleaned JSON response:",
        cleanedResponse.substring(0, 200) + "..."
      );

      const extracted = JSON.parse(cleanedResponse);
      return {
        vulnerabilities: extracted.vulnerabilities || [],
        mitigations: extracted.mitigations || [],
        sources: extracted.sources || [],
        problems: extracted.problems || [],
        affected: extracted.affected || [],
        risks: extracted.risks || [],
        cves: extracted.cves || [],
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
        cves: [],
      };
    }
  }

  /**
   * Enhanced knowledge graph querying with comprehensive data retrieval
   */
  private async queryKnowledgeGraphEnhanced(
    entities: any,
    sources?: string[],
    cveInfo?: {
      cve_id?: string;
      cve_desc?: string;
      mitigation?: string;
    }
  ): Promise<any> {
    const session = driver.session();
    try {
      const results: any = {};

      // Enhanced vulnerability query with CVE relationships
      if (entities.vulnerabilities.length > 0 || cveInfo?.cve_id) {
        const vulnQuery = `
          MATCH (v:Vulnerability)
          WHERE any(name IN $names WHERE toLower(v.name) CONTAINS toLower(name))
             OR any(cveId IN $cveIds WHERE v.cveId = cveId)
          OPTIONAL MATCH (v)-[:HAS_CVE]->(c:CVE)
          OPTIONAL MATCH (v)-[:HAS_MITIGATION]->(m:Mitigation)
          OPTIONAL MATCH (v)-[:AFFECTS]->(a:Affected)
          OPTIONAL MATCH (v)-[:HAS_RISK]->(r:Risk)
          OPTIONAL MATCH (v)-[:REFERENCES]->(s:Source)
          RETURN v, 
                 collect(DISTINCT c) as cves, 
                 collect(DISTINCT m) as mitigations,
                 collect(DISTINCT a) as affected,
                 collect(DISTINCT r) as risks,
                 collect(DISTINCT s) as sources
        `;

        const vulnNames = entities.vulnerabilities.map((v: any) => v.name);
        const cveIds = entities.cves.map((c: any) => c.cveId);
        if (cveInfo?.cve_id) cveIds.push(cveInfo.cve_id);

        const vulnResult = await session.run(vulnQuery, {
          names: vulnNames,
          cveIds: cveIds,
        });

        results.vulnerabilities = vulnResult.records.map((record) => ({
          vulnerability: record.get("v").properties,
          cves: record.get("cves").map((cve: any) => cve.properties),
          mitigations: record
            .get("mitigations")
            .map((mit: any) => mit.properties),
          affected: record.get("affected").map((aff: any) => aff.properties),
          risks: record.get("risks").map((risk: any) => risk.properties),
          sources: record.get("sources").map((src: any) => src.properties),
        }));
      }

      // Enhanced CVE query with comprehensive relationships
      const cveQuery = `
        MATCH (c:CVE)
        WHERE any(id IN $ids WHERE c.cveId = id)
           OR any(desc IN $descriptions WHERE toLower(c.description) CONTAINS toLower(desc))
        OPTIONAL MATCH (c)-[:BELONGS_TO]->(v:Vulnerability)
        OPTIONAL MATCH (c)-[:HAS_MITIGATION]->(m:Mitigation)
        OPTIONAL MATCH (c)-[:AFFECTS]->(a:Affected)
        OPTIONAL MATCH (c)-[:HAS_SEVERITY]->(s:Severity)
        OPTIONAL MATCH (c)-[:REFERENCES]->(src:Source)
        RETURN c, 
               collect(DISTINCT v) as vulnerabilities, 
               collect(DISTINCT m) as mitigations,
               collect(DISTINCT a) as affected,
               collect(DISTINCT s) as severities,
               collect(DISTINCT src) as sources
      `;

      const cveIds = entities.cves.map((c: any) => c.cveId);
      const cveDescriptions = entities.cves
        .map((c: any) => c.description)
        .filter(Boolean);
      if (cveInfo?.cve_id) cveIds.push(cveInfo.cve_id);
      if (cveInfo?.cve_desc) cveDescriptions.push(cveInfo.cve_desc);

      const cveResult = await session.run(cveQuery, {
        ids: cveIds,
        descriptions: cveDescriptions,
      });

      results.cves = cveResult.records.map((record) => ({
        cve: record.get("c").properties,
        vulnerabilities: record
          .get("vulnerabilities")
          .map((vuln: any) => vuln.properties),
        mitigations: record
          .get("mitigations")
          .map((mit: any) => mit.properties),
        affected: record.get("affected").map((aff: any) => aff.properties),
        severities: record.get("severities").map((sev: any) => sev.properties),
        sources: record.get("sources").map((src: any) => src.properties),
      }));

      // Enhanced mitigation query
      if (entities.mitigations.length > 0) {
        const mitQuery = `
          MATCH (m:Mitigation)
          WHERE any(desc IN $descriptions WHERE toLower(m.description) CONTAINS toLower(desc))
             OR any(name IN $names WHERE toLower(m.name) CONTAINS toLower(name))
          OPTIONAL MATCH (m)-[:MITIGATES]->(v:Vulnerability)
          OPTIONAL MATCH (m)-[:PROTECTS]->(a:Affected)
          OPTIONAL MATCH (m)-[:REDUCES_RISK]->(r:Risk)
          OPTIONAL MATCH (m)-[:REFERENCES]->(s:Source)
          RETURN m, 
                 collect(DISTINCT v) as vulnerabilities,
                 collect(DISTINCT a) as affected,
                 collect(DISTINCT r) as risks,
                 collect(DISTINCT s) as sources
        `;

        const mitResult = await session.run(mitQuery, {
          descriptions: entities.mitigations
            .map((m: any) => m.description)
            .filter(Boolean),
          names: entities.mitigations.map((m: any) => m.name),
        });

        results.mitigations = mitResult.records.map((record) => ({
          mitigation: record.get("m").properties,
          vulnerabilities: record
            .get("vulnerabilities")
            .map((vuln: any) => vuln.properties),
          affected: record.get("affected").map((aff: any) => aff.properties),
          risks: record.get("risks").map((risk: any) => risk.properties),
          sources: record.get("sources").map((src: any) => src.properties),
        }));
      }

      // Query for affected systems and components
      if (entities.affected.length > 0) {
        const affectedQuery = `
          MATCH (a:Affected)
          WHERE any(name IN $names WHERE toLower(a.name) CONTAINS toLower(name))
             OR any(type IN $types WHERE toLower(a.type) CONTAINS toLower(type))
          OPTIONAL MATCH (a)-[:VULNERABLE_TO]->(v:Vulnerability)
          OPTIONAL MATCH (a)-[:PROTECTED_BY]->(m:Mitigation)
          OPTIONAL MATCH (a)-[:HAS_RISK]->(r:Risk)
          RETURN a, 
                 collect(DISTINCT v) as vulnerabilities,
                 collect(DISTINCT m) as mitigations,
                 collect(DISTINCT r) as risks
        `;

        const affectedResult = await session.run(affectedQuery, {
          names: entities.affected.map((a: any) => a.name),
          types: entities.affected.map((a: any) => a.type).filter(Boolean),
        });

        results.affected = affectedResult.records.map((record) => ({
          affected: record.get("a").properties,
          vulnerabilities: record
            .get("vulnerabilities")
            .map((vuln: any) => vuln.properties),
          mitigations: record
            .get("mitigations")
            .map((mit: any) => mit.properties),
          risks: record.get("risks").map((risk: any) => risk.properties),
        }));
      }

      return results;
    } finally {
      await session.close();
    }
  }

  /**
   * Generate relationships between entities using LLM
   */
  private async generateRelationships(
    entities: any,
    kgData: any,
    answer: string,
    question: string
  ): Promise<
    Array<{
      source: string;
      target: string;
      type: string;
      description?: string;
      strength?: number;
    }>
  > {
    const prompt = `
You are a cybersecurity expert analyzing entities to identify relationships for a knowledge graph.

USER QUESTION: "${question}"

This is the MAIN PROBLEM that all other entities should relate to.

Entities extracted:
${JSON.stringify(entities, null, 2)}

Knowledge Graph Data:
${JSON.stringify(kgData, null, 2)}

Context: ${answer}

Identify meaningful relationships between these entities, with special focus on how they relate to the user's question. Return a JSON array of relationships with:
- source: source entity name
- target: target entity name  
- type: relationship type (mitigates, affects, references, causes, relates_to, protects, reduces_risk, vulnerable_to, answers, explains, demonstrates)
- description: brief description of the relationship
- strength: relationship strength (1-10, where 10 is strongest)

IMPORTANT RULES:
1. The user question should be the central focus of all relationships
2. Every major entity should have a relationship to the main problem
3. Include relationships that directly answer or explain the user's question
4. Use "answers" type for entities that directly answer the question
5. Use "explains" type for entities that provide context or explanation
6. Use "demonstrates" type for entities that show examples or evidence

Example:
[
  {
    "source": "SQL Injection",
    "target": "User Question", 
    "type": "answers",
    "description": "SQL injection directly answers the user's question about database vulnerabilities",
    "strength": 10
  },
  {
    "source": "Input Validation",
    "target": "SQL Injection", 
    "type": "mitigates",
    "description": "Input validation prevents SQL injection attacks",
    "strength": 9
  }
]

Only include relationships that are clearly supported by the context or knowledge graph data.
`;

    try {
      const response = await this.openai.chat([
        {
          role: "system",
          content:
            "You are a cybersecurity relationship extraction expert. Return only valid JSON arrays.",
        },
        {
          role: "user",
          content: prompt,
        },
      ]);

      // Clean the response to handle markdown code blocks and trailing backticks
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
      }
      cleanedResponse = cleanedResponse.replace(/`+$/, "").trim();

      console.log(
        "[GraphGenerationService] Cleaned relationships response:",
        cleanedResponse.substring(0, 200) + "..."
      );

      return JSON.parse(cleanedResponse) || [];
    } catch (error) {
      console.error(
        "[GraphGenerationService] Error generating relationships:",
        error
      );
      return [];
    }
  }

  /**
   * Build enhanced graph structure optimized for D3 visualization
   */
  private async buildGraphStructureEnhanced(
    messageId: string,
    chatId: string,
    entities: any,
    kgData: any,
    relationships: any[],
    question: string,
    answer: string
  ): Promise<GraphData> {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // Extract the main topic from the user's question
    const extractTopicPrompt = `Extract the main cybersecurity topic/concept from this question. Return only the core topic (2-5 words max), not the full sentence.

Question: "${question}"

Return only the topic, no quotes or extra text. Examples:
- "SQL injection" (not "How does SQL injection work?")
- "CVE-2021-44228" (not "What is the Log4j vulnerability?")
- "Parameterized queries" (not "How do parameterized queries prevent SQL injection?")
- "Authentication bypass" (not "What are common authentication bypass techniques?")`;

    let mainTopic: string;
    try {
      const topicResponse = await this.openai.chat([
        { role: "user", content: extractTopicPrompt },
      ]);
      mainTopic =
        topicResponse.trim() || question.split(" ").slice(0, 3).join(" ");
    } catch (error) {
      console.log(
        "[GraphGenerationService] Topic extraction failed, using fallback:",
        error
      );
      mainTopic = question.split(" ").slice(0, 3).join(" ");
    }

    // Add main problem node (extracted topic) - this is ALWAYS the central node
    const problemNode: GraphNode = {
      id: "main-problem",
      label: mainTopic,
      type: "problem",
      description: `Main topic: ${mainTopic}`,
      metadata: {
        originalQuestion: question,
        messageId,
        chatId,
        isUserQuestion: true,
        source: "user-question", // Move source to metadata to avoid schema validation issues
      },
    };
    nodes.push(problemNode);
    nodeMap.set("main-problem", problemNode);
    nodeMap.set("User Question", problemNode); // Also map to the relationship target name

    // Add vulnerability nodes
    entities.vulnerabilities.forEach((vuln: any, index: number) => {
      const nodeId = `vuln-${index}`;
      const node: GraphNode = {
        id: nodeId,
        label: vuln.name,
        type: "vulnerability",
        description: vuln.description,
        severity: vuln.severity as any,
        cvss: vuln.cvss,
        metadata: {
          originalEntity: vuln,
          source: "extracted",
          kgData: kgData.vulnerabilities?.find((kg: any) =>
            kg.vulnerability.name
              .toLowerCase()
              .includes(vuln.name.toLowerCase())
          ),
        },
      };
      nodes.push(node);
      nodeMap.set(vuln.name, node);
    });

    // Add CVE nodes
    entities.cves.forEach((cve: any, index: number) => {
      const nodeId = `cve-${index}`;
      const node: GraphNode = {
        id: nodeId,
        label: cve.cveId,
        type: "cve",
        description: cve.description,
        severity: cve.severity as any,
        cvss: cve.cvss,
        metadata: {
          originalEntity: cve,
          source: "NVD",
          kgData: kgData.cves?.find((kg: any) => kg.cve.cveId === cve.cveId),
        },
      };
      nodes.push(node);
      nodeMap.set(cve.cveId, node);
    });

    // Add mitigation nodes
    entities.mitigations.forEach((mit: any, index: number) => {
      const nodeId = `mit-${index}`;
      const node: GraphNode = {
        id: nodeId,
        label: mit.name,
        type: "mitigation",
        description: mit.description,
        metadata: {
          originalEntity: mit,
          source: "extracted",
          kgData: kgData.mitigations?.find((kg: any) =>
            kg.mitigation.name.toLowerCase().includes(mit.name.toLowerCase())
          ),
        },
      };
      nodes.push(node);
      nodeMap.set(mit.name, node);
    });

    // Add source nodes
    entities.sources.forEach((src: any, index: number) => {
      const nodeId = `src-${index}`;
      const node: GraphNode = {
        id: nodeId,
        label: src.name,
        type: "source",
        description: src.description,
        metadata: {
          originalEntity: src,
          source: "extracted",
        },
      };
      nodes.push(node);
      nodeMap.set(src.name, node);
    });

    // Add affected nodes
    entities.affected.forEach((aff: any, index: number) => {
      const nodeId = `aff-${index}`;
      const node: GraphNode = {
        id: nodeId,
        label: aff.name,
        type: "affected",
        description: aff.description,
        metadata: {
          originalEntity: aff,
          source: "extracted",
          kgData: kgData.affected?.find((kg: any) =>
            kg.affected.name.toLowerCase().includes(aff.name.toLowerCase())
          ),
        },
      };
      nodes.push(node);
      nodeMap.set(aff.name, node);
    });

    // Add risk nodes
    entities.risks.forEach((risk: any, index: number) => {
      const nodeId = `risk-${index}`;
      const node: GraphNode = {
        id: nodeId,
        label: risk.name,
        type: "risk",
        description: risk.impact,
        severity: risk.level as any,
        metadata: {
          originalEntity: risk,
          source: "extracted",
        },
      };
      nodes.push(node);
      nodeMap.set(risk.name, node);
    });

    // Add relationships as links
    relationships.forEach((rel, index) => {
      const sourceNode = nodeMap.get(rel.source);
      const targetNode = nodeMap.get(rel.target);

      if (sourceNode && targetNode) {
        const link: GraphLink = {
          id: `link-${index}`,
          source: sourceNode.id,
          target: targetNode.id,
          type: rel.type as any,
          description: rel.description,
          strength: rel.strength,
        };
        links.push(link);
      }
    });

    // Ensure ALL entities connect to the main problem (user question)
    const allEntities = [
      ...entities.vulnerabilities.map((v: any) => ({
        name: v.name,
        type: "vulnerability",
      })),
      ...entities.cves.map((c: any) => ({ name: c.cveId, type: "cve" })),
      ...entities.mitigations.map((m: any) => ({
        name: m.name,
        type: "mitigation",
      })),
      ...entities.sources.map((s: any) => ({ name: s.name, type: "source" })),
      ...entities.affected.map((a: any) => ({
        name: a.name,
        type: "affected",
      })),
      ...entities.risks.map((r: any) => ({ name: r.name, type: "risk" })),
    ];

    // Add connections to main problem for entities that don't already have them
    allEntities.forEach((entity, index) => {
      const entityNode = nodeMap.get(entity.name);
      if (entityNode) {
        // Check if this entity already has a connection to main problem
        const existingConnection = links.find(
          (link) =>
            (link.source === "main-problem" && link.target === entityNode.id) ||
            (link.source === entityNode.id && link.target === "main-problem")
        );

        if (!existingConnection) {
          // Determine relationship type based on entity type
          let relationshipType = "relates_to";
          let description = "Related to user question";

          switch (entity.type) {
            case "vulnerability":
              relationshipType = "answers";
              description =
                "Directly answers the user's question about vulnerabilities";
              break;
            case "cve":
              relationshipType = "demonstrates";
              description = "Demonstrates specific vulnerability examples";
              break;
            case "mitigation":
              relationshipType = "explains";
              description = "Explains how to address the problem";
              break;
            case "source":
              relationshipType = "references";
              description = "References authoritative information";
              break;
            case "affected":
              relationshipType = "explains";
              description = "Explains what systems are impacted";
              break;
            case "risk":
              relationshipType = "explains";
              description = "Explains the risk assessment";
              break;
          }

          const link: GraphLink = {
            id: `problem-connection-${index}`,
            source: "main-problem",
            target: entityNode.id,
            type: relationshipType as any,
            description: description,
            strength: 7,
          };
          links.push(link);
        }
      }
    });

    console.log("[GraphGenerationService] Main topic extracted:", mainTopic);
    console.log("[GraphGenerationService] Original question:", question);

    return {
      nodes,
      links,
      metadata: {
        title: `Knowledge Graph: ${mainTopic}`,
        description: `Generated from chat message analysis`,
        createdAt: Date.now(),
        messageId,
        chatId,
      },
    };
  }

  /**
   * Utility method to validate and clean entity data
   */
  private validateEntityData(entities: any): any {
    const cleaned = {
      vulnerabilities:
        entities.vulnerabilities?.filter((v: any) => v.name && v.name.trim()) ||
        [],
      mitigations:
        entities.mitigations?.filter((m: any) => m.name && m.name.trim()) || [],
      sources:
        entities.sources?.filter((s: any) => s.name && s.name.trim()) || [],
      problems:
        entities.problems?.filter((p: any) => p.name && p.name.trim()) || [],
      affected:
        entities.affected?.filter((a: any) => a.name && a.name.trim()) || [],
      risks: entities.risks?.filter((r: any) => r.name && r.name.trim()) || [],
      cves: entities.cves?.filter((c: any) => c.cveId && c.cveId.trim()) || [],
    };

    // Remove duplicates based on name/cveId
    cleaned.vulnerabilities = this.removeDuplicates(
      cleaned.vulnerabilities,
      "name"
    );
    cleaned.mitigations = this.removeDuplicates(cleaned.mitigations, "name");
    cleaned.sources = this.removeDuplicates(cleaned.sources, "name");
    cleaned.problems = this.removeDuplicates(cleaned.problems, "name");
    cleaned.affected = this.removeDuplicates(cleaned.affected, "name");
    cleaned.risks = this.removeDuplicates(cleaned.risks, "name");
    cleaned.cves = this.removeDuplicates(cleaned.cves, "cveId");

    return cleaned;
  }

  /**
   * Remove duplicate entities based on a key field
   */
  private removeDuplicates(entities: any[], keyField: string): any[] {
    const seen = new Set();
    return entities.filter((entity) => {
      const key = entity[keyField]?.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate a comprehensive graph summary for logging
   */
  private generateGraphSummary(graphData: GraphData): string {
    const nodeCounts = graphData.nodes.reduce((acc: any, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {});

    const linkCounts = graphData.links.reduce((acc: any, link) => {
      acc[link.type] = (acc[link.type] || 0) + 1;
      return acc;
    }, {});

    return `
Graph Summary:
- Total Nodes: ${graphData.nodes.length}
- Node Types: ${Object.entries(nodeCounts)
      .map(([type, count]) => `${type}: ${count}`)
      .join(", ")}
- Total Links: ${graphData.links.length}
- Link Types: ${Object.entries(linkCounts)
      .map(([type, count]) => `${type}: ${count}`)
      .join(", ")}
- Message ID: ${graphData.metadata?.messageId}
- Chat ID: ${graphData.metadata?.chatId}
    `.trim();
  }

  /**
   * Test method to generate sample graph data
   */
  async generateSampleGraph(): Promise<GraphData> {
    const sampleData: GraphData = {
      nodes: [
        {
          id: "main-problem",
          label: "SQL Injection Vulnerability",
          type: "problem",
          description: "Database injection attack risk",
          metadata: {
            source: "sample",
          },
        },
        {
          id: "vuln-1",
          label: "SQL Injection",
          type: "vulnerability",
          description: "Database injection attack",
          severity: "High",
          cvss: 8.5,
          metadata: {
            source: "sample",
          },
        },
        {
          id: "mit-1",
          label: "Input Validation",
          type: "mitigation",
          description: "Validate all user inputs",
          metadata: {
            source: "sample",
          },
        },
        {
          id: "cve-1",
          label: "CVE-2023-1234",
          type: "cve",
          description: "SQL injection vulnerability",
          severity: "High",
          cvss: 8.5,
          metadata: {
            source: "NVD",
          },
        },
      ],
      links: [
        {
          id: "link-1",
          source: "main-problem",
          target: "vuln-1",
          type: "relates_to",
          description: "Main problem involves SQL injection",
          strength: 9,
        },
        {
          id: "link-2",
          source: "mit-1",
          target: "vuln-1",
          type: "mitigates",
          description: "Input validation prevents SQL injection",
          strength: 8,
        },
        {
          id: "link-3",
          source: "cve-1",
          target: "vuln-1",
          type: "affects",
          description: "CVE affects the vulnerability",
          strength: 9,
        },
      ],
      metadata: {
        title: "Sample SQL Injection Graph",
        description: "Sample graph for testing",
        createdAt: Date.now(),
        messageId: "sample",
        chatId: "sample",
      },
    };

    return sampleData;
  }

  private extractSeverity(
    text: string,
    kgData?: any
  ): "Critical" | "High" | "Medium" | "Low" | "Info" | undefined {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("critical")) return "Critical";
    if (lowerText.includes("high")) return "High";
    if (lowerText.includes("medium")) return "Medium";
    if (lowerText.includes("low")) return "Low";
    if (lowerText.includes("info")) return "Info";
    return undefined;
  }

  private extractCVSS(text: string, kgData?: any): number | undefined {
    const cvssMatch = text.match(/CVSS[:\s]*(\d+\.\d+)/i);
    if (cvssMatch) {
      const score = parseFloat(cvssMatch[1]);
      return score >= 0 && score <= 10 ? score : undefined;
    }
    return undefined;
  }
}

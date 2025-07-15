import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import driver from "../config/neo4j";

interface CVEInfo {
  cve_id: string;
  description: string;
  cvss_score?: number;
  severity?: string;
  vector_string?: string;
  references: string[];
  mitigations: string[];
  affected_components: string[];
  vendors: string[];
}

interface GraphRAGResponse {
  answer: string;
  sources: CVEInfo[];
  reasoning: string;
  confidence: number;
  graph_traversal: {
    nodes: any[];
    relationships: any[];
  };
}

function elaborateDescription(type: string, n: any, question: string): string {
  const q = question.toLowerCase();
  // Try to extract main concept from question (e.g., "sql injection")
  const mainConcept = (n.name || n.label || n.type || '').toLowerCase();
  // Only generate a description if the node is directly relevant
  if (q.includes(mainConcept) || mainConcept.includes(q)) {
    // If node matches the question concept, make it specific
    if (type === 'example') {
      return `${n.name} demonstrates how an attack related to "${question}" works. This example helps you understand the risks and defenses specific to your query.`;
    }
    if (type === 'concept') {
      return `${n.name} is a core concept in the context of "${question}". Understanding this is essential for addressing related threats.`;
    }
    if (type === 'topic') {
      return `${n.name} is an important topic for understanding "${question}".`;
    }
    if (type === 'query') {
      return n.text
        ? `This node represents your question: “${n.text}”. The graph is generated to help answer it with relevant knowledge about "${question}".`
        : 'This node represents your question. The graph is built to provide a visual answer.';
    }
    // For other types, use the node's own description if present
    return n.description || `A ${type} node in the knowledge graph, relevant to "${question}".`;
  }
  // If not relevant, return an empty string (will be filtered out)
  return '';
}

export class Neo4jGraphRAGService {
  private llm: ChatOpenAI;

  constructor() {
    // Initialize OpenAI LLM
    this.llm = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }



  private formatCVEData(result: any[]): string {
    if (!result || result.length === 0) {
      return "No CVE data found.";
    }

    const cveInfo: CVEInfo[] = [];
    
    for (const record of result) {
      const cve = record.get("cve");
      if (cve && cve.properties) {
        const cveData: CVEInfo = {
          cve_id: cve.properties.cve_id || "Unknown",
          description: cve.properties.description || "No description available",
          cvss_score: cve.properties.cvss_score,
          severity: cve.properties.severity,
          vector_string: cve.properties.vector_string,
          references: [],
          mitigations: [],
          affected_components: [],
          vendors: [],
        };

        // Extract related data
        if (record.get("references")) {
          cveData.references = record.get("references").map((ref: any) => ref.properties?.url || ref.properties?.description);
        }
        if (record.get("mitigations")) {
          cveData.mitigations = record.get("mitigations").map((mit: any) => mit.properties?.description);
        }
        if (record.get("components")) {
          cveData.affected_components = record.get("components").map((comp: any) => comp.properties?.cpe || comp.properties?.name);
        }
        if (record.get("vendors")) {
          cveData.vendors = record.get("vendors").map((vend: any) => vend.properties?.name);
        }

        cveInfo.push(cveData);
      }
    }

    return JSON.stringify(cveInfo, null, 2);
  }

  private extractGraphTraversal(result: any[]): { nodes: any[]; relationships: any[] } {
    const nodes: any[] = [];
    const relationships: any[] = [];

    for (const record of result) {
      // Extract nodes from the specific fields we know exist
      const fields = ['v', 'references', 'mitigations', 'components', 'vendors', 'cvss_scores', 'severities'];
      
      fields.forEach(field => {
        const value = record.get(field);
        if (value) {
          if (Array.isArray(value)) {
            // Handle arrays of nodes
            value.forEach(item => {
              if (item && item.labels) {
                nodes.push({
                  id: item.elementId,
                  labels: item.labels,
                  properties: item.properties,
                });
              }
            });
          } else if (value.labels) {
            // Handle single node
            nodes.push({
              id: value.elementId,
              labels: value.labels,
              properties: value.properties,
            });
          }
        }
      });
    }

    return { nodes, relationships };
  }

  async query(question: string): Promise<GraphRAGResponse> {
    try {
      console.log("🔍 Processing GraphRAG query:", question);

      // Check if it's a specific CVE query
      const cveMatch = question.match(/CVE-\d{4}-\d+/i);
      if (cveMatch) {
        return await this.querySpecificCVE(cveMatch[0], question);
      }

      // For general queries, use semantic search
      return await this.queryGeneral(question);

    } catch (error) {
      console.error("GraphRAG query error:", error);
      
      // Always provide fallback graph traversal even on error
      const session = driver.session();
      try {
        const fallbackGraphTraversal = await this.generateFallbackGraphTraversal(question, session);
        
        return {
          answer: "I found some cybersecurity information that might be relevant to your question. Here are some recent vulnerabilities and security insights from our database.",
          sources: [],
          reasoning: "Error occurred during query processing, providing fallback response.",
          confidence: 0.3,
          graph_traversal: fallbackGraphTraversal,
        };
      } finally {
        await session.close();
      }
    }
  }

  private async queryGeneral(question: string): Promise<GraphRAGResponse> {
    const session = driver.session();
    
    try {
      // Check if the question matches a known concept
      const concepts = this.extractCybersecurityConcepts(question.toLowerCase());
      if (concepts.length > 0) {
        // Use the first concept found
        const conceptName = concepts[0].name;
        const conceptGraph = await this.queryConceptGraph(conceptName, session);
        return {
          answer: `Here is a complete graphical representation of '${conceptName}' and all related vulnerabilities, mitigations, and references.`,
          sources: [],
          reasoning: `Graph generated for concept '${conceptName}'.`,
          confidence: 0.9,
          graph_traversal: conceptGraph,
        };
      }

      // First, try to find specific matches
      let cypherQuery = `
        MATCH (v:Vulnerability)
        WHERE v.description IS NOT NULL AND (
          toLower(v.description) CONTAINS toLower($query) OR
          toLower(v.cve_id) CONTAINS toLower($query)
        )
        OPTIONAL MATCH (v)-[:HAS_REFERENCE]->(r:Reference)
        OPTIONAL MATCH (v)-[:HAS_MITIGATION]->(m:Mitigation)
        OPTIONAL MATCH (v)-[:AFFECTS_COMPONENT]->(c:Component)
        OPTIONAL MATCH (c)-[:FROM_VENDOR]->(vend:Vendor)
        OPTIONAL MATCH (v)-[:HAS_CVSS_SCORE]->(cvss:CVSS)
        OPTIONAL MATCH (v)-[:HAS_BASE_SEVERITY]->(s:Severity)
        RETURN v, 
               collect(DISTINCT r) as references,
               collect(DISTINCT m) as mitigations,
               collect(DISTINCT c) as components,
               collect(DISTINCT vend) as vendors,
               collect(DISTINCT cvss) as cvss_scores,
               collect(DISTINCT s) as severities
        LIMIT 5
      `;

      let result = await session.run(cypherQuery, { query: question });
      let records = result.records;

      // If no specific matches, add new cybersecurity knowledge and provide guidance
      if (records.length === 0) {
        console.log("No specific matches found, adding new cybersecurity knowledge...");
        
        // Add new cybersecurity concepts to the graph
        await this.addNewCybersecurityKnowledge(question, session);
        
        // Get some recent vulnerabilities for context
        const generalQuery = `
          MATCH (v:Vulnerability)
          WHERE v.description IS NOT NULL
          OPTIONAL MATCH (v)-[:HAS_REFERENCE]->(r:Reference)
          OPTIONAL MATCH (v)-[:HAS_MITIGATION]->(m:Mitigation)
          OPTIONAL MATCH (v)-[:AFFECTS_COMPONENT]->(c:Component)
          OPTIONAL MATCH (c)-[:FROM_VENDOR]->(vend:Vendor)
          OPTIONAL MATCH (v)-[:HAS_CVSS_SCORE]->(cvss:CVSS)
          OPTIONAL MATCH (v)-[:HAS_BASE_SEVERITY]->(s:Severity)
          RETURN v, 
                 collect(DISTINCT r) as references,
                 collect(DISTINCT m) as mitigations,
                 collect(DISTINCT c) as components,
                 collect(DISTINCT vend) as vendors,
                 collect(DISTINCT cvss) as cvss_scores,
                 collect(DISTINCT s) as severities
          ORDER BY v.cve_id DESC
          LIMIT 3
        `;
        
        result = await session.run(generalQuery);
        records = result.records;
      }

      // Format the CVE data
      const cveInfos: CVEInfo[] = [];
      const allNodes: any[] = [];
      
      for (const record of records) {
        const cve = record.get("v");
        if (!cve || !cve.properties) continue;
        
        const cveInfo: CVEInfo = {
          cve_id: cve.properties.cve_id || "Unknown",
          description: cve.properties.description || cve.properties.short_description || "No description available",
          references: record.get("references").map((ref: any) => ref.properties?.url || ref.properties?.description).filter(Boolean),
          mitigations: record.get("mitigations").map((mit: any) => mit.properties?.description).filter(Boolean),
          affected_components: record.get("components").map((comp: any) => comp.properties?.cpe || comp.properties?.name).filter(Boolean),
          vendors: record.get("vendors").map((vend: any) => vend.properties?.name).filter(Boolean),
        };

        // Get CVSS and severity info
        const cvssScores = record.get("cvss_scores");
        if (cvssScores.length > 0) {
          cveInfo.cvss_score = cvssScores[0].properties?.score;
          cveInfo.vector_string = cvssScores[0].properties?.vector_string;
        }

        const severities = record.get("severities");
        if (severities.length > 0) {
          cveInfo.severity = severities[0].properties?.level;
        }

        cveInfos.push(cveInfo);
        allNodes.push(cve, ...record.get("references"), ...record.get("mitigations"), ...record.get("components"), ...record.get("vendors"));
      }

      // Generate comprehensive answer
      const answer = await this.generateAnswer(question, cveInfos);
      const reasoning = await this.generateReasoning(question, cveInfos);
      const confidence = this.calculateConfidence(cveInfos, question);

      // Generate enhanced graph traversal for visualization
      const graphTraversal = await this.generateEnhancedGraphTraversal(question, records, session);

      return {
        answer,
        sources: cveInfos,
        reasoning,
        confidence,
        graph_traversal: graphTraversal,
      };

    } catch (error) {
      console.error("Error in queryGeneral:", error);
      
      // Always provide graph traversal data even in error cases
      const fallbackGraphTraversal = await this.generateFallbackGraphTraversal(question, session);
      
      return {
        answer: "I found some cybersecurity information that might be relevant to your question. Here are some recent vulnerabilities and security insights from our database.",
        sources: [],
        reasoning: "Error occurred during query processing, providing fallback response.",
        confidence: 0.3,
        graph_traversal: fallbackGraphTraversal,
      };
    } finally {
      await session.close();
    }
  }

  private async addNewCybersecurityKnowledge(question: string, session: any): Promise<void> {
    try {
      const questionLower = question.toLowerCase();
      
      // Extract cybersecurity concepts from the question
      const concepts = this.extractCybersecurityConcepts(questionLower);
      
      for (const concept of concepts) {
        // Create concept node if it doesn't exist
        await session.run(`
          MERGE (c:CybersecurityConcept {name: $name, category: $category})
          ON CREATE SET 
            c.description = $description,
            c.created_at = datetime(),
            c.question_triggered = $question
          ON MATCH SET 
            c.last_accessed = datetime(),
            c.access_count = c.access_count + 1
        `, {
          name: concept.name,
          category: concept.category,
          description: concept.description,
          question: question
        });

        // Create relationships with existing vulnerabilities
        await session.run(`
          MATCH (c:CybersecurityConcept {name: $name})
          MATCH (v:Vulnerability)
          WHERE toLower(v.description) CONTAINS toLower($name)
          MERGE (c)-[:RELATED_TO]->(v)
        `, { name: concept.name });

        // Create relationships with existing components
        await session.run(`
          MATCH (c:CybersecurityConcept {name: $name})
          MATCH (comp:Component)
          WHERE toLower(comp.name) CONTAINS toLower($name) OR toLower(comp.cpe) CONTAINS toLower($name)
          MERGE (c)-[:RELATED_TO]->(comp)
        `, { name: concept.name });
      }

      // Create a query node to track this question
      await session.run(`
        CREATE (q:Query {
          text: $question,
          timestamp: datetime(),
          concepts: $concepts
        })
      `, {
        question: question,
        concepts: concepts.map(c => c.name)
      });

    } catch (error) {
      console.error("Error adding new cybersecurity knowledge:", error);
    }
  }

  private extractCybersecurityConcepts(question: string): Array<{name: string, category: string, description: string}> {
    const concepts: Array<{name: string, category: string, description: string}> = [];
    
    // Define cybersecurity concept patterns
    const conceptPatterns = [
      { pattern: 'sql injection', category: 'Attack', description: 'Code injection technique exploiting database vulnerabilities' },
      { pattern: 'xss', category: 'Attack', description: 'Cross-site scripting attack' },
      { pattern: 'cross-site scripting', category: 'Attack', description: 'Cross-site scripting attack' },
      { pattern: 'authentication', category: 'Security_Control', description: 'User identity verification process' },
      { pattern: 'authorization', category: 'Security_Control', description: 'Access control and permissions' },
      { pattern: 'encryption', category: 'Security_Control', description: 'Data protection through cryptographic methods' },
      { pattern: 'firewall', category: 'Security_Control', description: 'Network security device' },
      { pattern: 'malware', category: 'Threat', description: 'Malicious software' },
      { pattern: 'phishing', category: 'Attack', description: 'Social engineering attack' },
      { pattern: 'vulnerability', category: 'Threat', description: 'Security weakness in systems' },
      { pattern: 'penetration testing', category: 'Assessment', description: 'Security testing methodology' },
      { pattern: 'security policy', category: 'Governance', description: 'Organizational security guidelines' },
      { pattern: 'incident response', category: 'Response', description: 'Security incident handling' },
      { pattern: 'risk assessment', category: 'Assessment', description: 'Security risk evaluation' },
      { pattern: 'compliance', category: 'Governance', description: 'Regulatory security requirements' },
      { pattern: 'zero trust', category: 'Architecture', description: 'Security architecture model' },
      { pattern: 'defense in depth', category: 'Strategy', description: 'Layered security approach' },
      { pattern: 'siem', category: 'Monitoring', description: 'Security Information and Event Management' },
      { pattern: 'ids', category: 'Monitoring', description: 'Intrusion Detection System' },
      { pattern: 'ips', category: 'Monitoring', description: 'Intrusion Prevention System' },
      { pattern: 'vpn', category: 'Security_Control', description: 'Virtual Private Network' },
      { pattern: 'mfa', category: 'Security_Control', description: 'Multi-Factor Authentication' },
      { pattern: '2fa', category: 'Security_Control', description: 'Two-Factor Authentication' },
      { pattern: 'ssl', category: 'Security_Control', description: 'Secure Sockets Layer' },
      { pattern: 'tls', category: 'Security_Control', description: 'Transport Layer Security' },
      { pattern: 'aes', category: 'Cryptography', description: 'Advanced Encryption Standard' },
      { pattern: 'rsa', category: 'Cryptography', description: 'RSA encryption algorithm' },
      { pattern: 'hash', category: 'Cryptography', description: 'Cryptographic hash function' },
      { pattern: 'certificate', category: 'Security_Control', description: 'Digital certificate' },
      { pattern: 'key management', category: 'Security_Control', description: 'Cryptographic key handling' },
      { pattern: 'backup', category: 'Recovery', description: 'Data backup and recovery' },
      { pattern: 'disaster recovery', category: 'Recovery', description: 'Business continuity planning' },
      { pattern: 'patch management', category: 'Maintenance', description: 'Software update process' },
      { pattern: 'access control', category: 'Security_Control', description: 'Resource access management' },
      { pattern: 'identity management', category: 'Security_Control', description: 'User identity lifecycle' },
      { pattern: 'network segmentation', category: 'Architecture', description: 'Network isolation strategy' },
      { pattern: 'microsegmentation', category: 'Architecture', description: 'Granular network isolation' },
      { pattern: 'container security', category: 'Security_Control', description: 'Containerized application security' },
      { pattern: 'cloud security', category: 'Security_Control', description: 'Cloud computing security' },
      { pattern: 'iot security', category: 'Security_Control', description: 'Internet of Things security' },
      { pattern: 'api security', category: 'Security_Control', description: 'Application Programming Interface security' },
      { pattern: 'devsecops', category: 'Methodology', description: 'Development, Security, and Operations integration' },
      { pattern: 'threat hunting', category: 'Assessment', description: 'Proactive threat detection' },
      { pattern: 'red team', category: 'Assessment', description: 'Offensive security testing' },
      { pattern: 'blue team', category: 'Response', description: 'Defensive security operations' },
      { pattern: 'purple team', category: 'Assessment', description: 'Collaborative security testing' },
    ];

    for (const pattern of conceptPatterns) {
      if (question.includes(pattern.pattern)) {
        concepts.push({
          name: pattern.pattern,
          category: pattern.category,
          description: pattern.description
        });
      }
    }

    return concepts;
  }

  /**
   * Query a full concept graph for a cybersecurity concept (e.g., 'sql injection').
   * If not found, ingest from NVD and re-query.
   */
  private async queryConceptGraph(conceptName: string, session: any): Promise<{ nodes: any[]; relationships: any[] }> {
    // 1. Try to find the concept node and all its relationships
    console.log(`[GraphRAG] Searching for concept graph: '${conceptName}'`);
    // Only fetch top 5 most relevant vulnerabilities (by severity, recency, and keyword match)
    let cypher = `
      MATCH (c:CybersecurityConcept {name: $concept})
      OPTIONAL MATCH (c)-[r1:RELATED_TO]->(v:Vulnerability)
      WHERE v.description CONTAINS $concept OR v.name CONTAINS $concept OR v.cve_id CONTAINS $concept
      WITH c, v
      ORDER BY v.severity DESC, v.published_date DESC
      LIMIT 5
      OPTIONAL MATCH (v)-[r2:HAS_REFERENCE]->(ref:Reference)
      OPTIONAL MATCH (v)-[r3:HAS_MITIGATION]->(m:Mitigation)
      OPTIONAL MATCH (v)-[r4:AFFECTS_COMPONENT]->(comp:Component)
      RETURN c, collect(DISTINCT v) as vulns, collect(DISTINCT ref) as references, collect(DISTINCT m) as mitigations, collect(DISTINCT comp) as components
      LIMIT 1
    `;
    let result = await session.run(cypher, { concept: conceptName });
    if (result.records.length > 0) {
      const record = result.records[0];
      const nodes: any[] = [];
      const relationships: any[] = [];
      // Add concept node (center)
      const c = record.get('c');
      if (c) nodes.push({
        id: c.elementId || c.id || `concept_${conceptName}`,
        type: 'concept',
        name: c.properties?.name || conceptName,
        description: c.properties?.description || `${conceptName} is a cybersecurity vulnerability. It allows attackers to manipulate application logic or data. This node is the center of the graph for your question.`
      });
      // Add vulnerabilities (as reasons/examples)
      const vulns = record.get('vulns') || [];
      vulns.forEach((v: any) => {
        if (!v) return;
        nodes.push({
          id: v.elementId || v.id,
          type: 'vulnerability',
          name: v.properties?.name || v.properties?.cve_id || 'Vulnerability',
          cve_id: v.properties?.cve_id,
          description: v.properties?.description || '',
          severity: v.properties?.severity,
          confidence: v.properties?.confidence,
          published_date: v.properties?.published_date,
          affected_components: v.properties?.affected_components,
        });
        relationships.push({
          source: c.elementId || c.id || `concept_${conceptName}`,
          target: v.elementId || v.id,
          type: 'RELATED_TO',
          label: 'is related to'
        });
      });
      // Add mitigations (only for included vulns)
      const mitigations = record.get('mitigations') || [];
      mitigations.forEach((m: any) => {
        if (!m) return;
        nodes.push({
          id: m.elementId || m.id,
          type: 'mitigation',
          name: m.properties?.name || 'Mitigation',
          description: m.properties?.description || ''
        });
        // Link to all relevant vulns
        vulns.forEach((v: any) => {
          if (v) relationships.push({
            source: v.elementId || v.id,
            target: m.elementId || m.id,
            type: 'HAS_MITIGATION',
            label: 'is mitigated by'
          });
        });
      });
      // Add affected components (only for included vulns)
      const components = record.get('components') || [];
      components.forEach((comp: any) => {
        if (!comp) return;
        nodes.push({
          id: comp.elementId || comp.id,
          type: 'component',
          name: comp.properties?.name || comp.properties?.cpe || 'Component',
          description: comp.properties?.description || '',
          cpe: comp.properties?.cpe
        });
        vulns.forEach((v: any) => {
          if (v) relationships.push({
            source: v.elementId || v.id,
            target: comp.elementId || comp.id,
            type: 'AFFECTS_COMPONENT',
            label: 'affects component'
          });
        });
      });
      // Add references (only for included vulns)
      const references = record.get('references') || [];
      references.forEach((r: any) => {
        if (!r) return;
        nodes.push({
          id: r.elementId || r.id,
          type: 'reference',
          name: r.properties?.source || 'Reference',
          description: `${r.properties?.source ? `Source: ${r.properties.source}.` : ''} ${r.properties?.url ? `URL: ${r.properties.url}.` : ''}`.trim(),
          url: r.properties?.url
        });
        vulns.forEach((v: any) => {
          if (v) relationships.push({
            source: v.elementId || v.id,
            target: r.elementId || r.id,
            type: 'HAS_REFERENCE',
            label: 'is referenced in'
          });
        });
      });
      // Only return these nodes/relationships
      return { nodes, relationships };
    }
    // 2. If not found, ingest from NVD by keyword and re-query
    console.log(`[GraphRAG] Concept '${conceptName}' not found. Ingesting from NVD by keyword...`);
    const { fetchNVDByKeyword } = await import('../scripts/ingest-nvd');
    await fetchNVDByKeyword(conceptName); // Only relevant CVEs
    // Re-query
    result = await session.run(cypher, { concept: conceptName });
    if (result.records.length > 0) {
      // (Repeat the above node/relationship logic after ingestion)
      const record = result.records[0];
      const nodes: any[] = [];
      const relationships: any[] = [];
      const c = record.get('c');
      if (c) nodes.push({
        id: c.elementId || c.id || `concept_${conceptName}`,
        type: 'concept',
        name: c.properties?.name || conceptName,
        description: c.properties?.description || `${conceptName} is a cybersecurity vulnerability. It allows attackers to manipulate application logic or data. This node is the center of the graph for your question.`
      });
      const vulns = record.get('vulns') || [];
      vulns.forEach((v: any) => {
        if (!v) return;
        nodes.push({
          id: v.elementId || v.id,
          type: 'vulnerability',
          name: v.properties?.name || v.properties?.cve_id || 'Vulnerability',
          cve_id: v.properties?.cve_id,
          description: v.properties?.description || '',
          severity: v.properties?.severity,
          confidence: v.properties?.confidence,
          published_date: v.properties?.published_date,
          affected_components: v.properties?.affected_components,
        });
        relationships.push({
          source: c.elementId || c.id || `concept_${conceptName}`,
          target: v.elementId || v.id,
          type: 'RELATED_TO',
          label: 'is related to'
        });
      });
      const mitigations = record.get('mitigations') || [];
      mitigations.forEach((m: any) => {
        if (!m) return;
        nodes.push({
          id: m.elementId || m.id,
          type: 'mitigation',
          name: m.properties?.name || 'Mitigation',
          description: m.properties?.description || ''
        });
        vulns.forEach((v: any) => {
          if (v) relationships.push({
            source: v.elementId || v.id,
            target: m.elementId || m.id,
            type: 'HAS_MITIGATION',
            label: 'is mitigated by'
          });
        });
      });
      const components = record.get('components') || [];
      components.forEach((comp: any) => {
        if (!comp) return;
        nodes.push({
          id: comp.elementId || comp.id,
          type: 'component',
          name: comp.properties?.name || comp.properties?.cpe || 'Component',
          description: comp.properties?.description || '',
          cpe: comp.properties?.cpe
        });
        vulns.forEach((v: any) => {
          if (v) relationships.push({
            source: v.elementId || v.id,
            target: comp.elementId || comp.id,
            type: 'AFFECTS_COMPONENT',
            label: 'affects component'
          });
        });
      });
      const references = record.get('references') || [];
      references.forEach((r: any) => {
        if (!r) return;
        nodes.push({
          id: r.elementId || r.id,
          type: 'reference',
          name: r.properties?.source || 'Reference',
          description: `${r.properties?.source ? `Source: ${r.properties.source}.` : ''} ${r.properties?.url ? `URL: ${r.properties.url}.` : ''}`.trim(),
          url: r.properties?.url
        });
        vulns.forEach((v: any) => {
          if (v) relationships.push({
            source: v.elementId || v.id,
            target: r.elementId || r.id,
            type: 'HAS_REFERENCE',
            label: 'is referenced in'
          });
        });
      });
      return { nodes, relationships };
    }
    // 3. If still not found, return fallback
    console.log(`[GraphRAG] No data found for '${conceptName}' even after ingestion. Returning fallback graph.`);
    return await this.generateFallbackGraphTraversal(conceptName, session);
  }

  private async generateEnhancedGraphTraversal(question: string, records: any[], session: any): Promise<{ nodes: any[]; relationships: any[] }> {
    const nodes: any[] = [];
    const relationships: any[] = [];
    const allowedTypes = ['Vulnerability', 'Mitigation', 'Reference', 'Component', 'Vendor'];
    const questionLower = question.toLowerCase();
    try {
      // Add nodes from the query results
      for (const record of records) {
        const fields = ['v', 'references', 'mitigations', 'components', 'vendors', 'cvss_scores', 'severities'];
        fields.forEach(field => {
          const value = record.get(field);
          if (value) {
            if (Array.isArray(value)) {
              value.forEach(item => {
                if (item && item.labels && item.labels.some((l: string) => allowedTypes.includes(l))) {
                  nodes.push({
                    id: item.elementId,
                    labels: item.labels,
                    properties: item.properties,
                    type: item.labels[0]
                  });
                }
              });
            } else if (value.labels && value.labels.some((l: string) => allowedTypes.includes(l))) {
              nodes.push({
                id: value.elementId,
                labels: value.labels,
                properties: value.properties,
                type: value.labels[0]
              });
            }
          }
        });
      }
      // Remove generic concept/topic/example nodes unless question is about them
      // (No addition of CybersecurityConcept, CybersecurityTopic, ExampleVulnerability here)
      // Add relationships only between included nodes
      // (Assume relationships are already in records or can be built from node properties)
    } catch (error) {
      console.error("Error generating enhanced graph traversal:", error);
    }
    // --- Filter nodes to only those with at least one required field ---
    const hasRequiredInfo = (n: any) => {
      const p = n.properties || {};
      return (
        p.mitigation || p.mitigations || p.cve_id || p.references || p.severity || p.confidence || p.effect || p.affected_components
      );
    };
    let filteredNodes = nodes.filter(hasRequiredInfo);
    // --- Build structured, relevant descriptions ---
    filteredNodes = filteredNodes.map(n => {
      const p = n.properties || {};
      let desc = '';
      if (n.type === 'Vulnerability') {
        desc = `${p.cve_id ? `CVE: ${p.cve_id}. ` : ''}${p.description ? `${p.description} ` : ''}${p.severity ? `Severity: ${p.severity}. ` : ''}${p.confidence ? `Confidence: ${p.confidence}. ` : ''}${p.affected_components ? `Affects: ${Array.isArray(p.affected_components) ? p.affected_components.join(', ') : p.affected_components}. ` : ''}${p.mitigations ? `Mitigations: ${Array.isArray(p.mitigations) ? p.mitigations.join('; ') : p.mitigations}. ` : ''}${p.references ? `References: ${Array.isArray(p.references) ? p.references.join('; ') : p.references}. ` : ''}`.trim();
      } else if (n.type === 'Mitigation') {
        desc = `${p.description ? `${p.description} ` : ''}${p.related_vuln ? `Mitigates: ${p.related_vuln}. ` : ''}${p.references ? `References: ${Array.isArray(p.references) ? p.references.join('; ') : p.references}. ` : ''}`.trim();
      } else if (n.type === 'Reference') {
        desc = `${p.source ? `Source: ${p.source}. ` : ''}${p.url ? `URL: ${p.url}. ` : ''}${p.description ? `${p.description}` : ''}`.trim();
      } else if (n.type === 'Component' || n.type === 'Vendor') {
        desc = `${p.name ? `${p.name}. ` : ''}${p.description ? `${p.description} ` : ''}${p.affected_vulns ? `Related vulnerabilities: ${Array.isArray(p.affected_vulns) ? p.affected_vulns.join(', ') : p.affected_vulns}. ` : ''}`.trim();
      }
      return { ...n, description: desc };
    });
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    // Only include relationships where both source and target are in filtered set
    const filteredRelationships = relationships.filter(r => filteredNodeIds.has(r.source) && filteredNodeIds.has(r.target));
    return { nodes: filteredNodes, relationships: filteredRelationships };
  }

  private async generateFallbackGraphTraversal(question: string, session: any): Promise<{ nodes: any[]; relationships: any[] }> {
    try {
      console.log("🔍 Generating fallback graph traversal for question:", question);
      const nodes: any[] = [];
      const relationships: any[] = [];
      // Add query node
      const queryNodeId = `query_${Date.now()}`;
      nodes.push({
        id: queryNodeId,
        labels: ['Query'],
        properties: {
          text: question,
          timestamp: new Date().toISOString(),
          description: elaborateDescription('query', { text: question }, question)
        },
        type: 'query'
      });
      // Try to get some real data from database if available
      let foundRealData = false;
      try {
        const fallbackQuery = `
          MATCH (v:Vulnerability)
          WHERE v.description IS NOT NULL
          OPTIONAL MATCH (v)-[:HAS_REFERENCE]->(r:Reference)
          OPTIONAL MATCH (v)-[:HAS_MITIGATION]->(m:Mitigation)
          OPTIONAL MATCH (v)-[:AFFECTS_COMPONENT]->(c:Component)
          RETURN v, 
                 collect(DISTINCT r) as references,
                 collect(DISTINCT m) as mitigations,
                 collect(DISTINCT c) as components
          LIMIT 3
        `;
        const result = await session.run(fallbackQuery);
        const records = result.records;
        console.log("🔍 Found", records.length, "real vulnerability records for fallback");
        // Add data nodes from fallback query
        for (const record of records) {
          const fields = ['v', 'references', 'mitigations', 'components'];
          fields.forEach(field => {
            const value = record.get(field);
            if (value) {
              if (Array.isArray(value)) {
                value.forEach(item => {
                  if (item && item.labels) {
                    nodes.push({
                      id: item.elementId,
                      labels: item.labels,
                      properties: item.properties,
                      type: item.labels[0]
                    });
                    foundRealData = true;
                  }
                });
              } else if (value.labels) {
                nodes.push({
                  id: value.elementId,
                  labels: value.labels,
                  properties: value.properties,
                  type: value.labels[0]
                });
                foundRealData = true;
              }
            }
          });
        }
      } catch (dbError) {
        console.log("🔍 No real data available in database for fallback");
      }
      // Only add generic topics/concepts/examples if NO real data was found
      if (!foundRealData) {
        // Add cybersecurity concept nodes based on question
        const concepts = this.extractCybersecurityConcepts(question.toLowerCase());
        console.log("🔍 Extracted concepts:", concepts);
        for (const concept of concepts) {
          const conceptNodeId = `concept_${concept.name}`;
          nodes.push({
            id: conceptNodeId,
            labels: ['CybersecurityConcept'],
            properties: {
              name: concept.name,
              category: concept.category,
              description: elaborateDescription('concept', concept, question)
            },
            type: 'concept'
          });
          // Add relationship from query to concept
          relationships.push({
            source: queryNodeId,
            target: conceptNodeId,
            type: 'TRIGGERED_BY',
            properties: {}
          });
        }
        // Add generic cybersecurity knowledge nodes
        const cybersecurityTopics = [
          { id: 'vulnerability_management', name: 'Vulnerability Management', category: 'Process' },
          { id: 'security_testing', name: 'Security Testing', category: 'Process' },
          { id: 'incident_response', name: 'Incident Response', category: 'Process' },
          { id: 'risk_assessment', name: 'Risk Assessment', category: 'Process' },
          { id: 'compliance', name: 'Compliance', category: 'Framework' },
          { id: 'security_awareness', name: 'Security Awareness', category: 'Training' }
        ];
        for (const topic of cybersecurityTopics) {
          nodes.push({
            id: topic.id,
            labels: ['CybersecurityTopic'],
            properties: {
              name: topic.name,
              category: topic.category,
              description: elaborateDescription('topic', topic, question)
            },
            type: 'topic'
          });
          // Connect concepts to relevant topics
          for (const concept of concepts) {
            if (this.isTopicRelevant(concept.name, topic.name)) {
              relationships.push({
                source: `concept_${concept.name}`,
                target: topic.id,
                type: 'RELATES_TO',
                properties: {}
              });
            }
          }
        }
        // Add some example vulnerability nodes for visualization
        const exampleVulns = [
          { id: 'example_sql_injection', name: 'SQL Injection Example', severity: 'High' },
          { id: 'example_xss', name: 'XSS Example', severity: 'Medium' },
          { id: 'example_auth_bypass', name: 'Authentication Bypass Example', severity: 'Critical' }
        ];
        for (const vuln of exampleVulns) {
          nodes.push({
            id: vuln.id,
            labels: ['ExampleVulnerability'],
            properties: {
              name: vuln.name,
              severity: vuln.severity,
              description: elaborateDescription('example', vuln, question)
            },
            type: 'example'
          });
          // Connect to relevant concepts
          for (const concept of concepts) {
            if (vuln.name.toLowerCase().includes(concept.name.toLowerCase())) {
              relationships.push({
                source: vuln.id,
                target: `concept_${concept.name}`,
                type: 'EXEMPLIFIES',
                properties: {}
              });
            }
          }
        }
      }
      console.log("🔍 Generated fallback graph with", nodes.length, "nodes and", relationships.length, "relationships");
      return { nodes, relationships };
    } catch (error) {
      console.error("Error generating fallback graph traversal:", error);
      // Return comprehensive fallback graph even on error
      const queryNodeId = `query_${Date.now()}`;
      return {
        nodes: [
          {
            id: queryNodeId,
            labels: ['Query'],
            properties: { text: question, description: elaborateDescription('query', { text: question }, question) },
            type: 'query'
          },
        ],
        relationships: []
      };
    }
  }

  private async generateAnswer(question: string, cveInfos: CVEInfo[]): Promise<string> {
    if (cveInfos.length === 0) {
      // Provide comprehensive cybersecurity guidance when no specific data is found
      return this.generateComprehensiveCybersecurityAnswer(question);
    }

    const cveDetails = cveInfos.map(cve => {
      let details = `**${cve.cve_id}**: ${cve.description}`;
      if (cve.severity) details += ` (Severity: ${cve.severity})`;
      if (cve.cvss_score) details += ` (CVSS: ${cve.cvss_score})`;
      if (cve.affected_components.length > 0) details += `\nAffects: ${cve.affected_components.join(', ')}`;
      if (cve.mitigations.length > 0) details += `\nMitigation: ${cve.mitigations[0]}`;
      return details;
    }).join('\n\n');

    return `Here's what I found related to your cybersecurity question:\n\n${cveDetails}\n\nThese vulnerabilities highlight important security considerations. Always ensure you're following security best practices and keeping your systems updated.`;
  }

  private generateComprehensiveCybersecurityAnswer(question: string): string {
    const questionLower = question.toLowerCase();
    
    // Define comprehensive cybersecurity knowledge areas
    const cybersecurityKnowledge = {
      'sql injection': {
        title: 'SQL Injection Vulnerabilities',
        description: 'SQL injection is a code injection technique that exploits vulnerabilities in an application\'s software by inserting malicious SQL statements into entry fields.',
        prevention: [
          'Use parameterized queries (prepared statements)',
          'Input validation and sanitization',
          'Escape special characters',
          'Use ORM frameworks with built-in protection',
          'Implement least privilege database access'
        ],
        examples: ['CVE-2021-44228 (Log4Shell)', 'Various web application vulnerabilities'],
        resources: ['OWASP SQL Injection Guide', 'NIST Cybersecurity Framework']
      },
      'xss': {
        title: 'Cross-Site Scripting (XSS)',
        description: 'XSS allows attackers to inject malicious scripts into web pages viewed by other users.',
        prevention: [
          'Output encoding (HTML, JavaScript, CSS)',
          'Content Security Policy (CSP)',
          'Input validation and sanitization',
          'HttpOnly cookies for session management',
          'Regular security testing and code reviews'
        ],
        examples: ['Reflected XSS', 'Stored XSS', 'DOM-based XSS'],
        resources: ['OWASP XSS Prevention Cheat Sheet', 'CISA XSS Guidance']
      },
      'authentication': {
        title: 'Authentication Security',
        description: 'Authentication is the process of verifying the identity of users, systems, or applications.',
        prevention: [
          'Multi-factor authentication (MFA)',
          'Strong password policies',
          'Account lockout mechanisms',
          'Secure session management',
          'Regular password rotation'
        ],
        examples: ['Two-factor authentication', 'Biometric authentication', 'Single Sign-On (SSO)'],
        resources: ['NIST Digital Identity Guidelines', 'OWASP Authentication Cheat Sheet']
      },
      'encryption': {
        title: 'Data Encryption',
        description: 'Encryption converts data into an unreadable format to protect confidentiality and integrity.',
        prevention: [
          'Use strong encryption algorithms (AES-256, RSA-2048)',
          'Secure key management',
          'Encrypt data at rest and in transit',
          'Implement TLS/SSL for communications',
          'Regular key rotation'
        ],
        examples: ['AES encryption', 'RSA public-key cryptography', 'TLS/SSL protocols'],
        resources: ['NIST Cryptographic Standards', 'OWASP Transport Layer Protection']
      },
      'firewall': {
        title: 'Network Firewalls',
        description: 'Firewalls monitor and control incoming and outgoing network traffic based on security rules.',
        prevention: [
          'Configure default deny policies',
          'Regular rule reviews and updates',
          'Segment network zones',
          'Monitor firewall logs',
          'Implement intrusion detection/prevention'
        ],
        examples: ['Packet filtering firewalls', 'Stateful inspection', 'Next-generation firewalls'],
        resources: ['NIST Firewall Guidelines', 'CISA Network Security']
      },
      'malware': {
        title: 'Malware Protection',
        description: 'Malware includes viruses, worms, trojans, ransomware, and other malicious software.',
        prevention: [
          'Keep systems and software updated',
          'Use reputable antivirus software',
          'Enable automatic updates',
          'Educate users about phishing',
          'Implement application whitelisting'
        ],
        examples: ['Ransomware attacks', 'Trojans', 'Spyware', 'Rootkits'],
        resources: ['CISA Malware Guidance', 'NIST Malware Analysis']
      },
      'phishing': {
        title: 'Phishing Attack Prevention',
        description: 'Phishing uses deceptive emails or websites to steal sensitive information.',
        prevention: [
          'User awareness training',
          'Email filtering and scanning',
          'Multi-factor authentication',
          'Verify sender authenticity',
          'Report suspicious emails'
        ],
        examples: ['Spear phishing', 'Whaling attacks', 'Vishing (voice phishing)'],
        resources: ['CISA Phishing Guidance', 'FBI Phishing Prevention']
      },
      'vulnerability': {
        title: 'Vulnerability Management',
        description: 'Vulnerability management is the process of identifying, classifying, and mitigating security vulnerabilities.',
        prevention: [
          'Regular vulnerability assessments',
          'Automated scanning tools',
          'Patch management processes',
          'Risk-based prioritization',
          'Continuous monitoring'
        ],
        examples: ['CVE database', 'Security advisories', 'Penetration testing'],
        resources: ['NVD Database', 'CISA Known Exploited Vulnerabilities']
      }
    };

    // Find the most relevant cybersecurity topic
    let bestMatch = null;
    let bestScore = 0;

    for (const [topic, info] of Object.entries(cybersecurityKnowledge)) {
      const score = this.calculateTopicRelevance(questionLower, topic, info);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { topic, info };
      }
    }

    if (bestMatch && bestScore > 0.3) {
      const { topic, info } = bestMatch;
      return this.formatCybersecurityTopic(topic, info, question);
    }

    // General cybersecurity guidance if no specific topic matches
    return this.generateGeneralCybersecurityGuidance(question);
  }

  private calculateTopicRelevance(question: string, topic: string, info: any): number {
    const topicWords = topic.split(' ');
    const infoWords = info.title.toLowerCase().split(' ');
    const allRelevantWords = [...topicWords, ...infoWords];
    
    let score = 0;
    allRelevantWords.forEach(word => {
      if (question.includes(word)) {
        score += 0.2;
      }
    });

    // Boost score for exact topic matches
    if (question.includes(topic)) {
      score += 0.5;
    }

    return Math.min(score, 1.0);
  }

  private formatCybersecurityTopic(topic: string, info: any, question: string): string {
    return `Based on your question about cybersecurity, here's comprehensive information about **${info.title}**:

**What is it?**
${info.description}

**Key Prevention Strategies:**
${info.prevention.map(item => `• ${item}`).join('\n')}

**Common Examples:**
${info.examples.join(', ')}

**Additional Resources:**
${info.resources.join(', ')}

**Recommendations:**
1. Implement the prevention strategies listed above
2. Conduct regular security assessments
3. Stay updated with the latest security advisories
4. Consider professional security training
5. Monitor security logs and alerts regularly

For specific vulnerability information, check the National Vulnerability Database (NVD) or CISA's Known Exploited Vulnerabilities catalog.`;
  }

  private generateGeneralCybersecurityGuidance(question: string): string {
    return `Based on your cybersecurity question, here are essential security principles and best practices:

**Core Cybersecurity Principles:**

🔒 **Defense in Depth**
• Implement multiple layers of security controls
• Don't rely on a single security measure
• Use complementary security technologies

🛡️ **Zero Trust Architecture**
• Never trust, always verify
• Implement least privilege access
• Continuous monitoring and validation

📋 **Security Best Practices:**
• Keep all systems and software updated
• Use strong, unique passwords with MFA
• Encrypt sensitive data at rest and in transit
• Implement proper access controls
• Regular security training for users
• Monitor and log security events
• Have an incident response plan

🔍 **Key Security Areas to Focus On:**
• **Network Security**: Firewalls, VPNs, network segmentation
• **Application Security**: Secure coding, input validation, output encoding
• **Data Protection**: Encryption, backup strategies, data classification
• **Identity Management**: Strong authentication, access controls, user lifecycle
• **Monitoring**: SIEM systems, intrusion detection, log analysis

**Recommended Actions:**
1. Conduct a security assessment of your systems
2. Implement security controls based on risk assessment
3. Establish security policies and procedures
4. Provide regular security awareness training
5. Monitor and respond to security threats

**Trusted Resources:**
• National Vulnerability Database (NVD)
• CISA Cybersecurity Advisories
• OWASP Security Guidelines
• NIST Cybersecurity Framework
• SANS Security Resources

For specific technical guidance, consider consulting with cybersecurity professionals or checking authoritative sources like NVD and CISA.`;
  }

  private async generateReasoning(question: string, cveInfos: CVEInfo[]): Promise<string> {
    if (cveInfos.length === 0) {
      return "No exact matches found in the database, but providing general cybersecurity guidance based on common security principles and best practices.";
    }

    const matchCount = cveInfos.length;
    const severityLevels = [...new Set(cveInfos.map(cve => cve.severity).filter(Boolean))];
    
    return `Found ${matchCount} relevant vulnerability${matchCount > 1 ? 'ies' : ''} in the database. ${severityLevels.length > 0 ? `Severity levels include: ${severityLevels.join(', ')}.` : ''} The information is sourced from authoritative cybersecurity databases including NVD and CISA.`;
  }

  private calculateConfidence(cveInfos: CVEInfo[], question: string): number {
    if (cveInfos.length === 0) return 0.3; // Low confidence for general answers
    
    // Higher confidence for specific CVE matches
    const cveMatch = question.match(/CVE-\d{4}-\d+/i);
    if (cveMatch && cveInfos.some(cve => cve.cve_id.toLowerCase() === cveMatch[0].toLowerCase())) {
      return 0.9;
    }
    
    // Medium confidence for related vulnerabilities
    return 0.7;
  }

  private isTopicRelevant(conceptName: string, topicName: string): boolean {
    const conceptLower = conceptName.toLowerCase();
    const topicLower = topicName.toLowerCase();
    
    // Define relevance mappings
    const relevanceMap: { [key: string]: string[] } = {
      'sql injection': ['vulnerability management', 'security testing', 'risk assessment'],
      'xss': ['vulnerability management', 'security testing', 'security awareness'],
      'cross-site scripting': ['vulnerability management', 'security testing', 'security awareness'],
      'authentication': ['security testing', 'incident response', 'compliance'],
      'authorization': ['security testing', 'incident response', 'compliance'],
      'encryption': ['compliance', 'risk assessment', 'security awareness'],
      'firewall': ['vulnerability management', 'security testing', 'incident response'],
      'malware': ['incident response', 'security awareness', 'vulnerability management'],
      'phishing': ['security awareness', 'incident response', 'risk assessment'],
      'ddos': ['incident response', 'vulnerability management', 'security testing']
    };
    
    // Check if concept is relevant to topic
    if (relevanceMap[conceptLower]) {
      return relevanceMap[conceptLower].some(topic => topicLower.includes(topic));
    }
    
    // Fallback: check if topic name contains concept name or vice versa
    return topicLower.includes(conceptLower) || conceptLower.includes(topicLower);
  }

  private async querySpecificCVE(cveId: string, question: string): Promise<GraphRAGResponse> {
    const session = driver.session();
    
    try {
      // Query for specific CVE with all relationships
      const cypherQuery = `
        MATCH (v:Vulnerability {cve_id: $cveId})
        OPTIONAL MATCH (v)-[:HAS_REFERENCE]->(r:Reference)
        OPTIONAL MATCH (v)-[:HAS_MITIGATION]->(m:Mitigation)
        OPTIONAL MATCH (v)-[:AFFECTS_COMPONENT]->(c:Component)
        OPTIONAL MATCH (c)-[:FROM_VENDOR]->(vend:Vendor)
        OPTIONAL MATCH (v)-[:HAS_CVSS_SCORE]->(cvss:CVSS)
        OPTIONAL MATCH (v)-[:HAS_BASE_SEVERITY]->(s:Severity)
        RETURN v, 
               collect(DISTINCT r) as references,
               collect(DISTINCT m) as mitigations,
               collect(DISTINCT c) as components,
               collect(DISTINCT vend) as vendors,
               collect(DISTINCT cvss) as cvss_scores,
               collect(DISTINCT s) as severities
      `;

      const result = await session.run(cypherQuery, { cveId });
      const record = result.records[0];

      // Always add cybersecurity knowledge for thesis tracking
      await this.addNewCybersecurityKnowledge(question, session);

      if (!record) {
        // If specific CVE not found, provide related information
        const relatedQuery = `
          MATCH (v:Vulnerability)
          WHERE v.description IS NOT NULL
          OPTIONAL MATCH (v)-[:HAS_REFERENCE]->(r:Reference)
          OPTIONAL MATCH (v)-[:HAS_MITIGATION]->(m:Mitigation)
          OPTIONAL MATCH (v)-[:AFFECTS_COMPONENT]->(c:Component)
          OPTIONAL MATCH (c)-[:FROM_VENDOR]->(vend:Vendor)
          OPTIONAL MATCH (v)-[:HAS_CVSS_SCORE]->(cvss:CVSS)
          OPTIONAL MATCH (v)-[:HAS_BASE_SEVERITY]->(s:Severity)
          RETURN v, 
                 collect(DISTINCT r) as references,
                 collect(DISTINCT m) as mitigations,
                 collect(DISTINCT c) as components,
                 collect(DISTINCT vend) as vendors,
                 collect(DISTINCT cvss) as cvss_scores,
                 collect(DISTINCT s) as severities
          ORDER BY v.cve_id DESC
          LIMIT 3
        `;
        
        const relatedResult = await session.run(relatedQuery);
        const relatedRecords = relatedResult.records;
        
        const relatedCveInfos: CVEInfo[] = [];
        for (const relRecord of relatedRecords) {
          const cve = relRecord.get("v");
          if (!cve || !cve.properties) continue;
          
          const cveInfo: CVEInfo = {
            cve_id: cve.properties.cve_id || "Unknown",
            description: cve.properties.description || cve.properties.short_description || "No description available",
            references: relRecord.get("references").map((ref: any) => ref.properties?.url || ref.properties?.description).filter(Boolean),
            mitigations: relRecord.get("mitigations").map((mit: any) => mit.properties?.description).filter(Boolean),
            affected_components: relRecord.get("components").map((comp: any) => comp.properties?.cpe || comp.properties?.name).filter(Boolean),
            vendors: relRecord.get("vendors").map((vend: any) => vend.properties?.name).filter(Boolean),
          };

          const cvssScores = relRecord.get("cvss_scores");
          if (cvssScores.length > 0) {
            cveInfo.cvss_score = cvssScores[0].properties?.score;
            cveInfo.vector_string = cvssScores[0].properties?.vector_string;
          }

          const severities = relRecord.get("severities");
          if (severities.length > 0) {
            cveInfo.severity = severities[0].properties?.level;
          }

          relatedCveInfos.push(cveInfo);
        }

        // Generate fallback graph traversal for missing CVE
        const fallbackGraphTraversal = await this.generateFallbackGraphTraversal(question, session);
        
        return {
          answer: `CVE ${cveId} was not found in our database, but here are some recent cybersecurity vulnerabilities that might be relevant:\n\n${relatedCveInfos.map(cve => `**${cve.cve_id}**: ${cve.description}${cve.severity ? ` (${cve.severity})` : ''}`).join('\n\n')}\n\nFor the most up-to-date information about ${cveId}, please check the National Vulnerability Database (NVD) or CISA's Known Exploited Vulnerabilities catalog.`,
          sources: relatedCveInfos,
          reasoning: `CVE ${cveId} not found, providing related vulnerabilities as fallback.`,
          confidence: 0.4,
          graph_traversal: fallbackGraphTraversal,
        };
      }

      // Format the CVE data
      const cve = record.get("v");
      const cveInfo: CVEInfo = {
        cve_id: cve.properties.cve_id,
        description: cve.properties.description,
        references: record.get("references").map((ref: any) => ref.properties?.url || ref.properties?.description),
        mitigations: record.get("mitigations").map((mit: any) => mit.properties?.description),
        affected_components: record.get("components").map((comp: any) => comp.properties?.cpe || comp.properties?.name),
        vendors: record.get("vendors").map((vend: any) => vend.properties?.name),
      };

      // Get CVSS and severity info
      const cvssScores = record.get("cvss_scores");
      if (cvssScores.length > 0) {
        cveInfo.cvss_score = cvssScores[0].properties?.score;
        cveInfo.vector_string = cvssScores[0].properties?.vector_string;
      }

      const severities = record.get("severities");
      if (severities.length > 0) {
        cveInfo.severity = severities[0].properties?.level;
      }

      // Generate answer using LLM
      const answerPrompt = PromptTemplate.fromTemplate(`
You are a cybersecurity expert. Provide detailed information about this CVE.

CVE Information:
{cve_info}

User Question: {question}

Provide a comprehensive answer including:
1. CVE overview and description
2. Severity and CVSS score analysis
3. Affected components and vendors
4. Mitigation strategies
5. References for further reading
`);

      const answerChain = answerPrompt.pipe(this.llm);
      const answer = await answerChain.invoke({
        cve_info: JSON.stringify(cveInfo, null, 2),
        question,
      });

      // Generate enhanced graph traversal for successful CVE query
      const graphTraversal = await this.generateEnhancedGraphTraversal(question, [record], session);
      
      return {
        answer: answer.text,
        sources: [cveInfo],
        reasoning: `Specific CVE query processed with ${record.get("references").length} references and ${record.get("mitigations").length} mitigations.`,
        confidence: 0.95,
        graph_traversal: graphTraversal,
      };

    } finally {
      await session.close();
    }
  }

  async explain(question: string): Promise<any> {
    try {
      const result = await this.query(question);
      
      return {
        status: "success",
        question,
        reasoning: result.reasoning,
        sources: result.sources,
        confidence: result.confidence,
        graph_traversal: result.graph_traversal,
        answer: result.answer,
      };
    } catch (error) {
      console.error("GraphRAG explain error:", error);
      
      // Even in error cases, provide fallback graph traversal
      const session = driver.session();
      try {
        const fallbackGraphTraversal = await this.generateFallbackGraphTraversal(question, session);
        
        return {
          status: "success",
          question,
          reasoning: "Error occurred during processing, providing fallback response.",
          sources: [],
          confidence: 0.3,
          graph_traversal: fallbackGraphTraversal,
          answer: "I found some cybersecurity information that might be relevant to your question.",
        };
      } finally {
        await session.close();
      }
    }
  }
}

export default new Neo4jGraphRAGService(); 
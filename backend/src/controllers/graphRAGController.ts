import type { Context } from "hono";
import { GraphCypherQAChain } from "langchain/chains/graph_qa/cypher";
import { Neo4jGraph } from "langchain/graphs/neo4j_graph";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";


const prompt = PromptTemplate.fromTemplate(`
You are a Neo4j Cypher expert working on a security graph.

The graph contains:
- (Vulnerability {cve_id: string})
- (Severity {level: string})
- Relationship: (Vulnerability)-[:HAS_BASE_SEVERITY]->(Severity)

When the user asks for the severity of a vulnerability, match by 'cve_id'.

Question: {query}
Return only the severity level.
`);

export class GraphRAGController {
  async query(c: Context) {
    try {
      const { question } = await c.req.json();

      if (!question || typeof question !== "string") {
        return c.json(
          { status: "error", message: "Invalid question format" },
          400
        );
      }

      console.log("🧠 Incoming question:", question);

      const graph = await Neo4jGraph.initialize({
        url: process.env.NEO4J_URI!,
        username: process.env.NEO4J_USERNAME!,
        password: process.env.NEO4J_PASSWORD!,
      });

      graph.getSchema = () => `
        NODE Vulnerability {
          cve_id: string
        }
        NODE Severity {
          level: string
        }
        RELATIONSHIP HAS_BASE_SEVERITY FROM Vulnerability TO Severity
      `;

      console.log("📊 Schema being used:\n", await graph.getSchema());
      

      const llm = new ChatOpenAI({
        modelName: "gpt-4",
        openAIApiKey: process.env.OPENAI_API_KEY!,
        temperature: 0.3,
      });

      const prompt = PromptTemplate.fromTemplate(`
You are a Neo4j Cypher expert working on a security graph.
The graph contains:
- Vulnerability nodes with a 'cve_id' property, e.g., "CVE-2025-6089"
- Severity nodes with a 'level' property, e.g., "HIGH", "LOW", etc.
- Relationship: (Vulnerability)-[:HAS_BASE_SEVERITY]->(Severity)

Translate the user query into an accurate Cypher query using the correct property names and relationships.

User question: {query}
`);

     const chain = await GraphCypherQAChain.fromLLM({
  llm,
  graph,
  qaPrompt: prompt,
});


      console.log("🧠 Calling LLM via GraphCypherQAChain with:", question);
      const result = await chain.call({ query: question });

      console.log("📤 LLM Response:", JSON.stringify(result, null, 2));
      console.log("📜 Cypher Generated:", result.intermediateSteps?.[0]?.query ?? "❌ No Cypher generated");

      const answer = result.answer ?? result.text ?? "❌ No answer could be generated.";

      return c.json({
        status: "success",
        answer,
        debug: {
          cypher: result.intermediateSteps?.[0]?.query ?? "❌ No Cypher generated",
          intermediateSteps: result.intermediateSteps ?? [],
        },
        metadata: {
          source: "Neo4j AuraDB",
          timestamp: new Date().toISOString(),
        },
      });

    } catch (err) {
      console.error("❌ GraphRAG error:", err);
      return c.json(
        { status: "error", message: (err as Error).message },
        500
      );
    }
  }
}

import type { Context } from "hono";
import { GraphCypherQAChain } from "langchain/chains/graph_qa/cypher";
import { Neo4jGraph } from "langchain/graphs/neo4j_graph";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import driver from "../config/neo4j"; // make sure this exports neo4j-driver instance

export class GraphRAGController {
  async query(c: Context) {
    try {
      const { question } = await c.req.json();

      if (!question || typeof question !== "string") {
        return c.json({ status: "error", message: "Invalid question format" }, 400);
      }

      // Connect to Neo4j with schema override
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

      // Setup LLM
      const llm = new ChatOpenAI({
        modelName: "gpt-4",
        openAIApiKey: process.env.OPENAI_API_KEY!,
        temperature: 0.2,
      });

      // ✅ SAFE PROMPT — only uses {input}
      const prompt = new PromptTemplate({
        inputVariables: ["input"],
        template: `
You are a Cypher expert working with a Neo4j graph.

The graph includes:
- (Vulnerability {cve_id})
- (Severity {level})
- A relationship: (Vulnerability)-[:HAS_BASE_SEVERITY]->(Severity)

Generate a Cypher query to answer the user's question below.

Question: {input}

Only return the Cypher query.
        `,
      });

      const chain = await GraphCypherQAChain.fromLLM({
        llm,
        graph,
        qaPrompt: prompt,
      });

      // Use only { input } — not cve_id or anything else
      const result = await chain.call({ input: question });

      const cypher = result.intermediateSteps?.[0]?.query;

      if (!cypher) {
        return c.json({
          status: "error",
          message: "❌ No Cypher query could be generated.",
          debug: result,
        });
      }

      // ✅ Execute Cypher manually using Neo4j driver
      const session = driver.session();
      const queryResult = await session.run(cypher);
      const records = queryResult.records.map(r => r.toObject());
      await session.close();

      return c.json({
        status: "success",
        answer: records,
        cypher,
        metadata: {
          source: "Neo4j AuraDB",
          timestamp: new Date().toISOString(),
        },
      });

    } catch (err) {
      console.error("❌ GraphRAG error:", err);
      return c.json({
        status: "error",
        message: (err as Error).message,
      }, 500);
    }
  }
}

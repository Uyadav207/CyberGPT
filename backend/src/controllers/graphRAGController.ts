import type { Context } from "hono";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import driver from "../config/neo4j"; // Make sure you have neo4j-driver exported here

export class GraphRAGController {
  async query(c: Context) {
    try {
      const { question } = await c.req.json();

      if (!question || typeof question !== "string") {
        return c.json({ status: "error", message: "Invalid question format" }, 400);
      }

      // Initialize LLM
      const llm = new ChatOpenAI({
        modelName: "gpt-4",
        openAIApiKey: process.env.OPENAI_API_KEY!,
        temperature: 0,
      });

      // ✅ SAFE Prompt (No {cve_id})
      const prompt = new PromptTemplate({
        inputVariables: ["input"],
        template: `
You are a Cypher query expert working with a Neo4j cybersecurity knowledge graph.

The graph contains:
- Vulnerability nodes with property "cve_id"
- Severity nodes with property "level"
- A relationship: (Vulnerability)-[:HAS_BASE_SEVERITY]->(Severity)

Given the user's question below, generate a Cypher query to retrieve the answer.

Question: {input}

Only return the Cypher query.
        `
      });

      // Format prompt and generate Cypher
      const formattedPrompt = await prompt.format({ input: question });
      const response = await llm.invoke(formattedPrompt);

      const cypher = response?.content?.trim();

      if (!cypher?.toLowerCase().startsWith("match")) {
        return c.json({
          status: "error",
          message: "❌ GPT-4 did not return a valid Cypher query.",
          cypher,
        });
      }

      // Execute the Cypher query manually
      const session = driver.session();
      const result = await session.run(cypher);
      const records = result.records.map((r) => r.toObject());
      await session.close();

      return c.json({
        status: "success",
        cypher,
        answer: records,
        metadata: {
          timestamp: new Date().toISOString(),
          source: "Neo4j AuraDB",
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

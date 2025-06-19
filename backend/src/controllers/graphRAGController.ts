import type { Context } from "hono";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import driver from "../config/neo4j";

export class GraphRAGController {
  async query(c: Context) {
    try {
      const { question } = await c.req.json();

      if (!question || typeof question !== "string") {
        return c.json({ status: "error", message: "Invalid question format" }, 400);
      }

      // Step 1: Initialize LLM
      const llm = new ChatOpenAI({
        modelName: "gpt-4",
        openAIApiKey: process.env.OPENAI_API_KEY!,
        temperature: 0.3,
      });

      // Step 2: Generate Cypher query
      const cypherPrompt = new PromptTemplate({
        inputVariables: ["input"],
        template: `
You are a Cypher query expert working with a Neo4j cybersecurity knowledge graph.

The graph contains:
- Vulnerability nodes with "cve_id"
- Severity nodes with "level"
- Mitigation, Risk, Source nodes
- Relationships: 
    (Vulnerability)-[:HAS_BASE_SEVERITY]->(Severity)
    (Vulnerability)-[:HAS_MITIGATION]->(Mitigation)
    (Vulnerability)-[:CAUSES]->(Risk)
    (Vulnerability)-[:HAS_SOURCE]->(Source)

Given the user question below, generate an appropriate Cypher query.

Question: {input}

Only return the Cypher query.
        `,
      });

      const cypherQuery = await cypherPrompt.format({ input: question });
      const cypherResponse = await llm.invoke(cypherQuery);
      const cypher = cypherResponse?.content?.trim();

      if (!cypher?.toLowerCase().startsWith("match")) {
        return c.json({
          status: "error",
          message: "❌ GPT-4 did not return a valid Cypher query.",
          cypher,
        });
      }

      // Step 3: Run Cypher on Neo4j
      const session = driver.session();
      const result = await session.run(cypher);
      const records = result.records.map((r) => r.toObject());
      const answer = records.map((r) => Object.values(r)[0]);
      await session.close();

      // Step 4: Ask LLM for Explanation, Graph, Sources
     const explanationPrompt = new PromptTemplate({
  inputVariables: ["input", "data"],
  template: `
You're an AI assistant. Based on the following question and its database result, return:

1. 🔍 Reasoning: Explain why this answer is relevant.
2. 📘 Sources: Mention any relevant references or typical cybersecurity sources.
3. 🌐 Graph Traversal: Explain the link: Vulnerability → CVE → Risk → Mitigation.

Format JSON like:
{{
  "title": "...",
  "reasoning": "...",
  "answer": "...",
  "sources": ["..."],
  "graphTraversal": "..."
}}

Question: {input}
Data: {data}
  `
});


      const explanationText = await explanationPrompt.format({
        input: question,
        data: JSON.stringify(answer),
      });

      const finalResponse = await llm.invoke(explanationText);
      const parsed = JSON.parse(finalResponse.content);

      return c.json({
        status: "success",
        answer: {
          title: parsed.title,
          reasoning: parsed.reasoning,
          content: parsed.answer,
          sources: parsed.sources,
          graph: parsed.graphTraversal,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          cypher,
          raw: records,
        },
      });

    } catch (err) {
      console.error("❌ GraphRAG Error:", err);
      return c.json(
        { status: "error", message: (err as Error).message },
        500
      );
    }
  }
}

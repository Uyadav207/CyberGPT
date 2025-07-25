import type { Context } from "hono";
import { ChatService } from "../services/chatService";
import { graphRAGAnswer } from "../utils/neo4j-cve-fetch-ingest";

export class ChatController {
  private chatService!: ChatService;

  constructor() {
    this.init();
  }

  private async init() {
    this.chatService = await ChatService.getInstance();
  }

  async chatTitle(c: Context) {
    try {
      const { botMessage } = await c.req.json();
      const response = await this.chatService.generateTitle(botMessage);
      return c.json({ response });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ status: "error", message: errorMessage }, 500);
    }
  }

  async chatStream(c: Context) {
    try {
      const { message } = await c.req.json();
      // Use graphRAGAnswer for the main chat flow
      const {
        answer,
        reasoningTrace,
        jargons,
        cveDescriptionsMap,
        dynamicTag,
        contextData,
        sourceLinks,
      } = await graphRAGAnswer(message);
      // Ensure trace is always an array with a narrative field if reasoningTrace is a string
      let trace = Array.isArray(reasoningTrace)
        ? reasoningTrace
        : reasoningTrace
          ? [{ narrative: reasoningTrace }]
          : [];
      return c.json({
        answer,
        trace,
        jargons,
        cveDescriptionsMap,
        dynamicTag,
        contextData,
        sourceLinks,
      });
    } catch (error) {
      console.error("Controller error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ status: "error", message: errorMessage }, 500);
    }
  }
  async chatSummary(c: Context) {
    try {
      const { messages } = await c.req.json();
      const stream = await this.chatService.processChatSummary(messages);
      return new Response(
        new ReadableStream({
          async start(controller) {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(new TextEncoder().encode(content));
              }
            }
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ status: "error", message: errorMessage }, 500);
    }
  }

  // Add a new endpoint for chat with jargon extraction
  async chatWithJargon(c: Context) {
    try {
      const body = await c.req.json();
      const { message, agentPersonality, concept, question } = body;
      // Accept both 'message' and 'concept' or 'question' as input
      const mainMessage = message || concept || question;
      if (!mainMessage) {
        return c.json(
          {
            status: "error",
            message: "Expected parameter(s): message, concept, or question",
          },
          400
        );
      }
      const {
        answer,
        reasoningTrace,
        jargons,
        cveDescriptionsMap,
        dynamicTag,
        contextData,
        sourceLinks,
      } = await graphRAGAnswer(mainMessage, agentPersonality);
      // Ensure trace is always an array with a narrative field if reasoningTrace is a string
      let trace = Array.isArray(reasoningTrace)
        ? reasoningTrace
        : reasoningTrace
          ? [{ narrative: reasoningTrace }]
          : [];
      return c.json({
        answer,
        trace,
        jargons,
        cveDescriptionsMap,
        dynamicTag,
        contextData,
        sourceLinks,
      });
    } catch (error) {
      console.error("Controller error:", error, error?.stack);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ status: "error", message: errorMessage }, 500);
    }
  }
}

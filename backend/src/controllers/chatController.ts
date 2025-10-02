import type { Context } from "hono";
import { ChatService } from "../services/chatService";
import { graphRAGAnswer } from "../utils/neo4j-cve-fetch-ingest";
import { ChatGraphIntegrationService } from "../services/chatGraphIntegrationService";
import { getConnectionHealth } from "../config/neo4j";
import { errorHandler } from "../middlewares/errorHandler";

export class ChatController {
  private chatService!: ChatService;
  private chatGraphService = ChatGraphIntegrationService.getInstance();

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

  async chatTitleAndTag(c: Context) {
    try {
      const { botMessage } = await c.req.json();
      const response = await this.chatService.generateTitleAndTag(botMessage);
      return c.json(response);
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
        dynamicTags,
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
        dynamicTags,
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

  // Add a new endpoint for chat with jargon extraction and automatic graph generation
  async chatWithJargon(c: Context) {
    try {
      const body = await c.req.json();
      const {
        message,
        agentPersonality,
        concept,
        question,
        messageId,
        chatId,
      } = body;
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
        dynamicTags,
        contextData,
        sourceLinks,
      } = await graphRAGAnswer(mainMessage, agentPersonality);
      // Ensure trace is always an array with a narrative field if reasoningTrace is a string
      let trace = Array.isArray(reasoningTrace)
        ? reasoningTrace
        : reasoningTrace
          ? [{ narrative: reasoningTrace }]
          : [];

      // Automatically generate graph visualization if messageId and chatId are provided
      let graphData = null;
      console.log("🔍 [ChatController] Checking graph generation conditions:", {
        messageId,
        chatId,
        hasMessageId: !!messageId,
        hasChatId: !!chatId,
        willGenerateGraph: !!(messageId && chatId),
      });
      if (messageId && chatId) {
        try {
          console.log(
            "🔄 [ChatController] Automatically generating graph for message:",
            {
              messageId,
              chatId,
              question: mainMessage.substring(0, 50) + "...",
              hasAnswer: !!answer,
              answerLength: answer.length,
            }
          );

          console.log(
            "🔄 [ChatController] Calling graph generation service with data:",
            {
              messageId,
              chatId,
              questionLength: mainMessage.length,
              answerLength: answer.length,
              hasReasoningTrace: !!trace,
              hasJargons: !!jargons,
              hasCveDescriptionsMap: !!cveDescriptionsMap,
              hasSourceLinks: !!sourceLinks,
              hasContextData: !!contextData,
            }
          );

          const graphResult =
            await this.chatGraphService.processChatMessageWithGraph({
              messageId,
              chatId,
              question: mainMessage,
              answer,
              reasoningTrace: trace,
              jargons,
              cveDescriptionsMap,
              sourceLinks,
              contextData: contextData || undefined,
            });

          if (graphResult.success) {
            graphData = graphResult.graphData;
            console.log("✅ [ChatController] Graph generated successfully:", {
              messageId,
              nodes: graphData.nodes.length,
              links: graphData.links.length,
              mainProblemNode: graphData.nodes.find(
                (n:any) => n.id === "main-problem"
              ),
              problemConnections: graphData.links.filter(
                (l:any) =>
                  l.source === "main-problem" || l.target === "main-problem"
              ).length,
            });
          } else {
            console.error(
              "❌ [ChatController] Graph generation failed:",
              graphResult.error
            );
          }
        } catch (graphError) {
          console.error(
            "❌ [ChatController] Error in automatic graph generation:",
            graphError
          );
          // Don't fail the entire request if graph generation fails
        }
      }

      console.log("📤 [ChatController] Sending response with graph data:", {
        hasAnswer: !!answer,
        hasGraphData: !!graphData,
        graphDataSummary: graphData
          ? {
              nodes: graphData.nodes?.length || 0,
              links: graphData.links?.length || 0,
              hasMainProblem: !!graphData.nodes?.find(
                (n:any) => n.id === "main-problem"
              ),
            }
          : "No graph data",
      });

      return c.json({
        answer,
        trace,
        jargons,
        cveDescriptionsMap,
        dynamicTags,
        contextData,
        sourceLinks,
        graphData, // Include graph data in response if generated
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ status: "error", message: errorMessage }, 500);
    }
  }
}

export const getNeo4jHealth = async (req: Request, res: Response) => {
  try {
    const health = getConnectionHealth;
    return health;
    res.json();
  } catch (error) {
    throw errorHandler;
  }
};

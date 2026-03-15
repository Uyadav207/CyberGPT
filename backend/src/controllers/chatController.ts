import type { Context } from "hono";
import { ChatService } from "../services/chatService";
import { graphRAGAnswer } from "../utils/neo4j-cve-fetch-ingest";
import { ChatGraphIntegrationService } from "../services/chatGraphIntegrationService";
import { getConnectionHealth } from "../config/neo4j";
import { errorHandler } from "../middlewares/errorHandler";
import { dastScanService } from "../services/dastScanService";

export class ChatController {
  private chatService!: ChatService;
  private chatGraphService = ChatGraphIntegrationService.getInstance();

  constructor() {
    this.init();
  }

  private async init() {
    this.chatService = await ChatService.getInstance();
  }

  private detectUrlsInMessage(message: string): string[] {
    const urlRegex =
      /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
    const urls = message.match(urlRegex) || [];

    // Filter and normalize URLs
    return urls
      .map((url) => {
        // Add protocol if missing
        if (!url.startsWith("http")) {
          return "https://" + url;
        }
        return url;
      })
      .filter((url) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });
  }

  /**
   * Guard: only run DAST when the user explicitly asks to scan a URL/URI.
   * Avoids scanning when the user just mentions a URL in passing (e.g. "what is this site?").
   */
  private userExplicitlyRequestsScan(message: string): boolean {
    if (!message || !message.trim()) return false;
    const lower = message.trim().toLowerCase();
    const scanIntentPatterns = [
      "scan ",
      " scan",
      "scan this",
      "scan the",
      "scan that",
      "run a scan",
      "run scan",
      "perform a scan",
      "perform scan",
      "do a scan",
      "security scan",
      "scan for vulnerabilities",
      "scan for security",
      "check this url",
      "check this link",
      "check this site",
      "scan url",
      "scan link",
      "scan site",
      "scan the url",
      "scan the link",
      "scan the site",
      "scan the following",
      "scan:",
      "scanning ",
    ];
    return scanIntentPatterns.some((p) => lower.includes(p));
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

  // New endpoint to fetch graph data after background generation
  async getGraphData(c: Context) {
    try {
      const { messageId, chatId } = await c.req.json();

      if (!messageId || !chatId) {
        return c.json(
          { status: "error", message: "messageId and chatId are required" },
          400
        );
      }

      console.log("🔍 [ChatController] Fetching graph data for:", {
        messageId,
        chatId,
      });

      // Get graph data from the database
      const graphData = await this.chatGraphService.getGraphData(
        messageId,
        chatId
      );

      if (graphData) {
        console.log("✅ [ChatController] Graph data retrieved:", {
          messageId,
          nodes: graphData.nodes?.length || 0,
          links: graphData.links?.length || 0,
        });
        return c.json({
          status: "success",
          graphData,
        });
      } else {
        console.log("⏳ [ChatController] Graph data not ready yet:", {
          messageId,
          chatId,
        });
        return c.json({
          status: "pending",
          message: "Graph generation still in progress",
        });
      }
    } catch (error) {
      console.error("❌ [ChatController] Error fetching graph data:", error);
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
        conversationHistory,
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
      // Check for URLs in the message
      const detectedUrls = this.detectUrlsInMessage(mainMessage);
      let dastScanResults = null;
      let scannedUrl = null;

      // Guard: only run DAST when user explicitly asks to scan (e.g. "scan https://...")
      const explicitScanRequest = this.userExplicitlyRequestsScan(mainMessage);
      if (detectedUrls.length > 0 && !explicitScanRequest) {
        console.log(
          `🔒 [ChatController] URLs detected but no explicit scan request—skipping DAST. Say e.g. "scan <url>" to run a security scan.`
        );
      }

      if (detectedUrls.length > 0 && explicitScanRequest) {
        console.log(
          `🔍 [ChatController] Explicit scan requested. Detected URLs: ${detectedUrls.join(", ")}`
        );

        // Perform DAST scan on the first URL found
        try {
          const firstUrl = detectedUrls[0];
          scannedUrl = firstUrl;
          console.log(
            `🔍 [ChatController] Starting DAST scan for: ${firstUrl}`
          );

          dastScanResults = await dastScanService.scanUrl(firstUrl);

          console.log(
            `✅ [ChatController] DAST scan completed for ${firstUrl}. Risk level: ${dastScanResults.overallRisk}`
          );

          // Insert DAST results into knowledge graph
          await dastScanService.insertDASTResultsIntoKG(dastScanResults);

          // Create enhanced message that includes DAST context (sanitized for Convex)
          const dastContext =
            ` 🔍 **SECURITY SCAN RESULTS FOR ${firstUrl}:** ` +
            `Risk Level: ${dastScanResults.overallRisk} ` +
            `Vulnerabilities Found: ${dastScanResults.vulnerabilities.length} ` +
            `Critical Issues: ${dastScanResults.vulnerabilities.filter((v) => v.severity === "Critical").length} ` +
            `High Priority Issues: ${dastScanResults.vulnerabilities.filter((v) => v.severity === "High").length} ` +
            `Technologies Detected: ${dastScanResults.technologies.join(", ")} ` +
            `Security Headers: ${Object.keys(dastScanResults.securityHeaders).length} headers analyzed ` +
            `Please analyze these security findings using your knowledge graph and provide comprehensive recommendations.`;

          // Use the enhanced message with GraphRAG (which will now query KG + web search)
          const enhancedMessage = mainMessage + dastContext;

          const {
            answer,
            reasoningTrace,
            reasoningMeta,
            jargons,
            cveDescriptionsMap,
            dynamicTags,
            contextData,
            sourceLinks,
          } = await graphRAGAnswer(
            enhancedMessage,
            agentPersonality,
            dastScanResults,
            conversationHistory
          );

          // Ensure trace is always an array with a narrative field if reasoningTrace is a string
          let trace = Array.isArray(reasoningTrace)
            ? reasoningTrace
            : reasoningTrace
              ? [{ narrative: reasoningTrace }]
              : [];

          return c.json({
            answer,
            trace,
            reasoningMeta,
            jargons,
            cveDescriptionsMap,
            dynamicTags,
            contextData,
            sourceLinks,
            graphGenerationStatus: "manual_only",
            dastScanResults,
            scannedUrl: firstUrl,
          });
        } catch (dastError) {
          console.error(
            `❌ [ChatController] DAST scan failed for ${detectedUrls[0]}:`,
            dastError
          );
          // Continue with normal processing if DAST scan fails
        }
      }

      const {
        answer,
        reasoningTrace,
        reasoningMeta,
        jargons,
        cveDescriptionsMap,
        dynamicTags,
        contextData,
        sourceLinks,
      } = await graphRAGAnswer(mainMessage, agentPersonality, undefined, conversationHistory);
      // Ensure trace is always an array with a narrative field if reasoningTrace is a string
      let trace = Array.isArray(reasoningTrace)
        ? reasoningTrace
        : reasoningTrace
          ? [{ narrative: reasoningTrace }]
          : [];

      // Start background graph generation if messageId and chatId are provided
      console.log("🔍 [ChatController] Checking graph generation conditions:", {
        messageId,
        chatId,
        hasMessageId: !!messageId,
        hasChatId: !!chatId,
        willGenerateGraph: !!(messageId && chatId),
      });

      // Graph generation is now handled manually when user clicks graph icon
      // No automatic background generation
      console.log(
        "📝 [ChatController] Graph generation disabled - will be triggered manually via graph icon",
        {
          messageId,
          chatId,
          question: mainMessage.substring(0, 50) + "...",
          hasAnswer: !!answer,
          answerLength: answer.length,
        }
      );

      console.log(
        "📤 [ChatController] Sending immediate response (no background graph generation):",
        {
          hasAnswer: !!answer,
          answerLength: answer.length,
          hasTrace: !!trace,
          hasJargons: !!jargons,
          hasDynamicTags: !!dynamicTags,
          manualGraphGeneration: "Click graph icon to generate",
        }
      );

      return c.json({
        answer,
        trace,
        reasoningMeta,
        jargons,
        cveDescriptionsMap,
        dynamicTags,
        contextData,
        sourceLinks,
        graphGenerationStatus: "manual_only",
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

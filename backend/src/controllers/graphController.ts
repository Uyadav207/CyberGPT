import { Context } from "hono";
import { GraphGenerationService } from "../services/graphGenerationService";
import type {
  GraphGenerationRequest,
  GraphGenerationResponse,
} from "../../types/graphVisualization";

export class GraphController {
  private graphService = GraphGenerationService.getInstance();

  /**
   * Generate graph visualization for a chat message
   */
  async generateGraph(c: Context) {
    try {
      console.log("[GraphController] Generating graph visualization");

      const body: GraphGenerationRequest = await c.req.json();

      // Validate required fields
      if (!body.messageId || !body.chatId || !body.question || !body.answer) {
        return c.json(
          {
            success: false,
            error:
              "Missing required fields: messageId, chatId, question, answer",
          } as GraphGenerationResponse,
          400
        );
      }

      // Generate graph data
      const graphData = await this.graphService.generateGraphFromMessage(
        body.messageId,
        body.chatId,
        body.question,
        body.answer,
        body.reasoning,
        body.sources,
        body.jargons,
        body.cveInfo
      );

      console.log("[GraphController] Graph generated successfully");

      return c.json({
        success: true,
        graphData,
      } as GraphGenerationResponse);
    } catch (error) {
      console.error("[GraphController] Error generating graph:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        } as GraphGenerationResponse,
        500
      );
    }
  }

  /**
   * Get graph visualization by message ID
   */
  async getGraphByMessageId(c: Context) {
    try {
      const { messageId } = c.req.param();

      if (!messageId) {
        return c.json(
          {
            success: false,
            error: "Message ID is required",
          },
          400
        );
      }

      // This would typically query the database for stored graph data
      // For now, we'll return a placeholder response
      return c.json(
        {
          success: false,
          error: "Graph not found for this message",
        },
        404
      );
    } catch (error) {
      console.error("[GraphController] Error getting graph:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
        500
      );
    }
  }

  /**
   * Get all graphs for a chat
   */
  async getGraphsByChatId(c: Context) {
    try {
      const { chatId } = c.req.param();

      if (!chatId) {
        return c.json(
          {
            success: false,
            error: "Chat ID is required",
          },
          400
        );
      }

      // This would typically query the database for all graphs in a chat
      // For now, we'll return a placeholder response
      return c.json({
        success: true,
        graphs: [],
      });
    } catch (error) {
      console.error("[GraphController] Error getting graphs:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
        500
      );
    }
  }
}

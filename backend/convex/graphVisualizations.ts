import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Save graph visualization to chat history
export const saveGraphVisualization = mutation({
  args: {
    messageId: v.string(),
    chatId: v.id("chats"),
    graphVisualization: v.object({
      vulnerabilities: v.optional(
        v.array(
          v.object({
            id: v.string(),
            name: v.string(),
            description: v.optional(v.string()),
            severity: v.optional(v.string()),
            cvss: v.optional(v.number()),
            cveIds: v.optional(v.array(v.string())),
            affectedSystems: v.optional(v.array(v.string())),
            attackVectors: v.optional(v.array(v.string())),
            references: v.optional(v.array(v.string())),
          })
        )
      ),
      mitigations: v.optional(
        v.array(
          v.object({
            id: v.string(),
            name: v.string(),
            description: v.optional(v.string()),
            type: v.optional(v.string()),
            effectiveness: v.optional(v.number()),
            implementation: v.optional(v.string()),
            cost: v.optional(v.string()),
            references: v.optional(v.array(v.string())),
          })
        )
      ),
      sources: v.optional(
        v.array(
          v.object({
            id: v.string(),
            name: v.string(),
            type: v.optional(v.string()),
            url: v.optional(v.string()),
            reliability: v.optional(v.number()),
            lastUpdated: v.optional(v.number()),
            description: v.optional(v.string()),
          })
        )
      ),
      cves: v.optional(
        v.array(
          v.object({
            id: v.string(),
            cveId: v.string(),
            description: v.optional(v.string()),
            severity: v.optional(v.string()),
            cvss: v.optional(v.number()),
            publishedDate: v.optional(v.number()),
            affectedProducts: v.optional(v.array(v.string())),
            references: v.optional(v.array(v.string())),
            patches: v.optional(v.array(v.string())),
          })
        )
      ),
      problems: v.optional(
        v.array(
          v.object({
            id: v.string(),
            name: v.string(),
            description: v.optional(v.string()),
            category: v.optional(v.string()),
            impact: v.optional(v.string()),
            priority: v.optional(v.string()),
            affectedComponents: v.optional(v.array(v.string())),
          })
        )
      ),
      affected: v.optional(
        v.array(
          v.object({
            id: v.string(),
            name: v.string(),
            type: v.optional(v.string()),
            description: v.optional(v.string()),
            impact: v.optional(v.string()),
            systems: v.optional(v.array(v.string())),
            users: v.optional(v.array(v.string())),
          })
        )
      ),
      risks: v.optional(
        v.array(
          v.object({
            id: v.string(),
            name: v.string(),
            level: v.optional(v.string()),
            probability: v.optional(v.number()),
            impact: v.optional(v.string()),
            description: v.optional(v.string()),
            mitigation: v.optional(v.string()),
            monitoring: v.optional(v.string()),
          })
        )
      ),
      relationships: v.optional(
        v.array(
          v.object({
            id: v.string(),
            sourceId: v.string(),
            targetId: v.string(),
            type: v.string(),
            strength: v.optional(v.number()),
            description: v.optional(v.string()),
            evidence: v.optional(v.string()),
            confidence: v.optional(v.number()),
          })
        )
      ),
    }),
  },
  handler: async (ctx, { messageId, chatId, graphVisualization }) => {
    // Find the chat history entry by messageId
    const chatHistoryEntry = await ctx.db
      .query("chatHistory")
      .withIndex("by_chatId", (q) => q.eq("chatId", chatId))
      .filter((q) => q.eq(q.field("humanInTheLoopId"), messageId))
      .first();

    if (chatHistoryEntry) {
      // Update existing chat history entry with graph visualization
      const result = await ctx.db.patch(chatHistoryEntry._id, {
        graphVisualization,
      });
      return { success: true, updated: true, messageId: chatHistoryEntry._id };
    } else {
      return { success: false, error: "Chat history entry not found" };
    }
  },
});

// Get graph visualization by message ID
export const getGraphByMessageId = query({
  args: { messageId: v.string(), chatId: v.id("chats") },
  handler: async (ctx, { messageId, chatId }) => {
    const chatHistoryEntry = await ctx.db
      .query("chatHistory")
      .withIndex("by_chatId", (q) => q.eq("chatId", chatId))
      .filter((q) => q.eq(q.field("humanInTheLoopId"), messageId))
      .first();

    return chatHistoryEntry?.graphVisualization || null;
  },
});

// Get all graphs for a chat
export const getGraphsByChatId = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    const chatHistoryEntries = await ctx.db
      .query("chatHistory")
      .withIndex("by_chatId", (q) => q.eq("chatId", chatId))
      .filter((q) => q.neq(q.field("graphVisualization"), undefined))
      .order("desc")
      .collect();

    return chatHistoryEntries.map((entry) => ({
      messageId: entry.humanInTheLoopId,
      graphVisualization: entry.graphVisualization,
      createdAt: entry.createdAt,
    }));
  },
});

// Get recent graphs
export const getRecentGraphs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const chatHistoryEntries = await ctx.db
      .query("chatHistory")
      .filter((q) => q.neq(q.field("graphVisualization"), undefined))
      .order("desc")
      .take(limit);

    return chatHistoryEntries.map((entry) => ({
      messageId: entry.humanInTheLoopId,
      chatId: entry.chatId,
      graphVisualization: entry.graphVisualization,
      createdAt: entry.createdAt,
    }));
  },
});

// Delete graph visualization by message ID
export const deleteGraphByMessageId = mutation({
  args: { messageId: v.string(), chatId: v.id("chats") },
  handler: async (ctx, { messageId, chatId }) => {
    const chatHistoryEntry = await ctx.db
      .query("chatHistory")
      .withIndex("by_chatId", (q) => q.eq("chatId", chatId))
      .filter((q) => q.eq(q.field("humanInTheLoopId"), messageId))
      .first();

    if (chatHistoryEntry) {
      await ctx.db.patch(chatHistoryEntry._id, {
        graphVisualization: undefined,
      });
      return { success: true, deleted: true };
    }

    return { success: false, deleted: false, error: "Graph not found" };
  },
});

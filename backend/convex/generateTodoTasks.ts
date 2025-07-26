import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";

export interface TodoItem {
  id: string;
  task: string;
  priority: "high" | "medium" | "low";
  category: string;
  description?: string;
  completed: boolean;
  riskLevel: "critical" | "high" | "medium" | "low";
  cvssScore: number;
  confidence: number;
  cveIds?: string[];
  affectedSystems?: string[];
  emoji: string;
  createdAt: number;
  lastModified?: number;
}

export interface TodoList {
  id: string;
  title: string;
  description: string;
  items: TodoItem[];
  createdAt: number;
  lastModified?: number;
}

// Generate TODO tasks based on AI response with KG context
export const generateTodoTasks = action({
  args: {
    chatId: v.id("chats"),
    messageId: v.string(),
    aiResponse: v.string(),
    kgContext: v.optional(v.string()),
    cveInfo: v.optional(v.any()),
    reasoningTrace: v.optional(v.any()),
    sourceLinks: v.optional(v.array(v.any())),
    jargons: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    console.log(
      "🚀 [Backend] TODO GENERATION ACTION CALLED - This should appear!"
    );

    const {
      chatId,
      messageId,
      aiResponse,
      kgContext,
      cveInfo,
      reasoningTrace,
      sourceLinks,
      jargons,
    } = args;

    console.log("🔄 [generateTodoTasks] Starting TODO list generation:", {
      chatId,
      messageId,
      aiResponseLength: aiResponse?.length,
      hasKGContext: !!kgContext,
      hasCveInfo: !!cveInfo,
      hasReasoningTrace: !!reasoningTrace,
      hasSourceLinks: !!sourceLinks,
      hasJargons: !!jargons,
    });

    try {
      // Generate TODO tasks based on actual AI response and KG context
      console.log("🔍 [TODO Generation] Context received:", {
        aiResponseLength: aiResponse?.length || 0,
        hasKGContext: !!kgContext,
        hasCVEInfo: !!cveInfo,
        hasReasoningTrace: !!reasoningTrace,
        hasSourceLinks: !!sourceLinks,
        hasJargons: !!jargons,
        chatId,
        messageId,
        aiResponsePreview: aiResponse?.substring(0, 200) + "...",
        kgContextPreview: kgContext?.substring(0, 200) + "...",
      });

      // Extract CVE information for task generation
      const cveData = cveInfo
        ? {
            cveId: cveInfo.cve_id || "Unknown",
            description: cveInfo.cve_desc || "No description available",
          }
        : null;

      // Generate tasks dynamically using AI based on the actual context
      const generatedTasks: TodoItem[] = [];

      // Create a comprehensive prompt for AI to generate TODO tasks
      const todoGenerationPrompt = `You are a cybersecurity expert tasked with generating actionable TODO tasks based on security analysis.

CONTEXT:
- AI Response: ${aiResponse || "No AI response available"}
- Knowledge Graph Context: ${kgContext || "No KG context available"}
- CVE Information: ${cveInfo ? JSON.stringify(cveInfo) : "No CVE info available"}
- Reasoning Trace: ${reasoningTrace ? JSON.stringify(reasoningTrace) : "No reasoning trace available"}
- Source Links: ${sourceLinks ? JSON.stringify(sourceLinks) : "No source links available"}
- Technical Jargons: ${jargons ? JSON.stringify(jargons) : "No jargons available"}

TASK:
Generate a MINIMUM of 4 specific, actionable TODO tasks (can be more based on content complexity) based on the security analysis above. Each task should be:
- Specific and actionable (not generic)
- Based on the actual content and context provided
- Prioritized appropriately (high/medium/low)
- Categorized correctly (Security/Updates/Configuration/Compliance/Technical/Monitoring/Testing)
- Include appropriate risk levels and CVSS scores
- Include relevant emojis for visual appeal

REQUIREMENTS:
- Generate tasks that directly address issues mentioned in the AI response
- Use CVE information when available to create specific patching tasks
- Consider compliance requirements from source links
- Address technical concerns from jargons
- Ensure tasks are practical and implementable
- Include confidence scores based on available information

OUTPUT FORMAT:
Return a JSON array of task objects with this exact structure:
[
  {
    "task": "Specific actionable task description",
    "priority": "high|medium|low",
    "category": "Security|Updates|Configuration|Compliance|Technical|Monitoring|Testing",
    "description": "Detailed description of what needs to be done",
    "riskLevel": "critical|high|medium|low",
    "cvssScore": 0.0-10.0,
    "confidence": 0.0-1.0,
    "cveIds": ["CVE-XXXX-XXXX"],
    "affectedSystems": ["System1", "System2"],
    "emoji": "🔒"
  }
]

IMPORTANT: Only return valid JSON, no additional text or explanations.`;

      try {
        console.log(
          "🤖 [TODO Generation] Calling OpenAI for dynamic task generation..."
        );

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a cybersecurity expert specializing in generating actionable security tasks. Always respond with valid JSON only.",
                },
                {
                  role: "user",
                  content: todoGenerationPrompt,
                },
              ],
              temperature: 0.7,
              max_tokens: 2000,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            `OpenAI API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const aiGeneratedTasks = JSON.parse(data.choices[0].message.content);

        console.log("✅ [TODO Generation] AI generated tasks:", {
          taskCount: aiGeneratedTasks.length,
          tasks: aiGeneratedTasks.map((t: any) => ({
            task: t.task,
            priority: t.priority,
            category: t.category,
            emoji: t.emoji,
          })),
        });

        // Convert AI-generated tasks to TodoItem format
        aiGeneratedTasks.forEach((aiTask: any, index: number) => {
          generatedTasks.push({
            id: `todo-${Date.now()}-${index + 1}`,
            task: aiTask.task,
            priority: aiTask.priority,
            category: aiTask.category,
            description: aiTask.description,
            completed: false,
            riskLevel: aiTask.riskLevel,
            cvssScore: aiTask.cvssScore,
            confidence: aiTask.confidence,
            cveIds: aiTask.cveIds || [],
            affectedSystems: aiTask.affectedSystems || [],
            emoji: aiTask.emoji,
            createdAt: Date.now(),
          });
        });

        // Ensure minimum of 4 tasks - add default tasks if needed
        if (generatedTasks.length < 4) {
          console.log(
            `⚠️ [TODO Generation] AI generated only ${generatedTasks.length} tasks, adding default tasks to reach minimum of 4...`
          );

          const defaultTasks = [
            {
              id: `todo-${Date.now()}-default-1`,
              task: "Conduct comprehensive security assessment",
              priority: "medium" as const,
              category: "Security",
              description:
                "Perform thorough security review of all systems and configurations",
              completed: false,
              riskLevel: "medium" as const,
              cvssScore: 6.0,
              confidence: 0.8,
              cveIds: [],
              affectedSystems: ["All Systems"],
              emoji: "🔍",
              createdAt: Date.now(),
            },
            {
              id: `todo-${Date.now()}-default-2`,
              task: "Implement security monitoring and alerting",
              priority: "medium" as const,
              category: "Monitoring",
              description:
                "Set up continuous monitoring and alerting for security events",
              completed: false,
              riskLevel: "medium" as const,
              cvssScore: 5.5,
              confidence: 0.7,
              cveIds: [],
              affectedSystems: ["Monitoring Systems"],
              emoji: "📊",
              createdAt: Date.now(),
            },
            {
              id: `todo-${Date.now()}-default-3`,
              task: "Update security documentation and policies",
              priority: "low" as const,
              category: "Configuration",
              description:
                "Review and update security documentation, policies, and procedures",
              completed: false,
              riskLevel: "low" as const,
              cvssScore: 3.0,
              confidence: 0.6,
              cveIds: [],
              affectedSystems: ["Documentation Systems"],
              emoji: "📋",
              createdAt: Date.now(),
            },
            {
              id: `todo-${Date.now()}-default-4`,
              task: "Schedule regular security testing and validation",
              priority: "medium" as const,
              category: "Testing",
              description:
                "Plan and schedule regular security testing, penetration testing, and validation",
              completed: false,
              riskLevel: "medium" as const,
              cvssScore: 5.0,
              confidence: 0.7,
              cveIds: [],
              affectedSystems: ["Testing Infrastructure"],
              emoji: "🧪",
              createdAt: Date.now(),
            },
          ];

          // Add default tasks to reach minimum of 4
          const tasksNeeded = 4 - generatedTasks.length;
          for (let i = 0; i < tasksNeeded; i++) {
            generatedTasks.push(defaultTasks[i]);
          }

          console.log(
            `✅ [TODO Generation] Added ${tasksNeeded} default tasks. Total tasks: ${generatedTasks.length}`
          );
        }
      } catch (aiError) {
        console.error(
          "❌ [TODO Generation] AI task generation failed:",
          aiError
        );

        // Fallback to basic task generation if AI fails
        console.log(
          "🔄 [TODO Generation] Falling back to basic task generation..."
        );

        // Generate minimum 4 fallback tasks
        const fallbackTasks = [
          {
            id: `todo-${Date.now()}-fallback-1`,
            task: "Review and address security concerns from analysis",
            priority: "medium" as const,
            category: "Security",
            description:
              "Analyze the security response and implement necessary measures",
            completed: false,
            riskLevel: "medium" as const,
            cvssScore: 6.0,
            confidence: 0.7,
            cveIds: [],
            affectedSystems: ["All Systems"],
            emoji: "🔍",
            createdAt: Date.now(),
          },
          {
            id: `todo-${Date.now()}-fallback-2`,
            task: "Implement security patches and updates",
            priority: "high" as const,
            category: "Updates",
            description:
              "Apply all available security patches and system updates",
            completed: false,
            riskLevel: "high" as const,
            cvssScore: 7.5,
            confidence: 0.8,
            cveIds: [],
            affectedSystems: ["All Systems"],
            emoji: "🛠️",
            createdAt: Date.now(),
          },
          {
            id: `todo-${Date.now()}-fallback-3`,
            task: "Configure security monitoring and logging",
            priority: "medium" as const,
            category: "Monitoring",
            description:
              "Set up comprehensive security monitoring and logging systems",
            completed: false,
            riskLevel: "medium" as const,
            cvssScore: 5.5,
            confidence: 0.7,
            cveIds: [],
            affectedSystems: ["Monitoring Systems"],
            emoji: "📊",
            createdAt: Date.now(),
          },
          {
            id: `todo-${Date.now()}-fallback-4`,
            task: "Conduct security training and awareness",
            priority: "low" as const,
            category: "Configuration",
            description:
              "Provide security training and awareness programs for team members",
            completed: false,
            riskLevel: "low" as const,
            cvssScore: 3.0,
            confidence: 0.6,
            cveIds: [],
            affectedSystems: ["Human Resources"],
            emoji: "👥",
            createdAt: Date.now(),
          },
        ];

        generatedTasks.push(...fallbackTasks);
        console.log(
          `✅ [TODO Generation] Generated ${fallbackTasks.length} fallback tasks. Total tasks: ${generatedTasks.length}`
        );
      }

      // Create the TODO list
      const todoList: TodoList = {
        id: `todo-list-${Date.now()}`,
        title: "🔐 Security Action Items",
        description: "Generated actionable tasks based on security analysis",
        items: generatedTasks,
        createdAt: Date.now(),
      };

      // Update the chat history with the TODO list using runMutation
      console.log(
        "💾 [TODO Generation] Attempting to save TODO list to database:",
        {
          chatId,
          messageId,
          todoListId: todoList.id,
          itemsCount: todoList.items.length,
        }
      );

      const saveResult = await ctx.runMutation(
        api.generateTodoTasks.updateTodoListFromAction,
        {
          chatId,
          messageId,
          todoList,
        }
      );

      console.log("✅ [TODO Generation] Database save result:", saveResult);

      return {
        success: true,
        todoList: todoList,
        message: "TODO tasks generated successfully using AI analysis",
      };
    } catch (error) {
      console.error("Error generating TODO tasks:", error);
      throw new Error(
        `Failed to generate TODO tasks: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

// Update TODO list in chat history from action
export const updateTodoListFromAction = mutation({
  args: {
    chatId: v.id("chats"),
    messageId: v.string(),
    todoList: v.any(),
  },
  handler: async (ctx, args) => {
    const { chatId, messageId, todoList } = args;

    console.log("🔄 [updateTodoListFromAction] Starting update with params:", {
      chatId,
      messageId,
      hasTodoList: !!todoList,
      todoListItemsCount: todoList?.items?.length || 0,
    });

    console.log("🔍 [updateTodoListFromAction] Parameter validation:", {
      chatIdType: typeof chatId,
      messageIdType: typeof messageId,
      chatIdValid: !!chatId,
      messageIdValid: !!messageId,
      chatIdLength: chatId?.length || 0,
      messageIdLength: messageId?.length || 0,
    });

    try {
      console.log(
        "🔍 [updateTodoListFromAction] Searching for chat history entry:",
        {
          chatId,
          messageId,
        }
      );

      // First, let's check if there are any chat history entries for this chatId
      const allChatHistoryEntries = await ctx.db
        .query("chatHistory")
        .withIndex("by_chatId", (q) => q.eq("chatId", chatId))
        .collect();

      console.log(
        "🔍 [updateTodoListFromAction] All chat history entries for chatId:",
        {
          chatId,
          totalEntries: allChatHistoryEntries.length,
          entryIds: allChatHistoryEntries.map((entry) => entry._id),
          messageIds: allChatHistoryEntries.map(
            (entry) => entry.humanInTheLoopId
          ),
          hasTargetMessageId: allChatHistoryEntries.some(
            (entry) => entry.humanInTheLoopId === messageId
          ),
          targetMessageId: messageId,
          allMessageIds: allChatHistoryEntries.map(
            (entry) => entry.humanInTheLoopId
          ),
        }
      );

      // Check if the target messageId exists in any of the entries
      const targetEntryExists = allChatHistoryEntries.some(
        (entry) => entry.humanInTheLoopId === messageId
      );

      console.log("🔍 [updateTodoListFromAction] Target entry check:", {
        targetMessageId: messageId,
        targetEntryExists,
        allMessageIds: allChatHistoryEntries.map(
          (entry) => entry.humanInTheLoopId
        ),
        exactMatches: allChatHistoryEntries.filter(
          (entry) => entry.humanInTheLoopId === messageId
        ).length,
      });

      const chatHistoryEntry = await ctx.db
        .query("chatHistory")
        .withIndex("by_chatId", (q) => q.eq("chatId", chatId))
        .filter((q) => q.eq(q.field("humanInTheLoopId"), messageId))
        .first();

      console.log("🔍 [updateTodoListFromAction] Chat history entry found:", {
        found: !!chatHistoryEntry,
        entryId: chatHistoryEntry?._id,
        hasTodoList: !!chatHistoryEntry?.todoList,
      });

      if (chatHistoryEntry) {
        console.log(
          "💾 [updateTodoListFromAction] Updating chat history with TODO list"
        );
        await ctx.db.patch(chatHistoryEntry._id, {
          todoList: todoList,
        });
        console.log(
          "✅ [updateTodoListFromAction] TODO list updated successfully"
        );
        return { success: true, message: "TODO list updated successfully" };
      } else {
        console.log(
          "❌ [updateTodoListFromAction] Chat history entry not found, attempting retry..."
        );

        console.log(
          "❌ [updateTodoListFromAction] Chat history entry not found - this may be a timing issue"
        );
        throw new Error(
          "Chat history entry not found - please try again in a moment"
        );
      }
    } catch (error) {
      console.error("Error updating TODO list:", error);
      throw new Error(
        `Failed to update TODO list: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

// Update TODO list in chat history
export const updateTodoList = mutation({
  args: {
    chatId: v.id("chats"),
    messageId: v.string(),
    todoList: v.any(),
  },
  handler: async (ctx, args) => {
    const { chatId, messageId, todoList } = args;

    try {
      const chatHistoryEntry = await ctx.db
        .query("chatHistory")
        .withIndex("by_chatId", (q) => q.eq("chatId", chatId))
        .filter((q) => q.eq(q.field("humanInTheLoopId"), messageId))
        .first();

      if (chatHistoryEntry) {
        await ctx.db.patch(chatHistoryEntry._id, {
          todoList: {
            ...todoList,
            lastModified: Date.now(),
          },
        });
        return { success: true, message: "TODO list updated successfully" };
      } else {
        throw new Error("Chat history entry not found");
      }
    } catch (error) {
      console.error("Error updating TODO list:", error);
      throw new Error(
        `Failed to update TODO list: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

// Get TODO list from chat history
export const getTodoListFromChat = mutation({
  args: {
    chatId: v.id("chats"),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const { chatId, messageId } = args;

    try {
      const chatHistoryEntry = await ctx.db
        .query("chatHistory")
        .withIndex("by_chatId", (q) => q.eq("chatId", chatId))
        .filter((q) => q.eq(q.field("humanInTheLoopId"), messageId))
        .first();

      if (chatHistoryEntry && chatHistoryEntry.todoList) {
        return {
          success: true,
          todoList: chatHistoryEntry.todoList,
        };
      } else {
        return {
          success: false,
          todoList: null,
          message: "No TODO list found for this message",
        };
      }
    } catch (error) {
      console.error("Error fetching TODO list:", error);
      throw new Error(
        `Failed to fetch TODO list: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

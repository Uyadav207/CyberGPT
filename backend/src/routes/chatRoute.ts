import { Hono } from "hono";
import { ScanController } from "../controllers/scanController";
import { healthCheckHandler } from "../controllers/ragController";
import { ChatController } from "../controllers/chatController";
import { generateRelatedQuestions } from "../utils/neo4j-cve-fetch-ingest";

const chatRoutes = new Hono();
const chatController = new ChatController(); // Not needed for /message/stream
const scanController = new ScanController();

chatRoutes.post("/title", (c) => chatController.chatTitle(c)); // Leave other endpoints as is
// Old /message/stream route removed - now using /with-jargon
chatRoutes.get("/health", healthCheckHandler);
chatRoutes.post("/scan/summary", (c) => scanController.chatStream(c));
chatRoutes.post("/detailed/summary", (c) => scanController.detailedSummary(c));
chatRoutes.post("/chat-summary", (c) => chatController.chatSummary(c));
chatRoutes.post("/sast-scan/summary", (c) => scanController.chatSastStream(c));
chatRoutes.post("/detailed/sast-summary", (c) =>
  scanController.detailedSastSummary(c)
);
chatRoutes.post("/with-jargon", (c) => chatController.chatWithJargon(c));

// Generate contextual related questions
chatRoutes.post("/related-questions", async (c) => {
  try {
    const body = await c.req.json();
    const { userQuestion, aiAnswer, kgContext, previousQuestions } = body;

    if (!userQuestion || !aiAnswer) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const questions = await generateRelatedQuestions(
      userQuestion,
      aiAnswer,
      kgContext || "",
      previousQuestions || []
    );

    return c.json({ questions });
  } catch (error) {
    console.error("Error generating related questions:", error);
    return c.json({ error: "Failed to generate related questions" }, 500);
  }
});

export { chatRoutes };

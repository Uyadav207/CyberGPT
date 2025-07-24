import { Hono } from "hono";
import { ScanController } from "../controllers/scanController";
import { healthCheckHandler } from "../controllers/ragController";
import { ChatController } from "../controllers/chatController";

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
export { chatRoutes };

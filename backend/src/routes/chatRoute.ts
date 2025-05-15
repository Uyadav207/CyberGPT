import { Hono } from "hono";
import { ChatController } from "../controllers/chatController";
import { ScanController } from "../controllers/scanController";

const chatRoutes = new Hono();
const chatController = new ChatController();
const scanController = new ScanController();

chatRoutes.post("/title", (c) => chatController.chatTitle(c));
chatRoutes.post("/message/stream", (c) => chatController.chatStream(c));
chatRoutes.post("/scan/summary", (c) => scanController.chatStream(c));
chatRoutes.post("/detailed/summary", (c) => scanController.detailedSummary(c));
chatRoutes.post("/chat-summary", (c) => chatController.chatSummary(c));
chatRoutes.post("/sast-scan/summary", (c) => scanController.chatSastStream(c));
chatRoutes.post("/detailed/sast-summary", (c) =>
	scanController.detailedSastSummary(c),
);
export { chatRoutes };

import { Hono } from "hono";
import { GraphController } from "../controllers/graphController";

const graphController = new GraphController();

const graphRoutes = new Hono();

// Generate graph visualization for a chat message
graphRoutes.post("/generate", async (c) => {
  return graphController.generateGraph(c);
});

// Get graph by message ID
graphRoutes.get("/message/:messageId", async (c) => {
  return graphController.getGraphByMessageId(c);
});

// Get all graphs for a chat
graphRoutes.get("/chat/:chatId", async (c) => {
  return graphController.getGraphsByChatId(c);
});

export default graphRoutes;

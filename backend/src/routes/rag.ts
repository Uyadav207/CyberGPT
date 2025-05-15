import { Hono } from "hono";
import { RAGController } from "../controllers/ragController";

const ragRoutes = new Hono();
const controller = new RAGController();

ragRoutes.post("/load-documents", (c) => controller.loadDocuments(c));
ragRoutes.post("/query", (c) => controller.query(c));
ragRoutes.get("/latest-cves", (c) => controller.getDocuments(c));

export { ragRoutes };

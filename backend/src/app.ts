import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { errorHandler } from "./middlewares/errorHandler";

import { authRoutes } from "./routes/authRoutes";
import { userRoutes } from "./routes/userRoutes";
import { reportRoutes } from "./routes/reportRoutes";
import { zapRoutes } from "./routes/zapRoutes";
import { chatRoutes } from "./routes/chatRoute";
import { ragRoutes } from "./routes/rag";
import { paymentRoutes } from "./routes/paymentRoutes";
import graphRoutes from "./routes/graphRoutes";

const app = new Hono();

app.use("*", cors());

//logger.info
app.use("*", logger());

// Middlewares
app.use("*", errorHandler);

// Routes
app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/chat", chatRoutes);
app.route("/api", ragRoutes);
app.route("/api/chat", chatRoutes); // Add this for /api/chat/with-jargon
app.route("/reports", reportRoutes);
app.route("/zap", zapRoutes);
app.route("/reports", reportRoutes);
app.route("/subscription", paymentRoutes);
app.route("/graph", graphRoutes);

export default app;

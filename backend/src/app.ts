import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { errorHandler } from "./middlewares/errorHandler";
import { driver } from "./config/neo4j";

import { authRoutes } from "./routes/authRoutes";
import { userRoutes } from "./routes/userRoutes";
import { reportRoutes } from "./routes/reportRoutes";
import { zapRoutes } from "./routes/zapRoutes";
import { chatRoutes } from "./routes/chatRoute";
import { ragRoutes } from "./routes/rag";
import { paymentRoutes } from "./routes/paymentRoutes";
import graphRoutes from "./routes/graphRoutes";

const app = new Hono();

// CORS: must come first
const allowedOrigins = [
  "https://appcybergpt.vercel.app",
  "https://cybergpt-sable.vercel.app"
];

app.use("*", cors({
  origin: (origin) => {
    if (!origin) return "*";
    if (process.env.NODE_ENV === "production") {
      return allowedOrigins.includes(origin) ? origin : "";
    }
    return "*";
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400
}));

// Required by Vercel — handle OPTIONS first
app.options("*", (c) => {
  return c.text("", 200);
});

// Logging
app.use("*", logger());

// Safe error handler that skips OPTIONS
app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return c.text("", 200);
  try {
    return await next();
  } catch (err) {
    return errorHandler(c, () => Promise.resolve(c), err);
  }
});

// Routes
app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/chat", chatRoutes);
app.route("/api", ragRoutes);
app.route("/api/chat", chatRoutes);
app.route("/reports", reportRoutes);
app.route("/zap", zapRoutes);
app.route("/subscription", paymentRoutes);
app.route("/graph", graphRoutes);

// Health check
app.get("/health", async (c) => {
  try {
    await driver.verifyConnectivity();
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        neo4j: "connected"
      }
    });
  } catch (error) {
    return c.json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error"
    }, 503);
  }
});

export default app;

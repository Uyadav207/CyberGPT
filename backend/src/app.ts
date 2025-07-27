import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
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

// 🌍 Define allowed origins
const allowedOrigins = [
  "https://appcybergpt.vercel.app",
  "https://cybergpt-sable.vercel.app"
];

// 🔐 CORS Middleware
app.use("*", cors({
  origin: (origin) => {
    if (!origin) return "*";
    if (process.env.NODE_ENV === "production") {
      if (allowedOrigins.includes(origin)) return origin;
      console.warn(`🚫 Blocked CORS origin: ${origin}`);
      return ""; // Explicitly deny
    }
    return "*";
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400,
}));

// ⚠️ OPTIONS preflight route must return 200 OK
app.options("*", (c) => c.text("", 200));

// 📝 Logger for all requests
app.use("*", logger());

// 🛡️ Safe error handler that skips OPTIONS
app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return c.text("", 200);
  try {
    return await next();
  } catch (err) {
    // Reuse your structured errorHandler here
    if (err instanceof Error) {
      return c.json(
        {
          error: {
            message: err.message,
            stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
          },
        },
        500
      );
    }

    return c.json(
      {
        error: {
          message: "An unexpected error occurred",
          stack: process.env.NODE_ENV === "production" ? "🥞" : "Unknown stack",
        },
      },
      500
    );
  }
});

// ✅ Define Routes
app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/chat", chatRoutes);
app.route("/api", ragRoutes);
app.route("/api/chat", chatRoutes); // Special route for /api/chat/with-jargon
app.route("/reports", reportRoutes);
app.route("/zap", zapRoutes);
app.route("/subscription", paymentRoutes);
app.route("/graph", graphRoutes);

// 🧪 Health Check
app.get("/health", async (c) => {
  try {
    await driver.verifyConnectivity();
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        neo4j: "connected",
      },
    });
  } catch (error) {
    console.error("❌ Health check failed:", error);
    return c.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        neo4j: "disconnected",
      },
      error: error instanceof Error ? error.message : "Unknown error",
    }, 503);
  }
});

export default app;

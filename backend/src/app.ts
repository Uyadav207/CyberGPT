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

// Set CORS origin based on environment
const corsOrigin = process.env.NODE_ENV === "production" 
  ? ["https://appcybergpt.vercel.app", "https://cybergpt-sable.vercel.app"] 
  : "*";

console.log("🔧 CORS Configuration:", {
  NODE_ENV: process.env.NODE_ENV,
  corsOrigin: corsOrigin
});

// CORS middleware with proper preflight handling
app.use('*', cors({
  origin: (origin) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return "*";
    
    if (process.env.NODE_ENV === "production") {
      return ["https://appcybergpt.vercel.app", "https://cybergpt-sable.vercel.app"].includes(origin) ? origin : null;
    }
    return "*";
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
}))

// 🛠️ Proper OPTIONS handler for CORS preflight requests
app.options("*", (c) => {
  return c.text("", 200);
});

// 📝 Logging all requests for better observability!
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

// Health check endpoint
app.get("/health", async (c) => {
  try {
    // Test Neo4j connection
    await driver.verifyConnectivity();
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        neo4j: "connected"
      }
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return c.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        neo4j: "disconnected"
      },
      error: error instanceof Error ? error.message : "Unknown error"
    }, 503);
  }
});

export default app;

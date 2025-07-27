import app from "./app";

// Export for Vercel serverless
export default app;

const port = process.env.PORT || 8001;

// Local development
if (!process.env.VERCEL) {
  Bun.serve({
    port,
    fetch: app.fetch,
  });
  
  console.log(`🚀 Server running on port ${port}`);
}

import app from "../app";

// Add OPTIONS handler for CORS preflight
app.options("*", (c) => {
  return c.text("", 200);
});

// Export the handler for Vercel serverless deployment
export default app.fetch;

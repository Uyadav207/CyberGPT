import app from "../app";
// Export the handler for Vercel serverless deployment

export const config = {
    runtime: 'edge',
  }
export default app.fetch;

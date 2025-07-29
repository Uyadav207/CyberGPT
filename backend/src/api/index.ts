import { handle } from 'hono/vercel'
import app from "../app";

// Export the handler for Vercel serverless deployment
export default handle(app)
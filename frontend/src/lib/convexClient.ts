import { ConvexReactClient } from "convex/react";

// const convex = new ConvexReactClient(
// 	"https://affable-corgi-824.convex.cloud" as string,
// );

console.log("[ConvexClient] Environment variables:", {
  VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
});

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
console.log("[ConvexClient] Using Convex URL:", convexUrl);

if (!convexUrl) {
  console.error("[ConvexClient] VITE_CONVEX_URL is not set!");
  throw new Error("VITE_CONVEX_URL environment variable is required");
}

const convex = new ConvexReactClient(convexUrl);
console.log("[ConvexClient] ConvexReactClient created successfully");

export default convex;

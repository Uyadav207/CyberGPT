import { ConvexReactClient } from "convex/react";

// const convex = new ConvexReactClient(
// 	"https://affable-corgi-824.convex.cloud" as string,
// );
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export default convex;

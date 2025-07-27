import app from "./app";

Bun.serve({
	port: process.env.PORT || 8001,
	fetch: app.fetch,
});

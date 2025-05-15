import Redis from "ioredis";

const isProduction = process.env.NODE_ENV === "production";

const redis = isProduction
	? new Redis(process.env.REDIS_URL || "")
	: new Redis({
			host: process.env.REDIS_HOST_LOCAL || "127.0.0.1",
			port: Number.parseInt(process.env.REDIS_PORT_LOCAL || "6379", 10),
		});

redis.on("error", (err) => {
	console.error("Redis connection error:", err);
});

redis.on("connect", () => {
	console.log("Connected to Redis");
});

redis.on("reconnecting", () => {
	console.log("Reconnecting to Redis...");
});

redis.on("end", () => {
	console.log("Redis connection closed");
});

export default redis;

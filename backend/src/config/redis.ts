import Redis from "ioredis";

const isProduction = process.env.NODE_ENV === "production";

// Redis connection configuration
const redisConfig = isProduction
	? {
			url: process.env.REDIS_URL || "",
			retryDelayOnFailover: 100,
			maxRetriesPerRequest: 3,
		}
	: {
			host: process.env.REDIS_HOST_LOCAL || "127.0.0.1",
			port: Number.parseInt(process.env.REDIS_PORT_LOCAL || "6379", 10),
			retryDelayOnFailover: 100,
			maxRetriesPerRequest: 3,
			connectTimeout: 10000,
			lazyConnect: true,
		};

const redis = new Redis(redisConfig);

// Enhanced error handling and logging
redis.on("error", (err) => {
	console.error("❌ Redis connection error:", err.message);
	if ((err as any).code === "ECONNREFUSED") {
		console.error("💡 Make sure Redis server is running: brew services start redis");
	}
});

redis.on("connect", () => {
	console.log("✅ Connected to Redis successfully");
});

redis.on("reconnecting", () => {
	console.log("🔄 Reconnecting to Redis...");
});

redis.on("end", () => {
	console.log("🔌 Redis connection closed");
});

redis.on("ready", () => {
	console.log("🚀 Redis is ready to accept commands");
});

// Test connection on startup
redis.ping().then(() => {
	console.log("🏓 Redis ping successful");
}).catch((err) => {
	console.error("❌ Redis ping failed:", err.message);
});

export default redis;

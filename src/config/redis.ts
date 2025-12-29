import Redis from "ioredis";

// const redis = new Redis.default(process.env.REDIS_URL!);
const redis = new Redis.default({
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
	password: process.env.REDIS_PASSWORD,
});

redis.on("connect", () => {
	console.log("Connected to Redis");
});

redis.on("error", (err) => {
	console.error("Redis connection error:", err);
});

export { redis };

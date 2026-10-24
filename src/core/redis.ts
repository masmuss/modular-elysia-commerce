import Redis from "ioredis";
import { logger } from "@/core/logger";

export const redis = process.env.REDIS_URL
	? new Redis(process.env.REDIS_URL, {
			lazyConnect: true,
			maxRetriesPerRequest: 1,
		})
	: null;

redis?.on("error", (error) => {
	logger.error({ error }, "redis connection error");
});

// apps/order-service/src/middlewares/rateLimitMiddleware.js
import redisClient from '../config/redisClient.js';

/**
 * Simple Rate Limiter using Redis.
 * Limits requests per user to 5 per 60 seconds.
 */
export async function rateLimit(req, res, next) {
    const userId = req.user.id;
    const key = `ratelimit:${userId}`;

    const requests = await redisClient.incr(key);

    if (requests === 1) {
        await redisClient.expire(key, 60); // Set expiry for the first request
    }

    if (requests > 5) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    next();
}

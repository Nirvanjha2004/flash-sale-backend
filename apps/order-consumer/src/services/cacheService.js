import Redis from 'ioredis';

// Note: Use a connection pool or share this client across the consumer
const redisCache = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
});

export async function cachePaymentLink(orderId, link) {
  const key = `payment:link:${orderId}`;
  // Cache for 10 minutes (600 seconds)
  await redisCache.set(key, link, 'EX', 600);
  console.log(`[Cache] Payment link cached for order: ${orderId}`);
}

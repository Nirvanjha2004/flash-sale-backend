import Redis from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

redisClient.on('connect', () => console.log('Redis connected (Expiry Server)'));
redisClient.on('error', (err) => console.error('Redis error (Expiry Server):', err));

export default redisClient;

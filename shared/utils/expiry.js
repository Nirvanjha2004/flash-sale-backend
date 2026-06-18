/**
 * Lua script for atomic stock reversion (increment).
 * Ensures stock isn't inadvertently overflowed if business logic mandates.
 */
export const ATOMIC_INCREMENT_SCRIPT = `
redis.call("INCRBY", KEYS[1], ARGV[1])
return redis.call("GET", KEYS[1])
`;

/**
 * Reverts stock in Redis.
 * @param {object} redisClient 
 * @param {string} key 
 * @param {number} amount 
 */
export async function revertStock(redisClient, key, amount) {
    return await redisClient.eval(ATOMIC_INCREMENT_SCRIPT, 1, key, amount);
}

/**
 * Lua script for atomic stock decrement.
 *
 * Logic:
 * 1. Fetch current stock.
 * 2. If stock does not exist, return error.
 * 3. If stock >= decrement amount, decrement and return new stock.
 * 4. Otherwise, return error.
 *
 * @type {string}
 */
export const ATOMIC_DECREMENT_SCRIPT = `
local stock = redis.call("GET", KEYS[1])

if not stock then
    return {err = "PRODUCT_NOT_FOUND"}
end

stock = tonumber(stock)
local decrement = tonumber(ARGV[1])

if stock >= decrement then
    redis.call("DECRBY", KEYS[1], decrement)
    return stock - decrement
else
    return {err = "INSUFFICIENT_STOCK"}
end
`;

/**
 * Executes the atomic decrement script against a Redis client.
 *
 * @param {object} redisClient - The Redis client instance (compatible with ioredis/node-redis).
 * @param {string} key - The Redis key for the product stock.
 * @param {number} amount - The amount to decrement.
 * @returns {Promise<number>} - The remaining stock if successful.
 * @throws {Error} - If inventory check fails (insufficient stock or product not found).
 */
export async function decrementStock(redisClient, key, amount) {
  try {
    const result = await redisClient.eval(
      ATOMIC_DECREMENT_SCRIPT,
      1,
      key,
      amount,
    );
    return result;
  } catch (err) {
    // Handle Lua script errors returned as objects if client parses them,
    // or rethrow if they are network/connection errors.
    if (err.message.includes("INSUFFICIENT_STOCK")) {
      throw new Error("INSUFFICIENT_STOCK");
    } else if (err.message.includes("PRODUCT_NOT_FOUND")) {
      throw new Error("PRODUCT_NOT_FOUND");
    }
    throw err;
  }
}

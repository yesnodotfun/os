import { Redis } from "@upstash/redis";

// Set up Redis client
const redis = new Redis({
  url: process.env.REDIS_KV_REST_API_URL,
  token: process.env.REDIS_KV_REST_API_TOKEN,
});

// Constants for rate limiting
const AI_RATE_LIMIT_PREFIX = "ai:ratelimit:";
const ANONYMOUS_AI_LIMIT = 3;
const DAILY_USER_AI_LIMIT = 25;

// Helper function to get rate limit key for a user
const getAIRateLimitKey = (identifier) => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  // Key format: ai:ratelimit:{identifier}:{date}
  // For authenticated users: ai:ratelimit:username:2024-01-15
  // For anonymous users: ai:ratelimit:anon:123.45.67.89:2024-01-15
  return `${AI_RATE_LIMIT_PREFIX}${identifier}:${dateStr}`;
};

// Helper function to check and increment AI message count
async function checkAndIncrementAIMessageCount(
  identifier,
  isAuthenticated,
  authToken = null
) {
  const key = getAIRateLimitKey(identifier);
  const currentCount = await redis.get(key);
  const count = currentCount ? parseInt(currentCount) : 0;

  const limit = isAuthenticated ? DAILY_USER_AI_LIMIT : ANONYMOUS_AI_LIMIT;

  // Allow ryo to bypass rate limits
  const isRyo = identifier === "ryo";

  // If authenticated, validate the token
  if (isAuthenticated && authToken) {
    const AUTH_TOKEN_PREFIX = "chat:token:";
    const tokenKey = `${AUTH_TOKEN_PREFIX}${identifier}`;
    const storedToken = await redis.get(tokenKey);

    if (!storedToken || storedToken !== authToken) {
      // Invalid token, treat as unauthenticated
      return { allowed: false, count: 0, limit: ANONYMOUS_AI_LIMIT };
    }
  }

  if (count >= limit && !isRyo) {
    return { allowed: false, count, limit };
  }

  // Increment count
  await redis.incr(key);

  // Set expiration to end of day if this is the first message
  if (count === 0) {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const ttlSeconds = Math.floor((endOfDay - now) / 1000);
    await redis.expire(key, ttlSeconds);
  }

  return { allowed: true, count: count + 1, limit };
}

// Export rate limit functions
export {
  checkAndIncrementAIMessageCount,
  ANONYMOUS_AI_LIMIT,
  DAILY_USER_AI_LIMIT,
};

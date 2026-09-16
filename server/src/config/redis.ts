import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

if (!process.env.REDIS_URL) {
  console.warn('⚠️  REDIS_URL not found in environment variables. Defaulting to redis://localhost:6379');
}

const redisClient = createClient({
  url: REDIS_URL,
  disableOfflineQueue: true, // Fail immediately rather than hanging promises if Redis is offline
  pingInterval: 30000,
  socket: {
    connectTimeout: 2000,
    keepAlive: 30000,
    reconnectStrategy: (retries) => {
      if (retries > 1) {
        return false; // Stop reconnecting after 1 failed attempt in dev
      }
      return 500;
    }
  }
});

let hasLoggedRedisError = false;
redisClient.on('error', (err) => {
  if (err.message === 'Socket closed unexpectedly' || err.code === 'ECONNRESET') {
    return; 
  }

  if (!hasLoggedRedisError) {
    hasLoggedRedisError = true;
    console.warn(`⚠️ Redis unreachable at ${REDIS_URL} — server operating in standalone DB mode.`);
  }
});

redisClient.on('connect', () => {
  // Only log once to avoid flooding the console during reconnection
});

// Added a ready listener for a better indication of operational state
redisClient.on('ready', () => console.log('✅ Redis Client Ready & Operational'));

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err: any) {
    console.error('❌ Failed to connect to Redis:', err.message);
  }
};

export default redisClient;

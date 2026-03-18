import { createClient } from 'redis';
import { env } from './env.js';

export const redisClient = createClient({
  url: env.redis.url,
});

redisClient.on('error', (error) => {
  console.error('Redis Client Error:', error);
});

let connectPromise: Promise<void> | null = null;

export const ensureRedisConnected = async (): Promise<void> => {
  if (redisClient.isOpen) {
    return;
  }

  if (!connectPromise) {
    connectPromise = redisClient.connect().finally(() => {
      connectPromise = null;
    });
  }

  await connectPromise;
};
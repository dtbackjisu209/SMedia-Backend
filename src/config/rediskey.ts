export const REDIS_KEY_PREFIX = {
	feed: 'feed',
} as const;

export const redisKeys = {
	feed: (userId: number): string => `${REDIS_KEY_PREFIX.feed}:${userId}`,
};

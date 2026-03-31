const POST_REDIS_KEY_PREFIX = {
	feed: 'feed',
	postData: 'post:data',
	userInterest: 'user:interest',
} as const;

export const postRedisKeys = {
	feed: (userId: number): string => `${POST_REDIS_KEY_PREFIX.feed}:${userId}`,
	postData: (postId: number): string => `${POST_REDIS_KEY_PREFIX.postData}:${postId}`,
	userInterest: (userId: number): string => `${POST_REDIS_KEY_PREFIX.userInterest}:${userId}`,
};

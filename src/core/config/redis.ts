import { createClient } from 'redis';
import { env } from './env.js';

export type RedisType = 'fanout' | 'queue';

type RedisConnectionConfig = {
	host: string;
	port: number;
	username?: string;
	password?: string;
	db: number;
	tls?: Record<string, never>;
};

const toRedisConnectionConfig = (url: string): RedisConnectionConfig => {
	const parsed = new URL(url);
	const dbFromPath = Number(parsed.pathname.replace('/', ''));

	return {
		host: parsed.hostname,
		port: parsed.port ? Number(parsed.port) : 6379,
		username: parsed.username || undefined,
		password: parsed.password || undefined,
		db: Number.isFinite(dbFromPath) ? dbFromPath : 0,
		tls: parsed.protocol === 'rediss:' ? {} : undefined,
	};
};

const redisConnectionsByType: Record<RedisType, RedisConnectionConfig> = {
	fanout: toRedisConnectionConfig(env.redis.url),
	queue: toRedisConnectionConfig(env.redis.queueUrl),
};

export const getRedisConnectionByType = (type: RedisType): RedisConnectionConfig => {
	return redisConnectionsByType[type];
};

export const redisFanoutConnection = getRedisConnectionByType('fanout');
export const redisQueueConnection = getRedisConnectionByType('queue');

export const fanoutRedisClient = createClient({
	url: env.redis.url,
});

export const queueRedisClient = createClient({
	url: env.redis.queueUrl,
});

// Backward-compatible alias for existing modules.
export const redisClient = fanoutRedisClient;

fanoutRedisClient.on('error', (error) => {
  console.error('[redis-fanout] client error:', error);
});

queueRedisClient.on('error', (error) => {
	console.error('[redis-queue] client error:', error);
});

let fanoutConnectPromise: Promise<unknown> | null = null;
let queueConnectPromise: Promise<unknown> | null = null;

export const ensureFanoutRedisConnected = async (): Promise<void> => {
	if (fanoutRedisClient.isOpen) {
		return;
	}

 	if (!fanoutConnectPromise) {
		fanoutConnectPromise = fanoutRedisClient.connect().finally(() => {
			fanoutConnectPromise = null;
		});
	}

 	await fanoutConnectPromise;
};

export const ensureQueueRedisConnected = async (): Promise<void> => {
	if (queueRedisClient.isOpen) {
		return;
	}

	if (!queueConnectPromise) {
		queueConnectPromise = queueRedisClient.connect().finally(() => {
			queueConnectPromise = null;
		});
	}

	await queueConnectPromise;
};

// Backward-compatible alias for existing modules.
export const ensureRedisConnected = ensureFanoutRedisConnected;
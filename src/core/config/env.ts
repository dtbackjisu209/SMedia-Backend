import 'dotenv/config';

const requiredEnv = (name: string): string => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
};


export const env = {
	jwtSecret: process.env.JWT_SECRET,
	cloudinary: {
		cloudName: requiredEnv('CLOUDINARY_CLOUD_NAME'),
		apiKey: requiredEnv('CLOUDINARY_API_KEY'),
		apiSecret: requiredEnv('CLOUDINARY_API_SECRET'),
		folder: process.env.CLOUDINARY_POST_FOLDER || 'posts',
		storyFolder: process.env.CLOUDINARY_STORY_FOLDER || 'stories',
	},
	// gemini: {
	// 	apiKey: process.env.GEMINI_API_KEY,
	// },
	redis: {
		url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
		queueUrl: process.env.REDIS_URL_QUEUE || process.env.REDIS_URL || 'redis://127.0.0.1:6379',
	},
	gemini: {
		apiKey: process.env.GEMINI_API_KEY || process.env.gemini_api_key || '',
		model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
	},
	openrouter: {
		apiKey: process.env.OPENROUTER_API_KEY || '',
		model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
	},
};


import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthFailError } from '../handler/error.response.js';

declare global {
	namespace Express {
		interface Request {
			userId?: number;
		}
	}
}

const parseUserId = (value: unknown): number | null => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	const headerUserId = parseUserId(req.header('x-user-id'));
	if (headerUserId !== null) {
		req.userId = headerUserId;
		next();
		return;
	}

	const authorization = req.header('authorization');
	const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

	if (!token || !env.jwtSecret) {
		next(new AuthFailError());
		return;
	}

	try {
		const payload = jwt.verify(token, env.jwtSecret) as JwtPayload | string;
		const userId =
			typeof payload === 'string'
				? parseUserId(payload)
				: parseUserId(payload.userId ?? payload.id ?? payload.sub);

		if (userId === null) {
			next(new AuthFailError('Invalid token payload'));
			return;
		}

		req.userId = userId;
		next();
	} catch {
		next(new AuthFailError('Invalid token'));
	}
};

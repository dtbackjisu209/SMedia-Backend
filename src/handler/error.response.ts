import { ReasonPhrases, StatusCodes } from './http-status-code.js';

export abstract class CustomError extends Error {
	abstract readonly statusCode: number;
	abstract readonly status: string;
	abstract readonly logging: boolean;
	code?: string;
	details?: unknown;

	constructor(message: string, details?: unknown) {
		super(message);
		this.name = this.constructor.name;
		this.details = details;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class BadRequestError extends CustomError {
	readonly statusCode = StatusCodes.BAD_REQUEST;
	readonly status = ReasonPhrases.BAD_REQUEST;
	readonly logging = false;

	constructor(message: string = ReasonPhrases.BAD_REQUEST, details?: unknown) {
		super(message, details);
		this.code = 'BAD_REQUEST';
	}
}

export class NotFoundError extends CustomError {
	readonly statusCode = StatusCodes.NOT_FOUND;
	readonly status = ReasonPhrases.NOT_FOUND;
	readonly logging = false;

	constructor(message: string = ReasonPhrases.NOT_FOUND, details?: unknown) {
		super(message, details);
		this.code = 'NOT_FOUND';
	}
}

export class AuthFailError extends CustomError {
	readonly statusCode = StatusCodes.UNAUTHORIZED;
	readonly status = ReasonPhrases.UNAUTHORIZED;
	readonly logging = false;

	constructor(message: string = ReasonPhrases.UNAUTHORIZED, details?: unknown) {
		super(message, details);
		this.code = 'UNAUTHORIZED';
	}
}

export class TokenExpiredErr extends CustomError {
	readonly statusCode = StatusCodes.UNAUTHORIZED;
	readonly status = 'TokenExpired';
	readonly logging = false;

	constructor(message: string = 'Token expired', details?: unknown) {
		super(message, details);
		this.code = 'TOKEN_EXPIRED';
	}
}

export class ConflictRequestError extends CustomError {
	readonly statusCode = StatusCodes.CONFLICT;
	readonly status = ReasonPhrases.CONFLICT;
	readonly logging = false;

	constructor(message: string = ReasonPhrases.CONFLICT, details?: unknown) {
		super(message, details);
		this.code = 'CONFLICT';
	}
}

export class ForbiddenError extends CustomError {
	readonly statusCode = StatusCodes.FORBIDDEN;
	readonly status = ReasonPhrases.FORBIDDEN;
	readonly logging = false;

	constructor(message: string = ReasonPhrases.FORBIDDEN, details?: unknown) {
		super(message, details);
		this.code = 'FORBIDDEN';
	}
}

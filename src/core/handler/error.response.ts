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

abstract class BaseHttpError extends CustomError {
	readonly logging = false;

	protected constructor(
		readonly statusCode: number,
		readonly status: string,
		message: string,
		code: string,
		details?: unknown,
	) {
		super(message, details);
		this.code = code;
	}
}

export class BadRequestError extends BaseHttpError {
	constructor(message: string = ReasonPhrases.BAD_REQUEST, details?: unknown) {
		super(StatusCodes.BAD_REQUEST, ReasonPhrases.BAD_REQUEST, message, 'BAD_REQUEST', details);
	}
}

export class NotFoundError extends BaseHttpError {
	constructor(message: string = ReasonPhrases.NOT_FOUND, details?: unknown) {
		super(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, message, 'NOT_FOUND', details);
	}
}

export class AuthFailError extends BaseHttpError {
	constructor(message: string = ReasonPhrases.UNAUTHORIZED, details?: unknown) {
		super(StatusCodes.UNAUTHORIZED, ReasonPhrases.UNAUTHORIZED, message, 'UNAUTHORIZED', details);
	}
}

export class TokenExpiredErr extends BaseHttpError {
	constructor(message: string = 'Token expired', details?: unknown) {
		super(StatusCodes.UNAUTHORIZED, 'TokenExpired', message, 'TOKEN_EXPIRED', details);
	}
}

export class ConflictRequestError extends BaseHttpError {
	constructor(message: string = ReasonPhrases.CONFLICT, details?: unknown) {
		super(StatusCodes.CONFLICT, ReasonPhrases.CONFLICT, message, 'CONFLICT', details);
	}
}

export class ForbiddenError extends BaseHttpError {
	constructor(message: string = ReasonPhrases.FORBIDDEN, details?: unknown) {
		super(StatusCodes.FORBIDDEN, ReasonPhrases.FORBIDDEN, message, 'FORBIDDEN', details);
	}
}

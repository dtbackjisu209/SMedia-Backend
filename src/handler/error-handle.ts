import type { ErrorRequestHandler } from 'express';
import { ReasonPhrases, StatusCodes } from './http-status-code.js';

type AppError = Error & {
	statusCode?: number;
	status?: string;
	code?: string;
	details?: unknown;
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	const appError = err as AppError;
	const statusCode = appError.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;

	if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
		console.error(appError);
	}

	return res.status(statusCode).json({
		status: appError.status ?? 'Server error',
		message: appError.message ?? ReasonPhrases.INTERNAL_SERVER_ERROR,
		code: appError.code,
		details: appError.details,
	});
};

import { ReasonPhrases, StatusCodes } from './http-status-code.js';

type ResponseLike = {
	status: (code: number) => {
		json: (payload: unknown) => unknown;
	};
};

const statusToReason: Partial<Record<number, string>> = {
	[StatusCodes.OK]: ReasonPhrases.OK,
	[StatusCodes.CREATED]: ReasonPhrases.CREATED,
};

abstract class SuccessResponse {
	constructor(
		public statusCode: number = StatusCodes.OK,
		public message: string = ReasonPhrases.OK,
		public data?: unknown,
	) {}

	private getReasonPhrase(statusCode: number): string {
		return statusToReason[statusCode] ?? 'Unknown Status';
	}

	send(res: ResponseLike) {
		return res.status(this.statusCode).json({
			status: this.getReasonPhrase(this.statusCode),
			message: this.message,
			data: this.data,
		});
	}
}

export class OK extends SuccessResponse {
	constructor({
		status = StatusCodes.OK,
		message = ReasonPhrases.OK,
		data,
	}: {
		status?: number;
		message?: string;
		data?: unknown;
	}) {
		super(status, message, data);
	}
}

export class CREATED extends SuccessResponse {
	constructor({
		status = StatusCodes.CREATED,
		message = ReasonPhrases.CREATED,
		data,
	}: {
		status?: number;
		message?: string;
		data?: unknown;
	}) {
		super(status, message, data);
	}
}

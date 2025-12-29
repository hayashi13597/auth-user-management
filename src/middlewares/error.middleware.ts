import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/index.js";

/**
 * Standardized API response format
 */
interface ApiResponse<T = unknown> {
	success: boolean;
	message?: string;
	data?: T;
	errors?: unknown[];
	code?: string;
}

/**
 * Global error handler middleware
 * Catches all errors and sends standardized response
 */
export const errorHandler = (
	err: Error,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	// Default error values
	let statusCode = 500;
	let message = "Internal Server Error";
	let errors: unknown[] | undefined;
	let code: string | undefined;

	// Handle operational errors (AppError instances)
	if (err instanceof AppError) {
		statusCode = err.statusCode;
		message = err.message;
		code = err.code;
	}
	// Handle Zod validation errors
	else if (err instanceof ZodError) {
		statusCode = 400;
		message = "Validation failed";
		code = "VALIDATION_ERROR";
		errors = err.issues.map((issue) => ({
			field: issue.path.join("."),
			message: issue.message,
			code: issue.code,
		}));
	}
	// Handle other errors
	else {
		// Log unexpected errors
		console.error("Unexpected error:", err);

		// Don't expose internal error details in production
		if (process.env.NODE_ENV === "production") {
			message = "Something went wrong";
		} else {
			message = err.message || "Internal Server Error";
		}
	}

	// Send standardized error response
	const response: ApiResponse = {
		success: false,
		message,
		...(code && { code }),
		...(errors && { errors }),
	};

	res.status(statusCode).json(response);
};

/**
 * Catch 404 and forward to error handler
 */
export const notFoundHandler = (
	req: Request,
	_res: Response,
	next: NextFunction,
): void => {
	const error = new AppError(
		`Route ${req.originalUrl} not found`,
		404,
		true,
		"ROUTE_NOT_FOUND",
	);
	next(error);
};

import type { NextFunction, Request, Response } from "express";
import type { ZodObject } from "zod";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Validation middleware using Zod schemas
 * @param schema Zod schema to validate against
 * @returns Express middleware function
 */
// biome-ignore lint/suspicious: any
export const validate = (schema: ZodObject<any>) => {
	return asyncHandler(
		async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
			// Validate request - will throw ZodError if validation fails
			// Global error handler will catch and format the error
			await schema.parseAsync({
				body: req.body,
				query: req.query,
				params: req.params,
			});

			next();
		},
	);
};

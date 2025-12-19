import { Response } from "express";

/**
 * Standardized success response
 */
export const sendSuccess = <T = any>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    ...(data && { data }),
  });
};

/**
 * Standardized created response (201)
 */
export const sendCreated = <T = any>(
  res: Response,
  data?: T,
  message: string = "Resource created successfully"
): void => {
  sendSuccess(res, data, message, 201);
};

/**
 * Standardized no content response (204)
 */
export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

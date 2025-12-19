import { NextFunction, Request, Response } from "express";

/**
 * Wrapper function to catch async errors in route handlers
 * Eliminates the need for try-catch in every controller method
 *
 * @param fn Async function to wrap
 * @returns Express middleware function
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

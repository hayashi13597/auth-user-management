import { NextFunction, Request, Response } from "express";
import { ZodError, ZodObject } from "zod";
/**
 * validate middleware
 * @param schema Zod schema to validate against
 * @returns Express middleware function
 */
export const validate = (schema: ZodObject<any>) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
        return;
      }

      // Unexpected error
      console.error("Validation error:", error);
      res.status(500).json({
        success: false,
        message: "Validation error",
      });
    }
  };
};

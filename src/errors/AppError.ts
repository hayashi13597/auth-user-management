/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends AppError {
  constructor(message: string = "Bad Request", code?: string) {
    super(message, 400, true, code);
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized", code?: string) {
    super(message, 401, true, code);
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden", code?: string) {
    super(message, 403, true, code);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Not Found", code?: string) {
    super(message, 404, true, code);
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = "Conflict", code?: string) {
    super(message, 409, true, code);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message: string = "Internal Server Error", code?: string) {
    super(message, 500, false, code);
  }
}

import rateLimit from "express-rate-limit";

/**
 * Global rate limiter for all requests
 * 300 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication endpoints (login)
 * 5 attempts per 15 minutes per IP
 * Does not count successful requests
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many login attempts, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed login attempts
});

/**
 * Strict rate limiter for registration endpoint
 * 3 accounts per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message:
    "Too many accounts created from this IP, please try again after an hour",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for token refresh endpoint
 * 20 requests per hour per IP
 */
export const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: "Too many token refresh attempts, please try again after an hour",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Moderate rate limiter for other protected endpoints
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message:
    "Too many requests to this endpoint, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

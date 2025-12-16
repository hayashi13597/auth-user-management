import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { tokenService } from "../services/token.service";

/**
 * Create a standardized authentication error response
 * @param req - Request object
 * @returns Error response object
 */
const extractToken = (req: Request): string | null => {
  // 1. Check cookies
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  // 2. Check Authorization header and query parameters
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = tokenService.extractTokenFromHeader(authHeader);
    if (token) return token;
  }

  // 3. Check query parameters
  if (req.query.token && typeof req.query.token === "string") {
    return req.query.token;
  }

  return null;
};

/**
 * Create an AuthError object
 * @param message Error message
 * @param code Error code
 * @returns AuthError object
 */
type AuthError = {
  message: string;
  code: string;
};
const createAuthError = (message: string, code: string): AuthError => {
  return { message, code };
};

/**
 * Create a standardized authentication error response
 * @param req - Request object
 * @param res - Response object
 * @param next - Next function
 * @returns void
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Lấy token từ request
    const token = extractToken(req);

    if (!token) {
      res
        .status(401)
        .json(createAuthError("Token was not provided", "TOKEN_MISSING"));
      return;
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = tokenService.verifyAccessToken(token);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Token is invalid";
      res.status(401).json(createAuthError(message, "TOKEN_INVALID"));
      return;
    }

    // 3. Find user associated with the token
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      res.status(401).json(createAuthError("User not found", "USER_NOT_FOUND"));
      return;
    }

    if (!user.isActive) {
      res
        .status(403)
        .json(
          createAuthError("User account has been deactivated", "USER_INACTIVE")
        );
      return;
    }

    // 4. Attach user info to request object
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json(createAuthError("Authentication error", "AUTH_ERROR"));
  }
};

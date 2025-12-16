import { Request, Response } from "express";
import { authService } from "../services/auth.service";

class AuthController {
  /**
   * Create a new user account.
   * POST /api/auth/register
   * @param req Request user registration data (email, password, name)
   * @return void
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const user = await authService.create(req.body);
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: { user },
      });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: (error as Error).message });
      return;
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   * @param req Request user login data (email, password)
   * @return void
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // get metadata from request
      const metadata = {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip || req.socket.remoteAddress,
      };

      const result = await authService.login(req.body, metadata);

      // set HttpOnly cookies
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: (error as Error).message });
      return;
    }
  }

  /**
   * refresh tokens
   * POST /api/auth/refresh
   * @param req Request containing refresh token
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.refreshTokens(req.body.refreshToken);

      // set new HttpOnly cookies
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        success: true,
        message: "Tokens refreshed successfully",
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: (error as Error).message });
      return;
    }
  }

  /**
   * logout
   * POST /api/auth/logout
   * @param req Request containing refresh token
   * @return void
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.logout(req.body.refreshToken);

      // Clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: (error as Error).message });
      return;
    }
  }

  /**
   * Get user sessions
   * GET /api/auth/sessions
   * @param req Request containing user ID
   * @param res Response with list of user sessions
   * @return void
   */
  async getSessions(req: Request, res: Response): Promise<void> {
    const { userId } = req.user;
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is missing",
        });
        return;
      }

      const sessions = await authService.getUserSessions(userId);

      res.status(200).json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get user sessions",
      });
    }
  }

  /**
   * Revoke all user tokens
   * POST /api/auth/revoke-all
   * @param req Request containing user ID
   * @param res Response with success message
   * @return void
   */
  async revokeAllSessions(req: Request, res: Response): Promise<void> {
    const { userId } = req.user;
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is missing",
        });
        return;
      }

      await authService.revokeAllUserTokens(userId);

      // Clear current cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.status(200).json({
        success: true,
        message: "Logged out from all devices",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to revoke sessions",
      });
    }
  }

  /**
   * Revoke a specific session
   * POST /api/auth/sessions/:sessionId/revoke
   * @param req Request containing user ID and session ID
   * @param res Response with success message
   * @return void
   */
  async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }
      const { userId } = req.user;
      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is missing",
        });
        return;
      }

      const { sessionId } = req.params;
      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: "Session ID is missing",
        });
        return;
      }

      await authService.revokeSession(userId, sessionId);

      res.status(200).json({
        success: true,
        message: "Session has been revoked",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke session";
      res.status(400).json({
        success: false,
        message,
      });
    }
  }
}

export const authController = new AuthController();

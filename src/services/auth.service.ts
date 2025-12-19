import bcrypt from "bcrypt";
import { prisma } from "../config/database";
import { ConflictError, NotFoundError, UnauthorizedError } from "../errors";
import { RefreshToken, User } from "../generated/prisma/client";
import { tokenService } from "./token.service";

interface LoginMetadata {
  userAgent?: string;
  ipAddress?: string;
}

type CreateUserData = Pick<User, "email" | "password" | "name">;
type CreateUserDataResponse = Omit<User, "password">;
type LoginUserData = Pick<User, "email" | "password">;
type LoginUserDataResponse = {
  user: Omit<User, "password">;
  accessToken: string;
  refreshToken: string;
};
type RefreshTokensResponse = {
  accessToken: string;
  refreshToken: string;
};
type SessionResponse = Omit<
  RefreshToken,
  "token" | "isRevoked" | "userId" | "updatedAt"
>;
interface MessageResponse {
  message: string;
}

class AuthService {
  /**
   * create a new user.
   * @param data User registration data (email, password, name)
   * @returns Created user data
   */
  async create(data: CreateUserData): Promise<CreateUserDataResponse> {
    const { email, password, name } = data;

    // check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError(
        "User with this email already exists.",
        "USER_EXISTS"
      );
    }

    // hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // return created user without password
    return user;
  }

  /**
   * login a user.
   * @param data User login data (email, password)
   * @param metadata Additional login metadata (IP address, user agent)
   * @returns Logged in user data
   */
  async login(
    data: LoginUserData,
    metadata: LoginMetadata = {}
  ): Promise<LoginUserDataResponse> {
    const { email, password } = data;
    const { ipAddress, userAgent } = metadata;

    // check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError(
        "Invalid email or password.",
        "INVALID_CREDENTIALS"
      );
    }

    // check password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError(
        "Invalid email or password.",
        "INVALID_CREDENTIALS"
      );
    }

    // check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError(
        "User account is inactive.",
        "ACCOUNT_INACTIVE"
      );
    }

    // create access and refresh tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = tokenService.generateTokens(payload);

    // save refresh token to database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: tokenService.getRefreshTokenExpiry(),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    // return user data along with tokens
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh tokens for a user.
   * @param refreshToken Refresh token string
   * @return Object containing new access and refresh tokens
   */
  async refreshTokens(refreshToken: string): Promise<RefreshTokensResponse> {
    // verify refresh token
    const decoded = tokenService.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new UnauthorizedError("Invalid refresh token.", "INVALID_TOKEN");
    }

    // check if refresh token exists in database and is not revoked
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!storedToken || storedToken.isRevoked) {
      throw new UnauthorizedError(
        "Refresh token is invalid or has been revoked.",
        "TOKEN_REVOKED"
      );
    }

    // generate new tokens
    const payload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    const { accessToken, refreshToken: newRefreshToken } =
      tokenService.generateTokens(payload);

    // revoke old refresh token
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });

    // store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: decoded.userId,
        expiresAt: tokenService.getRefreshTokenExpiry(),
        ipAddress: storedToken.ipAddress || null,
        userAgent: storedToken.userAgent || null,
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * logout a user.
   * @param refreshToken Refresh token string (optional)
   */
  async logout(refreshToken: string): Promise<MessageResponse> {
    // find the refresh token in database
    const token = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    // if token not found, throw error
    if (!token) {
      throw new NotFoundError("Token is invalid", "TOKEN_NOT_FOUND");
    }

    // revoke the refresh token
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });

    return { message: "Logged out successfully" };
  }

  /**
   * Logout from all devices.
   * remove all refresh tokens for the user.
   * @param userId User ID
   * @return success message
   */
  async revokeAllUserTokens(userId: string): Promise<MessageResponse> {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    return { message: "All user tokens have been revoked" };
  }

  /**
   * Get user sessions.
   * @param userId User ID
   * @return List of active sessions
   */
  async getUserSessions(userId: string): Promise<SessionResponse[]> {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gte: new Date(), // only active sessions
        },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return sessions;
  }

  /**
   * Get revoke a specific session.
   * @param userId User ID
   * @param sessionId Session ID
   * @return success message
   */
  async revokeSession(
    userId: string,
    sessionId: string
  ): Promise<MessageResponse> {
    const session = await prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });
    if (!session) {
      throw new NotFoundError("Session does not exist", "SESSION_NOT_FOUND");
    }

    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    return { message: "Session has been revoked" };
  }
}

export const authService = new AuthService();

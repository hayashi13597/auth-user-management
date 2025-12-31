import { prisma } from "../config/database.js";
import type { AuditAction } from "../generated/prisma/client.js";

interface AuditLogData {
	userId?: string;
	action: AuditAction;
	details?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
}

class AuditService {
	/**
	 * Log a security event
	 */
	async log(data: AuditLogData): Promise<void> {
		try {
			await prisma.auditLog.create({
				data: {
					userId: data.userId || null,
					action: data.action,
					details: data.details ? JSON.stringify(data.details) : null,
					ipAddress: data.ipAddress || null,
					userAgent: data.userAgent || null,
				},
			});
		} catch (error) {
			// Don't throw - audit logging should never break the main flow
			console.error("Failed to create audit log:", error);
		}
	}

	/**
	 * Log successful login
	 */
	async logLoginSuccess(
		userId: string,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		await this.log({
			userId,
			action: "LOGIN_SUCCESS",
			ipAddress,
			userAgent,
		});
	}

	/**
	 * Log failed login attempt
	 */
	async logLoginFailed(
		email: string,
		reason: string,
		ipAddress?: string,
		userAgent?: string,
		userId?: string,
	): Promise<void> {
		await this.log({
			userId,
			action: "LOGIN_FAILED",
			details: { email, reason },
			ipAddress,
			userAgent,
		});
	}

	/**
	 * Log logout
	 */
	async logLogout(
		userId: string,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		await this.log({
			userId,
			action: "LOGOUT",
			ipAddress,
			userAgent,
		});
	}

	/**
	 * Log token refresh
	 */
	async logTokenRefresh(
		userId: string,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		await this.log({
			userId,
			action: "TOKEN_REFRESH",
			ipAddress,
			userAgent,
		});
	}

	/**
	 * Log token reuse detection (security event)
	 */
	async logTokenReuseDetected(
		userId: string,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		await this.log({
			userId,
			action: "TOKEN_REUSE_DETECTED",
			details: { severity: "HIGH" },
			ipAddress,
			userAgent,
		});
	}

	/**
	 * Log suspicious fingerprint detection (potential token theft)
	 */
	async logSuspiciousFingerprint(
		userId: string,
		originalIp: string | null,
		originalUserAgent: string | null,
		currentIp?: string,
		currentUserAgent?: string,
	): Promise<void> {
		await this.log({
			userId,
			action: "SUSPICIOUS_FINGERPRINT",
			details: {
				severity: "MEDIUM",
				originalIp,
				originalUserAgent,
				currentIp,
				currentUserAgent,
			},
			ipAddress: currentIp,
			userAgent: currentUserAgent,
		});
	}

	/**
	 * Log session revocation
	 */
	async logSessionRevoked(
		userId: string,
		sessionId: string,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		await this.log({
			userId,
			action: "SESSION_REVOKED",
			details: { sessionId },
			ipAddress,
			userAgent,
		});
	}

	/**
	 * Log all sessions revocation
	 */
	async logAllSessionsRevoked(
		userId: string,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		await this.log({
			userId,
			action: "ALL_SESSIONS_REVOKED",
			ipAddress,
			userAgent,
		});
	}

	/**
	 * Log account locked
	 */
	async logAccountLocked(
		userId: string,
		reason: string,
		lockoutMinutes: number,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		await this.log({
			userId,
			action: "ACCOUNT_LOCKED",
			details: { reason, lockoutMinutes },
			ipAddress,
			userAgent,
		});
	}

	/**
	 * Log account unlocked (by admin)
	 */
	async logAccountUnlocked(
		userId: string,
		unlockedBy: string,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		await this.log({
			userId,
			action: "ACCOUNT_UNLOCKED",
			details: { unlockedBy },
			ipAddress,
			userAgent,
		});
	}

	/**
	 * Log registration
	 */
	async logRegister(
		userId: string,
		email: string,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		await this.log({
			userId,
			action: "REGISTER",
			details: { email },
			ipAddress,
			userAgent,
		});
	}

	/**
	 * Get audit logs for a user
	 */
	async getUserLogs(
		userId: string,
		limit = 50,
	): Promise<
		Array<{
			id: string;
			action: AuditAction;
			details: string | null;
			ipAddress: string | null;
			userAgent: string | null;
			createdAt: Date;
		}>
	> {
		return prisma.auditLog.findMany({
			where: { userId },
			select: {
				id: true,
				action: true,
				details: true,
				ipAddress: true,
				userAgent: true,
				createdAt: true,
			},
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	}

	/**
	 * Get recent security events (for admin monitoring)
	 */
	async getSecurityEvents(limit = 100): Promise<
		Array<{
			id: string;
			userId: string | null;
			action: AuditAction;
			details: string | null;
			ipAddress: string | null;
			createdAt: Date;
		}>
	> {
		return prisma.auditLog.findMany({
			where: {
				action: {
					in: [
						"LOGIN_FAILED",
						"TOKEN_REUSE_DETECTED",
						"ACCOUNT_LOCKED",
						"ALL_SESSIONS_REVOKED",
					],
				},
			},
			select: {
				id: true,
				userId: true,
				action: true,
				details: true,
				ipAddress: true,
				createdAt: true,
			},
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	}
}

export const auditService = new AuditService();

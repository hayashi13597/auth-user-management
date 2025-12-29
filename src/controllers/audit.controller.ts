import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../errors/index.js";
import { auditService } from "../services/audit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

class AuditController {
	/**
	 * Get current user's audit logs
	 * GET /api/auth/audit-logs
	 * @param req Request containing user ID
	 * @param res Response with list of audit logs
	 */
	getMyAuditLogs = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user) {
				throw new UnauthorizedError("Unauthorized");
			}

			const { userId } = req.user;
			if (!userId) {
				throw new BadRequestError("User ID is missing");
			}

			// Get limit from query params, default to 50
			const limit = Math.min(
				Number.parseInt(req.query.limit as string, 10) || 50,
				100,
			);

			const logs = await auditService.getUserLogs(userId, limit);

			// Parse JSON details for each log
			const parsedLogs = logs.map((log) => ({
				...log,
				details: log.details ? JSON.parse(log.details) : null,
			}));

			sendSuccess(res, { logs: parsedLogs });
		},
	);

	/**
	 * Get security events (Admin only)
	 * GET /api/admin/security-events
	 * @param req Request
	 * @param res Response with list of security events
	 */
	getSecurityEvents = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user) {
				throw new UnauthorizedError("Unauthorized");
			}

			// Get limit from query params, default to 100
			const limit = Math.min(
				Number.parseInt(req.query.limit as string, 10) || 100,
				500,
			);

			const events = await auditService.getSecurityEvents(limit);

			// Parse JSON details for each event
			const parsedEvents = events.map((event) => ({
				...event,
				details: event.details ? JSON.parse(event.details) : null,
			}));

			sendSuccess(res, { events: parsedEvents });
		},
	);

	/**
	 * Get audit logs for a specific user (Admin only)
	 * GET /api/admin/users/:userId/audit-logs
	 * @param req Request with userId param
	 * @param res Response with list of audit logs
	 */
	getUserAuditLogs = asyncHandler(
		async (req: Request, res: Response): Promise<void> => {
			if (!req.user) {
				throw new UnauthorizedError("Unauthorized");
			}

			const { userId } = req.params;
			if (!userId) {
				throw new BadRequestError("User ID is required");
			}

			// Get limit from query params, default to 50
			const limit = Math.min(
				Number.parseInt(req.query.limit as string, 10) || 50,
				100,
			);

			const logs = await auditService.getUserLogs(userId, limit);

			// Parse JSON details for each log
			const parsedLogs = logs.map((log) => ({
				...log,
				details: log.details ? JSON.parse(log.details) : null,
			}));

			sendSuccess(res, { logs: parsedLogs });
		},
	);
}

export const auditController = new AuditController();

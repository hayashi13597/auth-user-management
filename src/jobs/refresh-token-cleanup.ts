import { prisma } from "../config/database";

const DEFAULT_INTERVAL_MS = 1 * 60 * 1000; // 15 minutes
const DEFAULT_BATCH_SIZE = 500;

const parsePositiveInt = (
	value: string | undefined,
	fallback: number,
): number => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return parsed;
};

const cleanupIntervalMs = parsePositiveInt(
	process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS,
	DEFAULT_INTERVAL_MS,
);
const cleanupBatchSize = parsePositiveInt(
	process.env.REFRESH_TOKEN_CLEANUP_BATCH_SIZE,
	DEFAULT_BATCH_SIZE,
);

let timer: NodeJS.Timeout | undefined;
let isRunning = false;

const deleteExpiredTokens = async (): Promise<void> => {
	if (isRunning) return;
	isRunning = true;

	try {
		const now = new Date();
		let totalDeleted = 0;

		while (true) {
			const expired = await prisma.refreshToken.findMany({
				select: { id: true },
				where: { expiresAt: { lt: now } },
				take: cleanupBatchSize,
			});

			if (expired.length === 0) break;

			const ids = expired.map((token) => token.id);
			const result = await prisma.refreshToken.deleteMany({
				where: { id: { in: ids } },
			});

			totalDeleted += result.count;

			if (expired.length < cleanupBatchSize) break;
		}

		if (totalDeleted > 0) {
			console.log(
				`[refresh-token-cleanup] Removed ${totalDeleted} expired refresh tokens`,
			);
		}
	} catch (error) {
		console.error(
			"[refresh-token-cleanup] Failed to remove expired tokens",
			error,
		);
	} finally {
		isRunning = false;
	}
};

export const startRefreshTokenCleanupJob = (): void => {
	if (timer) return;

	timer = setInterval(deleteExpiredTokens, cleanupIntervalMs);
	timer.unref?.(); // allow process to exit naturally

	// run once on startup to clear existing expired entries
	void deleteExpiredTokens();
};

export const stopRefreshTokenCleanupJob = (): void => {
	if (!timer) return;
	clearInterval(timer);
	timer = undefined;
};

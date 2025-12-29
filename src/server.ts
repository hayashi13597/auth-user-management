import app from "./app.js";
import { prisma } from "./config/database.js";
import {
	startRefreshTokenCleanupJob,
	stopRefreshTokenCleanupJob,
} from "./jobs/refresh-token-cleanup.js";

const PORT = process.env.PORT || 5000;

const gracefulShutdown = async () => {
	console.log("\n🛑 Shutting down gracefully...");
	stopRefreshTokenCleanupJob();
	await prisma.$disconnect();
	process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

const server = app.listen(PORT, () => {
	console.log(`
╔═══════════════════════════════════════╗
║   🚀 Server is running!               ║
║   📍 Port: ${PORT}                       ║
║   🌍 Environment: ${process.env.NODE_ENV || "development"}         ║
║   📝 API: http://localhost:${PORT}/api   ║
╚═══════════════════════════════════════╝
  `);
	startRefreshTokenCleanupJob();
});

export default server;

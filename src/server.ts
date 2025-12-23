import app from "./app";
import { prisma } from "./config/database";

const PORT = process.env.PORT || 5000;

const gracefulShutdown = async () => {
	console.log("\n🛑 Shutting down gracefully...");
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
});

export default server;

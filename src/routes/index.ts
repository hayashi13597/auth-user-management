import { Router } from "express";
import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";

const router = Router();

router.get("/health", (_req, res) => {
	res.status(200).json({
		success: true,
		message: "Server is running",
		timestamp: new Date().toISOString(),
	});
});

// Mount auth routes
router.use("/auth", authRoutes);

// Mount user routes
router.use("/users", userRoutes);

// 404 handler - catch all undefined routes
router.use((_req, res) => {
	res.status(404).json({
		success: false,
		message: "Route not found",
	});
});

export default router;

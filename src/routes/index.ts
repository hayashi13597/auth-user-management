import { Router } from "express";
import rateLimit from "express-rate-limit";
import authRoutes from "./auth.route";
import userRoutes from "./user.route";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// rate-limited for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // only try 5 requests per hour
  message: "Login attempts exceeded. Please try again after an hour.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Mount auth routes
router.use("/auth", authLimiter, authRoutes);

// Mount user routes
router.use("/users", userRoutes);

// 404 handler - catch all undefined routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default router;

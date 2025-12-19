import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "../schemas/user.schema";

const router = Router();

// User routes (authenticated users)
router.get("/profile", authenticate, userController.getProfile);
router.put(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  userController.updateProfile
);
router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword
);
router.delete("/account", authenticate, userController.deleteAccount);

// Admin routes
router.get("/", authenticate, authorize("ADMIN"), userController.getAllUsers);
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  userController.getUserById
);

export default router;

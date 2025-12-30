import z from "zod";

/**
 * Password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters long")
	.max(128, "Password must not exceed 128 characters")
	.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
	.regex(/[a-z]/, "Password must contain at least one lowercase letter")
	.regex(/[0-9]/, "Password must contain at least one number")
	.regex(
		/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
		"Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;':\",./<>?)",
	);

const createUserSchema = z.object({
	body: z.object({
		email: z
			.email("Invalid email address")
			.min(1, "Email is required")
			.max(255, "Email must not exceed 255 characters")
			.toLowerCase()
			.trim(),
		password: passwordSchema,
		name: z
			.string()
			.min(2, "Name must be at least 2 characters")
			.max(100, "Name must not exceed 100 characters")
			.trim()
			.optional(),
	}),
});

const loginUserSchema = z.object({
	body: z.object({
		email: z
			.email("Invalid email address")
			.min(1, "Email is required")
			.toLowerCase()
			.trim(),
		password: z.string().min(1, "Password is required"),
	}),
});

const verifyEmailSchema = z.object({
	query: z.object({
		token: z
			.string()
			.min(1, "Verification token is required")
			.length(64, "Invalid verification token format"),
	}),
});

const resendVerificationSchema = z.object({
	body: z.object({
		email: z
			.email("Invalid email address")
			.min(1, "Email is required")
			.toLowerCase()
			.trim(),
	}),
});

type CreateUserInput = z.infer<typeof createUserSchema>;
type LoginUserInput = z.infer<typeof loginUserSchema>;
type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export {
	createUserSchema,
	loginUserSchema,
	passwordSchema,
	resendVerificationSchema,
	verifyEmailSchema,
};

export type {
	CreateUserInput,
	LoginUserInput,
	ResendVerificationInput,
	VerifyEmailInput,
};

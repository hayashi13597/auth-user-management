import z from "zod";

const updateProfileSchema = z.object({
	body: z.object({
		name: z.string().optional(),
		email: z.email("Invalid email address").optional(),
	}),
});

const changePasswordSchema = z.object({
	body: z.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: z
			.string()
			.min(6, "New password must be at least 6 characters long"),
	}),
});

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export { changePasswordSchema, updateProfileSchema };

export type { ChangePasswordInput, UpdateProfileInput };

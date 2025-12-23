import z from "zod";

const createUserSchema = z.object({
	body: z.object({
		email: z.email().min(1, "Email is required"),
		password: z.string().min(6, "Password must be at least 6 characters long"),
		name: z.string().optional(),
	}),
});

const loginUserSchema = z.object({
	body: z.object({
		email: z.email("Invalid email address"),
		password: z.string().min(1, "Password is required"),
	}),
});

type CreateUserInput = z.infer<typeof createUserSchema>;
type LoginUserInput = z.infer<typeof loginUserSchema>;

export { createUserSchema, loginUserSchema };

export type { CreateUserInput, LoginUserInput };

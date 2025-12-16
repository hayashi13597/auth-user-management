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

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

const logoutUserSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

type CreateUserInput = z.infer<typeof createUserSchema>;
type LoginUserInput = z.infer<typeof loginUserSchema>;
type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
type LogoutUserInput = z.infer<typeof logoutUserSchema>;

export {
  createUserSchema,
  loginUserSchema,
  logoutUserSchema,
  refreshTokenSchema,
};

export type {
  CreateUserInput,
  LoginUserInput,
  LogoutUserInput,
  RefreshTokenInput,
};

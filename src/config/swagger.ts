import swaggerJsdoc from "swagger-jsdoc";

const jsonErrorResponse = {
	description: "Error response",
	content: {
		"application/json": {
			schema: { $ref: "#/components/schemas/ErrorResponse" },
		},
	},
};

const swaggerDefinition = {
	openapi: "3.0.3",
	info: {
		title: "Auth Flow API",
		version: "1.0.0",
		description:
			"REST API documentation for the authentication and user management service.",
	},
	servers: [
		{
			url: `${
				process.env.API_BASE_URL ||
				`http://localhost:${process.env.PORT || 5000}`
			}/api`,
			description: "Local",
		},
	],
	components: {
		schemas: {
			User: {
				type: "object",
				properties: {
					id: { type: "string", format: "uuid" },
					email: { type: "string", format: "email" },
					name: { type: "string", nullable: true },
					role: { type: "string", enum: ["USER", "ADMIN", "MODERATOR"] },
					isActive: { type: "boolean" },
					emailVerified: { type: "boolean" },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
				required: [
					"id",
					"email",
					"role",
					"isActive",
					"emailVerified",
					"createdAt",
					"updatedAt",
				],
			},
			Session: {
				type: "object",
				properties: {
					id: { type: "string", format: "uuid" },
					userAgent: { type: "string", nullable: true },
					ipAddress: { type: "string", nullable: true },
					createdAt: { type: "string", format: "date-time" },
					expiresAt: { type: "string", format: "date-time" },
				},
				required: ["id", "createdAt", "expiresAt"],
			},
			AuthTokens: {
				type: "object",
				properties: {
					accessToken: { type: "string" },
					refreshToken: { type: "string" },
				},
				required: ["accessToken", "refreshToken"],
			},
			SuccessMessage: {
				type: "object",
				properties: {
					success: { type: "boolean", example: true },
					message: { type: "string" },
				},
				required: ["success"],
			},
			SuccessWithData: {
				type: "object",
				properties: {
					success: { type: "boolean", example: true },
					message: { type: "string" },
					data: { type: "object" },
				},
				required: ["success"],
			},
			ErrorResponse: {
				type: "object",
				properties: {
					success: { type: "boolean", example: false },
					message: { type: "string" },
					code: { type: "string" },
					errors: {
						type: "array",
						items: {
							type: "object",
							properties: {
								field: { type: "string" },
								message: { type: "string" },
								code: { type: "string" },
							},
						},
					},
				},
				required: ["success", "message"],
			},
			RegisterRequest: {
				type: "object",
				properties: {
					email: { type: "string", format: "email", maxLength: 255 },
					password: {
						type: "string",
						minLength: 8,
						maxLength: 128,
						description:
							"Must contain at least one uppercase, one lowercase, one number, and one special character",
					},
					name: { type: "string", minLength: 2, maxLength: 100 },
				},
				required: ["email", "password"],
			},
			LoginRequest: {
				type: "object",
				properties: {
					email: { type: "string", format: "email" },
					password: { type: "string" },
				},
				required: ["email", "password"],
			},
			ResendVerificationRequest: {
				type: "object",
				properties: {
					email: { type: "string", format: "email" },
				},
				required: ["email"],
			},
			AuditLog: {
				type: "object",
				properties: {
					id: { type: "string", format: "uuid" },
					userId: { type: "string", format: "uuid", nullable: true },
					action: {
						type: "string",
						enum: [
							"LOGIN_SUCCESS",
							"LOGIN_FAILED",
							"LOGOUT",
							"TOKEN_REFRESH",
							"TOKEN_REUSE_DETECTED",
							"SESSION_REVOKED",
							"ALL_SESSIONS_REVOKED",
							"ACCOUNT_LOCKED",
							"ACCOUNT_UNLOCKED",
							"PASSWORD_CHANGED",
							"REGISTER",
							"EMAIL_VERIFICATION_SENT",
							"EMAIL_VERIFIED",
						],
					},
					details: { type: "string", nullable: true },
					ipAddress: { type: "string", nullable: true },
					userAgent: { type: "string", nullable: true },
					createdAt: { type: "string", format: "date-time" },
				},
				required: ["id", "action", "createdAt"],
			},
			LockStatus: {
				type: "object",
				properties: {
					userId: { type: "string", format: "uuid" },
					email: { type: "string", format: "email" },
					isLocked: { type: "boolean" },
					failedLoginAttempts: { type: "integer" },
					lockoutUntil: { type: "string", format: "date-time", nullable: true },
					lastFailedLogin: {
						type: "string",
						format: "date-time",
						nullable: true,
					},
				},
				required: ["userId", "email", "isLocked", "failedLoginAttempts"],
			},
			RefreshResponse: {
				allOf: [
					{ $ref: "#/components/schemas/SuccessMessage" },
					{
						type: "object",
						properties: {
							data: { $ref: "#/components/schemas/AuthTokens" },
						},
					},
				],
			},
		},
	},
	paths: {
		"/health": {
			get: {
				tags: ["System"],
				summary: "Health check",
				responses: {
					200: {
						description: "Server is running",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										success: { type: "boolean" },
										message: { type: "string" },
										timestamp: { type: "string", format: "date-time" },
									},
								},
							},
						},
					},
				},
			},
		},
		"/auth/register": {
			post: {
				tags: ["Auth"],
				summary: "Register a new user",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/RegisterRequest" },
						},
					},
				},
				responses: {
					201: {
						description: "User registered",
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														user: { $ref: "#/components/schemas/User" },
													},
												},
											},
										},
									],
								},
							},
						},
					},
					400: jsonErrorResponse,
					409: jsonErrorResponse,
				},
			},
		},
		"/auth/login": {
			post: {
				tags: ["Auth"],
				summary: "Login and receive tokens",
				description:
					"On success sets HttpOnly accessToken and refreshToken cookies. Tokens also returned in response data for non-browser clients.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/LoginRequest" },
						},
					},
				},
				responses: {
					200: {
						description: "Login successful",
						headers: {
							"Set-Cookie": {
								description: "HttpOnly accessToken and refreshToken cookies",
								schema: { type: "string" },
							},
						},
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														user: { $ref: "#/components/schemas/User" },
													},
												},
											},
										},
									],
								},
							},
						},
					},
					400: jsonErrorResponse,
					401: jsonErrorResponse,
				},
			},
		},
		"/auth/refresh": {
			post: {
				tags: ["Auth"],
				summary: "Refresh tokens",
				description: "Requires refreshToken HttpOnly cookie.",
				responses: {
					200: {
						description: "Tokens refreshed",
						headers: {
							"Set-Cookie": {
								description:
									"New HttpOnly accessToken and refreshToken cookies",
								schema: { type: "string" },
							},
						},
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/SuccessMessage" },
							},
						},
					},
					400: jsonErrorResponse,
					401: jsonErrorResponse,
				},
			},
		},
		"/auth/verify-email": {
			get: {
				tags: ["Auth"],
				summary: "Verify email address",
				description:
					"Verifies a user's email address using the token sent via email.",
				parameters: [
					{
						in: "query",
						name: "token",
						required: true,
						schema: { type: "string", minLength: 64, maxLength: 64 },
						description: "Email verification token",
					},
				],
				responses: {
					200: {
						description: "Email verified successfully",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/SuccessMessage" },
							},
						},
					},
					400: jsonErrorResponse,
				},
			},
		},
		"/auth/resend-verification": {
			post: {
				tags: ["Auth"],
				summary: "Resend verification email",
				description:
					"Sends a new verification email to the specified address. Returns success even if email doesn't exist for security.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/ResendVerificationRequest",
							},
						},
					},
				},
				responses: {
					200: {
						description: "Verification email sent (if account exists)",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/SuccessMessage" },
							},
						},
					},
					400: jsonErrorResponse,
					429: jsonErrorResponse,
				},
			},
		},
		"/auth/logout": {
			post: {
				tags: ["Auth"],
				summary: "Logout current session",
				responses: {
					200: {
						description: "Logged out",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/SuccessMessage" },
							},
						},
					},
					401: jsonErrorResponse,
				},
			},
		},
		"/auth/sessions": {
			get: {
				tags: ["Auth"],
				summary: "List active sessions",
				responses: {
					200: {
						description: "Active sessions",
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														sessions: {
															type: "array",
															items: { $ref: "#/components/schemas/Session" },
														},
													},
												},
											},
										},
									],
								},
							},
						},
					},
					401: jsonErrorResponse,
				},
			},
		},
		"/auth/revoke-all": {
			post: {
				tags: ["Auth"],
				summary: "Revoke all sessions for current user",
				responses: {
					200: {
						description: "Sessions revoked",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/SuccessMessage" },
							},
						},
					},
					401: { $ref: "#/components/schemas/ErrorResponse" },
				},
			},
		},
		"/auth/sessions/{sessionId}/revoke": {
			delete: {
				tags: ["Auth"],
				summary: "Revoke a specific session",
				parameters: [
					{
						in: "path",
						name: "sessionId",
						required: true,
						schema: { type: "string", format: "uuid" },
					},
				],
				responses: {
					200: {
						description: "Session revoked",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/SuccessMessage" },
							},
						},
					},
					401: jsonErrorResponse,
					404: jsonErrorResponse,
				},
			},
		},
		"/auth/audit-logs": {
			get: {
				tags: ["Auth"],
				summary: "Get audit logs for current user",
				description: "Returns audit logs for the authenticated user.",
				parameters: [
					{
						in: "query",
						name: "limit",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
						description:
							"Maximum number of logs to return (default: 50, max: 100)",
					},
				],
				responses: {
					200: {
						description: "Audit logs",
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														logs: {
															type: "array",
															items: { $ref: "#/components/schemas/AuditLog" },
														},
													},
												},
											},
										},
									],
								},
							},
						},
					},
					401: jsonErrorResponse,
				},
			},
		},
		"/users/profile": {
			get: {
				tags: ["Users"],
				summary: "Get current user profile",
				responses: {
					200: {
						description: "Profile",
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														user: { $ref: "#/components/schemas/User" },
													},
												},
											},
										},
									],
								},
							},
						},
					},
					401: jsonErrorResponse,
				},
			},
			put: {
				tags: ["Users"],
				summary: "Update profile",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									name: { type: "string" },
									email: { type: "string", format: "email" },
								},
							},
						},
					},
				},
				responses: {
					200: {
						description: "Profile updated",
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														user: { $ref: "#/components/schemas/User" },
													},
												},
											},
										},
									],
								},
							},
						},
					},
					400: jsonErrorResponse,
					401: jsonErrorResponse,
				},
			},
		},
		"/users/change-password": {
			put: {
				tags: ["Users"],
				summary: "Change password",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									currentPassword: { type: "string" },
									newPassword: {
										type: "string",
										minLength: 8,
										maxLength: 128,
										description:
											"Must contain at least one uppercase, one lowercase, one number, and one special character",
									},
								},
								required: ["currentPassword", "newPassword"],
							},
						},
					},
				},
				responses: {
					200: {
						description: "Password changed",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/SuccessMessage" },
							},
						},
					},
					400: jsonErrorResponse,
					401: jsonErrorResponse,
				},
			},
		},
		"/users/account": {
			delete: {
				tags: ["Users"],
				summary: "Delete (deactivate) account",
				responses: {
					200: {
						description: "Account deleted",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/SuccessMessage" },
							},
						},
					},
					401: jsonErrorResponse,
				},
			},
		},
		"/admin/users": {
			get: {
				tags: ["Admin"],
				summary: "List all users",
				description: "Admin only. Returns all users in the system.",
				responses: {
					200: {
						description: "Users list",
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														users: {
															type: "array",
															items: { $ref: "#/components/schemas/User" },
														},
														count: { type: "integer" },
													},
												},
											},
										},
									],
								},
							},
						},
					},
					401: jsonErrorResponse,
					403: jsonErrorResponse,
				},
			},
		},
		"/admin/users/{userId}": {
			get: {
				tags: ["Admin"],
				summary: "Get user by ID",
				description: "Admin only. Returns a specific user by ID.",
				parameters: [
					{
						in: "path",
						name: "userId",
						required: true,
						schema: { type: "string", format: "uuid" },
					},
				],
				responses: {
					200: {
						description: "User",
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														user: { $ref: "#/components/schemas/User" },
													},
												},
											},
										},
									],
								},
							},
						},
					},
					401: jsonErrorResponse,
					403: jsonErrorResponse,
					404: jsonErrorResponse,
				},
			},
		},
		"/admin/security-events": {
			get: {
				tags: ["Admin"],
				summary: "Get recent security events",
				description:
					"Admin only. Returns recent security events like failed logins, token reuse, and account lockouts.",
				parameters: [
					{
						in: "query",
						name: "limit",
						schema: { type: "integer", minimum: 1, maximum: 500, default: 100 },
						description:
							"Maximum number of events to return (default: 100, max: 500)",
					},
				],
				responses: {
					200: {
						description: "Security events",
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														events: {
															type: "array",
															items: { $ref: "#/components/schemas/AuditLog" },
														},
													},
												},
											},
										},
									],
								},
							},
						},
					},
					401: jsonErrorResponse,
					403: jsonErrorResponse,
				},
			},
		},
		"/admin/locked-accounts": {
			get: {
				tags: ["Admin"],
				summary: "Get all locked accounts",
				description: "Admin only. Returns all currently locked user accounts.",
				responses: {
					200: {
						description: "Locked accounts",
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														accounts: {
															type: "array",
															items: {
																$ref: "#/components/schemas/LockStatus",
															},
														},
														count: { type: "integer" },
													},
												},
											},
										},
									],
								},
							},
						},
					},
					401: jsonErrorResponse,
					403: jsonErrorResponse,
				},
			},
		},
		"/admin/users/{userId}/audit-logs": {
			get: {
				tags: ["Admin"],
				summary: "Get audit logs for a specific user",
				description: "Admin only. Returns audit logs for a specific user.",
				parameters: [
					{
						in: "path",
						name: "userId",
						required: true,
						schema: { type: "string", format: "uuid" },
					},
					{
						in: "query",
						name: "limit",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
						description:
							"Maximum number of logs to return (default: 50, max: 100)",
					},
				],
				responses: {
					200: {
						description: "User audit logs",
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														logs: {
															type: "array",
															items: { $ref: "#/components/schemas/AuditLog" },
														},
													},
												},
											},
										},
									],
								},
							},
						},
					},
					401: jsonErrorResponse,
					403: jsonErrorResponse,
					404: jsonErrorResponse,
				},
			},
		},
		"/admin/users/{userId}/lock-status": {
			get: {
				tags: ["Admin"],
				summary: "Get lock status for a user",
				description: "Admin only. Returns the lock status of a specific user.",
				parameters: [
					{
						in: "path",
						name: "userId",
						required: true,
						schema: { type: "string", format: "uuid" },
					},
				],
				responses: {
					200: {
						description: "Lock status",
						content: {
							"application/json": {
								schema: {
									allOf: [
										{ $ref: "#/components/schemas/SuccessMessage" },
										{
											type: "object",
											properties: {
												data: {
													type: "object",
													properties: {
														status: { $ref: "#/components/schemas/LockStatus" },
													},
												},
											},
										},
									],
								},
							},
						},
					},
					401: jsonErrorResponse,
					403: jsonErrorResponse,
					404: jsonErrorResponse,
				},
			},
		},
		"/admin/users/{userId}/unlock": {
			post: {
				tags: ["Admin"],
				summary: "Unlock a user account",
				description: "Admin only. Unlocks a locked user account.",
				parameters: [
					{
						in: "path",
						name: "userId",
						required: true,
						schema: { type: "string", format: "uuid" },
					},
				],
				responses: {
					200: {
						description: "Account unlocked",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/SuccessMessage" },
							},
						},
					},
					401: jsonErrorResponse,
					403: jsonErrorResponse,
					404: jsonErrorResponse,
				},
			},
		},
	},
};

const options: swaggerJsdoc.Options = {
	definition: swaggerDefinition,
	apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);

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
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
				required: ["id", "email", "role", "isActive", "createdAt", "updatedAt"],
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
					email: { type: "string", format: "email" },
					password: { type: "string", minLength: 6 },
					name: { type: "string" },
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
									newPassword: { type: "string", minLength: 6 },
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
		"/users": {
			get: {
				tags: ["Users"],
				summary: "List users (admin)",
				responses: {
					200: {
						description: "Users",
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
		"/users/{id}": {
			get: {
				tags: ["Users"],
				summary: "Get user by ID (admin)",
				parameters: [
					{
						in: "path",
						name: "id",
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
	},
};

const options: swaggerJsdoc.Options = {
	definition: swaggerDefinition,
	apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);

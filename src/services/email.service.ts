import { randomBytes } from "node:crypto";
import { emailSettings, transporter } from "../config/email.js";

interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

class EmailService {
	/**
	 * Send an email
	 */
	private async sendEmail(options: SendEmailOptions): Promise<boolean> {
		try {
			await transporter.sendMail({
				from: `"${emailSettings.fromName}" <${emailSettings.fromEmail}>`,
				to: options.to,
				subject: options.subject,
				html: options.html,
				text: options.text,
			});
			return true;
		} catch (error) {
			console.error("Failed to send email:", error);
			return false;
		}
	}

	/**
	 * Generate a secure verification token
	 */
	generateVerificationToken(): string {
		return randomBytes(32).toString("hex");
	}

	/**
	 * Calculate verification token expiry date
	 */
	getVerificationTokenExpiry(): Date {
		return new Date(Date.now() + emailSettings.verificationTokenExpiry);
	}

	/**
	 * Send email verification email
	 */
	async sendVerificationEmail(
		email: string,
		token: string,
		userName?: string,
	): Promise<boolean> {
		const verificationUrl = `${emailSettings.appUrl}/api/auth/verify-email?token=${token}`;
		const greeting = userName ? `Hello ${userName}` : "Hello";

		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Verify Your Email</title>
				<style>
					body {
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
						line-height: 1.6;
						color: #333;
						max-width: 600px;
						margin: 0 auto;
						padding: 20px;
					}
					.container {
						background: #f9fafb;
						border-radius: 8px;
						padding: 40px;
						text-align: center;
					}
					.logo {
						font-size: 24px;
						font-weight: bold;
						color: #4f46e5;
						margin-bottom: 20px;
					}
					h1 {
						color: #1f2937;
						font-size: 24px;
						margin-bottom: 16px;
					}
					p {
						color: #6b7280;
						margin-bottom: 24px;
					}
					.button {
						display: inline-block;
						background: #4f46e5;
						color: white !important;
						text-decoration: none;
						padding: 14px 32px;
						border-radius: 6px;
						font-weight: 600;
						margin-bottom: 24px;
					}
					.button:hover {
						background: #4338ca;
					}
					.link {
						word-break: break-all;
						color: #4f46e5;
						font-size: 14px;
					}
					.footer {
						margin-top: 32px;
						font-size: 12px;
						color: #9ca3af;
					}
					.expiry-notice {
						background: #fef3c7;
						border: 1px solid #f59e0b;
						border-radius: 4px;
						padding: 12px;
						margin-top: 20px;
						font-size: 14px;
						color: #92400e;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="logo">${emailSettings.fromName}</div>
					<h1>Verify Your Email Address</h1>
					<p>${greeting},</p>
					<p>Thank you for registering! Please click the button below to verify your email address.</p>
					<a href="${verificationUrl}" class="button">Verify Email</a>
					<p>If the button doesn't work, copy and paste this link into your browser:</p>
					<p class="link">${verificationUrl}</p>
					<div class="expiry-notice">
						This verification link will expire in 24 hours.
					</div>
					<div class="footer">
						<p>If you didn't create an account, you can safely ignore this email.</p>
						<p>&copy; ${new Date().getFullYear()} ${
							emailSettings.fromName
						}. All rights reserved.</p>
					</div>
				</div>
			</body>
			</html>
		`;

		const text = `
${greeting},

Thank you for registering! Please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

${emailSettings.fromName}
		`;

		return await this.sendEmail({
			to: email,
			subject: "Verify Your Email Address",
			html,
			text,
		});
	}
}

export const emailService = new EmailService();

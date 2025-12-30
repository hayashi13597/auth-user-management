import nodemailer from "nodemailer";

// Email configuration
const emailConfig = {
	host: process.env.SMTP_HOST || "localhost",
	port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
	secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
	auth: {
		user: process.env.SMTP_USER || "",
		pass: process.env.SMTP_PASS || "",
	},
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify transporter connection
transporter.verify((error) => {
	if (error) {
		console.error("Email transporter verification failed:", error);
	} else {
		console.log("Email transporter is ready to send emails");
	}
});

// Application email settings
const emailSettings = {
	fromName: process.env.EMAIL_FROM_NAME || "Auth Service",
	fromEmail: process.env.EMAIL_FROM_ADDRESS || "noreply@example.com",
	appUrl: process.env.APP_URL || "http://localhost:3000",
	verificationTokenExpiry: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

export { emailConfig, emailSettings, transporter };

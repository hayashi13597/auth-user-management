import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { globalLimiter } from "./middlewares/rate-limit.middleware";
import routes from "./routes";

const app: Application = express();

// Security
app.use(helmet());

// CORS
app.use(
	cors({
		origin: process.env.CLIENT_URL || "http://localhost:3000",
		credentials: true,
	}),
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Request logging (development)
if (process.env.NODE_ENV === "development") {
	app.use((req, _res, next) => {
		console.log(`${req.method} ${req.path}`);
		next();
	});
}

// Apply global rate limiter to all requests
app.use(globalLimiter);

// Swagger UI
app.use(
	"/api-docs",
	swaggerUi.serve,
	swaggerUi.setup(swaggerSpec, { explorer: true }),
);
app.get("/api-docs.json", (_req, res) => {
	res.setHeader("Content-Type", "application/json");
	res.send(swaggerSpec);
});

// Routes
app.use("/api", routes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

export default app;

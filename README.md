# Auth Flow API

Authentication and user management service built with Express 5, TypeScript, Prisma, PostgreSQL, Redis-backed token/session controls, and JWT-based access/refresh tokens. Swagger docs are included for quick exploration.

## Tech Stack

- Node.js + Express 5 (TypeScript)
- Prisma ORM + PostgreSQL
- Redis (session/token blacklist)
- JWT for access/refresh tokens
- Zod validation, Helmet, CORS, rate limiting
- Swagger UI for API docs
- pnpm for package management

## Getting Started

1. Install prerequisites: Node.js 18+, pnpm, Docker (for Postgres & Redis).
2. Copy `.env.example` (or create `.env`) with the variables below.
3. Start services: `docker-compose up -d`.
4. Install dependencies: `pnpm install`.
5. Apply schema (first run): `pnpm db:migrate` (or `pnpm db:reset` to recreate dev data).

### Environment Variables

```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000
APP_URL=http://localhost:5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_db?schema=public
ACCESS_TOKEN_SECRET=replace-with-strong-random-string
REFRESH_TOKEN_SECRET=replace-with-strong-random-string
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD= # leave blank if none
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=auth_db

# Email Configuration (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM_NAME=Auth Service
EMAIL_FROM_ADDRESS=noreply@example.com
```

## Running the App

- Dev (watch):
  ```bash
  pnpm dev
  ```
- Production build:
  ```bash
  pnpm build
  pnpm start
  ```
- Database tooling:
  ```bash
  pnpm db:migrate   # prisma migrate dev
  pnpm db:generate  # regenerate Prisma client
  pnpm db:reset     # drop, recreate, seed (interactive)
  pnpm db:studio    # open Prisma Studio
  ```

## API Documentation

- Swagger UI: http://localhost:5000/api-docs
- OpenAPI JSON: http://localhost:5000/api-docs.json
- Base path for APIs: http://localhost:5000/api

## Project Structure

```
express/
├── src/
│   ├── app.ts              # Express app setup (security, parsing, rate limiting, swagger)
│   ├── server.ts           # App bootstrap & graceful shutdown
│   ├── config/             # Database, Redis, Swagger
│   ├── controllers/        # Auth & user controllers
│   ├── middlewares/        # Auth, validation, rate limiting, error handlers
│   ├── routes/             # Route definitions mounted under /api
│   ├── schemas/            # Zod request validators
│   ├── services/           # Auth, token, user, blacklist services
│   ├── utils/              # Helpers (async handler, response wrapper)
│   └── generated/prisma/   # Prisma client output
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker-compose.yml      # Postgres + Redis for local dev
├── tsconfig.json
├── pnpm-lock.yaml
└── package.json
```

## Database Schema (Prisma)

- `User`
  - `id` (uuid, PK)
  - `email` (unique), `password`, optional `name`
  - `role` (`USER` | `ADMIN` | `MODERATOR`), `isActive` (default true)
  - `emailVerified` (default false), `emailVerificationToken`, `emailVerificationExpires` (for email verification flow)
  - Timestamps: `createdAt`, `updatedAt`
- `RefreshToken`
  - `id` (uuid, PK), `token` (unique)
  - FK `userId` → `User` (cascade on delete)
  - Metadata: `expiresAt`, `isRevoked`, optional `userAgent`, `ipAddress`
  - Timestamps: `createdAt`, `updatedAt`

## Running in Docker (optional)

- `docker-compose up -d` starts Postgres (port 5432) and Redis (6379, password set in compose).
- Ensure `DATABASE_URL` and Redis env vars point to these services before running the app.

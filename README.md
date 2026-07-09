# Authly

**Authly** is a self-hosted, multi-tenant authentication platform — a lightweight alternative to Auth0 or Clerk. It lets developers register their SaaS or web app as a **tenant**, get API keys, and immediately offload user authentication (registration, login, JWT/session management, token refresh, and logout) to Authly's API. A full-featured admin dashboard is included to manage apps and inspect users.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Server Setup](#server-setup)
  - [Client Setup](#client-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Health Check](#health-check)
  - [Admin Endpoints](#admin-endpoints)
  - [Tenant User Endpoints](#tenant-user-endpoints)
- [Authentication Flows](#authentication-flows)
  - [JWT Flow](#jwt-flow)
  - [Session Flow](#session-flow)
  - [Token Refresh Strategy](#token-refresh-strategy)
- [Integrating Authly Into Your App](#integrating-authly-into-your-app)
- [Security](#security)
- [Database Schema](#database-schema)

---

## Features

### Platform / Admin
- **Admin registration & login** — secure bcrypt-hashed credentials, JWT-based admin sessions
- **Multi-app management** — create and manage multiple application tenants from a single admin account
- **Free / Pro tiers** — free tier allows 1 app; Pro tier unlocks unlimited apps
- **API key generation** — each app gets a `pk_*` public key and a `sk_*` secret key on creation
- **Per-app RSA-2048 key pairs** — auto-generated on app creation; user JWTs are signed with the app's own private key and verifiable with its public key, completely isolated per tenant
- **Admin dashboard API** — single endpoint returns profile, all apps, selected app details, and paginated/searchable user list

### Tenant Authentication
- **Dual auth modes** — each app can be configured as `JWT` or `SESSION` at creation time
- **JWT mode** — RS256-signed access tokens (15-min expiry) + httpOnly refresh token cookies (24h)
- **Session mode** — Redis-backed server-side sessions with a `sessionId` httpOnly cookie (24h)
- **User registration & login** — scoped per tenant via `x-public-key` header; users are isolated across apps
- **Token refresh** — silent refresh for both admin and user tokens
- **Universal logout** — invalidates refresh tokens, access tokens, and sessions via Redis blacklisting
- **Token blacklisting** — revoked tokens are stored in Redis with TTL matching their remaining validity

### Security
- **Rate limiting** — all `/api/auth` routes are rate-limited to **10 requests per 5 seconds** per IP via `express-rate-limit`
- **Helmet** — standard HTTP security headers applied globally
- **CORS** — admin-only routes (`/admin-login`, `/register-admin`, `/create-app`) are restricted to `ALLOWED_ORIGINS`; tenant routes are open by design to support any frontend
- **httpOnly cookies** — refresh tokens and session IDs are never accessible via JavaScript
- **Zod validation** — all request bodies are validated with strict Zod schemas before processing

### Admin Dashboard (Client)
- Built with React Router v7 + Tailwind CSS v4 + shadcn/ui
- Login & signup pages for platform admins
- Dashboard with app switcher, user table (paginated, searchable), and API key display
- Interactive documentation page (`/docs`) with an **Auth Flow Simulator** — a step-by-step key/token visualizer showing the login → JWT → profile verification flow
- Animated UI using Framer Motion

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Your Application                        │
│  (Any frontend/backend using x-public-key to call Authly API)  │
└─────────────────────────────┬──────────────────────────────────┘
                              │  HTTP (x-public-key header)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Authly API (Express)                        │
│                                                                 │
│  POST /api/auth/register-user   ──► Create user in tenant       │
│  POST /api/auth/login           ──► Issue JWT or Session        │
│  POST /api/auth/refresh         ──► Rotate access token        │
│  POST /api/auth/logout          ──► Blacklist tokens / session  │
│  GET  /api/auth/me              ──► Get current user profile    │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
        ┌──────▼──────┐           ┌───────▼───────┐
        │  PostgreSQL  │           │     Redis     │
        │  (Prisma)    │           │  (Sessions &  │
        │              │           │  Blacklists)  │
        └──────────────┘           └───────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Server** | Node.js, Express 5, TypeScript |
| **Database** | PostgreSQL via Prisma ORM |
| **Cache / Sessions** | Redis (ioredis) |
| **Auth Tokens** | jsonwebtoken (HS256 for admin, RS256 per-app for users) |
| **Password Hashing** | bcryptjs |
| **Validation** | Zod |
| **Security** | Helmet, cors, express-rate-limit |
| **Client** | React 19, React Router v7, TypeScript |
| **Client UI** | Tailwind CSS v4, shadcn/ui, Framer Motion, Lucide icons |
| **Client Font** | Geist (variable) |

---

## Project Structure

```
authly/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma          # DB models: Admin, App, User, ApiKey, AppJwtConfig
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts               # Express app entry, CORS config, health check
│   │   ├── controllers/
│   │   │   └── auth.controller.ts # All auth business logic
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts  # adminAuthMiddleware, userAuthMiddleware
│   │   │   ├── tenant.middleware.ts# tenantMiddleware (x-public-key resolution)
│   │   │   ├── limiter.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   └── auth.routes.ts     # All /api/auth/* route definitions
│   │   └── lib/
│   │       ├── prisma.ts          # Prisma client singleton
│   │       └── redis.ts           # ioredis client
│   ├── api_documentation.md
│   └── package.json
│
└── client/
    ├── app/
    │   ├── routes/
    │   │   ├── home.tsx           # Landing / redirect
    │   │   ├── login.tsx          # Admin login page
    │   │   ├── signup.tsx         # Admin registration page
    │   │   ├── dashboard.tsx      # Admin dashboard
    │   │   └── docs.tsx           # Interactive API documentation
    │   ├── components/            # Shared UI components
    │   ├── lib/                   # Utility functions
    │   ├── routes.ts              # React Router route config
    │   └── root.tsx               # App root with providers
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **PostgreSQL** database (local or Supabase/Neon)
- **Redis** instance (local or Upstash)

### Server Setup

```bash
cd server

# Install dependencies
npm install

# Create and fill in environment variables (see Environment Variables section below)
cp .env .env.local     # or create server/.env manually

# Apply database migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Start development server (hot-reload)
npm run dev
```

The server starts on `http://localhost:3000` by default.

### Client Setup

```bash
cd client

# Install dependencies
npm install

# Create and fill in environment variables
# Create client/.env and set VITE_API_BASE_URL

# Start development server
npm run dev
```

The client starts on `http://localhost:5173` by default.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `JWT_SECRET` | HS256 secret for admin access tokens |
| `JWT_REFRESH_SECRET` | HS256 secret for admin refresh tokens |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins (e.g. `http://localhost:5173`) |
| `PORT` | Server port (default: `3000`) |
| `NODE_ENV` | `development` or `production` (affects cookie `Secure`/`SameSite` flags) |

### Client (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the Authly server (e.g. `http://localhost:3000`) |

---

## API Reference

### Base URL

| Environment | URL |
|---|---|
| Local | `http://localhost:3000` |
| Production | Your deployed server URL |

---

### Health Check

#### `GET /health`
Returns real-time status of the server, PostgreSQL, and Redis connections with latency.

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": { "status": "up", "latency": "12ms" },
    "redis": { "status": "up", "latency": "3ms" }
  }
}
```

---

### Admin Endpoints

All admin endpoints are under `/api/auth` and rate-limited. Admin-protected routes require `Authorization: Bearer <adminAccessToken>`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register-admin` | Public | Register a new platform admin |
| `POST` | `/api/auth/admin-login` | Public | Admin login, returns `accessToken` + sets `adminRefreshToken` cookie |
| `POST` | `/api/auth/admin-refresh` | Cookie | Rotate admin access token using `adminRefreshToken` cookie |
| `GET` | `/api/auth/admin-profile` | Bearer | Get authenticated admin's profile |
| `GET` | `/api/auth/admin-apps` | Bearer | List all apps with API keys |
| `GET` | `/api/auth/admin-dashboard` | Bearer | Full dashboard data: profile + apps + paginated users |
| `POST` | `/api/auth/create-app` | Bearer | Create a new tenant app (free tier: 1 app max) |

**`POST /api/auth/create-app` body:**
```json
{
  "appName": "My SaaS",
  "appSlug": "my-saas",
  "authType": "JWT"
}
```
> `authType` accepts `"JWT"` (default) or `"SESSION"`.

**`GET /api/auth/admin-dashboard` query params:**
| Param | Description |
|---|---|
| `appId` or `appSlug` | Select a specific app (defaults to first app) |
| `page` | Page number for user list (default: 1) |
| `limit` | Users per page (default: 10) |
| `search` | Search by email, firstName, or lastName |

---

### Tenant User Endpoints

User endpoints require the `x-public-key` header to identify which app the user belongs to.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register-user` | `x-public-key` | Register a user in the tenant app |
| `POST` | `/api/auth/login` | `x-public-key` | User login, returns `accessToken` + sets `userRefreshToken` cookie (JWT mode) or `sessionId` cookie (Session mode) |
| `POST` | `/api/auth/refresh` | Cookie | Rotate user access token using `userRefreshToken` cookie |
| `GET` | `/api/auth/me` | Bearer + `x-public-key` (JWT) *or* `sessionId` cookie (Session) | Get current user profile |
| `POST` | `/api/auth/logout` | Optional Bearer | Invalidate all tokens/session for the current user |

**`POST /api/auth/register-user` and `POST /api/auth/login` body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword123",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

---

## Authentication Flows

### JWT Flow

```
Client                         Authly Server
  │                                  │
  │── POST /login ──────────────────►│
  │   { email, password }            │
  │   x-public-key: pk_...           │  ← Identifies tenant app
  │                                  │── Verify credentials
  │                                  │── Sign RS256 access token (15m)
  │                                  │── Sign RS256 refresh token (24h)
  │◄── 200 { accessToken } ──────────│
  │    Set-Cookie: userRefreshToken  │  ← httpOnly, 24h
  │                                  │
  │── GET /me ───────────────────────►│
  │   Authorization: Bearer <token>  │
  │   x-public-key: pk_...           │
  │◄── 200 { user } ────────────────│
```

### Session Flow

```
Client                         Authly Server                Redis
  │                                  │                         │
  │── POST /login ──────────────────►│                         │
  │   x-public-key: pk_...           │── SET session:<id> ────►│
  │◄── 200 { message } ─────────────│                         │
  │    Set-Cookie: sessionId         │                         │
  │                                  │                         │
  │── GET /me ──────────────────────►│                         │
  │   Cookie: sessionId              │── GET session:<id> ────►│
  │                                  │◄── sessionData ─────────│
  │◄── 200 { user } ────────────────│                         │
```

### Token Refresh Strategy

Access tokens expire in **15 minutes**. Implement silent refresh to provide a seamless UX:

1. Intercept any `401 Unauthorized` response on a protected request.
2. Call `POST /api/auth/refresh` (cookies are sent automatically with `credentials: 'include'`).
3. Store the new `accessToken` and retry the original request.
4. If refresh also returns `401`, the session has fully expired — redirect to login.

**Axios interceptor example:**
```javascript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Integrating Authly Into Your App

### 1. Register as an Admin

```bash
curl -X POST https://your-authly-instance.com/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{ "email": "me@example.com", "password": "secret123" }'
```

### 2. Login and Get an Admin Token

```bash
curl -X POST https://your-authly-instance.com/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{ "email": "me@example.com", "password": "secret123" }'
# Response: { "accessToken": "eyJ..." }
```

### 3. Create a Tenant App

```bash
curl -X POST https://your-authly-instance.com/api/auth/create-app \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "appName": "My App", "appSlug": "my-app", "authType": "JWT" }'
# Response: { "app": { "publicKey": "pk_...", "secretKey": "sk_..." } }
```

### 4. Use the Public Key in Your Frontend

```javascript
// Register a user in your app
const res = await fetch('https://your-authly-instance.com/api/auth/register-user', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'x-public-key': 'pk_your_public_key_here',
  },
  body: JSON.stringify({ email: 'user@example.com', password: 'pass123' }),
});
const { accessToken } = await res.json();
```

> ⚠️ Only the `pk_*` public key should be used in frontend code. Never expose the `sk_*` secret key on the client.

---

## Security

| Feature | Implementation |
|---|---|
| Password hashing | bcryptjs with salt rounds = 10 |
| Admin tokens | HS256 JWT signed with `JWT_SECRET` |
| User tokens | RS256 JWT signed with a **per-app** RSA-2048 private key |
| Refresh token storage | httpOnly cookie, not accessible to JavaScript |
| Token revocation | Redis blacklisting with TTL equal to token expiry |
| Session storage | Redis with 24h TTL |
| Rate limiting | All `/api/auth` routes via `express-rate-limit` |
| HTTP headers | `helmet` applied globally |
| CORS | Admin-only routes restricted to `ALLOWED_ORIGINS`; tenant routes open |
| Input validation | Zod schemas on all request bodies |
| Tenant isolation | Users scoped by `(email, appId)` unique constraint; sessions validated against app's public key |

---

## Database Schema

```
Admin ──┐
        │ 1:N
        ├──► App ──────────► AppJwtConfig  (RSA keys per app)
        │         │
        │         ├──► ApiKey[]            (sk_* keys)
        │         │
        │         └──► User[]              (tenant users, email unique per app)
        │
        └── isPro / plan                   (Free/Pro tier gating)
```

| Model | Key Fields |
|---|---|
| `Admin` | `id`, `email`, `password`, `isPro`, `plan` |
| `App` | `id`, `slug` (unique), `publicKey` (unique), `authType` (JWT/SESSION), `isActive` |
| `AppJwtConfig` | `privateKey`, `publicKey` (RSA PEM, one-to-one with App) |
| `ApiKey` | `key` (sk_*), `name`, `lastUsedAt` |
| `User` | `email`, `password`, `appId` — unique constraint on `(email, appId)` |

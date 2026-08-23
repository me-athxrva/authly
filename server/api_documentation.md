# Authly API Documentation

This document provides details for all available API endpoints in the Authly multi-tenant authentication system.

## Base URL

| Environment | URL |
|-------------|-----|
| Local       | `http://localhost:3000` |
| Production  | Set via `VITE_API_BASE_URL` in client `.env` |

---

## 1. General Endpoints

### Health Check
- **Endpoint**: `GET /health`
- **Description**: Performs live health and latency checks on backend services (PostgreSQL database via Prisma and Redis).
- **Auth**: None
- **Responses**:
  - `200 OK` *(All services healthy)*:
    ```json
    {
      "status": "healthy",
      "timestamp": "2026-07-21T10:32:00.000Z",
      "services": {
        "database": {
          "status": "up",
          "latency": "2ms"
        },
        "redis": {
          "status": "up",
          "latency": "1ms"
        }
      }
    }
    ```
  - `503 Service Unavailable` *(One or more services down)*:
    ```json
    {
      "status": "unhealthy",
      "timestamp": "2026-07-21T10:32:00.000Z",
      "services": {
        "database": {
          "status": "down",
          "latency": null,
          "error": "Connection error details..."
        },
        "redis": {
          "status": "up",
          "latency": "1ms"
        }
      }
    }
    ```

---

## 2. Authentication Endpoints (Mounted at `/api/auth`)

> **Note:** All routes under `/api/auth` are rate-limited via an IP-based login limiter middleware.

---

### Register Admin
Registers a new platform administrator account.

- **Endpoint**: `POST /api/auth/register-admin`
- **Auth**: None (public)
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "securepassword123",
    "firstName": "John",
    "lastName": "Doe",
    "isPro": false,
    "plan": "FREE"
  }
  ```
  > `firstName`, `lastName`, `isPro` (default `false`), and `plan` (default `"FREE"`) are optional.

- **Responses**:
  - `201 Created`:
    ```json
    {
      "message": "Admin registered successfully",
      "admin": {
        "id": "...",
        "email": "admin@example.com"
      },
      "status": "success"
    }
    ```
  - `400 Bad Request`:
    ```json
    {
      "message": "Email already registered",
      "status": "failed"
    }
    ```

---

### Admin Login
Authenticates a platform administrator.

- **Endpoint**: `POST /api/auth/admin-login`
- **Auth**: None (public)
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "securepassword123"
  }
  ```

- **Responses**:
  - `200 OK`:
    ```json
    {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "status": "success"
    }
    ```
    > Sets an `httpOnly` cookie named `adminRefreshToken` (24h expiry). Cookie uses `SameSite=None; Secure` in production and `SameSite=Lax` in development.
  - `401 Unauthorized`:
    ```json
    {
      "message": "Invalid credentials",
      "status": "failed"
    }
    ```

---

### Admin Refresh Token
Issues a new access token using a valid refresh token.

- **Endpoint**: `POST /api/auth/admin-refresh`
- **Auth**: Reads `adminRefreshToken` cookie automatically (no body required if cookie is present).
- **Request Body** *(optional)*:
  ```json
  { "refreshToken": "..." }
  ```

- **Responses**:
  - `200 OK`:
    ```json
    {
      "accessToken": "...",
      "status": "success"
    }
    ```
  - `400 Bad Request` / `401 Unauthorized`:
    ```json
    {
      "message": "Refresh token is required" | "Refresh token has been revoked" | "Invalid or expired refresh token",
      "status": "failed"
    }
    ```

---

### Get Admin Profile
Returns the profile of the currently authenticated administrator.

- **Endpoint**: `GET /api/auth/admin-profile`
- **Auth**: `Authorization: Bearer <adminAccessToken>` *(required)*
- **Responses**:
  - `200 OK`:
    ```json
    {
      "admin": {
        "id": "...",
        "email": "admin@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "isPro": false,
        "plan": "FREE",
        "createdAt": "..."
      },
      "status": "success"
    }
    ```
  - `401 Unauthorized`: Token missing, blacklisted, or invalid.
  - `404 Not Found`: Admin record not found.

---

### Create App
Creates a new application workspace under the authenticated admin.

- **Endpoint**: `POST /api/auth/create-app`
- **Auth**: `Authorization: Bearer <adminAccessToken>` *(required)*
- **Request Body**:
  ```json
  {
    "appName": "My SaaS",
    "appSlug": "my-saas",
    "authType": "JWT"
  }
  ```
  > `authType` is optional. Accepted values: `"JWT"` (default) or `"SESSION"`.

- **Responses**:
  - `201 Created`:
    ```json
    {
      "message": "App created successfully",
      "app": {
        "id": "...",
        "name": "My SaaS",
        "slug": "my-saas",
        "publicKey": "pk_...",
        "secretKey": "sk_...",
        "authType": "JWT"
      },
      "status": "success"
    }
    ```
  - `400 Bad Request`: App slug already taken.
  - `401 Unauthorized`: Token missing or invalid.
  - `403 Forbidden` *(Free tier limit reached)*:
    ```json
    {
      "message": "Free tier limit reached. You can only create 1 app. Upgrade to Pro for unlimited apps.",
      "status": "failed"
    }
    ```

---

### Get Admin Apps
Returns all application workspaces owned by the authenticated admin, including their API keys.

- **Endpoint**: `GET /api/auth/admin-apps`
- **Auth**: `Authorization: Bearer <adminAccessToken>` *(required)*
- **Responses**:
  - `200 OK`:
    ```json
    {
      "apps": [
        {
          "id": "...",
          "name": "My SaaS",
          "slug": "my-saas",
          "publicKey": "pk_...",
          "authType": "JWT",
          "isActive": true,
          "createdAt": "...",
          "updatedAt": "...",
          "apiKeys": [
            {
              "key": "sk_...",
              "name": "Default Secret Key",
              "createdAt": "..."
            }
          ]
        }
      ],
      "status": "success"
    }
    ```
  - `401 Unauthorized`: Token missing or invalid.

---

### Get Admin Dashboard
Returns complete admin dashboard data: admin profile, list of owned apps, selected app details, and a paginated list of end-users for the selected app.

- **Endpoint**: `GET /api/auth/admin-dashboard`
- **Auth**: `Authorization: Bearer <adminAccessToken>` *(required)*
- **Query Parameters**:
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | `appId` | String | Optional | Select app by ID |
  | `appSlug` | String | Optional | Select app by slug |
  | `page` | Integer | Optional | Page number for end-user pagination (default: `1`) |
  | `limit` | Integer | Optional | Number of users per page (default: `10`) |
  | `search` | String | Optional | Search query filtering users by email, firstName, or lastName |

- **Responses**:
  - `200 OK`:
    ```json
    {
      "admin": {
        "id": "...",
        "email": "admin@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "isPro": true,
        "plan": "PRO",
        "createdAt": "..."
      },
      "apps": [ ... ],
      "selectedApp": {
        "id": "...",
        "name": "My SaaS",
        "slug": "my-saas",
        "publicKey": "pk_...",
        "authType": "JWT",
        "isActive": true,
        "createdAt": "..."
      },
      "users": [
        {
          "id": "...",
          "email": "user@example.com",
          "firstName": "Jane",
          "lastName": "Doe",
          "createdAt": "..."
        }
      ],
      "pagination": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      },
      "status": "success"
    }
    ```
  - `401 Unauthorized`: Token missing or invalid.
  - `404 Not Found`: Admin record not found.

---

### Register User
Registers a new end-user within a specific application tenant.

- **Endpoint**: `POST /api/auth/register-user`
- **Auth**: None — requires `x-public-key` header to identify the target application.
- **Headers**:
  | Header | Value |
  |--------|-------|
  | `x-public-key` | The app's public key (e.g. `pk_...`) |
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "userpassword123",
    "firstName": "Jane",
    "lastName": "Doe"
  }
  ```
  > `firstName` and `lastName` are optional.

- **Responses**:
  - `201 Created` *(JWT App)*:
    ```json
    {
      "message": "User registered successfully",
      "accessToken": "...",
      "status": "success"
    }
    ```
    > Sets an `httpOnly` cookie named `userRefreshToken` (24h expiry).
  - `201 Created` *(SESSION App)*:
    ```json
    {
      "message": "User registered successfully (Session started)",
      "status": "success"
    }
    ```
    > Sets an `httpOnly` cookie named `sessionId` (24h expiry in Redis & Cookie).
  - `400 Bad Request`: `x-public-key` header missing or user already registered in this app.
  - `403 Forbidden`: App access has been revoked (`app.isActive` is `false`).
  - `404 Not Found`: App not found.

---

### Tenant User Login
Authenticates an end-user within a specific application tenant.

- **Endpoint**: `POST /api/auth/login`
- **Auth**: None — requires `x-public-key` header.
- **Headers**:
  | Header | Value |
  |--------|-------|
  | `x-public-key` | The app's public key (e.g. `pk_...`) |
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "userpassword123"
  }
  ```

- **Responses**:
  - `200 OK` *(JWT App)*:
    ```json
    {
      "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "status": "success"
    }
    ```
    > Sets an `httpOnly` cookie named `userRefreshToken`. The access token is signed with the **app's RS256 private key** (not the global secret).
  - `200 OK` *(SESSION App)*:
    ```json
    {
      "message": "Login successful (Session started)",
      "status": "success"
    }
    ```
    > Sets an `httpOnly` cookie named `sessionId`.
  - `400 Bad Request`: `x-public-key` header missing.
  - `401 Unauthorized`: Invalid credentials.
  - `403 Forbidden`: App access has been revoked (`app.isActive` is `false`).
  - `404 Not Found`: App not found.

---

### Tenant User Refresh Token
Issues a new user access token from a valid refresh token.

- **Endpoint**: `POST /api/auth/refresh`
- **Auth**: Reads `userRefreshToken` cookie automatically (no body required if cookie is present).
- **Request Body** *(optional)*:
  ```json
  { "refreshToken": "..." }
  ```

- **Responses**:
  - `200 OK`: `{ "accessToken": "...", "status": "success" }`
  - `401 Unauthorized`: Refresh token revoked, blacklisted, or expired.

---

### Get Current User
Returns the profile of the currently authenticated end-user.

- **Endpoint**: `GET /api/auth/me`
- **Auth**: Depends on the app's `authType`:
  | Auth Type | Required |
  |-----------|----------|
  | JWT       | `Authorization: Bearer <token>` header + `x-public-key` header |
  | SESSION   | `sessionId` cookie + `x-public-key` header |

- **Responses**:
  - `200 OK`:
    ```json
    {
      "user": {
        "id": "...",
        "email": "user@example.com",
        "firstName": "Jane",
        "lastName": "Doe",
        "appId": "...",
        "createdAt": "..."
      },
      "status": "success"
    }
    ```
  - `401 Unauthorized`: Token revoked/expired, session invalid, or authentication missing.
  - `403 Forbidden`: Session does not match the app associated with the provided `x-public-key`.
  - `404 Not Found`: User not found.

---

### Get JWT Public Key
Returns the RSA public key (in PEM format) used to sign RS256 JWT access tokens for a specific application. Third-party backends use this key to verify token authenticity and claims locally without making RPC calls back to Authly.

- **Endpoint**: `GET /api/auth/jwt-public-key`
- **Auth**: Protected (Admin Bearer Token: `Authorization: Bearer <admin_access_token>`)
- **Headers / Query Parameters**:
  - `Authorization` header: `Bearer <admin_access_token>` (Mandatory)
  - Provide an application identifier using one of:
    - `x-public-key` header (e.g. `pk_...`)
    - `publicKey` query parameter (e.g. `?publicKey=pk_...`)
    - `appSlug` query parameter (e.g. `?appSlug=my-app`)
    - `appId` query parameter (e.g. `?appId=cuid...`)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
      "algorithm": "RS256",
      "status": "success"
    }
    ```
  - `400 Bad Request`: App identifier missing.
  - `401 Unauthorized`: Missing or invalid admin Bearer token.
  - `404 Not Found`: App or JWT configuration not found (or does not belong to authenticated admin).

---

### Logout
Universal logout endpoint for both admins and tenant users.

- **Endpoint**: `POST /api/auth/logout`
- **Auth**: Optional — pass `Authorization: Bearer <token>` to also blacklist the current access token.
- **Description**: Clears the `adminRefreshToken`, `userRefreshToken`, and `sessionId` cookies. Blacklists both refresh tokens (24h) and the current access token (15 min) in Redis.
- **Responses**:
  - `200 OK`: `{ "message": "Logged out successfully", "status": "success" }`

---

## 3. Headers Reference

| Header | Used By | Description |
|--------|---------|-------------|
| `x-public-key` | Tenant endpoints | Identifies the target application. Required for all user-scoped routes (login, register, refresh, me). |
| `Authorization` | Admin & JWT User endpoints | `Bearer <accessToken>`. Required for protected routes. |
| `Content-Type` | POST/PUT requests | Must be `application/json`. |

---

## 4. Cookies Reference

| Cookie Name | Set By | Expiry | Scope |
|-------------|--------|--------|-------|
| `adminRefreshToken` | Admin login | 24 hours | Admin token refresh |
| `userRefreshToken` | User login / register (JWT apps) | 24 hours | User token refresh |
| `sessionId` | User login / register (SESSION apps) | 24 hours | Session-based auth |

> All cookies are `httpOnly`, preventing JavaScript access. In production they require `Secure` (HTTPS) and `SameSite=None` for cross-origin requests. In development, `SameSite=Lax` is used.

---

## 5. Handling Token Expiration

Access tokens are short-lived (**15 minutes**). When one expires the API returns `401 Unauthorized`.

### Recommended Flow

1. **Monitor Responses** — intercept all `401` errors on protected requests.
2. **Silent Refresh** — call `POST /api/auth/refresh` (or `/api/auth/admin-refresh` for admins; cookies are sent automatically if `credentials: "include"` is set).
3. **Retry** — store the new `accessToken` and replay the original request.
4. **Re-authenticate** — if the refresh also returns `401`, the session is fully expired (24h). Redirect to login.

### Example — Axios Interceptor

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://authly-chi.vercel.app',
  withCredentials: true, // send cookies automatically
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
}
```

### Example — Fetch (native)

```javascript
async function authFetch(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    const refresh = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (refresh.ok) {
      const { accessToken } = await refresh.json();
      localStorage.setItem('token', accessToken);

      response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          ...options.headers,
        },
      });
    } else {
      window.location.href = '/login';
    }
  }

  return response;
}
```

---

## 6. CORS Configuration

The server configures CORS dynamically. For sensitive administrative endpoints (`/api/auth/admin-login`, `/api/auth/register-admin`, `/api/auth/create-app`), origin checking is enforced against origins listed in the `ALLOWED_ORIGINS` environment variable (comma-separated):

```env
# server/.env
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
```

For public tenant endpoints, cross-origin access is permitted while allowing credentials (`credentials: true`).

All fetch/axios requests from the frontend must include `credentials: "include"` (or `withCredentials: true`) for cookies to be sent and received across origins.

---

## 7. Production Axios Integration Template

Third-party application developers can copy and drop this full `authlyClient.ts` module into their codebase to handle all tenant authentication interactions with Authly:

```typescript
import axios from "axios";

const AUTHLY_URL = "http://localhost:3000"; // Replace with your Authly server URL
const PUBLIC_KEY = "pk_your_app_public_key_here"; // Replace with your tenant App Public Key

// 1. Create a pre-configured Axios instance
export const authlyClient = axios.create({
  baseURL: AUTHLY_URL,
  withCredentials: true, // Crucial: automatically sends/receives httpOnly cookies (userRefreshToken / sessionId)
  headers: {
    "Content-Type": "application/json",
    "x-public-key": PUBLIC_KEY,
  },
});

let accessToken: string | null = localStorage.getItem("authly_token");

export const setToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem("authly_token", token);
  } else {
    localStorage.removeItem("authly_token");
  }
};

// 2. Request Interceptor: Dynamically attach Bearer token if present
authlyClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 3. Response Interceptor: Perform automatic silent token refresh on 401 Unauthorized
authlyClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${AUTHLY_URL}/api/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { "x-public-key": PUBLIC_KEY },
          }
        );

        if (data?.accessToken) {
          setToken(data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return authlyClient(originalRequest);
        }
      } catch (refreshError) {
        setToken(null);
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// --- Exported Auth Helper Methods ---

/** Register a new user under your application tenant */
export const registerUser = async (userData: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) => {
  const { data } = await authlyClient.post("/api/auth/register-user", userData);
  if (data.accessToken) setToken(data.accessToken);
  return data;
};

/** Authenticate an end-user within your tenant */
export const loginUser = async (credentials: { email: string; password: string }) => {
  const { data } = await authlyClient.post("/api/auth/login", credentials);
  if (data.accessToken) setToken(data.accessToken);
  return data;
};

/** Retrieve current authenticated user profile */
export const getUserProfile = async () => {
  const { data } = await authlyClient.get("/api/auth/me");
  return data.user;
};

/** Log out current user and clear tokens/cookies */
export const logoutUser = async () => {
  try {
    await authlyClient.post("/api/auth/logout");
  } finally {
    setToken(null);
  }
};
```


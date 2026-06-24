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
- **Description**: Returns the current server status.
- **Auth**: None
- **Response**:
  ```json
  { "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
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
    "lastName": "Doe"
  }
  ```
  > `firstName` and `lastName` are optional.

- **Responses**:
  - `201 Created`:
    ```json
    {
      "message": "Admin registered successfully",
      "admin": { "id": "...", "email": "..." }
    }
    ```
  - `400 Bad Request`: Email already registered.

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
  - `401 Unauthorized`: Invalid credentials.

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
  - `200 OK`: `{ "accessToken": "...", "status": "success" }`
  - `401 Unauthorized`: Invalid or expired refresh token.

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
  - `401 Unauthorized`: Token missing or invalid.
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
  - `403 Forbidden`: Requester is not an admin.

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
              "name": "Default",
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
  - `201 Created`:
    ```json
    {
      "message": "User registered successfully",
      "accessToken": "...",
      "status": "success"
    }
    ```
    > Sets an `httpOnly` cookie named `userRefreshToken`.
  - `400 Bad Request`: User already exists in this app.
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
  - `200 OK`:
    ```json
    {
      "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "status": "success"
    }
    ```
    > Sets an `httpOnly` cookie named `userRefreshToken`. The access token is signed with the **app's RS256 private key** (not the global secret).
  - `400 Bad Request`: `x-public-key` header missing.
  - `401 Unauthorized`: Invalid credentials.
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
  - `401 Unauthorized`: Invalid or expired refresh token.

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
  - `401 Unauthorized`: Token revoked, expired, or session invalid.
  - `404 Not Found`: User not found.

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
| `Authorization` | Admin endpoints | `Bearer <accessToken>`. Required for protected admin routes. |
| `Content-Type` | POST/PUT requests | Must be `application/json`. |

---

## 4. Cookies Reference

| Cookie Name | Set By | Expiry | Scope |
|-------------|--------|--------|-------|
| `adminRefreshToken` | Admin login | 24 hours | Admin token refresh |
| `userRefreshToken` | User login / register | 24 hours | User token refresh |
| `sessionId` | Session-type app login | 24 hours | Session-based auth |

> All cookies are `httpOnly`, preventing JavaScript access. In production they require `Secure` (HTTPS) and `SameSite=None` for cross-origin requests. In development, `SameSite=Lax` is used.

---

## 5. Handling Token Expiration

Access tokens are short-lived (**15 minutes**). When one expires the API returns `401 Unauthorized`.

### Recommended Flow

1. **Monitor Responses** — intercept all `401` errors on protected requests.
2. **Silent Refresh** — call `POST /api/auth/refresh` (cookies are sent automatically if `credentials: "include"` is set).
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
);
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

The server reads allowed frontend origins from the `ALLOWED_ORIGINS` environment variable (comma-separated).

```env
# server/.env
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
```

If `ALLOWED_ORIGINS` is not set, all origins are permitted (suitable for local development only).

All fetch/axios calls from the frontend must include `credentials: "include"` (or `withCredentials: true`) for cookies to be sent and received across origins.

# Authly API Documentation

This document provides details for the available API endpoints in the Authly Multi-tenant Authentication system.

## Base URL
Default: `http://localhost:3000`

---

## 1. General Endpoints

### Health Check
- **Endpoint**: `GET /health`
- **Description**: Returns the current status of the server.
- **Response**:
  - `200 OK`: `{"status": "ok", "timestamp": "..."}`

---

## 2. Authentication Endpoints (Mounted at `/api/auth`)

### Register Admin
Registers a new platform administrator account.
- **Endpoint**: `POST /api/auth/register-admin`
- **Description**: Creates a new Admin record. This account can later create and manage multiple apps.
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "securepassword123",
    "firstName": "John", (optional)
    "lastName": "Doe" (optional)
  }
  ```
- **Responses**:
  - `201 Created`: `{"message": "Admin registered successfully", "admin": {"id": "...", "email": "..."}}`
  - `400 Bad Request`: If the email is already registered.

---

### Create App
Creates a new application under the logged-in admin.
- **Endpoint**: `POST /api/auth/create-app`
- **Description**: Creates a new App record and links it to the authenticated Admin.
- **Requirement**: Must include a valid Admin `accessToken` in the Authorization header.
- **Request Body**:
  ```json
  {
    "appName": "My SaaS",
    "appSlug": "my-saas",
    "authType": "JWT" // or "SESSION" (optional, default: "JWT")
  }
  ```
- **Responses**:
  - `201 Created`: 
    ```json
    {
      "message": "App created successfully",
      "app": {
        "id": "...",
        "name": "...",
        "slug": "...",
        "publicKey": "pk_...",
        "secretKey": "sk_...",
        "authType": "..."
      },
      "status": "success"
    }
    ```


  - `400 Bad Request`: If the app slug is already taken.
  - `401 Unauthorized`: Token missing or invalid.
  - `403 Forbidden`: User is not an admin.

---


### Admin Login
Authenticates an application administrator.
- **Endpoint**: `POST /api/auth/admin-login`
- **Description**: Verifies admin credentials and returns a JWT token.
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
      "accessToken": "JWT_ACCESS_TOKEN",
      "status": "success"
    }
    ```

    *Note: The `refreshToken` is set as an `httpOnly` cookie named `adminRefreshToken`.*
  - `401 Unauthorized`: Invalid credentials.

---

### Admin Refresh Token
Refresh an expired admin access token.
- **Endpoint**: `POST /api/auth/admin-refresh`
- **Description**: Verifies a valid refresh token and returns a new access token and a new refresh token.
- **Request Body**:
  ```json
  {
    "refreshToken": "JWT_REFRESH_TOKEN"
  }
  ```
- **Responses**:
  - `200 OK`: `{"accessToken": "...", "status": "success"}`
    *Note: The system reads the refresh token from the `adminRefreshToken` cookie.*

  - `401 Unauthorized`: Invalid or expired refresh token.

---

### Register User
Registers a new user within a specific application.
- **Endpoint**: `POST /api/auth/register-user`
- **Description**: Creates a new User record associated with an application.

- **Requirement**: Must include the `x-public-key` header.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "userpassword123",
    "firstName": "Jane", (optional)
    "lastName": "Doe" (optional)
  }
  ```



- **Responses**:
  - `201 Created`: 
    ```json
    {
      "message": "User registered successfully",
      "accessToken": "...",
      "status": "success"
    }
    ```

    *Note: Sets the `userRefreshToken` cookie.*
  - `400 Bad Request`: User already exists in this app.
  - `404 Not Found`: App not found.

---

### Tenant User Login

Authenticates a normal user within a specific application (tenant).
- **Endpoint**: `POST /api/auth/login`
- **Description**: Verifies user credentials for a specific application. Note that the same email can exist in multiple apps.

- **Requirement**: Must include the `x-public-key` header.
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
      "accessToken": "JWT_ACCESS_TOKEN",
      "status": "success"
    }
    ```

    *Note: The `refreshToken` is set as an `httpOnly` cookie named `userRefreshToken`.*
  - `400 Bad Request`: App ID is missing.
  - `401 Unauthorized`: Invalid credentials.

---

### Tenant User Refresh Token
Refresh an expired tenant user access token.
- **Endpoint**: `POST /api/auth/refresh`
- **Description**: Verifies a valid refresh token and returns a new access token.
- **Request Body**:
  ```json
  {
    "refreshToken": "JWT_REFRESH_TOKEN" (Optional if cookie is sent)
  }
  ```
- **Responses**:
  - `200 OK`: `{"accessToken": "...", "status": "success"}`
    *Note: The system reads the refresh token from the `userRefreshToken` cookie.*

  - `401 Unauthorized`: Invalid or expired refresh token.


---

### Logout
Universal logout for both admins and tenant users.
- **Endpoint**: `POST /api/auth/logout`
- **Description**: Clears the `adminRefreshToken` and `userRefreshToken` cookies and blacklists both the refresh tokens (for 24 hours) and the current access token (for 15 minutes) in Redis.
- **Responses**:
  - `200 OK`: `{"message": "Logged out successfully", "status": "success"}`


---

### Get Current User
Retrieves details of the currently authenticated user.
- **Endpoint**: `GET /api/auth/me`
- **Description**: Returns user profile information. Works for both JWT-based and Session-based applications.
- **Requirement**: 
  - **JWT Apps**: Must include `Authorization: Bearer <token>` and `x-public-key` header.
  - **Session Apps**: Must include the `sessionId` cookie and `x-public-key` header.
- **Responses**:
  - `200 OK`: 
    ```json
    {
      "user": {
        "id": "...",
        "email": "...",
        "firstName": "...",
        "lastName": "...",
        "appId": "...",
        "createdAt": "..."
      },
      "status": "success"
    }
    ```
  - `401 Unauthorized`: Session expired or token invalid.


---

## Headers


### Tenant Identification
For identifying the application/tenant in user routes (login, register, refresh):
- `x-public-key`: The shareable Public Key of the application. Required for all tenant-scoped operations.



### Authorization
For protected routes (when implemented):
- `Authorization`: `Bearer <JWT_TOKEN>`

---

## 3. Handling Token Expiration

Since Authly is a secure authentication service, `accessTokens` are short-lived (15 minutes). When a token expires, the API will return a `401 Unauthorized` status.

### Recommended Flow for Developers:

1.  **Monitor Responses**: Your client-side application should check for `401` status codes on all protected requests.
2.  **Silent Refresh**: When a `401` is received, call the `/api/auth/refresh` endpoint. 
    *   *Security Note*: Since Authly uses `httpOnly` cookies for refresh tokens, you don't need to pass anything in the request body if the browser is handling cookies.
3.  **Retry**: Once the refresh call succeeds, update your stored `accessToken` and retry the original failed request.
4.  **Re-authentication**: If the `/api/auth/refresh` call also returns a `401`, it means the user's session has completely expired (24 hours), and they must be prompted to log in again.

### Example (Axios Interceptor):

```javascript
import axios from 'axios';

const api = axios.create({ baseURL: 'https://api.authly.com' });

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const { accessToken } = res.data;
        
        // Update the original request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Redirect to login or clear local state
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
```

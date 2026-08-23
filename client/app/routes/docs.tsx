import { useState } from "react";
import type { Route } from "./+types/docs";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Lock, Menu, X, ArrowRight, Check, Copy, RefreshCw, Server, Laptop } from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Authly | Docs" },
    { name: "description", content: "Multi-tenant authentication SaaS API documentation." },
  ];
}

interface ParamItem {
  name: string;
  type: string;
  required: boolean;
  desc: string;
}

interface DocSection {
  id: string;
  category: "General" | "Authentication" | "Integration";
  title: string;
  desc: string;
  method?: "GET" | "POST" | null;
  path?: string | null;
  headers?: { name: string; description: string; }[];
  params?: ParamItem[];
  requestBody?: string;
  responseSuccess?: string;
  codeTemplate?: string;
}

const docSections: DocSection[] = [
  {
    id: "overview",
    category: "General",
    title: "System Overview",
    desc: "Authly is engineered as a secure, high-performance, multi-tenant authentication engine. All requests default to the base URL listed below. Tenant user routes are isolated cryptographically through shareable application public keys.",
    method: null,
    path: null,
    requestBody: undefined,
    responseSuccess: undefined
  },
  {
    id: "playground",
    category: "General",
    title: "Auth Flow Simulator",
    desc: "Interactive key and token visualizer. Understand how public and secret keys coordinate at the client and server levels.",
    method: null,
    path: null,
  },
  {
    id: "headers",
    category: "General",
    title: "Required Headers",
    desc: "Authly uses standard and custom headers to authenticate and partition multi-tenant requests.",
    headers: [
      { name: "x-public-key", description: "Mandatory for all user routes (Register User, User Login, Me). Identifies the target tenant application." },
      { name: "Authorization", description: "Mandatory for authenticated routes. Standard Bearer format: Bearer <access_token>." },
      { name: "Content-Type", description: "Must be set to application/json for all write requests." }
    ]
  },
  {
    id: "register-user",
    category: "Authentication",
    title: "Register User",
    desc: "Registers a normal user account within a specific client tenant. Requires the x-public-key header representing the tenant application.",
    method: "POST",
    path: "/api/auth/register-user",
    params: [
      { name: "email", type: "string", required: true, desc: "Unique user email address within the application scope." },
      { name: "password", type: "string", required: true, desc: "The password for the user account." },
      { name: "firstName", type: "string", required: false, desc: "Optional first name." },
      { name: "lastName", type: "string", required: false, desc: "Optional last name." }
    ],
    requestBody: `{
  "email": "user@example.com",
  "password": "userpassword123",
  "firstName": "Jane",
  "lastName": "Doe"
}`,
    responseSuccess: `{
  "message": "User registered successfully",
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "status": "success"
}`
  },
  {
    id: "jwt-public-key",
    category: "Authentication",
    title: "Get JWT Public Key",
    desc: "Retrieves the tenant's RSA Public Key (PEM format) used for locally verifying RS256 JWT signatures on your backend services. Requires Admin Bearer authentication.",
    method: "GET",
    path: "/api/auth/jwt-public-key",
    headers: [
      { name: "Authorization", description: "Mandatory. Bearer <admin_access_token>." },
      { name: "x-public-key", description: "The app public key identifier (or pass ?publicKey=pk_... / ?appSlug=... as query param)." }
    ],
    responseSuccess: `{
  "publicKey": "-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\\n-----END PUBLIC KEY-----",
  "algorithm": "RS256",
  "status": "success"
}`
  },
  {
    id: "user-login",
    category: "Authentication",
    title: "User Login",
    desc: "Authenticates a tenant user. Evaluates credentials within the context of the application specified by the x-public-key header. Sets the userRefreshToken cookie.",
    method: "POST",
    path: "/api/auth/login",
    params: [
      { name: "email", type: "string", required: true, desc: "The user's registered email address." },
      { name: "password", type: "string", required: true, desc: "The user password." }
    ],
    requestBody: `{
  "email": "user@example.com",
  "password": "userpassword123"
}`,
    responseSuccess: `{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "status": "success"
}`
  },
  {
    id: "get-profile",
    category: "Authentication",
    title: "Get Profile",
    desc: "Retrieves profile information for the authenticated user session. Evaluates claims locally using Edge-compatible JWT verification.",
    method: "GET",
    path: "/api/auth/me",
    requestBody: undefined,
    responseSuccess: `{
  "user": {
    "id": "usr_9a2f1c83",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "appId": "app_98f238d",
    "createdAt": "2026-06-25T01:14:02.000Z"
  },
  "status": "success"
}`
  },
  {
    id: "token-refresh",
    category: "Authentication",
    title: "Token Refresh",
    desc: "Refreshes an expired 15-minute access token. Authenticates using the secure httpOnly userRefreshToken cookie automatically processed by the browser.",
    method: "POST",
    path: "/api/auth/refresh",
    params: [
      { name: "refreshToken", type: "string", required: false, desc: "Optional body token. Ignored if secure cookie is present." }
    ],
    requestBody: `{}`,
    responseSuccess: `{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "status": "success"
}`
  },
  {
    id: "logout",
    category: "Authentication",
    title: "Logout",
    desc: "Blacklists active tokens in Redis and clears all refresh token cookies.",
    method: "POST",
    path: "/api/auth/logout",
    requestBody: `{}`,
    responseSuccess: `{
  "message": "Logged out successfully",
  "status": "success"
}`
  },
  {
    id: "axios-template",
    category: "Integration",
    title: "Axios SDK / Template",
    desc: "Copy-pasteable Axios client module for third-party tenant apps. Pre-configured with automatic public key headers, credentials (httpOnly cookies), and a 401 response interceptor for silent token refresh.",
    method: null,
    path: null,
    codeTemplate: `import axios from "axios";

const AUTHLY_URL = "http://localhost:3000"; // Or process.env.VITE_AUTHLY_URL
const PUBLIC_KEY = "pk_your_app_public_key_here";

// 1. Create configured Axios client instance
export const authlyClient = axios.create({
  baseURL: AUTHLY_URL,
  withCredentials: true, // Sends and receives httpOnly cookies (userRefreshToken / sessionId)
  headers: {
    "Content-Type": "application/json",
    "x-public-key": PUBLIC_KEY,
  },
});

let accessToken: string | null = localStorage.getItem("authly_token");

export const setToken = (token: string | null) => {
  accessToken = token;
  if (token) localStorage.setItem("authly_token", token);
  else localStorage.removeItem("authly_token");
};

// 2. Request Interceptor: Attach Bearer Access Token
authlyClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = \`Bearer \${accessToken}\`;
  }
  return config;
});

// 3. Response Interceptor: Silent Token Refresh on 401 Unauthorized
authlyClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          \`\${AUTHLY_URL}/api/auth/refresh\`,
          {},
          {
            withCredentials: true,
            headers: { "x-public-key": PUBLIC_KEY },
          }
        );
        if (data?.accessToken) {
          setToken(data.accessToken);
          originalRequest.headers.Authorization = \`Bearer \${data.accessToken}\`;
          return authlyClient(originalRequest);
        }
      } catch (refreshErr) {
        setToken(null);
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

// --- Exported Auth Helper Methods ---

export const registerUser = (userData: { email: string; password: string; firstName?: string; lastName?: string }) =>
  authlyClient.post("/api/auth/register-user", userData).then((res) => {
    if (res.data.accessToken) setToken(res.data.accessToken);
    return res.data;
  });

export const loginUser = (credentials: { email: string; password: string }) =>
  authlyClient.post("/api/auth/login", credentials).then((res) => {
    if (res.data.accessToken) setToken(res.data.accessToken);
    return res.data;
  });

export const getProfile = () =>
  authlyClient.get("/api/auth/me").then((res) => res.data.user);

export const logoutUser = () =>
  authlyClient.post("/api/auth/logout").finally(() => setToken(null));`
  }
];

function getMethodBadgeClass(method: "GET" | "POST" | null | undefined) {
  if (!method) return "";
  if (method === "GET") {
    return "text-green-600 dark:text-green-400 bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-900/60";
  }
  return "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60";
}

function HighlightedCode({ code }: { code: string }) {
  const isJson = code.trim().startsWith("{") || code.trim().startsWith("[");

  if (isJson) {
    try {
      const obj = JSON.parse(code);
      const formatted = JSON.stringify(obj, null, 2);
      const lines = formatted.split("\n");
      return (
        <code className="block font-mono text-xs leading-relaxed text-zinc-300">
          {lines.map((line, idx) => {
            const keyMatch = line.match(/^(\s*)"([^"]+)"\s*:\s*(.*)$/);
            if (keyMatch) {
              const indent = keyMatch[1];
              const key = keyMatch[2];
              const value = keyMatch[3];

              let valElement = <span className="text-zinc-300">{value}</span>;
              if (value.startsWith('"')) {
                valElement = <span className="text-amber-400 dark:text-amber-300">{value}</span>;
              } else if (value.trim().replace(/,$/, "") === "true" || value.trim().replace(/,$/, "") === "false") {
                valElement = <span className="text-purple-400 dark:text-purple-300">{value}</span>;
              } else if (!isNaN(Number(value.replace(/,$/, "").trim()))) {
                valElement = <span className="text-teal-400 dark:text-teal-300">{value}</span>;
              } else if (value.trim().replace(/,$/, "") === "null") {
                valElement = <span className="text-red-400 dark:text-red-300">{value}</span>;
              }

              return (
                <div key={idx}>
                  <span className="whitespace-pre">{indent}</span>
                  <span className="text-sky-400 dark:text-sky-300">"{key}"</span>
                  <span className="text-zinc-500">: </span>
                  {valElement}
                </div>
              );
            }
            return (
              <div key={idx} className={line.trim() === "{" || line.trim() === "}" || line.trim() === "[" || line.trim() === "]" || line.trim() === "}," || line.trim() === "]," ? "text-zinc-500" : ""}>
                <span className="whitespace-pre">{line}</span>
              </div>
            );
          })}
        </code>
      );
    } catch {
      // Fallback
    }
  }

  const lines = code.split("\n");
  return (
    <code className="block font-mono text-xs leading-relaxed text-zinc-300 font-light">
      {lines.map((line, idx) => {
        if (line.trim().startsWith("#") || line.trim().startsWith("//")) {
          return (
            <div key={idx} className="text-zinc-500 italic">
              <span className="whitespace-pre">{line}</span>
            </div>
          );
        }
        if (line.includes("-H") || line.includes("-X") || line.includes("-d")) {
          const parts = line.split(/(\s+)/);
          return (
            <div key={idx}>
              {parts.map((p, pIdx) => {
                if (p === "curl" || p === "POST" || p === "GET") return <span key={pIdx} className="text-emerald-400 font-semibold">{p}</span>;
                if (p.startsWith("-H") || p.startsWith("-X") || p.startsWith("-d")) return <span key={pIdx} className="text-sky-400">{p}</span>;
                return <span key={pIdx}>{p}</span>;
              })}
            </div>
          );
        }
        return (
          <div key={idx}>
            <span className="whitespace-pre">{line}</span>
          </div>
        );
      })}
    </code>
  );
}

function KeyPlayground() {
  const [publicKey, setPublicKey] = useState("pk_58c21a94eb8417c8");
  const [secretKey, setSecretKey] = useState("sk_87aF98d281a6");
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("password123");
  const [simStep, setSimStep] = useState<1 | 2 | 3>(1);

  const [loginReq, setLoginReq] = useState("");
  const [loginRes, setLoginRes] = useState("");
  const [token, setToken] = useState("");

  const [profileReq, setProfileReq] = useState("");
  const [profileRes, setProfileRes] = useState("");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const generateKeys = () => {
    const randomHex = () => Math.random().toString(16).substring(2, 10);
    setPublicKey(`pk_${randomHex()}${randomHex()}`);
    setSecretKey(`sk_${randomHex()}${randomHex()}`);
    setSimStep(1);
    setToken("");
    setIsAuthorized(null);
  };

  const simulateLogin = () => {
    const curlCommand = `curl -X POST http://localhost:3000/api/auth/login \\
  -H "x-public-key: ${publicKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "${email}",
    "password": "${"*".repeat(password.length)}"
  }'`;

    setLoginReq(curlCommand);

    const mockJwt = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
      tenant: publicKey.slice(8, 16),
      email: email,
      exp: Math.floor(Date.now() / 1000) + 900
    })).replace(/=/g, "")}.signature`;

    const responseJson = `{
  "status": "success",
  "accessToken": "${mockJwt}"
}`;

    setLoginRes(responseJson);
    setToken(mockJwt);
    setSimStep(2);
    setIsAuthorized(null);
  };

  const simulateVerify = () => {
    const curlCommand = `curl -X GET http://localhost:3000/api/auth/me \\
  -H "Authorization: Bearer ${token.slice(0, 16)}..." \\
  -H "x-public-key: ${publicKey}"`;

    setProfileReq(curlCommand);

    const responseJson = `{
  "status": "success",
  "user": {
    "id": "usr_${publicKey.slice(8, 16)}",
    "email": "${email}",
    "appId": "app_${publicKey.slice(8, 12)}",
    "createdAt": "${new Date().toISOString()}"
  }
}`;

    setProfileRes(responseJson);
    setIsAuthorized(true);
    setSimStep(3);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 p-6 border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-normal text-foreground">1. Configure Playground Keys</h3>
            <button
              onClick={generateKeys}
              className="text-xs font-mono flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800/60 bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-muted-foreground hover:text-foreground transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Regenerate Keys
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Public Key (Client side)</label>
              <div className="flex items-center gap-2 px-3 py-2 border border-zinc-200 dark:border-zinc-800/60 rounded-xl bg-background">
                <Laptop className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  className="w-full text-xs font-mono bg-transparent border-0 outline-hidden focus:ring-0 text-foreground"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Secret Key (Server/Edge side)</label>
              <div className="flex items-center gap-2 px-3 py-2 border border-zinc-200 dark:border-zinc-800/60 rounded-xl bg-background">
                <Server className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full text-xs font-mono bg-transparent border-0 outline-hidden focus:ring-0 text-foreground"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Architectural Note</h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-light">
              The <strong>Public Key</strong> identifies your application tenant securely on public client headers. The <strong>Secret Key</strong> is restricted to server integrations to verify access scopes.
            </p>
          </div>
          <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/40 flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Secure Separation
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className={`p-6 border rounded-2xl transition-all duration-300 ${simStep === 1
            ? "border-zinc-400 dark:border-zinc-600 bg-zinc-50/30 dark:bg-zinc-900/10 shadow-xs"
            : "border-zinc-200/80 dark:border-zinc-800/60 bg-transparent opacity-80"
            }`}>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Flow Step 01</span>
            <h3 className="text-lg font-normal text-foreground mt-1">Client User Login</h3>
            <p className="text-xs text-muted-foreground font-light mt-1.5 leading-relaxed">
              Submit credentials to generate a JWT. The client uses the <strong>Public Key</strong> to route this login to the correct tenant.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-800/60 rounded-xl text-xs bg-background text-foreground"
              />
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-800/60 rounded-xl text-xs bg-background text-foreground"
              />
            </div>

            <button
              onClick={simulateLogin}
              className="mt-4 w-full bg-foreground text-background px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              Simulate Login <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className={`p-6 border rounded-2xl transition-all duration-300 ${simStep === 2
            ? "border-zinc-400 dark:border-zinc-600 bg-zinc-50/30 dark:bg-zinc-900/10 shadow-xs"
            : "border-zinc-200/80 dark:border-zinc-800/60 bg-transparent opacity-60 pointer-events-none"
            }`}>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Flow Step 02</span>
            <h3 className="text-lg font-normal text-foreground mt-1">Edge/Server-side Request</h3>
            <p className="text-xs text-muted-foreground font-light mt-1.5 leading-relaxed">
              Use the retrieved <code>accessToken</code> to request the current user profile. The edge gateway uses the <strong>Secret Key</strong> signature trust to authorize the tenant request under 1ms.
            </p>

            <div className="mt-4 p-3 border border-zinc-200/80 dark:border-zinc-800/60 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/30 font-mono text-[10px] truncate text-muted-foreground">
              Token: {token ? token : "Awaiting login..."}
            </div>

            <button
              onClick={simulateVerify}
              disabled={!token}
              className="mt-4 w-full bg-foreground text-background px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Simulate Verification <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-zinc-950 flex flex-col h-[400px]">
          <div className="flex items-center justify-between bg-zinc-900/60 px-4 py-3 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-zinc-500" />
              <span className="text-xs font-mono text-zinc-400">Auth Request Monitor</span>
            </div>
            {isAuthorized && (
              <span className="text-[10px] font-mono bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full">
                VERIFIED ✓
              </span>
            )}
          </div>
          <div className="flex-1 p-5 overflow-y-auto font-mono text-xs text-zinc-300 space-y-4">
            {simStep === 1 && (
              <div className="text-zinc-500 flex flex-col items-center justify-center h-full text-center space-y-2">
                <Server className="h-8 w-8 text-zinc-700 animate-pulse" />
                <p>Waiting for credentials submission...</p>
                <p className="text-[10px] text-zinc-600 font-light">Input email and click Simulate Login on Step 1.</p>
              </div>
            )}

            {simStep >= 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] text-blue-400 font-semibold uppercase">API Request (Client Login)</span>
                  <pre className="p-3 bg-black/60 rounded-xl border border-zinc-800/50 overflow-x-auto">
                    <HighlightedCode code={loginReq} />
                  </pre>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] text-green-400 font-semibold uppercase">API Response (JWT Issued)</span>
                  <pre className="p-3 bg-black/60 rounded-xl border border-zinc-800/50 overflow-x-auto">
                    <HighlightedCode code={loginRes} />
                  </pre>
                </div>
              </div>
            )}

            {simStep === 3 && (
              <div className="space-y-4 pt-4 border-t border-zinc-900">
                <div className="space-y-2">
                  <span className="text-[10px] text-blue-400 font-semibold uppercase">API Request (Edge Profile fetch)</span>
                  <pre className="p-3 bg-black/60 rounded-xl border border-zinc-800/50 overflow-x-auto">
                    <HighlightedCode code={profileReq} />
                  </pre>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] text-green-400 font-semibold uppercase">API Response (Profile Returned)</span>
                  <pre className="p-3 bg-black/60 rounded-xl border border-zinc-800/50 overflow-x-auto">
                    <HighlightedCode code={profileRes} />
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Docs() {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const activeDoc = docSections.find((sec) => sec.id === activeSection) || docSections[0];

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden text-foreground bg-transparent transition-colors duration-300">
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200/80 dark:border-zinc-800/60 bg-transparent flex-shrink-0">
        <div className="px-6 pt-8 pb-4 flex items-center gap-2.5">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground/75" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">API Reference</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          {["General", "Authentication", "Integration"].map((cat) => (
            <div key={cat} className="space-y-1.5">
              <h4 className="px-3 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pt-4 pb-1">
                {cat}
              </h4>
              <ul className="space-y-1">
                {docSections
                  .filter((sec) => sec.category === cat)
                  .map((sec) => (
                    <li key={sec.id}>
                      <button
                        onClick={() => setActiveSection(sec.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${activeSection === sec.id
                          ? "bg-zinc-100 dark:bg-zinc-900/60 text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20"
                          }`}
                      >
                        <span className="pl-1.5 font-light">{sec.title}</span>
                        {sec.method && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${getMethodBadgeClass(sec.method)}`}>
                            {sec.method}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="md:hidden fixed top-16 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/60 bg-background/80 backdrop-blur-md">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {activeDoc.method && (
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${getMethodBadgeClass(activeDoc.method)}`}>
              {activeDoc.method}
            </span>
          )}
          {activeDoc.title}
        </span>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 border border-zinc-200 dark:border-zinc-800/60 rounded bg-background"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden fixed top-[113px] left-0 right-0 bottom-0 z-20 bg-background/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/60 p-6 overflow-y-auto"
          >
            <nav className="space-y-6">
              {["General", "Authentication", "Integration"].map((cat) => (
                <div key={cat} className="space-y-1.5">
                  <h4 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pt-4 pb-1">
                    {cat}
                  </h4>
                  <ul className="space-y-1">
                    {docSections
                      .filter((sec) => sec.category === cat)
                      .map((sec) => (
                        <li key={sec.id}>
                          <button
                            onClick={() => {
                              setActiveSection(sec.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full text-left py-2.5 text-sm transition-colors flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900/40 last:border-0 ${activeSection === sec.id
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                              }`}
                          >
                            <span className="pl-2 font-light">{sec.title}</span>
                            {sec.method && (
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${getMethodBadgeClass(sec.method)}`}>
                                {sec.method}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto px-4 md:px-12 py-24 md:py-12 mt-12 md:mt-0">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {activeDoc.method && (
                <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded border ${getMethodBadgeClass(activeDoc.method)}`}>
                  {activeDoc.method}
                </span>
              )}
              {activeDoc.path && (
                <code className="text-sm font-mono text-muted-foreground bg-zinc-100/50 dark:bg-zinc-900/30 px-3 py-1 rounded border border-zinc-200/50 dark:border-zinc-800/40">
                  {activeDoc.path}
                </code>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground">
              {activeDoc.title}
            </h1>
            <p className="text-muted-foreground font-light leading-relaxed">
              {activeDoc.desc}
            </p>
          </div>

          {activeSection === "playground" ? (
            <KeyPlayground />
          ) : (
            <>
              {activeDoc.headers && (
                <div className="space-y-4">
                  <h3 className="text-lg font-normal text-foreground">Request Headers</h3>
                  <div className="border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/10">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800/60 text-muted-foreground font-mono">
                          <th className="p-4 w-1/3">Header</th>
                          <th className="p-4">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDoc.headers.map((h, i) => (
                          <tr key={i} className="border-b border-zinc-200/50 dark:border-zinc-800/40 last:border-0 font-light">
                            <td className="p-4 font-mono font-normal text-foreground">{h.name}</td>
                            <td className="p-4 text-muted-foreground">{h.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeDoc.params && (
                <div className="space-y-4">
                  <h3 className="text-lg font-normal text-foreground">Request Parameters</h3>
                  <div className="border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/10">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800/60 text-muted-foreground font-mono">
                          <th className="p-4">Parameter</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Required</th>
                          <th className="p-4">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDoc.params.map((p, i) => (
                          <tr key={i} className="border-b border-zinc-200/50 dark:border-zinc-800/40 last:border-0 font-light">
                            <td className="p-4 font-mono font-normal text-foreground">{p.name}</td>
                            <td className="p-4 font-mono text-xs text-muted-foreground">{p.type}</td>
                            <td className="p-4 text-xs font-mono">
                              {p.required ? (
                                <span className="text-foreground">true</span>
                              ) : (
                                <span className="text-muted-foreground/60">false</span>
                              )}
                            </td>
                            <td className="p-4 text-muted-foreground">{p.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeDoc.codeTemplate && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Axios Integration Module (`authlyClient.ts`)</span>
                    <button
                      onClick={() => handleCopy(activeDoc.codeTemplate || "", "template")}
                      className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900"
                    >
                      {copiedText === "template" ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-green-500 font-medium text-xs">Copied Code!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="font-medium text-xs">Copy Template Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-[#030303] text-zinc-300">
                    <div className="flex justify-between items-center bg-zinc-950 px-4 py-2.5 border-b border-zinc-900">
                      <span className="text-[10px] font-mono text-zinc-500">authlyClient.ts</span>
                    </div>
                    <pre className="p-4 font-mono text-xs overflow-x-auto leading-relaxed max-h-[500px]">
                      <HighlightedCode code={activeDoc.codeTemplate} />
                    </pre>
                  </div>
                </div>
              )}

              {(activeDoc.requestBody || activeDoc.responseSuccess) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {activeDoc.requestBody && (
                    <div className="space-y-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Example Request Body</span>
                      <div className="border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-[#030303] text-zinc-300">
                        <div className="flex justify-between items-center bg-zinc-950 px-4 py-2.5 border-b border-zinc-900">
                          <span className="text-[10px] font-mono text-zinc-500">payload.json</span>
                          <button
                            onClick={() => handleCopy(activeDoc.requestBody || "", "req")}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                          >
                            {copiedText === "req" ? (
                              <>
                                <Check className="h-3 w-3 text-green-500" />
                                <span className="text-green-500 text-[10px]">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span className="text-[10px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-4 font-mono text-xs overflow-x-auto leading-relaxed max-h-[300px]">
                          <HighlightedCode code={activeDoc.requestBody} />
                        </pre>
                      </div>
                    </div>
                  )}

                  {activeDoc.responseSuccess && (
                    <div className="space-y-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Response (200 Success)</span>
                      <div className="border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-[#030303] text-zinc-300">
                        <div className="flex justify-between items-center bg-zinc-950 px-4 py-2.5 border-b border-zinc-900">
                          <span className="text-[10px] font-mono text-zinc-500">response.json</span>
                          <button
                            onClick={() => handleCopy(activeDoc.responseSuccess || "", "res")}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                          >
                            {copiedText === "res" ? (
                              <>
                                <Check className="h-3 w-3 text-green-500" />
                                <span className="text-green-500 text-[10px]">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span className="text-[10px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-4 font-mono text-xs overflow-x-auto leading-relaxed max-h-[300px]">
                          <HighlightedCode code={activeDoc.responseSuccess} />
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-6 border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl bg-zinc-50/30 dark:bg-zinc-900/10 flex items-start gap-4">
                <Lock className="h-5 w-5 text-foreground/80 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-foreground">Integration Security</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed font-light">
                    Do not expose your application <code>secretKey</code> on client-side applications. Use the <code>publicKey</code> in the client environment, and reserve backend calls for admin credentials and app creation.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
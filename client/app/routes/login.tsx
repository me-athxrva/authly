import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/login";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Authly | Login" },
    { name: "description", content: "Log in to your Authly workspace." },
  ];
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const response = await fetch(`${apiBaseUrl}/api/auth/admin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid credentials. Please try again.");
      }

      toast.success("Authentication successful. Redirecting...");
      if (data.accessToken) {
        localStorage.setItem("token", data.accessToken);
      }

      navigate("/dashboard");
    } catch (err: any) {
      const isConnectionError = err.message?.toLowerCase().includes("fetch") || err.message?.toLowerCase().includes("connect");
      if (isConnectionError) {
        toast.warning(err.message || "Failed to connect to the authentication server.");
      } else {
        toast.error(err.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-6 px-4 bg-transparent relative lg:overflow-hidden">
      <Link
        to="/"
        className="fixed top-6 right-6 p-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-background/80 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors z-50 text-foreground/80 hover:text-foreground"
        title="Back to Home"
      >
        <X className="h-4 w-4" />
      </Link>
      <div className="w-full max-w-[420px] space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-light tracking-tight text-foreground">
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground font-light">
            Enter your credentials to access the workspace
          </p>
        </div>

        <div className="border border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl bg-zinc-50/30 dark:bg-zinc-900/10 backdrop-blur-md p-6 sm:p-10 shadow-xs relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5 flex flex-col gap-y-1">
                <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email Address
                </label>
                <div className="flex items-center gap-3 px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-background focus-within:border-foreground/45 transition-colors">
                  <Mail className="h-4 w-4 text-muted-foreground/80 flex-shrink-0" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full text-sm bg-transparent border-0 outline-hidden focus:ring-0 text-foreground font-light placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              <div className="space-y-1.5 flex flex-col gap-y-1">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                    Password
                  </label>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-background focus-within:border-foreground/45 transition-colors">
                  <Lock className="h-4 w-4 text-muted-foreground/80 flex-shrink-0" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm bg-transparent border-0 outline-hidden focus:ring-0 text-foreground font-light placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Log in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-200/50 dark:border-zinc-800/40 text-center">
            <p className="text-xs text-muted-foreground font-light">
              New to Authly?{" "}
              <Link to="/signup" className="text-foreground font-normal hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

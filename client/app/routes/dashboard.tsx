import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/dashboard";
import { 
  Plus, Key, Copy, Eye, EyeOff, LogOut, Loader2, Shield, Laptop, Server, User, Check, Settings, LayoutDashboard, FileText, ChevronRight, ChevronLeft, Search, Users, Mail, X
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "~/components/ThemeToggle";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Authly | Admin Dashboard" },
    { name: "description", content: "Manage your multi-tenant authentication applications." },
  ];
}

interface ApiKey {
  key: string;
  name: string;
  createdAt: string;
}

interface App {
  id: string;
  name: string;
  slug: string;
  publicKey: string;
  jwtPublicKey?: string;
  authType: "JWT" | "SESSION";
  isActive: boolean;
  createdAt: string;
  apiKeys: ApiKey[];
}

interface AdminProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isPro: boolean;
  plan: string;
}

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Navigation active state
  const [activeTab, setActiveTab] = useState<"dashboard" | "users">("dashboard");

  // Loading states
  const [initializing, setInitializing] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // Search and page state
  const [searchVal, setSearchVal] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Create App Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppSlug, setNewAppSlug] = useState("");
  const [newAuthType, setNewAuthType] = useState<"JWT" | "SESSION">("JWT");

  // UX states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [pemModalContent, setPemModalContent] = useState<{ appName: string; key: string } | null>(null);

  // Token retrieval helper
  const getToken = () => localStorage.getItem("token");

  // Load unified dashboard data
  const fetchDashboard = async (token: string, appId?: string, page: number = 1, search: string = "") => {
    setDashboardLoading(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      let url = `${apiBaseUrl}/api/auth/admin-dashboard?page=${page}&limit=5`;
      if (appId) {
        url += `&appId=${appId}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch dashboard data");
      }
      
      setProfile(data.admin);
      setApps(data.apps || []);
      setSelectedApp(data.selectedApp || null);
      setUsers(data.users || []);
      setPagination(data.pagination || null);
    } catch (err: any) {
      toast.error("Session expired. Please log in again.");
      localStorage.removeItem("token");
      navigate("/login");
    } finally {
      setInitializing(false);
      setDashboardLoading(false);
    }
  };

  // Check auth & load data initially
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }
    setInitializing(false);
    fetchDashboard(token);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      await fetch(`${apiBaseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getToken()}`,
        },
        credentials: "include",
      });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem("token");
      toast.success("Logged out successfully.");
      navigate("/");
    }
  };

  const handleSelectApp = (appId: string) => {
    if (selectedApp?.id === appId) return;
    setSearchVal("");
    setCurrentPage(1);
    fetchDashboard(getToken()!, appId, 1, "");
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDashboard(getToken()!, selectedApp?.id, 1, searchVal);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchDashboard(getToken()!, selectedApp?.id, newPage, searchVal);
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim() || !newAppSlug.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    setSubmitting(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const response = await fetch(`${apiBaseUrl}/api/auth/create-app`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`,
        },
        credentials: "include",
        body: JSON.stringify({
          appName: newAppName,
          appSlug: newAppSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          authType: newAuthType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create application.");
      }

      toast.success("Application created successfully!");
      setNewAppName("");
      setNewAppSlug("");
      setNewAuthType("JWT");
      setShowCreateModal(false);
      
      // Refresh dashboard and select the newly created app if returned
      fetchDashboard(getToken()!, data.app?.id);
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleSecretReveal = (appId: string) => {
    setRevealedSecrets(prev => ({
      ...prev,
      [appId]: !prev[appId]
    }));
  };

  // Generate slug dynamically from name
  const handleNameChange = (val: string) => {
    setNewAppName(val);
    setNewAppSlug(val.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden w-full bg-background flex flex-col lg:flex-row text-foreground transition-colors duration-300">
      
      {/* Sidebar navigation */}
      <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-6 space-y-6 flex-shrink-0 bg-zinc-50/50 dark:bg-zinc-950/20 lg:h-full lg:overflow-y-hidden">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-normal text-lg tracking-tight hover:opacity-80 transition-opacity">
            authly
          </Link>
          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle />
            <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/60 bg-background/50 backdrop-blur-xs">
          <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-background flex items-center justify-center font-medium text-xs">
            {profile?.firstName ? profile.firstName[0].toUpperCase() : (profile?.email ? profile.email[0].toUpperCase() : <User className="h-4 w-4" />)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">
              {profile?.firstName ? `${profile.firstName} ${profile?.lastName || ""}` : "Administrator"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
          </div>
          <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-sm font-mono border border-zinc-200 dark:border-zinc-700/60 uppercase">
            {profile?.plan || "Free"}
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          <button 
            onClick={() => setActiveTab("dashboard")} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "dashboard" 
                ? "bg-zinc-100 dark:bg-zinc-900 text-foreground font-semibold" 
                : "text-muted-foreground hover:text-foreground hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 font-normal"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("users")} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "users" 
                ? "bg-zinc-100 dark:bg-zinc-900 text-foreground font-semibold" 
                : "text-muted-foreground hover:text-foreground hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 font-normal"
            }`}
          >
            <Users className="h-4 w-4" />
            User Directory
          </button>
          <Link 
            to="/docs" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all"
          >
            <FileText className="h-4 w-4" />
            Developer Docs
          </Link>
        </nav>

        <div className="hidden lg:flex flex-col gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content pane */}
      <main className="flex-1 p-6 lg:p-10 lg:h-full overflow-y-auto space-y-8 animate-fade-in">
        
        {activeTab === "dashboard" ? (
          <>
            {/* Header toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-light tracking-tight text-foreground">Applications</h1>
                <p className="text-sm text-muted-foreground font-light mt-1">
                  Create and manage isolated authentication scopes for your platforms.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="self-start sm:self-auto bg-foreground text-background hover:opacity-90 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" /> Create App
              </button>
            </div>

            {/* Content sections */}
            {dashboardLoading && apps.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map(n => (
                  <div key={n} className="border border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl p-6 space-y-4 animate-pulse bg-zinc-50/30 dark:bg-zinc-900/10">
                    <div className="h-5 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded-sm"></div>
                    <div className="h-3 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded-sm"></div>
                    <div className="space-y-2 pt-4">
                      <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
                      <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : apps.length === 0 ? (
              <div className="border border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 bg-zinc-50/10 dark:bg-zinc-900/5 backdrop-blur-md">
                <div className="w-12 h-12 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center mx-auto text-muted-foreground">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">No applications found</h3>
                  <p className="text-sm text-muted-foreground font-light">
                    Get started by creating your first platform authentication workspace.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-foreground text-background px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
                >
                  Create App
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {apps.map(app => {
                  const secretKey = app.apiKeys?.[0]?.key || "No Secret Key Generated";
                  const isRevealed = !!revealedSecrets[app.id];

                  return (
                    <div 
                      key={app.id} 
                      className={"border rounded-3xl bg-zinc-50/20 dark:bg-zinc-900/5 backdrop-blur-md p-6 lg:p-8 space-y-6 transition-all shadow-xs relative overflow-hidden"}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-normal text-foreground">{app.name}</h3>
                            <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-muted-foreground px-2 py-0.5 rounded-full uppercase">
                              {app.authType}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">Slug: {app.slug}</p>
                        </div>
                        <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                          Active
                        </span>
                      </div>

                      <div className="space-y-3 pt-2">
                        {/* Public Key field */}
                        <div className="space-y-1 flex flex-col gap-y-1">
                          <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            <span>Public Key (Client scope)</span>
                            <span className="font-mono text-[9px] lowercase text-sky-500">x-public-key header</span>
                          </div>
                          <div className="flex items-center gap-3 px-3 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-background">
                            <Laptop className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="w-full text-xs font-mono truncate text-foreground/90 select-all">
                              {app.publicKey}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(app.publicKey, "Public Key")}
                              className="p-1 hover:text-foreground text-muted-foreground transition-colors cursor-pointer"
                              title="Copy Key"
                            >
                              {copiedKey === app.publicKey ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Secret Key field */}
                        <div className="space-y-1 flex flex-col gap-y-1">
                          <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            <span>Secret Key (Server scope)</span>
                            <span className="font-mono text-[9px] lowercase text-amber-500">restrict access</span>
                          </div>
                          <div className="flex items-center gap-3 px-3 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-background">
                            <Server className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="w-full text-xs font-mono truncate text-foreground/90 select-all">
                              {isRevealed ? secretKey : "••••••••••••••••••••••••••••••••"}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => toggleSecretReveal(app.id)}
                                className="p-1 hover:text-foreground text-muted-foreground transition-colors cursor-pointer"
                                title={isRevealed ? "Hide Secret" : "Show Secret"}
                              >
                                {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(secretKey, "Secret Key")}
                                className="p-1 hover:text-foreground text-muted-foreground transition-colors cursor-pointer"
                                title="Copy Key"
                              >
                                {copiedKey === secretKey ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* RSA JWT Public Key field */}
                        {app.jwtPublicKey && (
                          <div className="space-y-1 flex flex-col gap-y-1">
                            <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                              <span>RSA JWT Public Key (RS256)</span>
                              <button
                                type="button"
                                onClick={() => setPemModalContent({ appName: app.name, key: app.jwtPublicKey! })}
                                className="font-mono text-[9px] lowercase text-sky-500 hover:underline cursor-pointer"
                              >
                                View Full PEM
                              </button>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-background">
                              <Key className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="w-full text-xs font-mono truncate text-foreground/90 select-all">
                                {app.jwtPublicKey.replace(/\n/g, " ")}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(app.jwtPublicKey!, "RSA JWT Public Key")}
                                className="p-1 hover:text-foreground text-muted-foreground transition-colors cursor-pointer"
                                title="Copy RSA Public Key"
                              >
                                {copiedKey === app.jwtPublicKey ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/40 flex items-center justify-between text-xs text-muted-foreground font-light">
                        <span>Created: {new Date(app.createdAt).toLocaleDateString()}</span>
                        <Link 
                          to="/docs" 
                          className="text-foreground hover:underline flex items-center gap-1 font-normal"
                        >
                          View Integration <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Header toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-light tracking-tight text-foreground">User Directory</h1>
                <p className="text-sm text-muted-foreground font-light mt-1">
                  Manage enrolled user accounts and directory scope details.
                </p>
              </div>
            </div>

            {/* Application select switcher and search bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/10 p-5 border border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl backdrop-blur-md">
              <div className="flex items-center gap-3 w-full md:max-w-md">
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap uppercase tracking-wider">
                  Scope Application:
                </span>
                <select
                  value={selectedApp?.id || ""}
                  onChange={(e) => handleSelectApp(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-background text-foreground focus:border-foreground/50 transition-colors cursor-pointer"
                >
                  {apps.length === 0 ? (
                    <option value="">No applications found</option>
                  ) : (
                    apps.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name} ({app.authType})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Search Bar */}
              {selectedApp && (
                <div className="flex items-center gap-2 max-w-sm w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search email, name..."
                      value={searchVal}
                      onChange={(e) => setSearchVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSearch();
                        }
                      }}
                      className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-background text-foreground focus:border-foreground/50 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="bg-foreground text-background hover:opacity-90 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer animate-scale-up"
                  >
                    Search
                  </button>
                </div>
              )}
            </div>

            {/* User Directory Table Card */}
            {selectedApp ? (
              <div className="border border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl bg-zinc-50/20 dark:bg-zinc-900/5 backdrop-blur-md p-6 lg:p-8 space-y-6">
                <div className="overflow-x-auto border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl bg-background">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200/50 dark:border-zinc-800/40 text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-zinc-50/50 dark:bg-zinc-900/20">
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">User ID</th>
                        <th className="px-4 py-3">Enrolled Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/40 text-xs">
                      {dashboardLoading ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground font-light">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
                            </div>
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground font-light">
                            No users registered in this application.
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                            <td className="px-4 py-3.5 flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-medium text-[10px] text-foreground border border-zinc-200/50 dark:border-zinc-700/50">
                                {user.firstName ? user.firstName[0].toUpperCase() : user.email[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {user.firstName ? `${user.firstName} ${user.lastName || ""}` : "Anonymous"}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-light">{user.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[10px] text-muted-foreground select-all">
                              {user.id}
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground font-light">
                              {new Date(user.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-muted-foreground font-light">
                      Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} users total)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={pagination.page <= 1}
                        onClick={() => handlePageChange(pagination.page - 1)}
                        className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-foreground cursor-pointer transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => handlePageChange(pagination.page + 1)}
                        className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-foreground cursor-pointer transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 bg-zinc-50/10 dark:bg-zinc-900/5 backdrop-blur-md">
                <div className="w-12 h-12 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center mx-auto text-muted-foreground">
                  <Users className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">No active application</h3>
                  <p className="text-sm text-muted-foreground font-light">
                    Please select or create an application to view enrolled users.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create App Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="w-full max-w-[440px] border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-background p-6 sm:p-8 space-y-6 shadow-2xl relative">
            
            <div className="space-y-1.5">
              <h3 className="text-xl font-normal text-foreground">Create platform app</h3>
              <p className="text-xs text-muted-foreground font-light">
                Initialize client public keys and signing secrets.
              </p>
            </div>

            <form onSubmit={handleCreateApp} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1 flex flex-col gap-y-1">
                  <label htmlFor="appName" className="text-xs font-medium text-muted-foreground">
                    Application Name
                  </label>
                  <input
                    id="appName"
                    type="text"
                    required
                    value={newAppName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="My SaaS Portal"
                    className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-background text-foreground focus:border-foreground/50 transition-colors"
                  />
                </div>

                <div className="space-y-1 flex flex-col gap-y-1">
                  <label htmlFor="appSlug" className="text-xs font-medium text-muted-foreground">
                    Application Slug
                  </label>
                  <input
                    id="appSlug"
                    type="text"
                    required
                    value={newAppSlug}
                    onChange={(e) => setNewAppSlug(e.target.value)}
                    placeholder="my-saas-portal"
                    className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-background text-foreground focus:border-foreground/50 transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1 flex flex-col gap-y-1">
                  <label htmlFor="authType" className="text-xs font-medium text-muted-foreground">
                    Authentication Protocol
                  </label>
                  <select
                    id="authType"
                    value={newAuthType}
                    onChange={(e) => setNewAuthType(e.target.value as "JWT" | "SESSION")}
                    className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-background text-foreground focus:border-foreground/50 transition-colors cursor-pointer"
                  >
                    <option value="JWT">JWT (Stateless Access Token)</option>
                    <option value="SESSION">Session (Stateful Redis Cookie)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-xs font-semibold text-foreground cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-foreground text-background px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Initialize App"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PEM Key View Modal Overlay */}
      {pemModalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-background p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-normal text-foreground">RSA JWT Public Key</h3>
                <p className="text-xs text-muted-foreground font-light">
                  {pemModalContent.appName} — RS256 Verification Key (PEM format)
                </p>
              </div>
              <button
                onClick={() => setPemModalContent(null)}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900 font-mono text-[11px] leading-relaxed text-foreground overflow-x-auto max-h-60 select-all whitespace-pre-wrap">
                {pemModalContent.key}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-muted-foreground font-mono">
                Use this key on your backend to verify RS256 access tokens.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(pemModalContent.key, "RSA JWT Public Key")}
                  className="bg-foreground text-background px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedKey === pemModalContent.key ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy PEM Key
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Activity, Key, Cpu, ArrowRight, Check, Copy, ChevronRight, Terminal } from "lucide-react";

const words = [
    "trust",
    "control",
    "clarity",
    "security",
    "compliance"
];

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.04,
        },
    },
    exit: {
        transition: {
            staggerChildren: 0.02,
            staggerDirection: -1,
        },
    },
} as const;

const letterVariants = {
    hidden: {
        opacity: 0,
        filter: "blur(8px)",
        y: 10,
    },
    visible: {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        transition: {
            duration: 0.35,
            ease: "easeOut",
        },
    },
    exit: {
        opacity: 0,
        filter: "blur(8px)",
        y: -10,
        transition: {
            duration: 0.5,
            ease: "easeIn",
        },
    },
} as const;

function HeroSection() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % words.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative md:h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] w-full snap-start snap-always bg-transparent text-foreground overflow-hidden flex items-center justify-center px-4 sm:px-6">
            <div className="text-center w-full max-w-4xl mx-auto">
                <div className="relative leading-tight sm:leading-none font-normal tracking-tight">
                    <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-foreground/40">
                        The foundation of
                    </h1>
                    <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-foreground/40">
                        authorization is
                    </h1>
                    <div className="flex items-center justify-center gap-3 sm:gap-5 mt-2 flex-wrap min-h-[1.2em]">
                        <AnimatePresence mode="wait" initial={true}>
                            <motion.div
                                key={words[index]}
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="flex justify-center"
                            >
                                {words[index].split("").map((char, charIndex) => (
                                    <motion.span
                                        key={`${char}-${charIndex}`}
                                        variants={letterVariants}
                                        className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal text-foreground inline-block"
                                    >
                                        {char}
                                    </motion.span>
                                ))}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <p className="mt-8 sm:mt-10 max-w-2xl mx-auto px-4 sm:px-8 md:px-20 text-muted-foreground text-sm sm:text-base md:text-sm leading-relaxed font-light">
                    Authly gives developers a scalable foundation for authentication,
                    role-based access control, and tenant management.
                </p>

                <div className="mt-8 flex justify-center gap-4">
                    <Link
                        to="/signup"
                        className="bg-foreground text-background px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2"
                    >
                        get started <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

function ProblemSection() {
    const problems = [
        {
            num: "01",
            title: "Multi-tenant Pollution",
            desc: "Without strict boundaries, single database instances risk cross-tenant leaks. Authly enforces tenant separation at the header level."
        },
        {
            num: "02",
            title: "Short-lived Token Gaps",
            desc: "Handling token expiration securely requires seamless silent refreshes. Authly sets secure, httpOnly cookies automatically."
        },
        {
            num: "03",
            title: "Verification Overhead",
            desc: "Calling authentication databases on every API request increases latency. Authly solves this using lightweight JWT verification."
        }
    ];

    return (
        <section className="relative md:h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] w-full snap-start snap-always bg-transparent text-foreground flex items-center justify-center px-4 sm:px-6 py-12 md:py-0">
            <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-1">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">01 / THE CHALLENGE</span>
                    <h2 className="text-3xl font-light tracking-tight mt-4 text-foreground/80 leading-tight">
                        Authenticating multi-tenant SaaS is hard
                    </h2>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed font-light">
                        Enforcing tenant scopes, verifying signatures, and managing 15-minute token lifespans leaves rooms for security holes.
                    </p>
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {problems.map((p, idx) => (
                        <div key={idx} className="border-t border-zinc-200 dark:border-zinc-800/60 pt-6 flex flex-col justify-between h-full">
                            <div>
                                <span className="text-xs font-mono text-muted-foreground/60">{p.num}</span>
                                <h3 className="text-lg font-normal text-foreground mt-2">{p.title}</h3>
                                <p className="text-sm text-muted-foreground mt-3 leading-relaxed font-light">{p.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function SolutionSection() {
    return (
        <section className="relative md:h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] w-full snap-start snap-always bg-transparent text-foreground flex items-center justify-center px-4 sm:px-6 py-12 md:py-0">
            <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">02 / THE SOLUTION</span>
                    <h2 className="text-3xl sm:text-4xl font-light tracking-tight mt-4 text-foreground leading-tight">
                        Unified Tenant Identification
                    </h2>
                    <p className="mt-6 text-muted-foreground leading-relaxed font-light">
                        Identify your application tenant securely on user routes using public-key headers. Allow the same user email to exist safely across isolated applications.
                    </p>
                    <ul className="mt-8 space-y-4">
                        <li className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-foreground mt-0.5" />
                            <span className="text-sm text-foreground/80 font-light">Explicit header-based tenant verification using <code>x-public-key</code>.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-foreground mt-0.5" />
                            <span className="text-sm text-foreground/80 font-light">Short-lived access tokens (15 mins) combined with httpOnly refresh cookies.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-foreground mt-0.5" />
                            <span className="text-sm text-foreground/80 font-light">Full support for both JWT and Session-based applications.</span>
                        </li>
                    </ul>
                </div>
                <div className="relative border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 p-6 backdrop-blur-sm overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 shadow-xs">
                    <div className="absolute inset-0 bg-radial from-foreground/5 to-transparent pointer-events-none" />
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800/60 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">tenant_verification.sh</span>
                    </div>
                    <div className="font-mono text-xs space-y-2 text-foreground/80">
                        <p className="text-muted-foreground"># Authenticating user under specific tenant app...</p>
                        <p><span className="text-blue-500">$</span> curl -X POST http://localhost:3000/api/auth/login \</p>
                        <p className="pl-4">-H <span className="text-amber-500">"x-public-key: pk_58c21a94e..."</span> \</p>
                        <p className="pl-4">-H <span className="text-amber-500">"Content-Type: application/json"</span> \</p>
                        <p className="pl-4">-d <span className="text-amber-500">'{"{"}"email": "jane@acme.com", "password": "••••••••"{"}"}'</span></p>
                        <div className="bg-background/80 dark:bg-background/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/40 space-y-1 mt-2">
                            <p className="text-green-500">{"{"}</p>
                            <p className="pl-4">"status": <span className="text-amber-500">"success"</span>,</p>
                            <p className="pl-4">"accessToken": <span className="text-blue-400">"eyJhbGciOiJSUzI1NiIs..."</span></p>
                            <p className="text-green-500">{"}"}</p>
                        </div>
                        <p className="text-green-500 mt-2">✓ User authenticated. Set userRefreshToken cookie.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function HowItWorks() {
    const steps = [
        {
            step: "01",
            title: "Admin Onboarding",
            desc: "Register administrators via /register-admin and create isolated SaaS applications via /create-app."
        },
        {
            step: "02",
            title: "Tenant Operations",
            desc: "Use application public keys in x-public-key headers to handle isolated registration and logins."
        },
        {
            step: "03",
            title: "Continuous Refresh",
            desc: "Use secure cookies to perform silent refreshes, automatically resolving token expirations."
        }
    ];

    return (
        <section className="relative md:h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] w-full snap-start snap-always bg-transparent text-foreground flex items-center justify-center px-4 sm:px-6 py-12 md:py-0">
            <div className="w-full max-w-6xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">03 / ARCHITECTURE</span>
                    <h2 className="text-3xl sm:text-4xl font-light tracking-tight mt-4 text-foreground">
                        From admin registration to client login
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {steps.map((s, idx) => (
                        <div key={idx} className="relative p-6 border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors duration-300 flex flex-col justify-between min-h-[220px]">
                            <div>
                                <span className="text-3xl font-mono text-foreground/20 font-bold">{s.step}</span>
                                <h3 className="text-lg font-normal text-foreground mt-4">{s.title}</h3>
                                <p className="text-sm text-muted-foreground mt-2 leading-relaxed font-light">{s.desc}</p>
                            </div>
                            {idx < 2 && (
                                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                                    <ChevronRight className="h-6 w-6 text-muted-foreground/30" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CodeExample() {
    const [activeTab, setActiveTab] = useState<"nodejs" | "react" | "curl">("nodejs");
    const [copied, setCopied] = useState(false);

    const codes = {
        nodejs: `// Fetch current user details with tenant public-key headers
const response = await fetch("http://localhost:3000/api/auth/me", {
  method: "GET",
  headers: {
    "Authorization": \`Bearer \${accessToken}\`,
    "x-public-key": "pk_my_app_public_key"
  }
});

const data = await response.json();
if (data.status === "success") {
  console.log(\`Logged in as \${data.user.email}\`);
}`,
        react: `// Axios Interceptor for Silent Token Refresh
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000' });

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Triggers secure silent refresh via httpOnly cookies
      const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
      const { accessToken } = res.data;
      originalRequest.headers['Authorization'] = \`Bearer \${accessToken}\`;
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);`,
        curl: `# Register a new user under a specific application tenant
curl -X POST http://localhost:3000/api/auth/register-user \\
  -H "x-public-key: pk_58c21a94eb8417c8" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "jane.doe@example.com",
    "password": "securePassword123",
    "firstName": "Jane",
    "lastName": "Doe"
  }'`
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(codes[activeTab]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="relative md:h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] w-full snap-start snap-always bg-transparent text-foreground flex items-center justify-center px-4 sm:px-6 py-12 md:py-0">
            <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                <div className="lg:col-span-1">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">04 / INTEGRATION</span>
                    <h2 className="text-3xl font-light tracking-tight mt-4 text-foreground leading-tight">
                        Direct API integration
                    </h2>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed font-light">
                        Use standard HTTP libraries to call Authly. Securely request current profiles with Bearer auth and identify tenants with custom public-key headers.
                    </p>
                    <div className="mt-8 flex flex-col gap-2">
                        {(["nodejs", "react", "curl"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`text-left px-4 py-2 rounded-lg text-sm transition-colors duration-200 ${activeTab === tab
                                        ? "bg-foreground text-background font-medium"
                                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-muted-foreground"
                                    }`}
                            >
                                {tab === "nodejs" && "Profile Request (Fetch)"}
                                {tab === "react" && "Axios Interceptor"}
                                {tab === "curl" && "Register (cURL)"}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-2 border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-[#030303] text-zinc-300">
                    <div className="flex justify-between items-center bg-zinc-950 px-4 py-3 border-b border-zinc-900">
                        <div className="flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-zinc-500" />
                            <span className="text-xs font-mono text-zinc-500">
                                {activeTab === "nodejs" && "getUser.js"}
                                {activeTab === "react" && "axiosInterceptor.js"}
                                {activeTab === "curl" && "registerUser.sh"}
                            </span>
                        </div>
                        <button
                            onClick={handleCopy}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                    </div>
                    <div className="p-5 font-mono text-xs overflow-x-auto leading-relaxed max-h-[400px]">
                        <pre><code>{codes[activeTab]}</code></pre>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FeaturesSection() {
    const features = [
        {
            icon: Shield,
            title: "Header Tenant Routing",
            desc: "Identifies and partitions user databases using shareable x-public-key headers.",
            gridClass: "md:col-span-2"
        },
        {
            icon: Cpu,
            title: "15-minute Token Lifespan",
            desc: "Minimizes security exposure windows using short-lived cryptographically signed access tokens.",
            gridClass: "md:col-span-1"
        },
        {
            icon: Key,
            title: "Cookie Silent Refresh",
            desc: "Automatically fetch new access tokens in background via secure, httpOnly userRefreshToken cookies.",
            gridClass: "md:col-span-1"
        },
        {
            icon: Activity,
            title: "Universal Logout Mechanism",
            desc: "Immediately clears token cookies, blacklists refresh tokens in Redis for 24h, and rejects active access tokens.",
            gridClass: "md:col-span-2"
        }
    ];

    return (
        <section className="relative md:h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] w-full snap-start snap-always bg-transparent text-foreground flex items-center justify-center px-4 sm:px-6 py-12 md:py-0">
            <div className="w-full max-w-6xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">05 / CAPABILITIES</span>
                    <h2 className="text-3xl sm:text-4xl font-light tracking-tight mt-4 text-foreground">
                        Hardened SaaS authentication features
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((f, idx) => {
                        const Icon = f.icon;
                        return (
                            <div
                                key={idx}
                                className={`p-8 border border-zinc-200/80 dark:border-zinc-800/60 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between shadow-xs ${f.gridClass}`}
                            >
                                <div>
                                    <div className="p-3 border border-zinc-200/80 dark:border-zinc-800/60 rounded-xl bg-background w-fit">
                                        <Icon className="h-5 w-5 text-foreground/80" />
                                    </div>
                                    <h3 className="text-lg font-normal text-foreground mt-6">{f.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed font-light">{f.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function CTASection() {
    return (
        <section className="relative md:h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] w-full snap-start snap-always bg-transparent text-foreground flex items-center justify-center px-4 sm:px-6 py-12 md:py-0 overflow-hidden">
            <div className="absolute inset-0 bg-radial from-foreground/5 to-transparent pointer-events-none" />
            <div className="w-full max-w-5xl mx-auto text-center relative z-10">
                <div className="max-w-2xl mx-auto">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">06 / JOIN US</span>
                    <h2 className="text-4xl sm:text-5xl font-light tracking-tight mt-6 text-foreground">
                        Ready to integrate Authly?
                    </h2>
                    <p className="mt-6 text-muted-foreground leading-relaxed font-light max-w-lg mx-auto">
                        Follow the api specifications. Plug in tenant authentication and build secure products with speed.
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                        <a
                            href="/login"
                            className="bg-foreground text-background px-8 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-all"
                        >
                            get started free
                        </a>
                        <a
                            href="/docs"
                            className="border border-border text-foreground hover:bg-muted px-8 py-3 rounded-full text-sm font-medium transition-all"
                        >
                            read documentation
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

export { HeroSection, ProblemSection, SolutionSection, HowItWorks, CodeExample, FeaturesSection, CTASection }
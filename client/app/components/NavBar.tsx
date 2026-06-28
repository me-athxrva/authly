import { useEffect, useState } from "react";
import { ThemeToggle } from "~/components/ThemeToggle";
import { Link } from "react-router";
import { User } from "lucide-react";

export default function NavBar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
    }, []);

    useEffect(() => {
        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center py-4 lg:px-50 px-4 bg-background/80 backdrop-blur-md border-b border-border/10 transition-all duration-300 ${
            isVisible ? "translate-y-0" : "-translate-y-full"
        }`}>
            <div className="flex-1 flex items-center">
                <Link to="/" className="font-normal text-lg tracking-tight transition-none">authly</Link>
            </div>
            <div className="flex items-center gap-3">
                <ul className="flex items-center gap-6 text-sm">
                    <li>
                        <Link to="/pricing" className="hover:opacity-80 transition-opacity">pricing</Link>
                    </li>
                    <li>
                        <Link to="/docs" className="hover:opacity-80 transition-opacity">docs</Link>
                    </li>
                    <li className="flex items-center">
                        {isLoggedIn ? (
                            <Link
                                to="/dashboard"
                                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                                title="Go to Dashboard"
                            >
                                <User className="h-4 w-4" />
                            </Link>
                        ) : (
                            <Link
                                to="/login"
                                className="bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-full font-medium transition-all duration-300 text-xs"
                            >
                                login
                            </Link>
                        )}
                    </li>
                </ul>
                <div className="flex items-center">
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    );
}
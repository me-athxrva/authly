import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Check initial theme from localStorage or system preferences
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initialTheme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : (systemPrefersDark ? "dark" : "light");

    setTheme(initialTheme);

    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="border-none relative flex items-center justify-center w-9 h-9 rounded-lg bg-white/50 dark:bg-slate-950/50 transition-all duration-300"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "light" ? (
          <motion.div
            key="light-icon"
            initial={{ opacity: 0, filter: "blur(4px)", rotate: 90 }}
            animate={{ opacity: 1, filter: "blur(0px)", rotate: 0 }}
            exit={{ opacity: 0, filter: "blur(4px)", rotate: -90 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <Moon className="h-4.5 w-4.5 text-slate-700" />
          </motion.div>
        ) : (
          <motion.div
            key="dark-icon"
            initial={{ opacity: 0, filter: "blur(4px)", rotate: 90 }}
            animate={{ opacity: 1, filter: "blur(0px)", rotate: 0 }}
            exit={{ opacity: 0, filter: "blur(4px)", rotate: -90 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <Sun className="h-4.5 w-4.5 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

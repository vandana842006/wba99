import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { clsx } from "clsx";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        "relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20",
        theme === "dark" ? "bg-slate-800" : "bg-slate-200",
        className
      )}
      aria-label="Toggle theme"
    >
      <span
        className={clsx(
          "inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out flex items-center justify-center",
          theme === "dark" ? "translate-x-11" : "translate-x-1"
        )}
      >
        {theme === "dark" ? (
          <Moon className="w-4 h-4 text-slate-800" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </span>
    </button>
  );
}

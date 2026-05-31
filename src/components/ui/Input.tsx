import type { InputHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({ label, error, icon, className, id, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted/80 ml-1"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/60 group-focus-within:text-primary transition-colors pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={clsx(
            "w-full rounded-2xl border border-border bg-input py-3.5 text-sm text-text outline-none transition-all duration-300 shadow-sm",
            "focus:border-primary/50 focus:bg-surface placeholder:text-text-muted",
            icon ? "pl-12 pr-4" : "px-4",
            error ? "border-red-500/50" : "hover:border-primary/30",
            className
          )}
          {...rest}
        />
      </div>
      {error && (
        <p className="ml-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

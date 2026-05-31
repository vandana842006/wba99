import type { ReactNode } from "react";
import { clsx } from "clsx";

export type BadgeVariant = "primary" | "success" | "warning" | "error" | "muted";

const variantClasses: Record<BadgeVariant, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  muted: "bg-input text-text-muted border-border",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "muted", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

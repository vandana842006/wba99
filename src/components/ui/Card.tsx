import type { ReactNode } from "react";
import { clsx } from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-input border border-border rounded-2xl p-6 shadow-sm transition-all duration-300",
        onClick && "cursor-pointer hover:bg-surface hover:shadow-lg hover:border-primary/30 active:scale-[0.98]",
        className
      )}
    >
      {children}
    </div>
  );
}

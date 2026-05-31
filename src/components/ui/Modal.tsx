import type { ReactNode } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel — slides up from bottom on mobile, centered on desktop */}
      <div
        className={clsx(
          "relative w-full flex flex-col",
          "rounded-t-[2rem] sm:rounded-[2rem]",
          "border border-border bg-surface shadow-2xl",
          "animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200",
          "max-h-[92vh] sm:max-h-[90vh]",
          size !== "sm" && "sm:" + sizeClasses[size],
          size === "sm" && sizeClasses[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-text-muted/20" />
        </div>

        {/* Sticky Header */}
        {title && (
          <div className="flex-shrink-0 flex items-center justify-between px-6 pt-4 sm:pt-6 pb-4 border-b border-border">
            <h3 className="text-lg font-bold text-text">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-text/5 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className={clsx("flex-1 overflow-y-auto p-6", title && "pt-5")}>
          {children}
        </div>
      </div>
    </div>
  );
}

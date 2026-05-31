/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        primary: {
          DEFAULT: "var(--color-primary)",
          subtle: "var(--color-primary-subtle)",
        },
        secondary: "var(--color-secondary)",
        success: "var(--color-success)",
        error: "var(--color-error)",
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
        },
        accent: "var(--color-accent)",
        border: "var(--color-border)",
        input: "var(--color-input)",
      },
      borderRadius: {
        "2xl": "1.25rem",
      },
      boxShadow: {
        "soft-light": "0 10px 50px rgba(15, 23, 42, 0.35)",
        "glass-dark": "0 4px 30px rgba(15, 23, 42, 0.35)",
      },
      transitionDuration: {
        250: "250ms",
      },
    },
  },
  safelist: [
    // Dynamic color classes used in StatCard, ToolsHub, PhysioDashboard
    { pattern: /^bg-(emerald|violet|amber|sky|cyan|red|pink)-(400|500)\/(5|10|12|15|20|25)$/ },
    { pattern: /^text-(emerald|violet|amber|sky|cyan|red|pink)-(400|500)$/ },
    { pattern: /^border-(emerald|violet|amber|sky|cyan|red|pink)-(400|500)\/(20|30|40|50)$/ },
    "bg-emerald-500/10", "bg-emerald-500/15", "bg-emerald-500/20",
    "bg-violet-500/10", "bg-violet-500/15", "bg-violet-500/20",
    "bg-amber-500/10", "bg-amber-500/15", "bg-amber-500/20",
    "bg-sky-500/10", "bg-sky-500/15", "bg-sky-500/20",
    "bg-cyan-400/10", "bg-cyan-400/15", "bg-cyan-400/20",
    "text-emerald-500", "text-violet-500", "text-amber-500", "text-sky-500", "text-cyan-400",
    // Live Pose / Cricket tools
    "text-emerald-400", "text-violet-400", "text-amber-400", "text-red-400", "text-red-500", "text-pink-500",
    "bg-emerald-400/10", "bg-emerald-400/15", "bg-emerald-400/20",
    "bg-violet-400/20", "bg-violet-400/15",
    "bg-amber-400/10", "bg-amber-400/15",
    "bg-red-500/10", "bg-red-500/15",
    "bg-pink-500/5", "bg-pink-500/10",
    "border-emerald-400/40", "border-emerald-400/50", "border-emerald-400/60",
    "border-violet-400/40", "border-violet-400/60",
    "border-amber-400/30", "border-amber-400/40", "border-amber-400/60",
    "border-red-500/30", "border-red-500/40",
    "border-pink-500/30",
  ],
  plugins: [],
}

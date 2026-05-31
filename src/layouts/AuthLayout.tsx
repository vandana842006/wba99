import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Activity, Stethoscope, Footprints, Accessibility } from "lucide-react";
import { ThemeToggle } from "../components/ui/ThemeToggle";

const heroFeatures = [
  { label: "FMS Screen", Icon: Activity },
  { label: "ROM Assessment", Icon: Stethoscope },
  { label: "Gait Analysis", Icon: Footprints },
  { label: "MSK Analysis", Icon: Accessibility },
];

export function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const isLogin = location.pathname === "/login";

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryList | MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      setShowForm(e.matches);
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Mobile landing screen
  if (!isDesktop && !showForm) {
    return (
      <div className="min-h-screen bg-background text-text font-['Inter'] overflow-hidden relative">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />

        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle className="scale-75" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-6">
          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center gap-4 mb-8">
              <img src="/logo.png" alt="WBA99" className="h-24 w-24 drop-shadow-[0_0_20px_rgba(0,180,216,0.3)]" />
              <div className="inline-block px-4 py-1 rounded-full border border-primary/30 bg-primary/10 text-[12px] font-black uppercase tracking-[0.5em] text-primary">
                WBA99 PRO
              </div>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-text uppercase">Motion Intelligence</h1>
            <p className="text-text-muted font-medium leading-relaxed max-w-sm mx-auto">
              The ultimate clinical-grade movement analysis platform for physiotherapists and research organisations.
            </p>
          </div>

          <div className="w-full max-w-[360px] rounded-[48px] p-[1px] bg-gradient-to-b from-primary/30 to-transparent shadow-2xl overflow-hidden">
            <div className="bg-surface/90 rounded-[47px] p-6 backdrop-blur-3xl">
              <div className="flex flex-col gap-6 text-center">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => { navigate("/signup"); setShowForm(true); }}
                    className="flex-1 rounded-2xl bg-primary text-white h-12 text-sm font-black uppercase tracking-widest transition hover:bg-primary/80 active:scale-95"
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => { navigate("/login"); setShowForm(true); }}
                    className="flex-1 rounded-2xl border border-border bg-input text-text h-12 text-sm font-black uppercase tracking-widest transition hover:bg-surface active:scale-95 shadow-sm"
                  >
                    Login
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {heroFeatures.map(({ label, Icon }) => (
                    <div key={label} className="flex h-28 flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-input">
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text font-['Inter'] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="absolute top-8 right-8 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen items-center justify-center p-4 lg:p-12">
        <div className="flex w-full max-w-6xl min-h-[auto] lg:h-[820px] rounded-[32px] lg:rounded-[48px] overflow-visible lg:overflow-hidden border border-border bg-surface/50 backdrop-blur-2xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.2)]">

          {/* Hero Side */}
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-16 relative overflow-hidden border-r border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
            <div className="relative z-10 w-full max-w-md space-y-12">
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <img src="/logo.png" alt="WBA99" className="h-20 w-20 drop-shadow-[0_0_15px_rgba(0,180,216,0.2)]" />
                  <div className="inline-block px-4 py-1 rounded-full border border-primary/30 bg-primary/10 text-[12px] font-black uppercase tracking-[0.5em] text-primary">
                    MOTION PRO
                  </div>
                </div>
                <h1 className="text-6xl font-black tracking-tighter text-text leading-none uppercase">
                  WBA99
                  <span className="block text-3xl font-bold tracking-normal text-text-muted mt-2 lowercase">Motion Intelligence</span>
                </h1>
                <p className="text-xl text-text-muted font-medium leading-relaxed">
                  Clinical-grade physiotherapy tools and research analytics on one unified platform.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {heroFeatures.map(({ label, Icon }) => (
                  <div key={label} className="flex flex-col items-start gap-4 p-6 rounded-3xl border border-border bg-input hover:bg-surface hover:shadow-lg transition group/item duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center group-hover/item:bg-primary group-hover/item:text-white transition-all duration-300 group-hover/item:border-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-text-muted group-hover/item:text-text transition-colors">{label}</span>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-border flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-surface bg-input" />
                  ))}
                </div>
                <p className="text-sm text-text-muted font-medium">
                  Trusted by <span className="text-text font-bold">2,000+</span> specialists globally.
                </p>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="flex-1 flex flex-col bg-surface/30 min-h-[600px] lg:min-h-0 overflow-y-auto">
            <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-16">
              <div className="w-full max-w-sm space-y-8 my-8">
                {/* Mobile back button */}
                {!isDesktop && (
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back
                  </button>
                )}

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-cyan-500/20 rounded-[32px] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000" />
                  <div className="relative">
                    {/* Tab switcher */}
                    <div className="flex gap-1 p-1 rounded-2xl bg-input border border-border mb-8 shadow-inner">
                      <button
                        onClick={() => navigate("/login")}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isLogin ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-text"}`}
                      >
                        Login
                      </button>
                      <button
                        onClick={() => navigate("/signup")}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isLogin ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-text"}`}
                      >
                        Sign Up
                      </button>
                    </div>

                    <Outlet />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pb-8 pt-2 flex-shrink-0">
              <div className="flex flex-col items-center gap-2">
                <p className="text-[12px] uppercase tracking-[0.5em] text-text-muted font-black">Powered by</p>
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="WBA99" className="h-10 w-10" />
                  <span className="text-2xl font-black tracking-tighter text-text">WBA99</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

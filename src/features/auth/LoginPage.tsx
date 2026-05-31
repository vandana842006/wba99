import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { firebaseAuth } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

type ResetState = "idle" | "form" | "sending" | "sent";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleNewUser, setGoogleNewUser] = useState(false);
  const [resetState, setResetState] = useState<ResetState>("idle");
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const { login, loginWithGoogle, user, loading, error } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const emailFieldValue = watch("email") ?? "";

  const openResetForm = () => {
    setResetEmail(emailFieldValue);
    setResetError("");
    setResetState("form");
  };

  const handleSendReset = async () => {
    const trimmed = resetEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setResetError("Enter a valid email address.");
      return;
    }
    setResetState("sending");
    try {
      await sendPasswordResetEmail(firebaseAuth, trimmed);
      setResetState("sent");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      setResetError(
        code === "auth/user-not-found"
          ? "No account found with that email."
          : code === "auth/too-many-requests"
          ? "Too many attempts. Please wait and try again."
          : "Failed to send reset email. Please try again."
      );
      setResetState("form");
    }
  };

  // Redirect when user is set after login
  useEffect(() => {
    if (user) {
      navigate(user.role === "physio" ? "/physio/dashboard" : "/research/org-dashboard", { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
    } catch {
      // error is shown via AuthContext state
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleNewUser(false);
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result === "new") {
        setGoogleNewUser(true);
      }
    } catch {
      // error shown via AuthContext state
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold text-text tracking-tight">Welcome back</h2>
        <p className="mt-2 text-text-muted text-sm">Sign in to access your workspace.</p>
      </div>

      {/* Google Sign-In — primary option */}
      <Button
        type="button"
        variant="ghost"
        size="lg"
        loading={googleLoading}
        onClick={handleGoogleLogin}
        className="w-full"
      >
        {!googleLoading && <GoogleIcon />}
        Continue with Google
      </Button>

      {/* New user prompt */}
      {googleNewUser && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
          <p className="text-sm text-amber-400">
            No account found for this Google account.{" "}
            <Link to="/signup" className="font-bold underline underline-offset-2 hover:text-amber-300">
              Sign up instead?
            </Link>
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-muted font-medium uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Email / password form — secondary option */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Work Email"
          type="email"
          placeholder="you@example.com"
          icon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            className="pr-12"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-4 top-[38px] text-text-muted hover:text-text transition p-2 rounded-lg"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Forgot password link */}
        <div className="flex justify-end -mt-2">
          <button
            type="button"
            onClick={openResetForm}
            className="text-xs text-primary hover:underline font-medium"
          >
            Forgot password?
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting || loading}
          className="w-full mt-2"
        >
          Sign In with Email
        </Button>
      </form>

      {/* Forgot password panel */}
      {resetState !== "idle" && (
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          {resetState === "sent" ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text">Reset email sent</p>
                  <p className="text-xs text-text-muted">Check your inbox for <span className="font-medium">{resetEmail}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetState("idle")}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition font-medium"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-text">Reset your password</p>
                <button
                  type="button"
                  onClick={() => setResetState("idle")}
                  className="text-xs text-text-muted hover:text-text transition"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-text-muted">Enter your account email and we'll send a reset link.</p>
              <Input
                label=""
                type="email"
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
                value={resetEmail}
                onChange={(e) => { setResetEmail(e.target.value); setResetError(""); }}
                error={resetError}
              />
              <Button
                type="button"
                variant="primary"
                size="md"
                loading={resetState === "sending"}
                onClick={handleSendReset}
                className="w-full"
              >
                Send Reset Email
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

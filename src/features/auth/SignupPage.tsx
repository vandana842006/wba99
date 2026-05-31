import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Building2, Eye, EyeOff, Stethoscope, FlaskConical } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { UserRole } from "../../types";

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

const physioSchema = z.object({
  role: z.literal("physio"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

const researchSchema = z.object({
  role: z.literal("research"),
  name: z.string().min(2, "Your name is required"),
  orgName: z.string().min(2, "Organisation name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

const schema = z.discriminatedUnion("role", [physioSchema, researchSchema]);
type FormData = z.infer<typeof schema>;

function strengthScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColors = ["", "bg-red-500", "bg-amber-500", "bg-emerald-500", "bg-primary"];

export function SignupPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("physio");
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleOrgError, setGoogleOrgError] = useState("");
  const { signup, signupWithGoogle, user, loading, error } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "physio" } as FormData,
  });

  const password = watch("password") ?? "";
  const strength = strengthScore(password);

  useEffect(() => {
    if (user) {
      navigate(user.role === "physio" ? "/physio/dashboard" : "/research/org-dashboard", { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (data: FormData) => {
    try {
      const orgName = data.role === "research" ? data.orgName : undefined;
      await signup(data.name, data.email, data.password, data.role, orgName);
    } catch {
      // error shown via context
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleOrgError("");
    const orgName = (getValues as any)("orgName") as string | undefined;
    if (selectedRole === "research" && (!orgName || orgName.trim().length < 2)) {
      setGoogleOrgError("Enter your organisation name before signing up with Google.");
      return;
    }
    setGoogleLoading(true);
    try {
      await signupWithGoogle(selectedRole, orgName);
    } catch {
      // error shown via context
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl font-bold text-text tracking-tight">Create account</h2>
        <p className="mt-2 text-text-muted text-sm">Join WBA99 as a physiotherapist or research organisation.</p>
      </div>

      {/* Role Selector */}
      <div className="grid grid-cols-2 gap-3">
        {(["physio", "research"] as UserRole[]).map((role) => {
          const Icon = role === "physio" ? Stethoscope : FlaskConical;
          const label = role === "physio" ? "Physiotherapist" : "Research Org";
          return (
            <button
              key={role}
              type="button"
              onClick={() => { setSelectedRole(role); setValue("role", role); setGoogleOrgError(""); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all ${
                selectedRole === role
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-input text-text-muted hover:bg-surface hover:text-text shadow-sm"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Org Name for research — shown before Google so both paths can use it */}
      {selectedRole === "research" && (
        <Input
          label="Organisation Name"
          placeholder="Research Institute Ltd."
          icon={<Building2 className="w-4 h-4" />}
          error={(errors as any).orgName?.message || googleOrgError}
          {...register("orgName" as keyof FormData)}
          onChange={() => setGoogleOrgError("")}
        />
      )}

      {/* Google Sign-Up — primary option */}
      <Button
        type="button"
        variant="ghost"
        size="lg"
        loading={googleLoading}
        onClick={handleGoogleSignup}
        className="w-full"
      >
        {!googleLoading && <GoogleIcon />}
        Sign up with Google
      </Button>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-muted font-medium uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Email form — secondary option */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <input type="hidden" value={selectedRole} {...register("role")} />

        <Input
          label="Full Name"
          placeholder="Dr. Jane Smith"
          icon={<User className="w-4 h-4" />}
          error={"name" in errors ? (errors.name as any)?.message : undefined}
          {...register("name")}
        />

        <Input
          label="Email"
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
            placeholder="Min. 8 characters"
            icon={<Lock className="w-4 h-4" />}
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

          {password.length > 0 && (
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : "bg-input shadow-inner"}`}
                />
              ))}
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider ml-1">
                {strengthLabels[strength]}
              </span>
            </div>
          )}
          {errors.password && <p className="ml-1 text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>

        <Input
          label="Confirm Password"
          type={showPassword ? "text" : "password"}
          placeholder="Repeat password"
          icon={<Lock className="w-4 h-4" />}
          error={errors.confirm?.message}
          {...register("confirm")}
        />

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
          className="w-full mt-1"
        >
          Create Account with Email
        </Button>
      </form>
    </div>
  );
}

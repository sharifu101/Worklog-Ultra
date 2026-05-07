"use client";

import Link from "next/link";
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { safeRedirect } from "@/lib/utils";

const protectedRoles = ["hr", "manager", "admin"];

export function LoginForm({ variant = "default" }: { variant?: "default" | "minimal" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("employee");
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const isMinimal = variant === "minimal";

  async function onSubmit(formData: FormData) {
    setLoading(true);
    const payload = {
      role,
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      accessCode: String(formData.get("accessCode") ?? ""),
      remember: formData.get("remember") === "on",
    };

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    const result = raw ? JSON.parse(raw) : { message: "Login request failed." };
    setLoading(false);

    if (!response.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.push(safeRedirect(searchParams.get("next")));
    router.refresh();
  }

  return (
    <form action={onSubmit} className={cn("space-y-4", isMinimal && "space-y-5")}>
      <div className="space-y-2">
        <Label className={cn(isMinimal && "mb-1 text-[13px] font-medium text-slate-700")}>Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger
            className={cn(
              "h-10 rounded-xl",
              isMinimal &&
                "h-11 rounded-lg border border-slate-700/45 bg-white/16 px-3 text-base text-slate-900 shadow-none transition-colors hover:border-slate-800/70 focus:border-slate-900",
            )}
          >
            <SelectValue placeholder="Choose role" />
          </SelectTrigger>
          <SelectContent className={cn(isMinimal && "border-slate-300 bg-white text-slate-800 shadow-[0_20px_60px_rgba(15,23,42,0.18)]")}>
            <SelectItem className={cn(isMinimal && "data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-900 data-[highlighted]:bg-[#173b71] data-[highlighted]:text-white")} value="employee">Employee</SelectItem>
            <SelectItem className={cn(isMinimal && "data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-900 data-[highlighted]:bg-[#173b71] data-[highlighted]:text-white")} value="hr">HR</SelectItem>
            <SelectItem className={cn(isMinimal && "data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-900 data-[highlighted]:bg-[#173b71] data-[highlighted]:text-white")} value="manager">Team Head</SelectItem>
            <SelectItem className={cn(isMinimal && "data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-900 data-[highlighted]:bg-[#173b71] data-[highlighted]:text-white")} value="admin">CEO / Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className={cn(isMinimal && "mb-1 text-[13px] font-medium text-slate-700")}>Email</Label>
        <div className="relative">
          <Mail
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]",
              isMinimal && "left-3 h-[17px] w-[17px] text-slate-700/90",
            )}
          />
          <Input
            className={cn(
              "h-10 rounded-xl pl-9",
              isMinimal &&
                "h-11 rounded-lg border border-slate-700/45 bg-white/16 px-3 pl-11 text-base text-slate-900 placeholder:text-slate-600 shadow-none transition-colors hover:border-slate-800/70 focus:border-slate-900",
            )}
            name="email"
            type="email"
            placeholder="Email ID"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className={cn(isMinimal && "mb-1 text-[13px] font-medium text-slate-700")}>Password</Label>
        <div className="relative">
          <LockKeyhole
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]",
              isMinimal && "left-3 h-[17px] w-[17px] text-slate-700/90",
            )}
          />
          <Input
            className={cn(
              "h-10 rounded-xl pl-9 pr-10",
              isMinimal &&
                "h-11 rounded-lg border border-slate-700/45 bg-white/16 px-3 pl-11 pr-11 text-base text-slate-900 placeholder:text-slate-600 shadow-none transition-colors hover:border-slate-800/70 focus:border-slate-900",
            )}
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors hover:text-white",
              isMinimal && "right-3 text-slate-600 hover:text-slate-900",
            )}
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {protectedRoles.includes(role) ? (
        <div className="space-y-2">
          <Label className={cn(isMinimal && "mb-1 text-[13px] font-medium text-slate-700")}>Access Code</Label>
          <div className="relative">
            <KeyRound
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]",
                isMinimal && "left-3 h-[17px] w-[17px] text-slate-700/90",
              )}
            />
            <Input
              className={cn(
                "h-10 rounded-xl pl-9 pr-10",
                isMinimal &&
                  "h-11 rounded-lg border border-slate-700/45 bg-white/16 px-3 pl-11 pr-11 text-base text-slate-900 placeholder:text-slate-600 shadow-none transition-colors hover:border-slate-800/70 focus:border-slate-900",
              )}
              name="accessCode"
              type={showAccessCode ? "text" : "password"}
              placeholder="Access code"
            />
            <button
              aria-label={showAccessCode ? "Hide access code" : "Show access code"}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors hover:text-white",
                isMinimal && "right-3 text-slate-600 hover:text-slate-900",
              )}
              onClick={() => setShowAccessCode((current) => !current)}
              type="button"
            >
              {showAccessCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      ) : null}
      <div className={cn("flex items-center justify-between pt-1 text-sm text-[var(--muted-foreground)]", isMinimal && "pt-0 text-[13px] text-slate-700")}>
        <label className={cn("flex items-center gap-2", isMinimal && "text-slate-700")}>
          <input className="h-3.5 w-3.5 accent-slate-900" name="remember" type="checkbox" />
          <span>Remember me</span>
        </label>
        <Link href="/auth/forgot-password" className={cn("hover:text-white", isMinimal && "hover:text-slate-900")}>
          Forgot Password?
        </Link>
      </div>
      <Button
        className={cn(
          "auth-action-button mt-1 h-10 w-full rounded-xl",
          isMinimal &&
            "mt-2 h-12 rounded-none border-0 bg-[#102f5c] text-[17px] font-semibold uppercase tracking-[0.18em] hover:bg-[#173b71]",
        )}
        disabled={loading}
        type="submit"
      >
        {loading ? "Signing in..." : "Login"}
      </Button>
      <div className={cn("flex items-center justify-between pt-1 text-sm text-[var(--muted-foreground)]", isMinimal && "pt-0 text-[13px] text-slate-700")}>
        <span />
        <Link href="/auth/signup" className={cn("hover:text-white", isMinimal && "hover:text-slate-900")}>
          Create account
        </Link>
      </div>
    </form>
  );
}

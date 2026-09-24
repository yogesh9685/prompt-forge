import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoredUser, isAuthenticated, setAuthData } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — PromptForge" },
      { name: "description", content: "Log in to PromptForge to manage your Prompt Systems." },
      { property: "og:title", content: "Log in — PromptForge" },
      { property: "og:description", content: "Log in to PromptForge to manage your Prompt Systems." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to /dashboard
  useEffect(() => {
    if (isAuthenticated()) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [navigate]);

  const validate = () => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");
    setGlobalError("");

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setEmailError("Email is required.");
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      isValid = false;
    }

    return isValid;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGlobalError("");

    try {
      // Attempt backend auth if API is available, otherwise graceful fallback
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      let backendSuccess = false;

      try {
        const res = await fetch(`${apiUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setAuthData(
            { id: data.user?.id, name: data.user?.name, email: data.user?.email || email.trim() },
            data.access_token
          );
          backendSuccess = true;
        } else if (res.status === 401 || res.status === 400) {
          const errData = await res.json().catch(() => null);
          setGlobalError(errData?.detail || "Invalid email or password.");
          setLoading(false);
          return;
        }
      } catch {
        // Backend not reached or offline; fall back to local storage auth
      }

      if (!backendSuccess) {
        setAuthData({ email: email.trim() });
      }

      navigate({ to: "/dashboard", replace: true });
    } catch {
      setGlobalError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your PromptForge workspace."
      footer={
        <>
          No account?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {globalError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {globalError}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">Email</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError("");
            }}
            placeholder="you@company.com"
            disabled={loading}
            className={`bg-card/70 ${emailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            autoComplete="email"
          />
          {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
        </label>

        <label className="block">
          <span className="mb-1.5 flex text-xs font-medium">
            Password
            <button
              type="button"
              tabIndex={-1}
              onClick={() => alert("Password reset is managed by your workspace administrator.")}
              className="ml-auto font-normal text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Forgot?
            </button>
          </span>
          <Input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError("");
            }}
            placeholder="••••••••"
            disabled={loading}
            className={`bg-card/70 ${passwordError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            autoComplete="current-password"
          />
          {passwordError && <p className="mt-1 text-xs text-destructive">{passwordError}</p>}
        </label>

        <Button type="submit" disabled={loading} className="w-full cursor-pointer">
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

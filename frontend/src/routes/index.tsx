import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PromptForge" },
      { name: "description", content: "Build, organize, preview, and test reusable Prompt Systems in PromptForge." },
    ],
  }),
  component: RootIndexRedirect,
});

function RootIndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate({ to: "/dashboard", replace: true });
    } else {
      navigate({ to: "/login", replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="fixed inset-0 bg-workspace" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-foreground text-xs font-bold text-background shadow-sm animate-pulse">
          PF
        </div>
        <p className="font-mono text-xs text-muted-foreground">Loading PromptForge...</p>
      </div>
    </div>
  );
}
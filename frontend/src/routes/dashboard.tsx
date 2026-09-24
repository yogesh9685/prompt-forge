import { createFileRoute } from "@tanstack/react-router";
import { PromptForgeDashboard } from "@/components/dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PromptForge" },
      { name: "description", content: "Build, organize, preview, and test reusable Prompt Systems in PromptForge." },
      { property: "og:title", content: "Dashboard — PromptForge" },
      { property: "og:description", content: "Build, organize, preview, and test reusable Prompt Systems in PromptForge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return <PromptForgeDashboard />;
}

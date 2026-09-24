import {
  BookOpen,
  Boxes,
  Check,
  ChevronRight,
  Clipboard,
  Clock3,
  FileCode2,
  FileText,
  Filter,
  Home,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  User as UserIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { clearAuthData, getStoredUser, isAuthenticated } from "@/lib/auth";

type Tab = "Overview" | "Instructions" | "Variables" | "Modules" | "Examples" | "Output" | "Tests" | "Versions";

const systems = [
  { name: "Technical Blog Writer", description: "Long-form, technically accurate engineering articles with clear examples.", tags: ["Writing", "Technical"], icon: FileCode2, version: "v1.8", edited: "12 min ago", status: "Active" },
  { name: "Code Reviewer", description: "Reviews pull requests for correctness, security, and maintainability.", tags: ["Code", "Quality"], icon: SlidersHorizontal, version: "v2.4", edited: "Yesterday", status: "Active" },
  { name: "Executive Summary", description: "Turns complex reports into concise, decision-ready executive briefs.", tags: ["Business", "Summary"], icon: FileText, version: "v1.2", edited: "3 days ago", status: "Draft" },
];

const tabs: Tab[] = ["Overview", "Instructions", "Variables", "Modules", "Examples", "Output", "Tests", "Versions"];

export function PromptForgeDashboard() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<"library" | "editor">("library");
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  // Route protection: redirect to /login if unauthenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate({ to: "/login", replace: true });
    } else {
      setCurrentUser(getStoredUser());
    }
  }, [navigate]);

  const handleLogout = () => {
    clearAuthData();
    navigate({ to: "/login", replace: true });
  };

  const filtered = useMemo(
    () =>
      systems.filter((item) =>
        `${item.name} ${item.description} ${item.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const openEditor = () => {
    setScreen("editor");
    setActiveTab("Overview");
    setMobileNav(false);
  };

  const copyPreview = async () => {
    await navigator.clipboard?.writeText(
      "Core Instructions\nWrite precise, structured technical content.\n\nVariables\ntopic, audience, tone\n\nPrompt Modules\nResearch, Critic, Writer\n\nOutput Requirements\nMarkdown, 1,000–1,400 words."
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 bg-workspace" aria-hidden="true" />
      {mobileNav && (
        <button
          className="fixed inset-0 z-30 bg-overlay md:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="relative flex min-h-screen">
        <Sidebar
          open={mobileNav}
          user={currentUser}
          onClose={() => setMobileNav(false)}
          onHome={() => {
            setScreen("library");
            setMobileNav(false);
          }}
          onEditor={openEditor}
          onLogout={handleLogout}
        />
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-surface-glass px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileNav(true)}
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
              <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <button onClick={() => setScreen("library")} className="cursor-pointer hover:text-foreground">
                  Prompt Library
                </button>
                {screen === "editor" && (
                  <>
                    <span>/</span>
                    <span className="font-medium text-foreground">Technical Blog Writer</span>
                  </>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-md bg-card/60 px-2.5 py-1.5 text-[11px] text-muted-foreground ring-1 ring-border/60 lg:flex">
                  <span className="rounded bg-primary px-1.5 py-0.5 font-mono font-semibold text-primary-foreground">
                    ⌘K
                  </span>{" "}
                  Command
                </div>
                {screen === "editor" && (
                  <Button variant="outline" size="sm">
                    Save
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => (screen === "editor" ? setPreviewOpen(true) : setNewOpen(true))}
                >
                  {screen === "editor" ? (
                    <>
                      <Sparkles /> Preview Prompt
                    </>
                  ) : (
                    <>
                      <Plus /> New Prompt System
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
                >
                  <LogOut className="mr-1 size-3.5" />
                  Logout
                </Button>
              </div>
            </div>
          </header>
          {screen === "library" ? (
            <Library
              search={search}
              setSearch={setSearch}
              filtered={filtered}
              filterOpen={filterOpen}
              setFilterOpen={setFilterOpen}
              onOpen={openEditor}
              onNew={() => setNewOpen(true)}
            />
          ) : (
            <Editor
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onPreview={() => setPreviewOpen(true)}
            />
          )}
        </main>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="border-border bg-popover sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Prompt System</DialogTitle>
            <DialogDescription>Create a blank Prompt System to configure in the editor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium">Name</label>
            <Input placeholder="e.g. Product Brief Writer" className="bg-card/70" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setNewOpen(false);
                openEditor();
              }}
            >
              Create Prompt System
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-popover sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Final prompt preview</DialogTitle>
            <DialogDescription>Compiled from the current Prompt System configuration.</DialogDescription>
          </DialogHeader>
          <PromptPreview />
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Edit
            </Button>
            <Button variant="outline" onClick={copyPreview}>
              {copied ? (
                <>
                  <Check /> Copied
                </>
              ) : (
                <>
                  <Clipboard /> Copy
                </>
              )}
            </Button>
            <Button onClick={() => setPreviewOpen(false)}>
              <Sparkles /> Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Sidebar({
  open,
  user,
  onClose,
  onHome,
  onEditor,
  onLogout,
}: {
  open: boolean;
  user: { email?: string; name?: string } | null;
  onClose: () => void;
  onHome: () => void;
  onEditor: () => void;
  onLogout: () => void;
}) {
  const links = [
    { label: "Home", icon: Home, action: onHome },
    { label: "Prompt Systems", icon: BookOpen, action: onEditor },
    { label: "Modules", icon: Boxes },
    { label: "Templates", icon: FileText },
    { label: "Settings", icon: Settings },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar/90 px-3 py-5 backdrop-blur-xl transition-transform md:sticky md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-2.5 px-2">
        <div className="grid size-8 place-items-center rounded-lg bg-foreground text-[10px] font-bold text-background">
          PF
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold">PromptForge</div>
          <div className="font-mono text-[9px] uppercase text-muted-foreground">Prompt studio</div>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={onClose}>
          <X />
        </Button>
      </div>

      <nav className="mt-7 space-y-0.5">
        {links.map(({ label, icon: Icon, action }, index) => (
          <Button
            key={label}
            variant={index === 0 ? "secondary" : "ghost"}
            className="w-full justify-start px-3 font-normal"
            onClick={action}
          >
            <Icon />
            {label}
            {label === "Prompt Systems" && (
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">3</span>
            )}
          </Button>
        ))}
      </nav>

      {/* User profile & Workspace stats */}
      <div className="mt-auto space-y-2">
        {user && (
          <div className="flex items-center justify-between rounded-lg bg-card/60 px-3 py-2 ring-1 ring-border/60">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                {user.name && <div className="truncate text-xs font-medium">{user.name}</div>}
                <div className="truncate text-[10px] text-muted-foreground">{user.email}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={onLogout}
              title="Log out"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        )}

        <div className="rounded-lg bg-card/60 p-3 ring-1 ring-border/60">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium">Workspace</span>
            <span className="font-mono text-muted-foreground">v2.4</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 rounded-full bg-primary" />
          </div>
          <div className="mt-2 font-mono text-[9px] uppercase text-muted-foreground">3 prompt systems</div>
        </div>
      </div>
    </aside>
  );
}

function Library({
  search,
  setSearch,
  filtered,
  filterOpen,
  setFilterOpen,
  onOpen,
  onNew,
}: {
  search: string;
  setSearch: (value: string) => void;
  filtered: typeof systems;
  filterOpen: boolean;
  setFilterOpen: (value: boolean) => void;
  onOpen: () => void;
  onNew: () => void;
}) {
  return (
    <div className="pf-fade mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase text-primary">Workspace / Library</p>
          <h1 className="mt-1 text-2xl font-semibold">Prompt Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">Build and organize reusable Prompt Systems.</p>
        </div>
        <Button className="ml-auto hidden sm:inline-flex" onClick={onNew}>
          <Plus /> New Prompt System
        </Button>
      </div>
      <div className="relative mt-6 flex gap-2">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search Prompt Systems"
          className="h-10 bg-card/65 pl-9"
        />
        <Button
          variant={filterOpen ? "secondary" : "outline"}
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => setFilterOpen(!filterOpen)}
          aria-label="Filter Prompt Systems"
        >
          <Filter />
        </Button>
      </div>
      {filterOpen && (
        <div className="mt-2 flex gap-2 rounded-lg bg-card/55 p-3 ring-1 ring-border/60">
          <span className="text-xs font-medium">Status</span>
          <span className="rounded-md bg-accent px-2 py-0.5 text-[11px]">All</span>
          <span className="rounded-md px-2 py-0.5 text-[11px] text-muted-foreground">Active</span>
          <span className="rounded-md px-2 py-0.5 text-[11px] text-muted-foreground">Draft</span>
        </div>
      )}
      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Prompt Systems</h2>
        <span className="font-mono text-[10px] text-muted-foreground">{filtered.length} SYSTEMS</span>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <SystemCard key={item.name} item={item} onOpen={onOpen} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="mt-3 rounded-lg bg-card/55 py-16 text-center text-sm text-muted-foreground ring-1 ring-border/60">
          No Prompt Systems match “{search}”.
        </div>
      )}
      <section className="mt-9">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recently Edited</h2>
          <span className="font-mono text-[10px] text-muted-foreground">LAST 7 DAYS</span>
        </div>
        <div className="mt-3 overflow-hidden rounded-lg bg-card/55 ring-1 ring-border/60">
          {systems.map((item, index) => (
            <button
              key={item.name}
              onClick={onOpen}
              className="flex w-full cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-3 text-left last:border-0 hover:bg-card/75"
            >
              <item.icon className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                {index === 0
                  ? "Updated Core Instructions"
                  : index === 1
                    ? "Added a test case"
                    : "Changed output requirements"}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{item.edited}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SystemCard({ item, onOpen }: { item: (typeof systems)[number]; onOpen: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onOpen}
      className="group cursor-pointer rounded-lg bg-card/55 p-4 text-left ring-1 ring-border/60 transition hover:-translate-y-0.5 hover:bg-card/75 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{item.name}</h3>
            <span
              className={`ml-auto rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                item.status === "Active" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
              }`}
            >
              item.status
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-1.5">
        {item.tags.map((tag) => (
          <span key={tag} className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center border-t border-border/60 pt-3 font-mono text-[10px] text-muted-foreground">
        <span>{item.version}</span>
        <span className="ml-auto">Edited {item.edited}</span>
        <ChevronRight className="ml-2 size-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function Editor({
  activeTab,
  setActiveTab,
  onPreview,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onPreview: () => void;
}) {
  return (
    <div className="pf-fade mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase text-primary">Prompt System</p>
          <h1 className="mt-1 text-2xl font-semibold">Technical Blog Writer</h1>
          <p className="mt-1 text-sm text-muted-foreground">Long-form, technically accurate engineering articles.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-md bg-success-soft px-2 py-1 font-mono text-[10px] uppercase text-success">
            Active
          </span>
          <span className="rounded-md bg-primary-soft px-2 py-1 font-mono text-[10px] uppercase text-primary">
            v1.8
          </span>
        </div>
      </div>
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border/60 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer whitespace-nowrap rounded-t-md px-3 py-2 text-xs transition ${
              activeTab === tab
                ? "bg-card font-medium text-foreground shadow-inner"
                : "text-muted-foreground hover:bg-card/40 hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <TabContent tab={activeTab} />
        </section>
        <aside>
          <div className="sticky top-20 rounded-lg bg-card/55 p-4 ring-1 ring-border/60">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">Prompt preview</h3>
                <p className="mt-1 text-xs text-muted-foreground">Compiled from the current configuration.</p>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal />
              </Button>
            </div>
            <div className="mt-3 max-h-72 overflow-y-auto">
              <PromptPreview compact />
            </div>
            <Button className="mt-3 w-full" onClick={onPreview}>
              <Sparkles /> Preview Prompt
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  if (tab === "Overview")
    return (
      <Panel title="Overview" description="Basic details for this Prompt System.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input defaultValue="Technical Blog Writer" />
          </Field>
          <Field label="Optional Icon">
            <Button variant="outline" className="w-full justify-start">
              <FileCode2 /> Technical
            </Button>
          </Field>
          <Field label="Description" wide>
            <Textarea
              rows={4}
              defaultValue="Creates structured, accurate technical articles for engineering audiences."
            />
          </Field>
          <Field label="Tags" wide>
            <Input defaultValue="Writing, Technical, Engineering" />
          </Field>
        </div>
      </Panel>
    );
  if (tab === "Instructions")
    return (
      <Panel title="Core Instructions" description="Define the role, approach, and boundaries.">
        <Textarea
          className="min-h-80 font-mono text-xs leading-relaxed"
          defaultValue={
            "You are an experienced technical writer. Create clear, accurate articles for engineering audiences.\n\nExplain complex ideas without unnecessary jargon. Include practical examples and acknowledge meaningful trade-offs. Never invent benchmarks, quotations, or sources."
          }
        />
      </Panel>
    );
  if (tab === "Variables")
    return (
      <Panel title="Variables" description="Values supplied whenever this Prompt System runs." action="Add Variable">
        <div className="space-y-3">
          <Variable
            name="topic"
            label="Article topic"
            type="Text"
            required
            defaultValue="Event-driven architecture"
            description="The main subject of the article."
          />
          <Variable
            name="audience"
            label="Target audience"
            type="Select"
            required
            defaultValue="Senior engineers"
            description="Controls technical depth and vocabulary."
          />
          <Variable
            name="notes"
            label="Additional notes"
            type="Multiline"
            defaultValue=""
            description="Optional context to incorporate."
          />
        </div>
      </Panel>
    );
  if (tab === "Modules")
    return (
      <Panel title="Prompt Modules" description="Reusable blocks included when the prompt is compiled.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Module name="Research Module" description="Creates a fact checklist before drafting." enabled />
          <Module name="Critic Module" description="Challenges claims, gaps, and weak reasoning." enabled />
          <Module name="Writer Module" description="Transforms the plan into polished prose." enabled />
        </div>
      </Panel>
    );
  if (tab === "Examples")
    return (
      <Panel title="Input / Output Examples" description="Demonstrate the response pattern you expect." action="Add Example">
        <div className="space-y-3">
          <Example
            title="Rust async walkthrough"
            input={'topic = "tokio scheduling"\naudience = "backend engineers"'}
            output="A structured article with a runtime explanation, three examples, and a concise trade-off table."
          />
          <Example
            title="Distributed locks"
            input={'topic = "coordination under partial failure"\naudience = "CTO"'}
            output="An executive technical brief focused on failure modes and architecture decisions."
          />
        </div>
      </Panel>
    );
  if (tab === "Output")
    return (
      <Panel title="Output Requirements" description="Set the structure and quality bar for the final response.">
        <Textarea
          className="min-h-80 font-mono text-xs leading-relaxed"
          defaultValue={
            "Return clean Markdown.\n\n- Start with a three-bullet summary\n- Use descriptive H2 and H3 headings\n- Include runnable code blocks where useful\n- Target 1,000–1,400 words\n- End with practical next steps"
          }
        />
      </Panel>
    );
  if (tab === "Tests")
    return (
      <Panel title="Test Cases" description="Check expected behavior against representative inputs.">
        <div className="space-y-3">
          <Test
            name="Technical depth"
            variables="topic: Event loops · audience: Senior engineers"
            expected="Explains implementation details and trade-offs without introductory filler."
          />
          <Test
            name="Executive audience"
            variables="topic: Platform migration · audience: CTO"
            expected="Prioritizes risk, cost, and architectural implications."
          />
        </div>
      </Panel>
    );
  return (
    <Panel title="Versions" description="Review and restore earlier Prompt System revisions.">
      <div className="overflow-hidden rounded-lg ring-1 ring-border/60">
        {[
          ["v1.8", "Today, 10:42", "Refined output structure"],
          ["v1.7", "Sep 21, 2026", "Added Critic Module"],
          ["v1.6", "Sep 18, 2026", "Updated audience variable"],
        ].map(([version, date, note]) => (
          <div
            key={version}
            className="grid gap-2 border-b border-border/60 bg-card/50 p-4 last:border-0 sm:grid-cols-[60px_130px_1fr_auto] sm:items-center"
          >
            <span className="font-mono text-xs font-semibold">{version}</span>
            <span className="text-xs text-muted-foreground">{date}</span>
            <span className="text-sm">{note}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm">
                View
              </Button>
              <Button variant="ghost" size="sm">
                Compare
              </Button>
              <Button variant="outline" size="sm">
                Restore
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {action && (
          <Button variant="outline" size="sm">
            <Plus /> {action}
          </Button>
        )}
      </div>
      <div className="rounded-lg bg-card/55 p-4 ring-1 ring-border/60">{children}</div>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}

function Variable({
  name,
  label,
  type,
  required,
  defaultValue,
  description,
}: {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  defaultValue: string;
  description: string;
}) {
  return (
    <div className="rounded-lg bg-card/55 p-4 ring-1 ring-border/60">
      <div className="flex flex-wrap items-center gap-2">
        <code className="text-xs font-semibold text-primary">{`{{${name}}}`}</code>
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px]">{type}</span>
        {required && (
          <span className="rounded-md bg-primary-soft px-2 py-0.5 font-mono text-[10px] text-primary">Required</span>
        )}
        <Button variant="ghost" size="sm" className="ml-auto">
          Edit
        </Button>
      </div>
      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
        <div>
          <span className="text-muted-foreground">Label</span>
          <p className="mt-1 font-medium">{label}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Default</span>
          <p className="mt-1 font-medium">{defaultValue || "None"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Description</span>
          <p className="mt-1 font-medium">{description}</p>
        </div>
      </div>
    </div>
  );
}

function Module({ name, description, enabled }: { name: string; description: string; enabled: boolean }) {
  return (
    <div className="rounded-lg bg-card/55 p-4 ring-1 ring-border/60">
      <div className="flex items-center justify-between">
        <div className="grid size-8 place-items-center rounded-md bg-accent">
          <Boxes className="size-4" />
        </div>
        <Switch defaultChecked={enabled} aria-label={`Toggle ${name}`} />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{name}</h3>
      <p className="mt-1 min-h-10 text-xs leading-relaxed text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" className="mt-4 w-full">
        Configure
      </Button>
    </div>
  );
}

function Example({ title, input, output }: { title: string; input: string; output: string }) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-border/60">
      <div className="border-b border-border/60 bg-card/60 px-4 py-2 text-xs font-semibold">{title}</div>
      <div className="grid gap-px bg-border/60 sm:grid-cols-2">
        <div className="bg-card/45 p-4">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">Input</span>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed">{input}</pre>
        </div>
        <div className="bg-card/45 p-4">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">Output</span>
          <p className="mt-2 text-xs leading-relaxed">{output}</p>
        </div>
      </div>
    </div>
  );
}

function Test({ name, variables, expected }: { name: string; variables: string; expected: string }) {
  return (
    <div className="rounded-lg bg-card/55 p-4 ring-1 ring-border/60">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{name}</h3>
        <span className="rounded-md bg-success-soft px-2 py-0.5 font-mono text-[10px] text-success">Ready</span>
        <Button size="sm" className="ml-auto">
          Run Test
        </Button>
      </div>
      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <span className="text-muted-foreground">Variables</span>
          <p className="mt-1">{variables}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Expected Behavior</span>
          <p className="mt-1">{expected}</p>
        </div>
      </div>
    </div>
  );
}

function PromptPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-lg bg-preview p-4 font-mono text-xs leading-relaxed text-preview-foreground ${
        compact ? "text-[11px]" : ""
      }`}
    >
      <p className="text-preview-muted"># Core Instructions</p>
      <p className="mt-1">Write precise, well-structured technical articles for the specified audience.</p>
      <p className="mt-4 text-preview-muted"># Variables</p>
      <p className="mt-1">
        topic: Event-driven architecture
        <br />
        audience: Senior engineers
        <br />
        tone: Technical
      </p>
      <p className="mt-4 text-preview-muted"># Prompt Module outputs</p>
      <p className="mt-1">
        Research: key facts and source checklist
        <br />
        Critic: risks, gaps, and counterpoints
        <br />
        Writer: polished article draft
      </p>
      <p className="mt-4 text-preview-muted"># Output Requirements</p>
      <p className="mt-1">Markdown · 1,000–1,400 words · runnable examples · practical next steps</p>
    </div>
  );
}

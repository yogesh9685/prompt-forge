import {
  AlertCircle,
  BookOpen,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  FileCode2,
  FileText,
  Filter,
  Home,
  Loader2,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  promptSystemService,
  type PromptSystem,
  type VariableDefinition,
} from "@/services";

type Tab =
  | "Overview"
  | "Instructions"
  | "Variables"
  | "Modules"
  | "Examples"
  | "Output"
  | "Tests"
  | "Versions";

const tabs: Tab[] = [
  "Overview",
  "Instructions",
  "Variables",
  "Modules",
  "Examples",
  "Output",
  "Tests",
  "Versions",
];

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0 || isNaN(diffMs)) return "Recently";
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export function PromptForgeDashboard() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<"library" | "editor">("library");
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Draft">("All");
  const [mobileNav, setMobileNav] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  // Prompt Systems list state
  const [systems, setSystems] = useState<PromptSystem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Selected system (Editor) state
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<PromptSystem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Editor editable fields
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editVariables, setEditVariables] = useState<VariableDefinition[]>([]);
  const [editModules, setEditModules] = useState<any[]>([]);
  const [editExamples, setEditExamples] = useState<any[]>([]);
  const [editOutputFormat, setEditOutputFormat] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Create form state
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createInstructions, setCreateInstructions] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [systemToDelete, setSystemToDelete] = useState<PromptSystem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Route protection: redirect to /login if unauthenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate({ to: "/login", replace: true });
    } else {
      setCurrentUser(getStoredUser());
    }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    clearAuthData();
    navigate({ to: "/login", replace: true });
  }, [navigate]);

  // Fetch prompt systems list from backend
  const loadPromptSystems = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await promptSystemService.list({ sort: "recent" });
      setSystems(data);
    } catch (err: any) {
      if (err?.status === 401) {
        handleLogout();
        return;
      }
      setListError(err.message || "Failed to load Prompt Systems.");
    } finally {
      setLoadingList(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    if (isAuthenticated()) {
      loadPromptSystems();
    }
  }, [loadPromptSystems]);

  // Fetch single Prompt System by ID
  const fetchDetails = useCallback(
    async (id: number) => {
      setLoadingDetails(true);
      setDetailsError(null);
      setSaveError(null);
      setSaveSuccess(false);
      try {
        const data = await promptSystemService.getById(id);
        setSelectedSystem(data);
        setEditName(data.name || "");
        setEditDescription(data.description || "");
        setEditInstructions(data.instructions || "");
        setEditVariables(Array.isArray(data.variables) ? data.variables : []);
        setEditModules(Array.isArray(data.modules) ? data.modules : []);
        setEditExamples(Array.isArray(data.examples) ? data.examples : []);
        setEditOutputFormat(data.output_format ?? {});
      } catch (err: any) {
        if (err?.status === 401) {
          handleLogout();
          return;
        }
        setDetailsError(err.message || "Prompt System not found.");
      } finally {
        setLoadingDetails(false);
      }
    },
    [handleLogout]
  );

  const openEditor = useCallback(
    (id: number) => {
      setSelectedSystemId(id);
      setScreen("editor");
      setActiveTab("Overview");
      setMobileNav(false);
      fetchDetails(id);
    },
    [fetchDetails]
  );

  // Handle Save / Update
  const handleSave = async () => {
    if (!selectedSystem || saving) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setSaveError("Prompt System name cannot be empty.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await promptSystemService.update(selectedSystem.id, {
        name: trimmedName,
        description: editDescription.trim() || null,
        instructions: editInstructions || null,
        variables: editVariables,
        examples: editExamples,
        output_format: editOutputFormat,
        modules: editModules,
      });

      setSelectedSystem(updated);
      setEditName(updated.name);
      setEditDescription(updated.description || "");
      setEditInstructions(updated.instructions || "");
      setEditVariables(Array.isArray(updated.variables) ? updated.variables : []);
      setEditModules(Array.isArray(updated.modules) ? updated.modules : []);
      setEditExamples(Array.isArray(updated.examples) ? updated.examples : []);
      setEditOutputFormat(updated.output_format ?? {});

      // Update list in state
      setSystems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      if (err?.status === 401) {
        handleLogout();
        return;
      }
      setSaveError(err.message || "Failed to update Prompt System.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Create
  const handleCreatePromptSystem = async () => {
    const trimmedName = createName.trim();
    if (!trimmedName) {
      setCreateError("Prompt System name is required.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const created = await promptSystemService.create({
        name: trimmedName,
        description: createDescription.trim() || null,
        instructions: createInstructions.trim() || null,
        variables: [],
        examples: [],
        output_format: {},
        modules: [],
      });

      setSystems((prev) => [created, ...prev]);
      setNewOpen(false);
      setCreateName("");
      setCreateDescription("");
      setCreateInstructions("");

      // Open newly created Prompt System in editor
      openEditor(created.id);
    } catch (err: any) {
      if (err?.status === 401) {
        handleLogout();
        return;
      }
      setCreateError(err.message || "Failed to create Prompt System.");
    } finally {
      setCreating(false);
    }
  };

  // Handle Delete Prompt Confirmation
  const promptDelete = (system: PromptSystem) => {
    setSystemToDelete(system);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!systemToDelete || deleting) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await promptSystemService.delete(systemToDelete.id);
      setSystems((prev) => prev.filter((item) => item.id !== systemToDelete.id));
      setDeleteDialogOpen(false);

      // If currently editing the deleted system, return to library
      if (screen === "editor" && selectedSystemId === systemToDelete.id) {
        setScreen("library");
        setSelectedSystem(null);
        setSelectedSystemId(null);
      }
      setSystemToDelete(null);
    } catch (err: any) {
      if (err?.status === 401) {
        handleLogout();
        return;
      }
      setDeleteError(err.message || "Failed to delete Prompt System.");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return systems.filter((item) => {
      const term = search.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(term) ||
        (item.description || "").toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (statusFilter === "Active") return !item.archived;
      if (statusFilter === "Draft") return item.archived;
      return true;
    });
  }, [systems, search, statusFilter]);

  const copyPreview = async () => {
    const previewContent = [
      "Core Instructions",
      editInstructions || "No instructions defined.",
      "\nVariables",
      editVariables.length > 0
        ? editVariables.map((v) => `${v.name}${v.required ? " (required)" : ""}`).join(", ")
        : "None",
      "\nModules",
      editModules.length > 0 ? editModules.map((m) => (typeof m === "string" ? m : m.name || JSON.stringify(m))).join(", ") : "None",
      "\nOutput Requirements",
      typeof editOutputFormat === "string" ? editOutputFormat : JSON.stringify(editOutputFormat, null, 2),
    ].join("\n");

    await navigator.clipboard?.writeText(previewContent);
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
          systemCount={systems.length}
          onClose={() => setMobileNav(false)}
          onHome={() => {
            setScreen("library");
            setMobileNav(false);
          }}
          onEditor={() => {
            if (systems.length > 0) {
              openEditor(systems[0].id);
            } else {
              setNewOpen(true);
            }
          }}
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
                <button
                  onClick={() => setScreen("library")}
                  className="cursor-pointer hover:text-foreground"
                >
                  Prompt Library
                </button>
                {screen === "editor" && selectedSystem && (
                  <>
                    <span>/</span>
                    <span className="font-medium text-foreground truncate max-w-[200px]">
                      {editName || selectedSystem.name}
                    </span>
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

                {screen === "editor" && selectedSystem && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || loadingDetails}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Check className="mr-1.5 size-3.5 text-success" />
                          Saved
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      title="Delete Prompt System"
                      onClick={() => promptDelete(selectedSystem)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )}

                <Button
                  size="sm"
                  onClick={() =>
                    screen === "editor" ? setPreviewOpen(true) : setNewOpen(true)
                  }
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
              systems={systems}
              filtered={filtered}
              filterOpen={filterOpen}
              setFilterOpen={setFilterOpen}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              loading={loadingList}
              error={listError}
              onRetry={loadPromptSystems}
              onOpen={openEditor}
              onNew={() => {
                setCreateError(null);
                setNewOpen(true);
              }}
              onDelete={promptDelete}
            />
          ) : (
            <Editor
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedSystem={selectedSystem}
              selectedSystemId={selectedSystemId}
              loadingDetails={loadingDetails}
              detailsError={detailsError}
              saving={saving}
              saveError={saveError}
              saveSuccess={saveSuccess}
              onSave={handleSave}
              onRetry={() => selectedSystemId && fetchDetails(selectedSystemId)}
              onBackToLibrary={() => setScreen("library")}
              onPreview={() => setPreviewOpen(true)}
              onDelete={() => selectedSystem && promptDelete(selectedSystem)}
              editName={editName}
              setEditName={setEditName}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              editInstructions={editInstructions}
              setEditInstructions={setEditInstructions}
              editVariables={editVariables}
              setEditVariables={setEditVariables}
              editModules={editModules}
              setEditModules={setEditModules}
              editExamples={editExamples}
              setEditExamples={setEditExamples}
              editOutputFormat={editOutputFormat}
              setEditOutputFormat={setEditOutputFormat}
            />
          )}
        </main>
      </div>

      {/* Create Prompt System Dialog */}
      <Dialog
        open={newOpen}
        onOpenChange={(open) => {
          if (!creating) {
            setNewOpen(open);
            if (!open) setCreateError(null);
          }
        }}
      >
        <DialogContent className="border-border bg-popover sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Prompt System</DialogTitle>
            <DialogDescription>
              Create a new Prompt System in your workspace.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreatePromptSystem();
            }}
            className="space-y-3.5"
          >
            {createError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-2.5 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Name *</label>
              <Input
                placeholder="e.g. Technical Blog Writer"
                className="bg-card/70"
                value={createName}
                onChange={(e) => {
                  setCreateName(e.target.value);
                  setCreateError(null);
                }}
                disabled={creating}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Description</label>
              <Textarea
                placeholder="What will this Prompt System accomplish?"
                className="bg-card/70 text-xs"
                rows={2}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                disabled={creating}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Core Instructions</label>
              <Textarea
                placeholder="Define role, tone, and guidance..."
                className="bg-card/70 font-mono text-xs"
                rows={3}
                value={createInstructions}
                onChange={(e) => setCreateInstructions(e.target.value)}
                disabled={creating}
              />
            </div>
            <DialogFooter className="gap-2 sm:space-x-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !createName.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 size-3.5" />
                    Create Prompt System
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setDeleteDialogOpen(open);
            if (!open) {
              setDeleteError(null);
              setSystemToDelete(null);
            }
          }
        }}
      >
        <DialogContent className="border-border bg-popover sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              Delete Prompt System
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                “{systemToDelete?.name}”
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-2.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:space-x-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 size-3.5" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Prompt Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-popover sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Final prompt preview</DialogTitle>
            <DialogDescription>
              Compiled from current Prompt System configuration.
            </DialogDescription>
          </DialogHeader>
          <PromptPreview
            instructions={editInstructions}
            variables={editVariables}
            modules={editModules}
            outputFormat={editOutputFormat}
          />
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Edit
            </Button>
            <Button variant="outline" onClick={copyPreview}>
              {copied ? (
                <>
                  <Check className="mr-1.5 size-3.5" /> Copied
                </>
              ) : (
                <>
                  <Clipboard className="mr-1.5 size-3.5" /> Copy
                </>
              )}
            </Button>
            <Button onClick={() => setPreviewOpen(false)}>
              <Sparkles className="mr-1.5 size-3.5" /> Close Preview
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
  systemCount,
  onClose,
  onHome,
  onEditor,
  onLogout,
}: {
  open: boolean;
  user: { email?: string; name?: string } | null;
  systemCount: number;
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
          <div className="font-mono text-[9px] uppercase text-muted-foreground">
            Prompt studio
          </div>
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
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                {systemCount}
              </span>
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
                {user.name ? user.name[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : "U"}
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
          <div className="mt-2 font-mono text-[9px] uppercase text-muted-foreground">
            {systemCount} {systemCount === 1 ? "prompt system" : "prompt systems"}
          </div>
        </div>
      </div>
    </aside>
  );
}

function Library({
  search,
  setSearch,
  systems,
  filtered,
  filterOpen,
  setFilterOpen,
  statusFilter,
  setStatusFilter,
  loading,
  error,
  onRetry,
  onOpen,
  onNew,
  onDelete,
}: {
  search: string;
  setSearch: (value: string) => void;
  systems: PromptSystem[];
  filtered: PromptSystem[];
  filterOpen: boolean;
  setFilterOpen: (value: boolean) => void;
  statusFilter: "All" | "Active" | "Draft";
  setStatusFilter: (value: "All" | "Active" | "Draft") => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: (id: number) => void;
  onNew: () => void;
  onDelete: (system: PromptSystem) => void;
}) {
  return (
    <div className="pf-fade mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase text-primary">Workspace / Library</p>
          <h1 className="mt-1 text-2xl font-semibold">Prompt Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build and organize reusable Prompt Systems.
          </p>
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
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-card/55 p-3 ring-1 ring-border/60">
          <span className="text-xs font-medium">Status</span>
          <button
            onClick={() => setStatusFilter("All")}
            className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] ${
              statusFilter === "All" ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("Active")}
            className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] ${
              statusFilter === "Active" ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter("Draft")}
            className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] ${
              statusFilter === "Draft" ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            Archived
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-1.5 size-3.5" /> Retry
          </Button>
        </div>
      )}

      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Prompt Systems</h2>
        <span className="font-mono text-[10px] text-muted-foreground">
          {loading ? "LOADING..." : `${filtered.length} SYSTEMS`}
        </span>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="mt-4 flex h-48 flex-col items-center justify-center gap-3 rounded-lg bg-card/30 ring-1 ring-border/50">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading Prompt Systems from workspace...</p>
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <SystemCard
                key={item.id}
                item={item}
                onOpen={() => onOpen(item.id)}
                onDelete={() => onDelete(item)}
              />
            ))}
          </div>

          {filtered.length === 0 && !loading && (
            <div className="mt-3 rounded-lg bg-card/55 py-16 text-center ring-1 ring-border/60">
              <p className="text-sm text-muted-foreground">
                {search
                  ? `No Prompt Systems match “${search}”.`
                  : "No Prompt Systems found. Create your first Prompt System to get started."}
              </p>
              {!search && (
                <Button size="sm" className="mt-4" onClick={onNew}>
                  <Plus className="mr-1.5 size-3.5" /> New Prompt System
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Recently Edited Section */}
      {systems.length > 0 && (
        <section className="mt-9">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recently Edited</h2>
            <span className="font-mono text-[10px] text-muted-foreground">WORKSPACE ACTIVITY</span>
          </div>
          <div className="mt-3 overflow-hidden rounded-lg bg-card/55 ring-1 ring-border/60">
            {systems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => onOpen(item.id)}
                className="flex w-full cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-3 text-left last:border-0 hover:bg-card/75"
              >
                <FileCode2 className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {item.name}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:block truncate max-w-xs">
                  {item.description || "Core configuration"}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatRelativeTime(item.updated_at)}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SystemCard({
  item,
  onOpen,
  onDelete,
}: {
  item: PromptSystem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const varCount = Array.isArray(item.variables) ? item.variables.length : 0;
  const modCount = Array.isArray(item.modules) ? item.modules.length : 0;
  const tags = [
    varCount > 0 ? `${varCount} ${varCount === 1 ? "var" : "vars"}` : "Prompt System",
    modCount > 0 ? `${modCount} modules` : "Active",
  ];

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group relative cursor-pointer rounded-lg bg-card/55 p-4 text-left ring-1 ring-border/60 transition hover:-translate-y-0.5 hover:bg-card/75 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <FileCode2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{item.name}</h3>
            <span
              className={`ml-auto rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                !item.archived
                  ? "bg-success-soft text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {!item.archived ? "Active" : "Archived"}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {item.description || "No description provided."}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive opacity-70 hover:opacity-100"
          title="Delete Prompt System"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="mt-4 flex items-center border-t border-border/60 pt-3 font-mono text-[10px] text-muted-foreground">
        <span>v{item.version}.0</span>
        <span className="ml-auto">Edited {formatRelativeTime(item.updated_at)}</span>
        <ChevronRight className="ml-2 size-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}

function Editor({
  activeTab,
  setActiveTab,
  selectedSystem,
  selectedSystemId,
  loadingDetails,
  detailsError,
  saving,
  saveError,
  saveSuccess,
  onSave,
  onRetry,
  onBackToLibrary,
  onPreview,
  onDelete,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  editInstructions,
  setEditInstructions,
  editVariables,
  setEditVariables,
  editModules,
  setEditModules,
  editExamples,
  setEditExamples,
  editOutputFormat,
  setEditOutputFormat,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  selectedSystem: PromptSystem | null;
  selectedSystemId: number | null;
  loadingDetails: boolean;
  detailsError: string | null;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  onSave: () => void;
  onRetry: () => void;
  onBackToLibrary: () => void;
  onPreview: () => void;
  onDelete: () => void;
  editName: string;
  setEditName: (val: string) => void;
  editDescription: string;
  setEditDescription: (val: string) => void;
  editInstructions: string;
  setEditInstructions: (val: string) => void;
  editVariables: VariableDefinition[];
  setEditVariables: (val: VariableDefinition[]) => void;
  editModules: any[];
  setEditModules: (val: any[]) => void;
  editExamples: any[];
  setEditExamples: (val: any[]) => void;
  editOutputFormat: any;
  setEditOutputFormat: (val: any) => void;
}) {
  if (loadingDetails) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm">Loading Prompt System details...</p>
      </div>
    );
  }

  if (detailsError || !selectedSystem) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
          <AlertCircle className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 text-base font-semibold text-foreground">
            {detailsError || "Prompt System not found"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The requested Prompt System could not be loaded or was removed.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={onBackToLibrary}>
              Back to Library
            </Button>
            {selectedSystemId && (
              <Button size="sm" onClick={onRetry}>
                <RefreshCw className="mr-1.5 size-3.5" /> Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-fade mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Save Success / Error banners */}
      {saveSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-success-soft px-3 py-2 text-xs font-medium text-success">
          <CheckCircle2 className="size-4" />
          <span>Prompt System saved successfully.</span>
        </div>
      )}
      {saveError && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/15 px-3 py-2 text-xs font-medium text-destructive">
          <AlertCircle className="size-4" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase text-primary">Prompt System</p>
          <h1 className="mt-1 truncate text-2xl font-semibold">{editName || selectedSystem.name}</h1>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {editDescription || selectedSystem.description || "Reusable Prompt System"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-md bg-success-soft px-2 py-1 font-mono text-[10px] uppercase text-success">
            {!selectedSystem.archived ? "Active" : "Archived"}
          </span>
          <span className="rounded-md bg-primary-soft px-2 py-1 font-mono text-[10px] uppercase text-primary">
            v{selectedSystem.version}.0
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
          <TabContent
            tab={activeTab}
            editName={editName}
            setEditName={setEditName}
            editDescription={editDescription}
            setEditDescription={setEditDescription}
            editInstructions={editInstructions}
            setEditInstructions={setEditInstructions}
            editVariables={editVariables}
            setEditVariables={setEditVariables}
            editModules={editModules}
            setEditModules={setEditModules}
            editExamples={editExamples}
            setEditExamples={setEditExamples}
            editOutputFormat={editOutputFormat}
            setEditOutputFormat={setEditOutputFormat}
            onSave={onSave}
            saving={saving}
            onDelete={onDelete}
          />
        </section>

        <aside>
          <div className="sticky top-20 rounded-lg bg-card/55 p-4 ring-1 ring-border/60">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">Prompt preview</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Compiled from the current configuration.
                </p>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal />
              </Button>
            </div>
            <div className="mt-3 max-h-72 overflow-y-auto">
              <PromptPreview
                compact
                instructions={editInstructions}
                variables={editVariables}
                modules={editModules}
                outputFormat={editOutputFormat}
              />
            </div>
            <Button className="mt-3 w-full" onClick={onPreview}>
              <Sparkles className="mr-1.5 size-3.5" /> Preview Prompt
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TabContent({
  tab,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  editInstructions,
  setEditInstructions,
  editVariables,
  setEditVariables,
  editModules,
  setEditModules,
  editExamples,
  setEditExamples,
  editOutputFormat,
  setEditOutputFormat,
  onSave,
  saving,
  onDelete,
}: {
  tab: Tab;
  editName: string;
  setEditName: (val: string) => void;
  editDescription: string;
  setEditDescription: (val: string) => void;
  editInstructions: string;
  setEditInstructions: (val: string) => void;
  editVariables: VariableDefinition[];
  setEditVariables: (val: VariableDefinition[]) => void;
  editModules: any[];
  setEditModules: (val: any[]) => void;
  editExamples: any[];
  setEditExamples: (val: any[]) => void;
  editOutputFormat: any;
  setEditOutputFormat: (val: any) => void;
  onSave: () => void;
  saving: boolean;
  onDelete: () => void;
}) {
  if (tab === "Overview") {
    return (
      <Panel
        title="Overview"
        description="Basic details and configuration for this Prompt System."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Prompt System Name"
            />
          </Field>
          <Field label="Optional Icon">
            <Button variant="outline" className="w-full justify-start">
              <FileCode2 className="mr-2 size-4" /> Technical
            </Button>
          </Field>
          <Field label="Description" wide>
            <Textarea
              rows={4}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Explain the purpose of this Prompt System..."
            />
          </Field>
          <div className="sm:col-span-2 flex items-center justify-between border-t border-border/60 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1.5 size-3.5" /> Delete Prompt System
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving || !editName.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  if (tab === "Instructions") {
    return (
      <Panel
        title="Core Instructions"
        description="Define the role, approach, and boundaries for this Prompt System."
      >
        <Textarea
          className="min-h-80 font-mono text-xs leading-relaxed"
          value={editInstructions}
          onChange={(e) => setEditInstructions(e.target.value)}
          placeholder="You are an expert assistant..."
        />
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={onSave} disabled={saving || !editName.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Saving...
              </>
            ) : (
              "Save Instructions"
            )}
          </Button>
        </div>
      </Panel>
    );
  }

  if (tab === "Variables") {
    return (
      <Panel
        title="Variables"
        description="Values supplied whenever this Prompt System runs."
      >
        <div className="space-y-3">
          {editVariables && editVariables.length > 0 ? (
            editVariables.map((v) => (
              <Variable
                key={v.name}
                name={v.name}
                label={v.label || v.name}
                type={v.type || "Text"}
                required={v.required ?? true}
                defaultValue={v.default ? String(v.default) : ""}
                description={v.description || ""}
              />
            ))
          ) : (
            <div className="rounded-lg bg-card/40 p-6 text-center text-xs text-muted-foreground">
              No variables defined. You can reference variables using &#123;&#123;variable_name&#125;&#125; in your instructions.
            </div>
          )}
        </div>
      </Panel>
    );
  }

  if (tab === "Modules") {
    return (
      <Panel
        title="Prompt Modules"
        description="Reusable blocks included when the prompt is compiled."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {editModules && editModules.length > 0 ? (
            editModules.map((m, idx) => (
              <Module
                key={idx}
                name={typeof m === "string" ? m : m.name || `Module ${idx + 1}`}
                description={typeof m === "object" && m.description ? m.description : "Module block"}
                enabled
              />
            ))
          ) : (
            <>
              <Module name="Research Module" description="Creates a fact checklist before drafting." enabled />
              <Module name="Critic Module" description="Challenges claims, gaps, and weak reasoning." enabled />
              <Module name="Writer Module" description="Transforms the plan into polished prose." enabled />
            </>
          )}
        </div>
      </Panel>
    );
  }

  if (tab === "Examples") {
    return (
      <Panel
        title="Input / Output Examples"
        description="Demonstrate the response pattern you expect."
      >
        <div className="space-y-3">
          {editExamples && editExamples.length > 0 ? (
            editExamples.map((ex, idx) => (
              <Example
                key={idx}
                title={ex.title || `Example ${idx + 1}`}
                input={typeof ex.input === "string" ? ex.input : JSON.stringify(ex.input, null, 2)}
                output={typeof ex.output === "string" ? ex.output : JSON.stringify(ex.output, null, 2)}
              />
            ))
          ) : (
            <>
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
            </>
          )}
        </div>
      </Panel>
    );
  }

  if (tab === "Output") {
    const outputText =
      typeof editOutputFormat === "string"
        ? editOutputFormat
        : editOutputFormat && Object.keys(editOutputFormat).length > 0
          ? JSON.stringify(editOutputFormat, null, 2)
          : "Return clean Markdown.\n\n- Start with a three-bullet summary\n- Use descriptive H2 and H3 headings\n- Include runnable code blocks where useful\n- Target 1,000–1,400 words\n- End with practical next steps";

    return (
      <Panel
        title="Output Requirements"
        description="Set the structure and quality bar for the final response."
      >
        <Textarea
          className="min-h-80 font-mono text-xs leading-relaxed"
          value={outputText}
          onChange={(e) => {
            try {
              setEditOutputFormat(JSON.parse(e.target.value));
            } catch {
              setEditOutputFormat(e.target.value);
            }
          }}
          placeholder="Specify output constraints and formatting..."
        />
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={onSave} disabled={saving || !editName.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Saving...
              </>
            ) : (
              "Save Output Format"
            )}
          </Button>
        </div>
      </Panel>
    );
  }

  if (tab === "Tests") {
    return (
      <Panel
        title="Test Cases"
        description="Check expected behavior against representative inputs."
      >
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
  }

  return (
    <Panel
      title="Versions"
      description="Review and restore earlier Prompt System revisions."
    >
      <div className="overflow-hidden rounded-lg ring-1 ring-border/60">
        {[
          ["v1.0", "Current version", "Active deployment revision"],
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

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
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
          <span className="rounded-md bg-primary-soft px-2 py-0.5 font-mono text-[10px] text-primary">
            Required
          </span>
        )}
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
          <p className="mt-1 font-medium">{description || "None"}</p>
        </div>
      </div>
    </div>
  );
}

function Module({
  name,
  description,
  enabled,
}: {
  name: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div className="rounded-lg bg-card/55 p-4 ring-1 ring-border/60">
      <div className="flex items-center justify-between">
        <div className="grid size-8 place-items-center rounded-md bg-accent">
          <Boxes className="size-4" />
        </div>
        <Switch defaultChecked={enabled} aria-label={`Toggle ${name}`} />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{name}</h3>
      <p className="mt-1 min-h-10 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Button variant="outline" size="sm" className="mt-4 w-full">
        Configure
      </Button>
    </div>
  );
}

function Example({
  title,
  input,
  output,
}: {
  title: string;
  input: string;
  output: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-border/60">
      <div className="border-b border-border/60 bg-card/60 px-4 py-2 text-xs font-semibold">
        {title}
      </div>
      <div className="grid gap-px bg-border/60 sm:grid-cols-2">
        <div className="bg-card/45 p-4">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">Input</span>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {input}
          </pre>
        </div>
        <div className="bg-card/45 p-4">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">Output</span>
          <p className="mt-2 text-xs leading-relaxed">{output}</p>
        </div>
      </div>
    </div>
  );
}

function Test({
  name,
  variables,
  expected,
}: {
  name: string;
  variables: string;
  expected: string;
}) {
  return (
    <div className="rounded-lg bg-card/55 p-4 ring-1 ring-border/60">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{name}</h3>
        <span className="rounded-md bg-success-soft px-2 py-0.5 font-mono text-[10px] text-success">
          Ready
        </span>
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

function PromptPreview({
  compact = false,
  instructions,
  variables,
  modules,
  outputFormat,
}: {
  compact?: boolean;
  instructions?: string;
  variables?: VariableDefinition[];
  modules?: any[];
  outputFormat?: any;
}) {
  return (
    <div
      className={`rounded-lg bg-preview p-4 font-mono text-xs leading-relaxed text-preview-foreground ${
        compact ? "text-[11px]" : ""
      }`}
    >
      <p className="text-preview-muted"># Core Instructions</p>
      <p className="mt-1 whitespace-pre-wrap">
        {instructions || "Write precise, structured technical content."}
      </p>

      <p className="mt-4 text-preview-muted"># Variables</p>
      <p className="mt-1">
        {variables && variables.length > 0
          ? variables.map((v) => `${v.name}${v.required ? " (required)" : ""}`).join("\n")
          : "None defined"}
      </p>

      <p className="mt-4 text-preview-muted"># Prompt Modules</p>
      <p className="mt-1">
        {modules && modules.length > 0
          ? modules.map((m) => (typeof m === "string" ? m : m.name || JSON.stringify(m))).join("\n")
          : "Standard composition"}
      </p>

      <p className="mt-4 text-preview-muted"># Output Requirements</p>
      <p className="mt-1 whitespace-pre-wrap">
        {typeof outputFormat === "string"
          ? outputFormat
          : outputFormat && Object.keys(outputFormat).length > 0
            ? JSON.stringify(outputFormat, null, 2)
            : "Markdown · Clean headings · Runnable examples"}
      </p>
    </div>
  );
}

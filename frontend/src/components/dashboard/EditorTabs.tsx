import { Boxes, FileCode2, Loader2, Plus, Trash2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function Panel({
  title,
  description,
  action,
  onAction,
  children,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
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
          <Button variant="outline" size="sm" onClick={onAction}>
            <Plus /> {action}
          </Button>
        )}
      </div>
      <div className="rounded-lg bg-card/55 p-4 ring-1 ring-border/60">{children}</div>
    </div>
  );
}

export function Field({
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

export function ModuleItem({
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

export function ExampleItem({
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

export function TestItem({
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

// Tab: Overview
export function OverviewTab({
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  saving,
  onSave,
  onDelete,
}: {
  editName: string;
  setEditName: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onDelete: () => void;
}) {
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

// Tab: Instructions
export function InstructionsTab({
  editName,
  editInstructions,
  setEditInstructions,
  saving,
  onSave,
}: {
  editName: string;
  editInstructions: string;
  setEditInstructions: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Panel
      title="Core Instructions"
      description="Define the role, approach, and boundaries for this Prompt System. Use {variable_name} syntax for variables."
    >
      <Textarea
        className="min-h-80 font-mono text-xs leading-relaxed"
        value={editInstructions}
        onChange={(e) => setEditInstructions(e.target.value)}
        placeholder="You are an expert assistant. Write an article about {topic} for {audience}..."
      />
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          Tip: Reference variables with single curly braces like <code className="text-primary font-mono">&#123;variable&#125;</code>.
        </span>
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

// Tab: Modules
export function ModulesTab({ editModules }: { editModules: unknown[] }) {
  return (
    <Panel
      title="Prompt Modules"
      description="Reusable blocks included when the prompt is compiled."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {editModules && editModules.length > 0 ? (
          editModules.map((m, idx) => {
            const modObj = typeof m === "object" && m !== null ? (m as { name?: string; description?: string }) : null;
            return (
              <ModuleItem
                key={idx}
                name={typeof m === "string" ? m : modObj?.name || `Module ${idx + 1}`}
                description={modObj?.description || "Module block"}
                enabled
              />
            );
          })
        ) : (
          <>
            <ModuleItem name="Research Module" description="Creates a fact checklist before drafting." enabled />
            <ModuleItem name="Critic Module" description="Challenges claims, gaps, and weak reasoning." enabled />
            <ModuleItem name="Writer Module" description="Transforms the plan into polished prose." enabled />
          </>
        )}
      </div>
    </Panel>
  );
}

// Tab: Examples
export function ExamplesTab({ editExamples }: { editExamples: unknown[] }) {
  return (
    <Panel
      title="Input / Output Examples"
      description="Demonstrate the response pattern you expect."
    >
      <div className="space-y-3">
        {editExamples && editExamples.length > 0 ? (
          editExamples.map((ex, idx) => {
            const exObj = typeof ex === "object" && ex !== null ? (ex as { title?: string; input?: unknown; output?: unknown }) : null;
            return (
              <ExampleItem
                key={idx}
                title={exObj?.title || `Example ${idx + 1}`}
                input={typeof exObj?.input === "string" ? exObj.input : JSON.stringify(exObj?.input, null, 2)}
                output={typeof exObj?.output === "string" ? exObj.output : JSON.stringify(exObj?.output, null, 2)}
              />
            );
          })
        ) : (
          <>
            <ExampleItem
              title="Rust async walkthrough"
              input={'topic = "tokio scheduling"\naudience = "backend engineers"'}
              output="A structured article with a runtime explanation, three examples, and a concise trade-off table."
            />
            <ExampleItem
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

// Tab: Output
export function OutputTab({
  editName,
  editOutputFormat,
  setEditOutputFormat,
  saving,
  onSave,
}: {
  editName: string;
  editOutputFormat: unknown;
  setEditOutputFormat: (val: unknown) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const outputText =
    typeof editOutputFormat === "string"
      ? editOutputFormat
      : editOutputFormat && typeof editOutputFormat === "object" && Object.keys(editOutputFormat).length > 0
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

// Tab: Tests
export function TestsTab() {
  return (
    <Panel
      title="Test Cases"
      description="Check expected behavior against representative inputs."
    >
      <div className="space-y-3">
        <TestItem
          name="Technical depth"
          variables="topic: Event loops · audience: Senior engineers"
          expected="Explains implementation details and trade-offs without introductory filler."
        />
        <TestItem
          name="Executive audience"
          variables="topic: Platform migration · audience: CTO"
          expected="Prioritizes risk, cost, and architectural implications."
        />
      </div>
    </Panel>
  );
}

// Tab: Versions
export function VersionsTab() {
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

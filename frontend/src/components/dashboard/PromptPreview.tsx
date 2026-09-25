import { Check, Clipboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VariableDefinition } from "@/services";

export function PromptPreview({
  compact = false,
  instructions,
  variables,
  modules,
  outputFormat,
}: {
  compact?: boolean;
  instructions?: string;
  variables?: VariableDefinition[];
  modules?: unknown[];
  outputFormat?: unknown;
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
          ? modules
              .map((m) =>
                typeof m === "string"
                  ? m
                  : (m as { name?: string })?.name || JSON.stringify(m)
              )
              .join("\n")
          : "Standard composition"}
      </p>

      <p className="mt-4 text-preview-muted"># Output Requirements</p>
      <p className="mt-1 whitespace-pre-wrap">
        {typeof outputFormat === "string"
          ? outputFormat
          : outputFormat && typeof outputFormat === "object" && Object.keys(outputFormat).length > 0
            ? JSON.stringify(outputFormat, null, 2)
            : "Markdown · Clean headings · Runnable examples"}
      </p>
    </div>
  );
}

interface PromptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructions: string;
  variables: VariableDefinition[];
  modules: unknown[];
  outputFormat: unknown;
  copied: boolean;
  onCopy: () => void;
}

export function PromptPreviewDialog({
  open,
  onOpenChange,
  instructions,
  variables,
  modules,
  outputFormat,
  copied,
  onCopy,
}: PromptPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-popover sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Final prompt preview</DialogTitle>
          <DialogDescription>
            Compiled from current Prompt System configuration.
          </DialogDescription>
        </DialogHeader>
        <PromptPreview
          instructions={instructions}
          variables={variables}
          modules={modules}
          outputFormat={outputFormat}
        />
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Edit
          </Button>
          <Button variant="outline" onClick={onCopy}>
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
          <Button onClick={() => onOpenChange(false)}>
            <Sparkles className="mr-1.5 size-3.5" /> Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  FileJson,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Target,
  ListTodo,
  Calendar,
  Tag,
  FolderKanban,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useParseImportFile, useImportPlan } from "@/features/import-export/hooks";
import type { ImportPreview, ImportOptions } from "@/features/import-export/types";
import { useRouter } from "next/navigation";

type ImportStep = "select" | "preview" | "options" | "importing" | "complete";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Import options
  const [options, setOptions] = useState<ImportOptions>({
    createNewPlan: true,
    skipCheckIns: false,
    skipWeeklyReviews: false,
    resetProgress: false,
  });

  const [importResult, setImportResult] = useState<{
    success: boolean;
    planId: string;
    counts: ImportPreview["counts"];
    errors: string[];
  } | null>(null);

  const parseFile = useParseImportFile();
  const importPlan = useImportPlan();

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("select");
      setSelectedFile(null);
      setPreview(null);
      setImportResult(null);
      setOptions({
        createNewPlan: true,
        skipCheckIns: false,
        skipWeeklyReviews: false,
        resetProgress: false,
      });
    }
  }, [open]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".json")) {
        return;
      }

      setSelectedFile(file);
      const result = await parseFile.mutateAsync(file);
      setPreview(result);
      setStep("preview");
    },
    [parseFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImport = async () => {
    if (!selectedFile) return;

    setStep("importing");

    try {
      const result = await importPlan.mutateAsync({
        file: selectedFile,
        options,
      });

      setImportResult(result);
      setStep("complete");
    } catch {
      setStep("options");
    }
  };

  const handleComplete = () => {
    onOpenChange(false);
    if (importResult?.success && importResult.planId) {
      router.push(`/plans/${importResult.planId}/okrs`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {step === "select" && "Import Plan"}
            {step === "preview" && "Preview Import"}
            {step === "options" && "Import Options"}
            {step === "importing" && "Importing..."}
            {step === "complete" && (importResult?.success ? "Import Complete" : "Import Failed")}
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Select a JSON file exported from OKRs Tracker"}
            {step === "preview" && "Review the data that will be imported"}
            {step === "options" && "Configure how the data should be imported"}
            {step === "importing" && "Please wait while we import your data"}
            {step === "complete" &&
              (importResult?.success
                ? "Your data has been imported successfully"
                : "There were errors during import")}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Select File */}
        {step === "select" && (
          <div className="py-4">
            <div
              className={`p-8 rounded-card border-2 border-dashed transition-colors cursor-pointer ${
                isDragging
                  ? "border-accent bg-accent/5"
                  : "border-border-soft hover:border-border"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-accent" />
                </div>
                <p className="text-body-sm font-medium">
                  {isDragging ? "Drop file here" : "Drag & drop or click to select"}
                </p>
                <p className="text-small text-text-muted mt-1">
                  JSON files only
                </p>
              </div>
            </div>

            {parseFile.isPending && (
              <div className="flex items-center justify-center gap-2 mt-4 text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-small">Parsing file...</span>
              </div>
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && preview && (
          <div className="py-4 space-y-4">
            {/* File Info */}
            <div className="flex items-center gap-3 p-3 rounded-card bg-bg-1/50 border border-border-soft">
              <FileJson className="w-5 h-5 text-accent" />
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium truncate">
                  {selectedFile?.name}
                </p>
                <p className="text-small text-text-muted">
                  {preview.plan.name} ({preview.plan.year})
                </p>
              </div>
              {preview.validation.isValid ? (
                <Badge variant="outline" className="bg-status-success/10 text-status-success border-status-success/20">
                  <Check className="w-3 h-3 mr-1" />
                  Valid
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-status-danger/10 text-status-danger border-status-danger/20">
                  <X className="w-3 h-3 mr-1" />
                  Invalid
                </Badge>
              )}
            </div>

            {/* Validation Errors */}
            {preview.validation.errors.length > 0 && (
              <div className="p-3 rounded-card bg-status-danger/10 border border-status-danger/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />
                  <div className="text-small">
                    <p className="font-medium text-status-danger">Validation Errors</p>
                    <ul className="mt-1 space-y-1 text-text-muted">
                      {preview.validation.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {preview.validation.errors.length > 5 && (
                        <li>... and {preview.validation.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {preview.validation.warnings.length > 0 && (
              <div className="p-3 rounded-card bg-status-warning/10 border border-status-warning/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
                  <div className="text-small">
                    <p className="font-medium text-status-warning">Warnings</p>
                    <ul className="mt-1 space-y-1 text-text-muted">
                      {preview.validation.warnings.slice(0, 3).map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                      {preview.validation.warnings.length > 3 && (
                        <li>... and {preview.validation.warnings.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Data Counts */}
            {preview.validation.isValid && (
              <div className="grid grid-cols-2 gap-2">
                <CountItem icon={Target} label="Objectives" count={preview.counts.objectives} />
                <CountItem icon={FolderKanban} label="Key Results" count={preview.counts.annualKrs} />
                <CountItem icon={ListTodo} label="Tasks" count={preview.counts.tasks} />
                <CountItem icon={Tag} label="Tags" count={preview.counts.tags} />
                <CountItem icon={Calendar} label="Check-ins" count={preview.counts.checkIns} />
                <CountItem icon={Calendar} label="Weekly Reviews" count={preview.counts.weeklyReviews} />
              </div>
            )}
          </div>
        )}

        {/* Step: Options */}
        {step === "options" && (
          <div className="py-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-card bg-bg-1/30 border border-border-soft">
                <Checkbox
                  id="skip-checkins"
                  checked={options.skipCheckIns}
                  onCheckedChange={(checked) =>
                    setOptions((o) => ({ ...o, skipCheckIns: checked === true }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="skip-checkins" className="cursor-pointer">
                    Skip check-in history
                  </Label>
                  <p className="text-small text-text-muted mt-0.5">
                    Do not import historical check-in records
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-card bg-bg-1/30 border border-border-soft">
                <Checkbox
                  id="skip-reviews"
                  checked={options.skipWeeklyReviews}
                  onCheckedChange={(checked) =>
                    setOptions((o) => ({ ...o, skipWeeklyReviews: checked === true }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="skip-reviews" className="cursor-pointer">
                    Skip weekly reviews
                  </Label>
                  <p className="text-small text-text-muted mt-0.5">
                    Do not import weekly review records
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-card bg-bg-1/30 border border-border-soft">
                <Checkbox
                  id="reset-progress"
                  checked={options.resetProgress}
                  onCheckedChange={(checked) =>
                    setOptions((o) => ({ ...o, resetProgress: checked === true }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="reset-progress" className="cursor-pointer">
                    Reset progress to start values
                  </Label>
                  <p className="text-small text-text-muted mt-0.5">
                    Start fresh with all KRs at their initial values
                  </p>
                </div>
              </div>
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2 p-3 rounded-card bg-accent/5 border border-accent/10">
              <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-small text-text-muted">
                This will create a new plan with the imported data. You will be
                redirected to the new plan after import.
              </p>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="py-12 text-center">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-accent" />
            <p className="text-body-sm text-text-muted mt-4">
              Importing your data...
            </p>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && importResult && (
          <div className="py-4 space-y-4">
            {importResult.success ? (
              <>
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-status-success/10 flex items-center justify-center">
                    <Check className="w-6 h-6 text-status-success" />
                  </div>
                  <p className="text-body-sm font-medium mt-3">
                    Import completed successfully!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <CountItem icon={Target} label="Objectives" count={importResult.counts.objectives} />
                  <CountItem icon={FolderKanban} label="Key Results" count={importResult.counts.annualKrs} />
                  <CountItem icon={ListTodo} label="Tasks" count={importResult.counts.tasks} />
                  <CountItem icon={Tag} label="Tags" count={importResult.counts.tags} />
                </div>
              </>
            ) : (
              <>
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-status-danger/10 flex items-center justify-center">
                    <X className="w-6 h-6 text-status-danger" />
                  </div>
                  <p className="text-body-sm font-medium mt-3 text-status-danger">
                    Import failed
                  </p>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-3 rounded-card bg-status-danger/10 border border-status-danger/20">
                    <ul className="text-small text-text-muted space-y-1">
                      {importResult.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "select" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button
                onClick={() => setStep("options")}
                disabled={!preview?.validation.isValid}
                className="gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {step === "options" && (
            <>
              <Button variant="outline" onClick={() => setStep("preview")}>
                Back
              </Button>
              <Button onClick={handleImport} className="gap-2">
                <Upload className="w-4 h-4" />
                Import Data
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button onClick={handleComplete}>
              {importResult?.success ? "Go to Plan" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountItem({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-card bg-bg-1/30 border border-border-soft">
      <Icon className="w-4 h-4 text-text-muted" />
      <span className="text-small text-text-muted">{label}</span>
      <Badge variant="outline" className="ml-auto text-[10px]">
        {count}
      </Badge>
    </div>
  );
}

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  FileUp,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromPDF, extractWithOCROnly } from "@/lib/pdf-utils";
import { extractDataFromExcel, formatExcelDataForAnalysis } from "@/lib/excel-utils";
import { performLocalExcelAnalysis } from "@/lib/local-excel-analysis";
import { performLocalTextAnalysis } from "@/lib/local-text-analysis";
import { cn } from "@/lib/utils";
import type { ExcelExtractionResult } from "@/lib/excel-utils";

interface BOQUploadDialogProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  isArabic: boolean;
  onSuccess: () => void;
  onSuccessWithData?: (data: any) => void;
}

type UploadStatus = "idle" | "processing" | "success" | "error";

const STEPS = {
  ar: ["قراءة الملف", "استخراج البنود", "حفظ البنود"],
  en: ["Read File", "Extract Items", "Save Items"],
};

function isExcelFile(file: File): boolean {
  return (
    file.type.includes("spreadsheet") ||
    file.type.includes("excel") ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls")
  );
}

function isAcceptedFile(file: File): boolean {
  const exts = [".pdf", ".xlsx", ".xls"];
  return exts.some((ext) => file.name.toLowerCase().endsWith(ext));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/* ─── Step indicator ──────────────────────────── */
function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  isArabic,
}: {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
  isArabic: boolean;
}) {
  return (
    <div className="flex items-center justify-between w-full gap-1" dir={isArabic ? "rtl" : "ltr"}>
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const done = completedSteps.includes(stepNum);
        const active = currentStep === stepNum;
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500",
                done && "bg-primary text-primary-foreground scale-110",
                active && !done && "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <CheckCircle2 className="w-4 h-4" /> : active ? <Loader2 className="w-4 h-4 animate-spin" /> : stepNum}
            </div>
            <span className={cn("text-[10px] text-center leading-tight", done ? "text-primary font-semibold" : active ? "text-foreground font-medium" : "text-muted-foreground")}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function BOQUploadDialog({
  open,
  onClose,
  projectId,
  isArabic,
  onSuccess,
  onSuccessWithData,
}: BOQUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [progressValue, setProgressValue] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const steps = isArabic ? STEPS.ar : STEPS.en;

  const resetState = () => {
    setSelectedFile(null);
    setStatus("idle");
    setStatusMessage("");
    setProgressValue(0);
    setCurrentStep(0);
    setCompletedSteps([]);
    setIsDragOver(false);
  };

  const handleClose = () => {
    if (status === "processing") return;
    resetState();
    onClose();
  };

  const handleSuccess = () => {
    resetState();
    onClose();
    onSuccess();
  };

  /* ─── Drag & drop handlers ─── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && isAcceptedFile(file)) {
        setSelectedFile(file);
      } else {
        toast({
          title: isArabic ? "نوع ملف غير مدعوم" : "Unsupported file type",
          description: isArabic ? "يرجى رفع ملف PDF أو Excel فقط" : "Please upload a PDF or Excel file only",
          variant: "destructive",
        });
      }
    },
    [isArabic, toast]
  );

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  /* ─── Ensure project exists in project_data for RLS ─── */
  const ensureProjectInProjectData = useCallback(async (pid: string) => {
    if (!user) return;
    const { data: exists } = await supabase
      .from("project_data")
      .select("id")
      .eq("id", pid)
      .maybeSingle();
    if (exists) return;

    const { data: saved } = await supabase
      .from("saved_projects")
      .select("id, name, analysis_data, file_name")
      .eq("id", pid)
      .maybeSingle();

    if (saved) {
      const ad = saved.analysis_data as any;
      await supabase.from("project_data").insert({
        id: pid,
        user_id: user.id,
        name: saved.name || "Untitled",
        file_name: saved.file_name || "",
        analysis_data: saved.analysis_data || {},
        total_value: ad?.summary?.total_value || 0,
        items_count: ad?.items?.length || 0,
      });
    }
  }, [user]);

  /* ─── Save items ─── */
  const saveItemsToProject = useCallback(
    async (items: any[]) => {
      if (!items?.length) throw new Error(isArabic ? "لم يتم استخراج أي بنود" : "No items extracted");
      if (!user) throw new Error(isArabic ? "يجب تسجيل الدخول أولاً" : "You must be logged in first");
      if (projectId) await ensureProjectInProjectData(projectId);

      const rows = items.map((item: any, idx: number) => {
        const desc = item.description || item.desc || "";
        const descAr = item.description_ar || item.descriptionAr || (desc && /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(desc) ? desc : null);
        return {
          project_id: projectId,
          item_number: item.item_number || item.number || String(idx + 1),
          description: desc,
          description_ar: descAr,
          unit: item.unit || "",
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price || item.rate || 0) || null,
          total_price: parseFloat(item.total_price || item.amount || 0) || null,
          sort_order: idx,
        };
      });

      const { error } = await supabase.from("project_items").insert(rows);
      if (error) {
        if (error.message?.includes("row-level security")) {
          throw new Error(
            isArabic
              ? "خطأ في صلاحيات الحفظ. تأكد من تسجيل الدخول وأن المشروع يخصك."
              : "Permission error. Ensure you are logged in and own this project."
          );
        }
        throw error;
      }
    },
    [projectId, isArabic, user, ensureProjectInProjectData]
  );

  /* ─── Main analysis handler ─── */
  const handleAnalyze = useCallback(async () => {
    const file = selectedFile;
    if (!file) return;

    if (!user) {
      toast({ title: isArabic ? "يجب تسجيل الدخول" : "Login Required", description: isArabic ? "يجب تسجيل الدخول أولاً لرفع الملفات" : "You must be logged in to upload files", variant: "destructive" });
      return;
    }

    setStatus("processing");
    setProgressValue(5);
    setCurrentStep(1);
    setCompletedSteps([]);

    try {
      let items: any[] = [];

      // ── Step 1: Read file ──
      setStatusMessage(isArabic ? "جارٍ قراءة الملف..." : "Reading file...");
      setProgressValue(15);

      if (isExcelFile(file)) {
        const excelData = await extractDataFromExcel(file);
        setCompletedSteps([1]);
        setProgressValue(33);
        toast({ title: isArabic ? "✓ تم قراءة الملف" : "✓ File read successfully" });

        // ── Step 2: Extract items ──
        setCurrentStep(2);
        setStatusMessage(isArabic ? "جارٍ استخراج البنود..." : "Extracting items...");
        const localResult = performLocalExcelAnalysis(excelData.items, file.name);

        if (localResult.items.length > 0) {
          items = localResult.items;
        } else {
          setStatusMessage(isArabic ? "جارٍ التحليل بالذكاء الاصطناعي..." : "AI analysis...");
          const formatted = formatExcelDataForAnalysis(excelData);
          const { data, error } = await supabase.functions.invoke("analyze-boq", {
            body: { boqText: formatted, fileName: file.name, projectId },
          });
          if (error) throw error;
          items = data?.items || [];
        }
      } else {
        let text = "";
        try {
          text = await extractTextFromPDF(file);
        } catch {
          text = await extractWithOCROnly(file);
        }
        if (!text || text.trim().length < 50) text = await extractWithOCROnly(file);

        setCompletedSteps([1]);
        setProgressValue(33);
        toast({ title: isArabic ? "✓ تم قراءة الملف" : "✓ File read successfully" });

        // ── Step 2: Extract items ──
        setCurrentStep(2);
        setStatusMessage(isArabic ? "جارٍ استخراج البنود..." : "Extracting items...");
        const localResult = performLocalTextAnalysis(text, { fileName: file.name });

        if (localResult.items.length > 0) {
          items = localResult.items;
        } else {
          setStatusMessage(isArabic ? "جارٍ التحليل بالذكاء الاصطناعي..." : "AI analysis...");
          const { data, error } = await supabase.functions.invoke("analyze-boq", {
            body: { boqText: text, fileName: file.name, projectId },
          });
          if (error) throw error;
          items = data?.items || [];
        }
      }

      setCompletedSteps((p) => [...p, 2]);
      setProgressValue(66);
      toast({ title: isArabic ? `✓ تم استخراج ${items.length} بند` : `✓ Extracted ${items.length} items` });

      // ── Step 3: Save items ──
      setCurrentStep(3);
      setStatusMessage(isArabic ? "جارٍ حفظ البنود..." : "Saving items...");

      if (!projectId) {
        onSuccessWithData?.({ items, file_name: file.name });
      } else {
        await saveItemsToProject(items);
      }

      setCompletedSteps((p) => [...p, 3]);
      setProgressValue(100);
      setCurrentStep(0);
      setStatus("success");
      setStatusMessage(
        isArabic
          ? `تم استخراج وحفظ ${items.length} بند بنجاح!`
          : `Successfully extracted and saved ${items.length} items!`
      );
      toast({
        title: isArabic ? "🎉 تم رفع BOQ بنجاح" : "🎉 BOQ Uploaded Successfully",
        description: isArabic ? `تم استخراج ${items.length} بند من الملف` : `Extracted ${items.length} items from the file`,
      });

      setTimeout(handleSuccess, 1800);
    } catch (err: any) {
      setStatus("error");
      setProgressValue(0);
      setCurrentStep(0);
      const msg = err?.message || (isArabic ? "حدث خطأ أثناء معالجة الملف" : "An error occurred while processing the file");
      setStatusMessage(msg);
      toast({ title: isArabic ? "خطأ في الرفع" : "Upload Error", description: msg, variant: "destructive" });
    }
  }, [selectedFile, projectId, isArabic, saveItemsToProject, toast, user, onSuccessWithData]);

  const FileIcon = selectedFile && isExcelFile(selectedFile) ? FileSpreadsheet : FileText;
  const showDropZone = (status === "idle" || status === "error") && !selectedFile;
  const showFilePreview = selectedFile && (status === "idle" || status === "error");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className={cn("max-w-lg transition-all", isDragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
        dir={isArabic ? "rtl" : "ltr"}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {isArabic ? "رفع وتحليل ملف BOQ" : "Upload & Analyze BOQ File"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "اسحب ملف PDF أو Excel وأفلته هنا أو اختر ملفاً لاستخراج البنود تلقائياً"
              : "Drag and drop a PDF or Excel file here, or choose a file to extract BOQ items automatically"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ─── Drop zone ─── */}
          {showDropZone && (
            <>
              <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls" onChange={handleFileInput} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "w-full rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 cursor-pointer group",
                  isDragOver
                    ? "border-primary bg-primary/10 scale-[1.02]"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center transition-all",
                  isDragOver
                    ? "bg-primary/20 scale-110"
                    : "bg-gradient-to-br from-primary/10 to-accent/10 group-hover:scale-105"
                )}>
                  <FileUp className={cn("w-8 h-8 text-primary transition-transform", isDragOver && "animate-bounce")} />
                </div>
                <p className="text-base font-semibold text-foreground mb-1">
                  {isDragOver
                    ? (isArabic ? "أفلت الملف هنا..." : "Drop your file here...")
                    : (isArabic ? "اسحب الملف وأفلته هنا" : "Drag & drop your file here")}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {isArabic ? "أو انقر لاختيار ملف" : "or click to browse"}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-xs font-medium">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </span>
                </div>
              </button>
            </>
          )}

          {/* ─── File preview ─── */}
          {showFilePreview && (
            <div className="rounded-xl border bg-muted/30 p-4 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  isExcelFile(selectedFile!) ? "bg-green-500/10" : "bg-primary/10"
                )}>
                  <FileIcon className={cn("w-6 h-6", isExcelFile(selectedFile!) ? "text-green-600 dark:text-green-400" : "text-primary")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{selectedFile!.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile!.size)} • {isExcelFile(selectedFile!) ? "Excel" : "PDF"}
                  </p>
                </div>
                <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* ─── Processing state with stepper ─── */}
          {status === "processing" && (
            <div className="space-y-5 py-4 animate-fade-in">
              <StepIndicator steps={steps} currentStep={currentStep} completedSteps={completedSteps} isArabic={isArabic} />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{statusMessage}</span>
                  <span className="font-mono font-semibold text-foreground">{progressValue}%</span>
                </div>
                <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite] transition-[width] duration-700 ease-out"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── Success state ─── */}
          {status === "success" && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center animate-scale-in">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold text-foreground">{statusMessage}</p>
            </div>
          )}

          {/* ─── Error state ─── */}
          {status === "error" && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{statusMessage}</p>
            </div>
          )}

          {/* ─── Action buttons ─── */}
          {(status === "idle" || status === "error") && selectedFile && (
            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleAnalyze}>
                {status === "error" && <RefreshCw className="w-4 h-4 me-2" />}
                {status === "error"
                  ? (isArabic ? "إعادة المحاولة" : "Retry")
                  : (isArabic ? "ابدأ التحليل والاستخراج" : "Start Analysis & Extraction")}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          )}

          {status === "idle" && !selectedFile && (
            <Button variant="outline" className="w-full" onClick={handleClose}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileUpload } from "@/components/FileUpload";
import { Loader2, CheckCircle2, AlertTriangle, Upload, FileText, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromPDF, extractWithOCROnly } from "@/lib/pdf-utils";
import { extractDataFromExcel, formatExcelDataForAnalysis } from "@/lib/excel-utils";
import { performLocalExcelAnalysis } from "@/lib/local-excel-analysis";
import { performLocalTextAnalysis } from "@/lib/local-text-analysis";
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

function isExcelFile(file: File): boolean {
  return (
    file.type.includes("spreadsheet") ||
    file.type.includes("excel") ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls")
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
  const { toast } = useToast();
  const { user } = useAuth();

  const handleClose = () => {
    if (status === "processing") return;
    setSelectedFile(null);
    setStatus("idle");
    setStatusMessage("");
    setProgressValue(0);
    onClose();
  };

  const handleSuccess = () => {
    setSelectedFile(null);
    setStatus("idle");
    setStatusMessage("");
    setProgressValue(0);
    onClose();
    onSuccess();
  };

  // ضمان وجود المشروع في project_data لتجاوز RLS
  const ensureProjectInProjectData = useCallback(async (pid: string) => {
    if (!user) return;

    const { data: exists } = await supabase
      .from("project_data")
      .select("id")
      .eq("id", pid)
      .maybeSingle();

    if (exists) return; // موجود بالفعل

    // تحقق من saved_projects
    const { data: saved } = await supabase
      .from("saved_projects")
      .select("id, name, analysis_data, file_name")
      .eq("id", pid)
      .maybeSingle();

    if (saved) {
      const analysisData = saved.analysis_data as any;
      await supabase.from("project_data").insert({
        id: pid,
        user_id: user.id,
        name: saved.name || "Untitled",
        file_name: saved.file_name || "",
        analysis_data: saved.analysis_data || {},
        total_value: analysisData?.summary?.total_value || 0,
        items_count: analysisData?.items?.length || 0,
      });
    }
  }, [user]);

  const saveItemsToProject = useCallback(
    async (items: any[]) => {
      if (!items || items.length === 0) {
        throw new Error(isArabic ? "لم يتم استخراج أي بنود" : "No items extracted");
      }

      if (!user) {
        throw new Error(isArabic ? "يجب تسجيل الدخول أولاً" : "You must be logged in first");
      }

      // ضمان وجود المشروع في project_data قبل إدراج البنود
      if (projectId) {
        await ensureProjectInProjectData(projectId);
      }

      const rows = items.map((item: any, idx: number) => ({
        project_id: projectId,
        item_number: item.item_number || item.number || String(idx + 1),
        description: item.description || item.desc || "",
        unit: item.unit || "",
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price || item.rate || 0) || null,
        total_price: parseFloat(item.total_price || item.amount || 0) || null,
        sort_order: idx,
      }));

      const { error } = await supabase.from("project_items").insert(rows);
      if (error) {
        // رسالة خطأ واضحة بدلاً من الرسالة التقنية
        if (error.message?.includes("row-level security")) {
          throw new Error(
            isArabic
              ? "خطأ في صلاحيات الحفظ. تأكد من تسجيل الدخول وأن المشروع يخصك."
              : "Permission error saving items. Ensure you are logged in and own this project."
          );
        }
        throw error;
      }
    },
    [projectId, isArabic, user, ensureProjectInProjectData]
  );

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;

    if (!user) {
      toast({
        title: isArabic ? "يجب تسجيل الدخول" : "Login Required",
        description: isArabic ? "يجب تسجيل الدخول أولاً لرفع الملفات" : "You must be logged in to upload files",
        variant: "destructive",
      });
      return;
    }

    setStatus("processing");
    setProgressValue(10);

    try {
      let items: any[] = [];

      if (isExcelFile(selectedFile)) {
        setStatusMessage(isArabic ? "جارٍ قراءة ملف Excel..." : "Reading Excel file...");
        setProgressValue(20);
        const excelData = await extractDataFromExcel(selectedFile);
        setProgressValue(40);
        const localResult = performLocalExcelAnalysis(excelData.items, selectedFile.name);

        if (localResult.items.length > 0) {
          items = localResult.items;
          setProgressValue(70);
        } else {
          setStatusMessage(isArabic ? "جارٍ تحليل البيانات بالذكاء الاصطناعي..." : "Analyzing with AI...");
          setProgressValue(50);
          const formatted = formatExcelDataForAnalysis(excelData);
          const { data, error } = await supabase.functions.invoke("analyze-boq", {
            body: { boqText: formatted, fileName: selectedFile.name, projectId },
          });
          if (error) throw error;
          items = data?.items || [];
          setProgressValue(70);
        }
      } else {
        setStatusMessage(isArabic ? "جارٍ استخراج النص من PDF..." : "Extracting text from PDF...");
        setProgressValue(20);
        let text = "";
        try {
          text = await extractTextFromPDF(selectedFile);
        } catch {
          text = await extractWithOCROnly(selectedFile);
        }
        setProgressValue(40);

        if (!text || text.trim().length < 50) {
          text = await extractWithOCROnly(selectedFile);
        }

        const localResult = performLocalTextAnalysis(text, { fileName: selectedFile.name });
        if (localResult.items.length > 0) {
          items = localResult.items;
          setProgressValue(70);
        } else {
          setStatusMessage(isArabic ? "جارٍ تحليل البيانات بالذكاء الاصطناعي..." : "Analyzing with AI...");
          setProgressValue(50);
          const { data, error } = await supabase.functions.invoke("analyze-boq", {
            body: { boqText: text, fileName: selectedFile.name, projectId },
          });
          if (error) throw error;
          items = data?.items || [];
          setProgressValue(70);
        }
      }

      if (!projectId) {
        onSuccessWithData?.({ items, file_name: selectedFile.name });
        setProgressValue(100);
        setStatus("success");
        setStatusMessage(
          isArabic
            ? `تم استخراج ${items.length} بند بنجاح!`
            : `Successfully extracted ${items.length} items!`
        );
        toast({
          title: isArabic ? "تم تحليل BOQ بنجاح" : "BOQ Analyzed Successfully",
          description: isArabic
            ? `تم استخراج ${items.length} بند من الملف`
            : `Extracted ${items.length} items from the file`,
        });
        setTimeout(handleSuccess, 1500);
        return;
      }

      setStatusMessage(isArabic ? "جارٍ حفظ البنود في المشروع..." : "Saving items to project...");
      setProgressValue(80);
      await saveItemsToProject(items);
      setProgressValue(100);

      setStatus("success");
      setStatusMessage(
        isArabic
          ? `تم استخراج وحفظ ${items.length} بند بنجاح!`
          : `Successfully extracted and saved ${items.length} items!`
      );

      toast({
        title: isArabic ? "تم رفع BOQ بنجاح" : "BOQ Uploaded Successfully",
        description: isArabic
          ? `تم استخراج ${items.length} بند من الملف`
          : `Extracted ${items.length} items from the file`,
      });

      setTimeout(handleSuccess, 1500);
    } catch (err: any) {
      setStatus("error");
      setProgressValue(0);
      const friendlyMessage = err?.message || (isArabic ? "حدث خطأ أثناء معالجة الملف" : "An error occurred while processing the file");
      setStatusMessage(friendlyMessage);
      toast({
        title: isArabic ? "خطأ في الرفع" : "Upload Error",
        description: friendlyMessage,
        variant: "destructive",
      });
    }
  }, [selectedFile, projectId, isArabic, saveItemsToProject, toast, user]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-lg"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {isArabic ? "رفع وتحليل ملف BOQ" : "Upload & Analyze BOQ File"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "ارفع ملف PDF أو Excel لاستخراج بنود جدول الكميات تلقائياً وإضافتها للمشروع"
              : "Upload a PDF or Excel file to automatically extract BOQ items and add them to this project"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(status === "idle" || status === "error") && (
            <FileUpload
              onFileSelect={setSelectedFile}
              isProcessing={false}
              selectedFile={selectedFile}
              onClear={() => setSelectedFile(null)}
            />
          )}

          {/* معلومات الملف المحدد */}
          {selectedFile && (status === "idle" || status === "error") && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {isExcelFile(selectedFile) ? "Excel" : "PDF"}
                </p>
              </div>
            </div>
          )}

          {status === "processing" && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="w-full space-y-2">
                <p className="font-medium text-foreground">
                  {isArabic ? "جارٍ المعالجة..." : "Processing..."}
                </p>
                <Progress value={progressValue} className="h-2" />
                <p className="text-sm text-muted-foreground">{statusMessage}</p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <p className="font-medium text-foreground">{statusMessage}</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{statusMessage}</p>
              </div>
            </div>
          )}

          {(status === "idle" || status === "error") && selectedFile && (
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleAnalyze}
                disabled={!selectedFile}
              >
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

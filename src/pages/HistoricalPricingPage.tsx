import { useState, useEffect, useCallback, useMemo } from "react";
import { Database, Upload, FileSpreadsheet, FileText, Trash2, Eye, Calendar, MapPin, CheckCircle, XCircle, Plus, Search, Filter, ArrowLeft, BarChart3, Loader2, Download, FileImage, RefreshCw, LogIn, ChevronLeft, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, FileBarChart, Lightbulb, DollarSign, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { extractRawDataFromExcel } from "@/lib/excel-utils";
import { createWorkbook, addJsonSheet, downloadWorkbook } from "@/lib/exceljs-utils";
import * as pdfjsLib from 'pdfjs-dist';
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { HistoricalPricingStats } from "@/components/HistoricalPricingStats";
import { HistoricalPricingPDFReport } from "@/components/HistoricalPricingPDFReport";
import { ImportFromSavedProjects } from "@/components/ImportFromSavedProjects";
import { HistoricalItemsTable } from "@/components/HistoricalItemsTable";
import { normalizeHistoricalItems, NormalizedHistoricalItem, safeTotalValue } from "@/lib/historical-data-utils";

interface HistoricalFileMeta {
  id: string;
  file_name: string;
  project_name: string;
  project_location: string | null;
  project_date: string | null;
  currency: string;
  items_count: number;
  total_value: number;
  notes: string | null;
  is_verified: boolean;
  created_at: string;
}

interface HistoricalFile extends HistoricalFileMeta {
  items: any[];
}

interface RawDataItem {
  [key: string]: any;
}

const LOCATIONS = [
  { value: "Riyadh", label: "الرياض" },
  { value: "Jeddah", label: "جدة" },
  { value: "Dammam", label: "الدمام" },
  { value: "Makkah", label: "مكة المكرمة" },
  { value: "Madinah", label: "المدينة المنورة" },
  { value: "Khobar", label: "الخبر" },
  { value: "Tabuk", label: "تبوك" },
  { value: "Other", label: "أخرى" },
];

const PAGE_SIZE = 20;
const MAX_ITEMS_PER_SAVE = 2000;

// Format large numbers with readable suffixes
function formatLargeNumber(value: number, currency?: string): string {
  const suffix = currency ? ` ${currency}` : '';
  if (!Number.isFinite(value) || value < 0) return `—${suffix}`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} B${suffix}`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} M${suffix}`;
  if (value >= 1e3) return `${value.toLocaleString()}${suffix}`;
  return `${value.toFixed(2)}${suffix}`;
}

export default function HistoricalPricingPage() {
  const [files, setFiles] = useState<HistoricalFileMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<HistoricalFile | null>(null);
  const [isLoadingFileItems, setIsLoadingFileItems] = useState(false);
  const [activeTab, setActiveTab] = useState("files");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  
  // Upload progress
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  
  // Upload form state
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [notes, setNotes] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [uploadedItems, setUploadedItems] = useState<NormalizedHistoricalItem[]>([]);
  const [uploadedHeaders, setUploadedHeaders] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [pdfPagePreviews, setPdfPagePreviews] = useState<string[]>([]);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [itemsTruncated, setItemsTruncated] = useState(false);
  const [originalRowCount, setOriginalRowCount] = useState<number | undefined>();

  const { toast } = useToast();
  const { user } = useAuth();
  const { isArabic } = useLanguage();

  const totalPages = Math.ceil(totalFiles / PAGE_SIZE);

  useEffect(() => {
    if (user) {
      loadFiles();
    } else {
      setIsLoading(false);
    }
  }, [user, currentPage]);

  const loadFiles = useCallback(async (retryCount = 0) => {
    if (!user) return;
    try {
      setIsLoading(true);
      setLoadError(null);
      
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      // First get count
      const { count, error: countError } = await supabase
        .from("historical_pricing_files")
        .select("id", { count: "exact", head: true });
      
      if (countError) throw countError;
      setTotalFiles(count || 0);
      
      // Then fetch metadata only (no items column)
      const { data, error } = await supabase
        .from("historical_pricing_files")
        .select("id, file_name, project_name, project_location, project_date, currency, items_count, total_value, notes, is_verified, created_at")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setFiles((data || []) as HistoricalFileMeta[]);
    } catch (error: any) {
      console.error("Failed to load historical files:", error);
      setLoadError(error.message || "فشل في تحميل الملفات التاريخية");
      
      // Auto-retry once on network error
      if (retryCount === 0 && (error.message?.includes('fetch') || error.message?.includes('network'))) {
        setTimeout(() => loadFiles(1), 2000);
        return;
      }
      
      toast({
        title: "خطأ في التحميل",
        description: error.message || "فشل في تحميل الملفات التاريخية",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentPage, toast]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadedFileName(file.name);
      setUploadProgress(0);
      setUploadStage("");
      setItemsTruncated(false);
      setOriginalRowCount(undefined);
      
      const isPDF = file.name.toLowerCase().endsWith('.pdf');
      
      if (isPDF) {
        await handlePDFUpload(file);
      } else {
        // Handle Excel files with progress
        const result = await extractRawDataFromExcel(file, (stage, progress, message) => {
          setUploadProgress(progress);
          setUploadStage(message || stage);
        });
        
        if (result.rows && result.rows.length > 0) {
          const normalized = normalizeHistoricalItems(result.rows, result.headers);
          setUploadedItems(normalized);
          setUploadedHeaders(result.headers);
          
          if (result.truncated) {
            setItemsTruncated(true);
            setOriginalRowCount(result.originalRowCount);
            toast({
              title: `⚠️ تم قراءة ${normalized.length} بند من أصل ${result.originalRowCount}`,
              description: "تم تقليص البنود للحد الأقصى المسموح (5000 بند)",
              variant: "destructive",
            });
          } else {
            toast({
              title: "✅ تم قراءة الملف",
              description: `تم استخراج ${normalized.length} بند من الملف`,
            });
          }
        } else {
          toast({
            title: "لا توجد بيانات",
            description: "لم يتم العثور على بيانات في الملف",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("File upload error:", error);
      toast({
        title: "خطأ في قراءة الملف",
        description: error.message || "فشل في استخراج البيانات",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage("");
    }
  };

  const handlePDFUpload = async (file: File) => {
    try {
      toast({
        title: "جاري معالجة PDF...",
        description: "قد يستغرق هذا بعض الوقت حسب حجم الملف",
      });

      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const previews: string[] = [];
        
        const numPages = Math.min(pdf.numPages, 5);
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context!,
            viewport: viewport
          }).promise;
          
          previews.push(canvas.toDataURL('image/jpeg', 0.7));
        }
        
        setPdfPagePreviews(previews);
        setShowPdfPreview(true);
      } catch (previewError) {
        console.warn("Could not generate PDF previews:", previewError);
      }

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach(byte => binary += String.fromCharCode(byte));
      const pdfBase64 = btoa(binary);

      toast({
        title: "جاري استخراج البنود...",
        description: "استخدام الذكاء الاصطناعي لتحليل المستند",
      });

      const { data, error } = await supabase.functions.invoke('process-pdf-boq', {
        body: {
          pdfBase64,
          fileName: file.name
        }
      });

      if (error) throw error;

      if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
        const rawItems = data.items;
        const headers = data.headers && Array.isArray(data.headers) && data.headers.length > 0
          ? data.headers
          : Object.keys(rawItems[0] || {});
        
        const normalized = normalizeHistoricalItems(rawItems, headers);
        setUploadedItems(normalized);
        setUploadedHeaders(headers);
        toast({
          title: "✅ تم استخراج البيانات",
          description: `تم استخراج ${normalized.length} بند من ملف PDF`,
        });
      } else {
        toast({
          title: "لم يتم العثور على بيانات",
          description: "حاول رفع ملف PDF يحتوي على جدول واضح",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("PDF processing error:", error);
      throw error;
    }
  };

  const handleExportToExcel = () => {
    if (uploadedItems.length === 0) return;

    const wb = createWorkbook();
    const exportData = uploadedItems.map(item => ({ ...item } as Record<string, unknown>));
    addJsonSheet(wb, exportData, 'Extracted Data');
    
    const fileName = uploadedFileName ? 
      `extracted_${uploadedFileName.replace(/\.[^/.]+$/, '')}.xlsx` : 
      'extracted_data.xlsx';
    
    downloadWorkbook(wb, fileName);
    
    toast({
      title: "✅ تم التصدير",
      description: `تم تصدير ${uploadedItems.length} صف إلى Excel`,
    });
  };

  const handleExportSavedToExcel = async (file: HistoricalFileMeta) => {
    // Load items on-demand for export
    try {
      const { data, error } = await supabase
        .from("historical_pricing_files")
        .select("items")
        .eq("id", file.id)
        .single();
      
      if (error) throw error;
      
      const items = Array.isArray(data?.items) ? data.items : [];
      if (items.length === 0) {
        toast({ title: "لا توجد بنود للتصدير", variant: "destructive" });
        return;
      }

      const headers = Object.keys(items[0] || {});
      const wb = createWorkbook();
      addJsonSheet(wb, items as Record<string, unknown>[], 'Data', { header: headers });
      
      const fileName = `${file.project_name.replace(/[^a-zA-Z0-9أ-ي]/g, '_')}.xlsx`;
      downloadWorkbook(wb, fileName);
      
      toast({
        title: "✅ تم التصدير",
        description: `تم تصدير ${items.length} صف إلى Excel`,
      });
    } catch (error: any) {
      toast({ title: "خطأ في التصدير", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveFile = async () => {
    if (!user) {
      toast({
        title: "يرجى تسجيل الدخول",
        description: "يجب تسجيل الدخول لحفظ الملفات",
        variant: "destructive",
      });
      return;
    }

    if (!projectName.trim()) {
      toast({
        title: "اسم المشروع مطلوب",
        description: "يرجى إدخال اسم المشروع",
        variant: "destructive",
      });
      return;
    }

    if (uploadedItems.length === 0) {
      toast({
        title: "لا توجد بنود",
        description: "يرجى رفع ملف يحتوي على بنود",
        variant: "destructive",
      });
      return;
    }

    try {
      const totalValue = safeTotalValue(uploadedItems);
      
      // Chunk items if too large (>2000 items)
      const itemsToSave = uploadedItems.length > MAX_ITEMS_PER_SAVE 
        ? uploadedItems.slice(0, MAX_ITEMS_PER_SAVE) 
        : uploadedItems;
      
      if (uploadedItems.length > MAX_ITEMS_PER_SAVE) {
        toast({
          title: `⚠️ تم تقليص البنود إلى ${MAX_ITEMS_PER_SAVE}`,
          description: `الملف يحتوي على ${uploadedItems.length} بند. سيتم حفظ أول ${MAX_ITEMS_PER_SAVE} بند لتجنب تجاوز حد التخزين.`,
        });
      }

      const { error } = await supabase
        .from("historical_pricing_files")
        .insert([{
          user_id: user.id,
          file_name: uploadedFileName,
          project_name: projectName.trim(),
          project_location: projectLocation || null,
          project_date: projectDate || null,
          currency,
          items: itemsToSave as any,
          items_count: itemsToSave.length,
          total_value: totalValue,
          notes: notes.trim() || null,
          is_verified: isVerified,
        }]);

      if (error) throw error;

      toast({
        title: "✅ تم الحفظ بنجاح",
        description: `تم حفظ ${itemsToSave.length} بند في قاعدة البيانات التاريخية`,
      });

      // Reset form
      setProjectName("");
      setProjectLocation("");
      setProjectDate("");
      setCurrency("SAR");
      setNotes("");
      setIsVerified(false);
      setUploadedItems([]);
      setUploadedHeaders([]);
      setUploadedFileName("");
      setItemsTruncated(false);
      setOriginalRowCount(undefined);
      setUploadDialogOpen(false);
      
      setCurrentPage(1);
      loadFiles();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "خطأ في الحفظ",
        description: error.message || "فشل في حفظ الملف",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from("historical_pricing_files")
        .delete()
        .eq("id", fileId);

      if (error) throw error;

      toast({
        title: "✅ تم الحذف",
        description: "تم حذف الملف بنجاح",
      });

      loadFiles();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "خطأ في الحذف",
        description: error.message || "فشل في حذف الملف",
        variant: "destructive",
      });
    }
  };

  const handleViewFile = async (file: HistoricalFileMeta) => {
    try {
      setIsLoadingFileItems(true);
      setViewDialogOpen(true);
      
      // Load items on-demand
      const { data, error } = await supabase
        .from("historical_pricing_files")
        .select("items")
        .eq("id", file.id)
        .single();
      
      if (error) throw error;
      
      setSelectedFile({
        ...file,
        items: Array.isArray(data?.items) ? data.items : [],
      });
    } catch (error: any) {
      toast({
        title: "خطأ في تحميل البنود",
        description: error.message,
        variant: "destructive",
      });
      setViewDialogOpen(false);
    } finally {
      setIsLoadingFileItems(false);
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = 
      file.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = filterLocation === "all" || file.project_location === filterLocation;
    return matchesSearch && matchesLocation;
  });

  const totalItems = files.reduce((sum, f) => sum + f.items_count, 0);
  const verifiedCount = files.filter(f => f.is_verified).length;

  // Login gate
  if (!user && !isLoading) {
    return (
      <PageLayout>
        <div className="container mx-auto p-4 md:p-6" dir={isArabic ? "rtl" : "ltr"}>
          <Card>
            <CardContent className="py-16 text-center">
              <LogIn className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-bold mb-2">يرجى تسجيل الدخول</h2>
              <p className="text-muted-foreground mb-6">
                يجب تسجيل الدخول للوصول إلى قاعدة البيانات التاريخية للأسعار
              </p>
              <Link to="/auth">
                <Button className="gap-2">
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6" dir={isArabic ? "rtl" : "ltr"}>
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Database className="w-6 h-6 text-primary" />
                قاعدة البيانات التاريخية للأسعار
              </h1>
              <p className="text-muted-foreground">
                رفع وإدارة ملفات BOQ المسعرة سابقاً لتحسين دقة التحليل
              </p>
            </div>
          </div>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <div className="flex items-center gap-2">
              <ImportFromSavedProjects 
                onImportComplete={() => { setCurrentPage(1); loadFiles(); }}
                existingProjectNames={files.map(f => f.project_name)}
              />
              <HistoricalPricingPDFReport historicalFiles={files as any} />
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  رفع ملف جديد
                </Button>
              </DialogTrigger>
            </div>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  رفع ملف مسعّر تاريخي
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label>ملف Excel أو PDF</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={isUploading}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {isUploading ? (
                        <div className="space-y-3">
                          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                          <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                          <p className="text-sm text-muted-foreground">{uploadStage}</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <FileSpreadsheet className="w-10 h-10 text-green-600" />
                          <FileText className="w-10 h-10 text-red-600" />
                        </div>
                      )}
                      {!isUploading && (
                        <>
                          <p className="text-sm text-muted-foreground">
                            اضغط لاختيار ملف Excel أو PDF
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            xlsx, xls, csv, pdf (حتى 5000 بند)
                          </p>
                        </>
                      )}
                      {uploadedFileName && !isUploading && (
                        <Badge variant="secondary" className="mt-2">
                          {uploadedFileName} ({uploadedItems.length} بند)
                        </Badge>
                      )}
                    </label>
                  </div>
                  
                  {/* Truncation warning */}
                  {itemsTruncated && originalRowCount && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                      <span>تم استخراج {uploadedItems.length} بند من أصل {originalRowCount} بند. البنود الزائدة لم يتم تضمينها.</span>
                    </div>
                  )}
                  
                  {/* Diagnostic bar - extraction quality */}
                  {uploadedItems.length > 0 && (() => {
                    const fields = ['description', 'unit', 'quantity', 'unit_price', 'total_price', 'item_number', 'item_code'];
                    const mappedFields = fields.filter(f => 
                      uploadedItems.some(item => {
                        const val = (item as any)[f];
                        return val && val !== '' && val !== 0;
                      })
                    );
                    const completeItems = uploadedItems.filter(item => 
                      item.description && item.unit_price > 0 && item.quantity > 0
                    );
                    const completenessRatio = uploadedItems.length > 0 ? completeItems.length / uploadedItems.length : 0;
                    const isLowQuality = completenessRatio < 0.5;
                    
                    return (
                      <div className={`p-3 rounded-lg border text-sm ${isLowQuality ? 'border-destructive/50 bg-destructive/10' : 'border-primary/30 bg-primary/5'}`}>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1">
                            <CheckCircle className={`w-4 h-4 ${isLowQuality ? 'text-destructive' : 'text-primary'}`} />
                            تم ربط <strong>{mappedFields.length}</strong> من {fields.length} حقل
                          </span>
                          <span className="text-muted-foreground">|</span>
                          <span>
                            <strong>{Math.round(completenessRatio * 100)}%</strong> من البنود تحتوي بيانات كاملة
                          </span>
                        </div>
                        {isLowQuality && (
                          <p className="text-xs text-destructive mt-1">
                            ⚠️ جودة الاستخراج منخفضة - تحقق من تنسيق الملف أو جرب ملف Excel بدلاً من PDF
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم المشروع *</Label>
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="مثال: برج الرياض السكني"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الموقع</Label>
                    <Select value={projectLocation} onValueChange={setProjectLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموقع" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATIONS.map(loc => (
                          <SelectItem key={loc.value} value={loc.value}>
                            {loc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>تاريخ المشروع</Label>
                    <Input
                      type="date"
                      value={projectDate}
                      onChange={(e) => setProjectDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>العملة</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                        <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                        <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                        <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية عن المشروع..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Switch
                    checked={isVerified}
                    onCheckedChange={setIsVerified}
                    id="verified"
                  />
                  <Label htmlFor="verified" className="cursor-pointer">
                    تم التحقق من الأسعار (مشروع منفذ فعلياً)
                  </Label>
                </div>

                {/* PDF Page Preview */}
                {showPdfPreview && pdfPagePreviews.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <FileImage className="w-4 h-4" />
                        معاينة صفحات PDF ({pdfPagePreviews.length} صفحات)
                      </Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowPdfPreview(false)}
                      >
                        إخفاء
                      </Button>
                    </div>
                    <ScrollArea className="h-[200px] border rounded-lg p-2">
                      <div className="flex gap-2">
                        {pdfPagePreviews.map((preview, idx) => (
                          <div key={idx} className="flex-shrink-0 border rounded-lg overflow-hidden">
                            <img 
                              src={preview} 
                              alt={`صفحة ${idx + 1}`}
                              className="h-[170px] w-auto object-contain"
                            />
                            <p className="text-xs text-center text-muted-foreground py-1">
                              صفحة {idx + 1}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Preview Items */}
                {uploadedItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>معاينة وتعديل البنود ({uploadedItems.length} بند)</Label>
                    <HistoricalItemsTable
                      items={uploadedItems}
                      onItemsChange={setUploadedItems}
                      projectName={projectName || uploadedFileName}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">إلغاء</Button>
                </DialogClose>
                <Button onClick={handleSaveFile} disabled={!projectName || uploadedItems.length === 0}>
                  حفظ في قاعدة البيانات
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="tabs-navigation-safe">
            <TabsTrigger value="files" className="gap-2">
              <Database className="w-4 h-4" />
              الملفات ({totalFiles})
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              الإحصائيات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4 mt-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{totalFiles}</p>
                  <p className="text-sm text-muted-foreground">ملف تاريخي</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{totalItems.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">بند (هذه الصفحة)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{verifiedCount}</p>
                  <p className="text-sm text-muted-foreground">ملف موثق</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {new Set(files.map(f => f.project_location).filter(Boolean)).size}
                  </p>
                  <p className="text-sm text-muted-foreground">موقع مختلف</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو الملف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 ml-2" />
                  <SelectValue placeholder="فلترة بالموقع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المواقع</SelectItem>
                  {LOCATIONS.map(loc => (
                    <SelectItem key={loc.value} value={loc.value}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Error state with retry */}
            {loadError && !isLoading && (
              <Card className="border-destructive">
                <CardContent className="py-8 text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-destructive" />
                  <p className="font-medium mb-2">فشل في تحميل البيانات</p>
                  <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
                  <Button onClick={() => loadFiles()} variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    إعادة المحاولة
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Files List */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : !loadError && filteredFiles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium">لا توجد ملفات تاريخية</p>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "لا توجد نتائج مطابقة للبحث" : "ابدأ برفع ملفات BOQ المسعرة لتحسين دقة التحليل"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      رفع أول ملف
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : !loadError && (
              <>
                <div className="grid gap-4">
                  {filteredFiles.map((file) => (
                    <Card key={file.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                              <FileSpreadsheet className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{file.project_name}</h3>
                                {file.is_verified && (
                                  <Badge variant="default" className="gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    موثق
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <FileSpreadsheet className="w-3 h-3" />
                                  {file.file_name}
                                </span>
                                {file.project_location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {LOCATIONS.find(l => l.value === file.project_location)?.label || file.project_location}
                                  </span>
                                )}
                                {file.project_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(file.project_date).toLocaleDateString("ar-SA")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-lg font-bold">{file.items_count}</p>
                              <p className="text-xs text-muted-foreground">بند</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold" title={file.total_value?.toLocaleString()}>
                                {formatLargeNumber(file.total_value || 0)}
                              </p>
                              <p className="text-xs text-muted-foreground">{file.currency}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleExportSavedToExcel(file)}
                                title="تصدير إلى Excel"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleViewFile(file)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteFile(file.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                      السابق
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      صفحة {currentPage} من {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      التالي
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <HistoricalPricingStats files={files as any} />
          </TabsContent>
        </Tabs>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {selectedFile?.project_name || "جاري التحميل..."}
              </DialogTitle>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">{selectedFile.file_name}</p>
              )}
            </DialogHeader>

            {isLoadingFileItems ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">جاري تحميل البنود...</p>
              </div>
            ) : selectedFile && (() => {
              const normalizedItems = normalizeHistoricalItems(selectedFile.items);
              const computedTotal = safeTotalValue(normalizedItems);
              const zeroItems = normalizedItems.filter(i => i.unit_price === 0 && i.quantity === 0);
              const pricedItems = normalizedItems.filter(i => i.unit_price > 0);
              const avgUnitPrice = pricedItems.length > 0 
                ? pricedItems.reduce((s, i) => s + i.unit_price, 0) / pricedItems.length 
                : 0;
              const stdDev = pricedItems.length > 1
                ? Math.sqrt(pricedItems.reduce((s, i) => s + Math.pow(i.unit_price - avgUnitPrice, 2), 0) / pricedItems.length)
                : 0;
              const hasHighVariance = avgUnitPrice > 0 && stdDev / avgUnitPrice > 0.5;
              const isCorruptData = normalizedItems.length > 0 && zeroItems.length / normalizedItems.length > 0.8;

              // Auto-fix corrupt DB total
              if (selectedFile.total_value && Math.abs(computedTotal - selectedFile.total_value) > 1 && 
                  (!Number.isFinite(selectedFile.total_value) || selectedFile.total_value > 1e15)) {
                supabase.from("historical_pricing_files")
                  .update({ total_value: computedTotal })
                  .eq("id", selectedFile.id)
                  .then(() => console.log('Auto-corrected total_value for', selectedFile.id));
              }

              return (
                <ScrollArea className="max-h-[calc(90vh-200px)]">
                  <div className="space-y-4 px-1">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                        <Database className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                        <p className="font-bold text-lg">{normalizedItems.length}</p>
                        <p className="text-xs text-muted-foreground">عدد البنود</p>
                      </div>
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                        <DollarSign className="w-4 h-4 text-green-600 mx-auto mb-1" />
                        <p className="font-bold text-lg" title={computedTotal.toLocaleString()}>
                          {formatLargeNumber(computedTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">القيمة الإجمالية ({selectedFile.currency})</p>
                      </div>
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-center">
                        <Calendar className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                        <p className="font-bold text-sm">
                          {selectedFile.project_date 
                            ? new Date(selectedFile.project_date).toLocaleDateString("ar-SA", { year: 'numeric', month: 'long' })
                            : "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">تاريخ المشروع</p>
                      </div>
                      <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-center">
                        <MapPin className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                        <p className="font-bold text-sm">
                          {selectedFile.project_location 
                            ? LOCATIONS.find(l => l.value === selectedFile.project_location)?.label || selectedFile.project_location 
                            : "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">الموقع</p>
                      </div>
                    </div>

                    {/* Corrupt Data Warning */}
                    {isCorruptData && (
                      <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-destructive">
                            بيانات ناقصة - يُنصح بإعادة الرفع
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round(zeroItems.length / normalizedItems.length * 100)}% من البنود بدون بيانات. هذا الملف تم حفظه قبل تحسين نظام الاستخراج. يُنصح بحذفه وإعادة رفع الملف الأصلي للحصول على نتائج أفضل.
                          </p>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="mt-2 gap-2"
                            onClick={() => {
                              handleDeleteFile(selectedFile.id);
                              setViewDialogOpen(false);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                            حذف هذا الملف وإعادة الرفع
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedFile.notes && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">{selectedFile.notes}</p>
                      </div>
                    )}

                    <HistoricalItemsTable
                      items={normalizedItems}
                      onItemsChange={(updatedItems) => {
                        setSelectedFile({ ...selectedFile, items: updatedItems, items_count: updatedItems.length });
                      }}
                      fileId={selectedFile.id}
                      projectName={selectedFile.project_name}
                    />

                    {/* Suggestions Section */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        اقتراحات وتحليل سريع
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Highest/Lowest price summary */}
                        {pricedItems.length > 0 && (() => {
                          const sorted = [...pricedItems].sort((a, b) => b.unit_price - a.unit_price);
                          const highest = sorted[0];
                          const lowest = sorted[sorted.length - 1];
                          return (
                            <>
                              <div className="p-3 border border-emerald-500/30 bg-emerald-500/5 rounded-lg">
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                  <TrendingUp className="w-4 h-4" />
                                  أعلى سعر وحدة
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {highest.description || highest.description_ar || `بند ${highest.item_number}`}
                                </p>
                                <p className="text-sm font-bold mt-0.5">
                                  {formatLargeNumber(highest.unit_price, selectedFile.currency)}
                                </p>
                              </div>
                              <div className="p-3 border border-cyan-500/30 bg-cyan-500/5 rounded-lg">
                                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                                  <TrendingDown className="w-4 h-4" />
                                  أقل سعر وحدة
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {lowest.description || lowest.description_ar || `بند ${lowest.item_number}`}
                                </p>
                                <p className="text-sm font-bold mt-0.5">
                                  {formatLargeNumber(lowest.unit_price, selectedFile.currency)}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                        {zeroItems.length > 0 && (
                          <div className="p-3 border border-yellow-500/30 bg-yellow-500/5 rounded-lg">
                            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4" />
                              {zeroItems.length} بند بدون أسعار
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ({Math.round(zeroItems.length / normalizedItems.length * 100)}%) بدون كمية أو سعر. يُنصح بمراجعتها.
                            </p>
                          </div>
                        )}
                        {hasHighVariance && (
                          <div className="p-3 border border-red-500/30 bg-red-500/5 rounded-lg">
                            <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5">
                              <ArrowUpDown className="w-4 h-4" />
                              تفاوت كبير في الأسعار
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              الانحراف المعياري ({Math.round(stdDev).toLocaleString()}) يتجاوز 50% من المتوسط ({Math.round(avgUnitPrice).toLocaleString()}).
                            </p>
                          </div>
                        )}
                        <div className="p-3 border border-blue-500/30 bg-blue-500/5 rounded-lg">
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" />
                            استخدم هذه الأسعار في مشاريعك
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            طبّق أسعار هذا الملف عبر أداة "التسعير التاريخي" في تفاصيل المشروع.
                          </p>
                        </div>
                        {files.length > 1 && (
                          <div className="p-3 border border-violet-500/30 bg-violet-500/5 rounded-lg">
                            <p className="text-sm font-medium text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                              <FileBarChart className="w-4 h-4" />
                              تصدير تقرير مقارنة
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              قارن أسعار {files.length} مشاريع محفوظة عبر تبويب "الإحصائيات".
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              );
            })()}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => selectedFile && handleExportSavedToExcel(selectedFile)}
                className="gap-2"
                disabled={!selectedFile}
              >
                <Download className="w-4 h-4" />
                تصدير إلى Excel
              </Button>
              <DialogClose asChild>
                <Button variant="outline">إغلاق</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}

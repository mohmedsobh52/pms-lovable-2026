import { useState, useCallback, useMemo } from "react";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileImage, Trash2, Sparkles, Download, FileSpreadsheet, FileText, Shovel, Layers, Pipette, Eye, CircleDot, ArrowUpDown } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface ExtractedQuantity {
  item_number: string;
  category: string;
  subcategory?: string;
  description: string;
  quantity: number;
  unit: string;
  measurement_basis?: string;
  pipe_diameter?: string;
  pipe_material?: string;
  notes?: string;
}

interface AnalysisResult {
  drawing_info?: { title?: string; type?: string; scale?: string; date?: string };
  quantities: ExtractedQuantity[];
  summary?: { total_items?: number; categories?: string[] };
}

const DRAWING_TYPES = [
  { value: "infrastructure", labelAr: "بنية تحتية / شبكات", labelEn: "Infrastructure / Networks" },
  { value: "structural", labelAr: "إنشائي", labelEn: "Structural" },
  { value: "architectural", labelAr: "معماري", labelEn: "Architectural" },
  { value: "electrical", labelAr: "كهرباء", labelEn: "Electrical" },
  { value: "mechanical", labelAr: "ميكانيكا", labelEn: "Mechanical" },
  { value: "plumbing", labelAr: "صحي", labelEn: "Plumbing" },
];

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; labelAr: string; labelEn: string }> = {
  Excavation: { icon: <Shovel className="w-4 h-4" />, color: "bg-amber-500/10 text-amber-700 dark:text-amber-400", labelAr: "أعمال الحفر", labelEn: "Excavation" },
  Backfilling: { icon: <Layers className="w-4 h-4" />, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", labelAr: "أعمال الردم", labelEn: "Backfilling" },
  Pipes: { icon: <Pipette className="w-4 h-4" />, color: "bg-blue-500/10 text-blue-700 dark:text-blue-400", labelAr: "المواسير", labelEn: "Pipes" },
  Fittings: { icon: <CircleDot className="w-4 h-4" />, color: "bg-purple-500/10 text-purple-700 dark:text-purple-400", labelAr: "القطع والتركيبات", labelEn: "Fittings" },
  Manholes: { icon: <Eye className="w-4 h-4" />, color: "bg-red-500/10 text-red-700 dark:text-red-400", labelAr: "غرف التفتيش", labelEn: "Manholes" },
  Valves: { icon: <ArrowUpDown className="w-4 h-4" />, color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400", labelAr: "المحابس", labelEn: "Valves" },
};

const normalizeQuantities = (quantities: any[]): ExtractedQuantity[] => {
  if (!Array.isArray(quantities)) return [];
  return quantities.map((q, idx) => {
    let qty = 0;
    const rawQty = q?.quantity ?? q?.qty ?? q?.Quantity ?? q?.amount ?? 0;
    if (typeof rawQty === "number" && !isNaN(rawQty)) qty = rawQty;
    else if (typeof rawQty === "string") {
      const cleaned = rawQty.replace(/[,،\s]/g, "").replace(/[^\d.-]/g, "");
      qty = parseFloat(cleaned) || 0;
    }
    return {
      item_number: String(q?.item_number || q?.itemNumber || idx + 1),
      category: q?.category || "General",
      subcategory: q?.subcategory || "",
      description: q?.description || q?.desc || "",
      quantity: qty,
      unit: q?.unit || "",
      measurement_basis: q?.measurement_basis || "",
      pipe_diameter: q?.pipe_diameter || "",
      pipe_material: q?.pipe_material || "",
      notes: q?.notes || "",
    };
  });
};

const DrawingAnalysisPage = () => {
  const { isArabic } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [drawingType, setDrawingType] = useState("infrastructure");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [results, setResults] = useState<ExtractedQuantity[]>([]);
  const [drawingInfo, setDrawingInfo] = useState<AnalysisResult["drawing_info"]>();

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    if (dropped.length) setFiles((prev) => [...prev, ...dropped]);
    else toast.error(isArabic ? "يرجى رفع ملفات PDF أو صور فقط" : "Please upload PDF or image files only");
  }, [isArabic]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  }, []);

  const removeFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const convertPdfToImages = async (file: File): Promise<string[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];
    const maxPages = Math.min(pdf.numPages, 10);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      images.push(canvas.toDataURL("image/png"));
    }
    return images;
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const analyzeDrawings = useCallback(async () => {
    if (!files.length) return toast.error(isArabic ? "يرجى رفع ملف واحد على الأقل" : "Please upload at least one file");
    setIsAnalyzing(true);
    setProgress(0);
    setResults([]);
    const allQuantities: ExtractedQuantity[] = [];
    let lastDrawingInfo: AnalysisResult["drawing_info"];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgressText(isArabic ? `تحليل ${file.name}...` : `Analyzing ${file.name}...`);
        setProgress(((i) / files.length) * 100);

        let payload: any = { fileName: file.name, drawingType, language: isArabic ? "ar" : "en" };

        if (file.type === "application/pdf") {
          setProgressText(isArabic ? `تحويل PDF إلى صور: ${file.name}` : `Converting PDF to images: ${file.name}`);
          const images = await convertPdfToImages(file);
          payload.images = images;
        } else {
          const base64 = await fileToBase64(file);
          payload.imageBase64 = base64;
        }

        const { data, error } = await supabase.functions.invoke("analyze-drawings", { body: payload });
        if (error) throw error;
        if (data?.quantities) {
          const normalized = normalizeQuantities(data.quantities);
          allQuantities.push(...normalized);
        }
        if (data?.drawing_info) lastDrawingInfo = data.drawing_info;
        setProgress(((i + 1) / files.length) * 100);
      }

      setResults(allQuantities);
      setDrawingInfo(lastDrawingInfo);
      toast.success(isArabic ? `تم استخراج ${allQuantities.length} بند بنجاح` : `Successfully extracted ${allQuantities.length} items`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (isArabic ? "حدث خطأ أثناء التحليل" : "Analysis failed"));
    } finally {
      setIsAnalyzing(false);
      setProgressText("");
    }
  }, [files, drawingType, isArabic]);

  // Summary cards data
  const summaryData = useMemo(() => {
    const excavation = results.filter((r) => r.category === "Excavation").reduce((s, r) => s + r.quantity, 0);
    const backfilling = results.filter((r) => r.category === "Backfilling").reduce((s, r) => s + r.quantity, 0);
    const pipes = results.filter((r) => r.category === "Pipes").reduce((s, r) => s + r.quantity, 0);
    const manholes = results.filter((r) => r.category === "Manholes").reduce((s, r) => s + r.quantity, 0);
    const valves = results.filter((r) => r.category === "Valves").reduce((s, r) => s + r.quantity, 0);
    return { excavation, backfilling, pipes, manholes, valves };
  }, [results]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, ExtractedQuantity[]> = {};
    results.forEach((r) => {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    });
    return groups;
  }, [results]);

  const exportToExcel = useCallback(async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(isArabic ? "تحليل المخططات" : "Drawing Analysis");
    ws.columns = [
      { header: isArabic ? "م" : "#", key: "no", width: 6 },
      { header: isArabic ? "الفئة" : "Category", key: "cat", width: 18 },
      { header: isArabic ? "الفئة الفرعية" : "Subcategory", key: "sub", width: 20 },
      { header: isArabic ? "الوصف" : "Description", key: "desc", width: 40 },
      { header: isArabic ? "الكمية" : "Quantity", key: "qty", width: 12 },
      { header: isArabic ? "الوحدة" : "Unit", key: "unit", width: 10 },
      { header: isArabic ? "أساس القياس" : "Measurement Basis", key: "basis", width: 30 },
      { header: isArabic ? "القطر" : "Diameter", key: "dia", width: 15 },
      { header: isArabic ? "المادة" : "Material", key: "mat", width: 15 },
    ];
    results.forEach((r, i) => {
      ws.addRow({ no: i + 1, cat: r.category, sub: r.subcategory, desc: r.description, qty: r.quantity, unit: r.unit, basis: r.measurement_basis, dia: r.pipe_diameter, mat: r.pipe_material });
    });
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `drawing-analysis-${Date.now()}.xlsx`);
    toast.success(isArabic ? "تم التصدير إلى Excel" : "Exported to Excel");
  }, [results, isArabic]);

  const exportToPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(isArabic ? "تقرير تحليل المخططات" : "Drawing Analysis Report", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [[isArabic ? "م" : "#", isArabic ? "الفئة" : "Category", isArabic ? "الوصف" : "Description", isArabic ? "الكمية" : "Qty", isArabic ? "الوحدة" : "Unit", isArabic ? "القطر" : "Dia", isArabic ? "أساس القياس" : "Basis"]],
      body: results.map((r, i) => [i + 1, r.category, r.description, r.quantity, r.unit, r.pipe_diameter || "-", r.measurement_basis || "-"]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 120] },
    });
    doc.save(`drawing-analysis-${Date.now()}.pdf`);
    toast.success(isArabic ? "تم التصدير إلى PDF" : "Exported to PDF");
  }, [results, isArabic]);

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" />
              {isArabic ? "تحليل المخططات الهندسية" : "Engineering Drawing Analysis"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isArabic
                ? "ارفع مخططات PDF أو صور لاستخراج الكميات وحساب الحفر والردم تلقائياً"
                : "Upload PDF drawings or images to extract quantities and calculate excavation/backfill automatically"}
            </p>
          </div>
          {results.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <FileSpreadsheet className="w-4 h-4 me-1" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPdf}>
                <FileText className="w-4 h-4 me-1" />
                PDF
              </Button>
            </div>
          )}
        </div>

        {/* Upload & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Drop Zone */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                onClick={() => document.getElementById("drawing-file-input")?.click()}
              >
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold text-foreground">
                  {isArabic ? "اسحب الملفات هنا أو اضغط للاختيار" : "Drag files here or click to select"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isArabic ? "PDF، PNG، JPG (حتى 10 صفحات للـ PDF)" : "PDF, PNG, JPG (up to 10 pages for PDF)"}
                </p>
                <input
                  id="drawing-file-input"
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                />
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <FileImage className="w-4 h-4 text-primary" />
                        <span className="text-sm text-foreground font-medium truncate max-w-[300px]">{f.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {(f.size / 1024 / 1024).toFixed(1)} MB
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFile(i)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isArabic ? "إعدادات التحليل" : "Analysis Settings"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {isArabic ? "نوع المخطط" : "Drawing Type"}
                </label>
                <Select value={drawingType} onValueChange={setDrawingType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DRAWING_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {isArabic ? t.labelAr : t.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                disabled={!files.length || isAnalyzing}
                onClick={analyzeDrawings}
              >
                <Sparkles className="w-4 h-4 me-2" />
                {isAnalyzing
                  ? isArabic ? "جاري التحليل..." : "Analyzing..."
                  : isArabic ? "بدء التحليل بالذكاء الاصطناعي" : "Start AI Analysis"}
              </Button>

              {drawingType === "infrastructure" && (
                <p className="text-xs text-muted-foreground">
                  {isArabic
                    ? "⛏️ سيتم تحليل: حفر، ردم، مواسير، غرف تفتيش، محابس"
                    : "⛏️ Will analyze: Excavation, Backfill, Pipes, Manholes, Valves"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        {isAnalyzing && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium">{progressText}</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: isArabic ? "إجمالي الحفر" : "Total Excavation", value: summaryData.excavation, unit: "م³", cat: "Excavation" },
              { label: isArabic ? "إجمالي الردم" : "Total Backfill", value: summaryData.backfilling, unit: "م³", cat: "Backfilling" },
              { label: isArabic ? "أطوال المواسير" : "Pipe Lengths", value: summaryData.pipes, unit: "م.ط", cat: "Pipes" },
              { label: isArabic ? "غرف التفتيش" : "Manholes", value: summaryData.manholes, unit: isArabic ? "عدد" : "nos", cat: "Manholes" },
              { label: isArabic ? "المحابس" : "Valves", value: summaryData.valves, unit: isArabic ? "عدد" : "nos", cat: "Valves" },
            ].map((card) => {
              const cfg = CATEGORY_CONFIG[card.cat];
              return (
                <Card key={card.cat} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium mb-2 ${cfg?.color || "bg-muted text-muted-foreground"}`}>
                      {cfg?.icon}
                      {card.label}
                    </div>
                    <p className="text-2xl font-bold text-foreground">{card.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{card.unit}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Results Table grouped by category */}
        {Object.keys(groupedResults).length > 0 &&
          Object.entries(groupedResults).map(([category, items]) => {
            const cfg = CATEGORY_CONFIG[category];
            return (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold ${cfg?.color || "bg-muted text-muted-foreground"}`}>
                      {cfg?.icon}
                      {isArabic ? cfg?.labelAr || category : cfg?.labelEn || category}
                    </span>
                    <Badge variant="secondary">{items.length} {isArabic ? "بند" : "items"}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-12 text-foreground font-bold">#</TableHead>
                        <TableHead className="text-foreground font-bold">{isArabic ? "الوصف" : "Description"}</TableHead>
                        <TableHead className="text-foreground font-bold w-24">{isArabic ? "الكمية" : "Qty"}</TableHead>
                        <TableHead className="text-foreground font-bold w-16">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                        {category === "Pipes" && (
                          <>
                            <TableHead className="text-foreground font-bold">{isArabic ? "القطر" : "Diameter"}</TableHead>
                            <TableHead className="text-foreground font-bold">{isArabic ? "المادة" : "Material"}</TableHead>
                          </>
                        )}
                        <TableHead className="text-foreground font-bold">{isArabic ? "أساس القياس" : "Measurement Basis"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/50">
                          <TableCell className="text-muted-foreground">{item.item_number}</TableCell>
                          <TableCell className="font-medium text-foreground">{item.description}</TableCell>
                          <TableCell className="font-bold text-primary text-base">{item.quantity.toLocaleString()}</TableCell>
                          <TableCell className="text-foreground">{item.unit}</TableCell>
                          {category === "Pipes" && (
                            <>
                              <TableCell className="text-foreground">{item.pipe_diameter || "-"}</TableCell>
                              <TableCell className="text-foreground">{item.pipe_material || "-"}</TableCell>
                            </>
                          )}
                          <TableCell className="text-muted-foreground text-xs">{item.measurement_basis || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </PageLayout>
  );
};

export default DrawingAnalysisPage;

import { useState, useEffect, useCallback, useMemo } from "react";
import { Calculator, TrendingUp, Users, Package, Wrench, Building2, AlertCircle, Sparkles, Loader2, Edit2, Save, X, Check, PieChart as PieChartIcon, Trash2, RefreshCw, ArrowUpDown, Lightbulb, Shield, DollarSign, FileDown, FileSpreadsheet, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface CostBreakdownItem {
  item_description: string;
  materials: {
    items: Array<{ name: string; quantity: number; unit: string; unit_price: number; total: number }>;
    total: number;
  };
  labor: {
    items: Array<{ role: string; hours: number; hourly_rate: number; total: number }>;
    total: number;
  };
  equipment: {
    items: Array<{ name: string; duration: string; daily_rate: number; total: number }>;
    total: number;
  };
  subcontractor: number;
  overhead: number;
  admin: number;
  insurance: number;
  contingency: number;
  profit_margin: number;
  profit_amount: number;
  total_direct: number;
  total_indirect: number;
  total_cost: number;
  unit_price: number;
  recommendations: string[];
}

interface CostAnalysisResult {
  cost_analysis: CostBreakdownItem[];
  summary: {
    total_materials: number;
    total_labor: number;
    total_equipment: number;
    total_subcontractor: number;
    total_direct_costs: number;
    total_indirect_costs: number;
    total_profit: number;
    grand_total: number;
    key_insights: string[];
  };
  ai_provider: string;
}

interface CostAnalysisProps {
  items: BOQItem[];
  currency?: string;
}

// Cache utilities
const COST_CACHE_KEY = 'cost_analysis_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const generateCacheHash = async (items: BOQItem[]): Promise<string> => {
  const text = items.map(i => `${i.description}|${i.quantity}|${i.unit}`).join('||');
  const encoder = new TextEncoder();
  const data = encoder.encode(text.slice(0, 8000));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
};

const getCachedAnalysis = (hash: string): CostAnalysisResult | null => {
  try {
    const cached = localStorage.getItem(COST_CACHE_KEY);
    if (!cached) return null;
    const entries = JSON.parse(cached);
    const entry = entries[hash];
    if (entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS) {
      return entry.result;
    }
    return null;
  } catch { return null; }
};

const saveCacheAnalysis = (hash: string, result: CostAnalysisResult) => {
  try {
    const cached = localStorage.getItem(COST_CACHE_KEY);
    const entries = cached ? JSON.parse(cached) : {};
    entries[hash] = { result, timestamp: Date.now() };
    // Keep max 10 entries
    const keys = Object.keys(entries);
    if (keys.length > 10) {
      const sorted = keys.sort((a, b) => entries[b].timestamp - entries[a].timestamp);
      sorted.slice(10).forEach(k => delete entries[k]);
    }
    localStorage.setItem(COST_CACHE_KEY, JSON.stringify(entries));
  } catch (e) { console.warn('Cache save failed:', e); }
};

const clearCostCache = () => {
  localStorage.removeItem(COST_CACHE_KEY);
};

// Batch size for API calls
const BATCH_SIZE = 15;
const MAX_ITEMS = 50;

export function CostAnalysis({ items, currency = "ر.س" }: CostAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CostAnalysisResult | null>(null);
  const [editedResult, setEditedResult] = useState<CostAnalysisResult | null>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [aiProvider, setAiProvider] = useState<'lovable' | 'openai' | 'genspark' | 'manus' | 'all'>('all');
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [fromCache, setFromCache] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  // Translation helper
  const t = useCallback((ar: string, en: string) => isArabic ? ar : en, [isArabic]);

  // Initialize editedResult when analysisResult changes
  useEffect(() => {
    if (analysisResult) {
      setEditedResult(JSON.parse(JSON.stringify(analysisResult)));
    }
  }, [analysisResult]);

  const runCostAnalysis = async () => {
    if (!items || items.length === 0) {
      toast({
        title: t("لا توجد بنود", "No items"),
        description: t("يرجى تحليل ملف BOQ أولاً", "Please analyze a BOQ file first"),
        variant: "destructive",
      });
      return;
    }

    // Check cache first
    const itemsToAnalyze = items.slice(0, MAX_ITEMS);
    const hash = await generateCacheHash(itemsToAnalyze);
    const cached = getCachedAnalysis(hash);
    if (cached) {
      setAnalysisResult(cached);
      setFromCache(true);
      toast({
        title: t("✅ نتيجة من الذاكرة المؤقتة", "✅ Cached Result"),
        description: t("تم تحميل النتيجة السابقة (أسرع)", "Previous result loaded (faster)"),
      });
      return;
    }

    setFromCache(false);
    setIsAnalyzing(true);
    
    try {
      // Split items into batches
      const batches: BOQItem[][] = [];
      for (let i = 0; i < itemsToAnalyze.length; i += BATCH_SIZE) {
        batches.push(itemsToAnalyze.slice(i, i + BATCH_SIZE));
      }
      
      setBatchProgress({ current: 0, total: batches.length, percentage: 0 });
      
      const allCostAnalysis: CostBreakdownItem[] = [];
      let lastProvider = '';

      for (let bIdx = 0; bIdx < batches.length; bIdx++) {
        setBatchProgress({ 
          current: bIdx + 1, 
          total: batches.length, 
          percentage: Math.round(((bIdx) / batches.length) * 100) 
        });

        const { data, error } = await supabase.functions.invoke("analyze-costs", {
          body: { 
            items: batches[bIdx],
            ai_provider: aiProvider,
            analysis_type: "detailed",
            language
          },
        });

        if (error) throw error;
        if (data.requires_api_key) {
          toast({
            title: t("مفتاح API مطلوب", "API Key Required"),
            description: data.error,
            variant: "destructive",
          });
          return;
        }
        if (data.error) throw new Error(data.error);

        if (data.cost_analysis && Array.isArray(data.cost_analysis)) {
          allCostAnalysis.push(...data.cost_analysis);
        }
        lastProvider = data.ai_provider || lastProvider;
      }

      setBatchProgress({ current: batches.length, total: batches.length, percentage: 100 });

      // Fix unit_price calculation: unit_price = total_cost / quantity
      const fixedCostAnalysis = allCostAnalysis.map((item, idx) => {
        const quantity = itemsToAnalyze[idx]?.quantity || 1;
        const correctedUnitPrice = quantity > 0 ? item.total_cost / quantity : item.total_cost;
        return { ...item, unit_price: correctedUnitPrice };
      });

      // Build merged result
      const mergedResult: CostAnalysisResult = {
        cost_analysis: fixedCostAnalysis,
        summary: recalculateSummaryFromItems(fixedCostAnalysis),
        ai_provider: lastProvider,
      };

      setAnalysisResult(mergedResult);
      saveCacheAnalysis(hash, mergedResult);

      toast({
        title: t("تم التحليل بنجاح", "Analysis Complete"),
        description: t(
          `تم تحليل تكاليف ${fixedCostAnalysis.length} بند باستخدام ${lastProvider}`,
          `Analyzed costs for ${fixedCostAnalysis.length} items using ${lastProvider}`
        ),
      });
    } catch (error) {
      console.error("Cost analysis error:", error);
      toast({
        title: t("خطأ في التحليل", "Analysis Error"),
        description: error instanceof Error ? error.message : t("حدث خطأ أثناء تحليل التكاليف", "An error occurred during cost analysis"),
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setBatchProgress({ current: 0, total: 0, percentage: 0 });
    }
  };

  const formatNumber = (num: number) => {
    return num?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) || '0';
  };

  const recalculateItemTotals = (item: CostBreakdownItem, quantity?: number): CostBreakdownItem => {
    const materialsTotal = item.materials?.items?.reduce((sum, m) => sum + (m.total || 0), 0) || 0;
    const laborTotal = item.labor?.items?.reduce((sum, l) => sum + (l.total || 0), 0) || 0;
    const equipmentTotal = item.equipment?.items?.reduce((sum, e) => sum + (e.total || 0), 0) || 0;
    
    const totalDirect = materialsTotal + laborTotal + equipmentTotal + (item.subcontractor || 0);
    const totalIndirect = (item.overhead || 0) + (item.admin || 0) + (item.insurance || 0) + (item.contingency || 0);
    const profitAmount = (totalDirect + totalIndirect) * ((item.profit_margin || 10) / 100);
    const totalCost = totalDirect + totalIndirect + profitAmount;
    const qty = quantity || 1;
    const unitPrice = qty > 0 ? totalCost / qty : totalCost;

    return {
      ...item,
      materials: { ...item.materials, total: materialsTotal },
      labor: { ...item.labor, total: laborTotal },
      equipment: { ...item.equipment, total: equipmentTotal },
      total_direct: totalDirect,
      total_indirect: totalIndirect,
      profit_amount: profitAmount,
      total_cost: totalCost,
      unit_price: unitPrice,
    };
  };

  const recalculateSummaryFromItems = (costAnalysis: CostBreakdownItem[]): CostAnalysisResult['summary'] => {
    return {
      total_materials: costAnalysis.reduce((sum, item) => sum + (item.materials?.total || 0), 0),
      total_labor: costAnalysis.reduce((sum, item) => sum + (item.labor?.total || 0), 0),
      total_equipment: costAnalysis.reduce((sum, item) => sum + (item.equipment?.total || 0), 0),
      total_subcontractor: costAnalysis.reduce((sum, item) => sum + (item.subcontractor || 0), 0),
      total_direct_costs: costAnalysis.reduce((sum, item) => sum + (item.total_direct || 0), 0),
      total_indirect_costs: costAnalysis.reduce((sum, item) => sum + (item.total_indirect || 0), 0),
      total_profit: costAnalysis.reduce((sum, item) => sum + (item.profit_amount || 0), 0),
      grand_total: costAnalysis.reduce((sum, item) => sum + (item.total_cost || 0), 0),
      key_insights: [],
    };
  };

  const recalculateSummary = (costAnalysis: CostBreakdownItem[]): CostAnalysisResult['summary'] => {
    const summary = recalculateSummaryFromItems(costAnalysis);
    summary.key_insights = editedResult?.summary?.key_insights || [];
    return summary;
  };

  const handleEditItem = (idx: number) => {
    setEditingItem(idx);
    setSelectedItem(idx);
  };

  const handleSaveItem = (idx: number) => {
    if (!editedResult) return;
    
    const updatedCostAnalysis = [...editedResult.cost_analysis];
    const quantity = items[idx]?.quantity || 1;
    updatedCostAnalysis[idx] = recalculateItemTotals(updatedCostAnalysis[idx], quantity);
    
    const updatedSummary = recalculateSummary(updatedCostAnalysis);
    
    setEditedResult({
      ...editedResult,
      cost_analysis: updatedCostAnalysis,
      summary: updatedSummary,
    });
    
    setEditingItem(null);
    toast({
      title: t("تم الحفظ", "Saved"),
      description: t("تم تحديث تفاصيل التكاليف", "Cost breakdown updated successfully"),
    });
  };

  const handleCancelEdit = () => {
    if (analysisResult) {
      setEditedResult(JSON.parse(JSON.stringify(analysisResult)));
    }
    setEditingItem(null);
  };

  const updateMaterialItem = (itemIdx: number, matIdx: number, field: string, value: number) => {
    if (!editedResult) return;
    const updatedResult = { ...editedResult };
    const material = updatedResult.cost_analysis[itemIdx].materials.items[matIdx];
    if (field === 'quantity') { material.quantity = value; material.total = value * material.unit_price; }
    else if (field === 'unit_price') { material.unit_price = value; material.total = material.quantity * value; }
    setEditedResult(updatedResult);
  };

  const updateLaborItem = (itemIdx: number, labIdx: number, field: string, value: number) => {
    if (!editedResult) return;
    const updatedResult = { ...editedResult };
    const labor = updatedResult.cost_analysis[itemIdx].labor.items[labIdx];
    if (field === 'hours') { labor.hours = value; labor.total = value * labor.hourly_rate; }
    else if (field === 'hourly_rate') { labor.hourly_rate = value; labor.total = labor.hours * value; }
    setEditedResult(updatedResult);
  };

  const updateIndirectCost = (itemIdx: number, field: string, value: number) => {
    if (!editedResult) return;
    const updatedResult = { ...editedResult };
    (updatedResult.cost_analysis[itemIdx] as any)[field] = value;
    setEditedResult(updatedResult);
  };

  const finalizeAnalysis = () => {
    if (!editedResult) return;
    setAnalysisResult(JSON.parse(JSON.stringify(editedResult)));
    toast({
      title: t("تم الاعتماد", "Finalized"),
      description: t("تم اعتماد تحليل التكاليف بالتعديلات", "Cost analysis has been finalized with your adjustments"),
    });
  };

  const handleClearCache = () => {
    clearCostCache();
    setAnalysisResult(null);
    setEditedResult(null);
    setFromCache(false);
    toast({
      title: t("تم مسح الذاكرة المؤقتة", "Cache Cleared"),
      description: t("تم حذف جميع النتائج المخزنة", "All cached results deleted"),
    });
  };

  const displayResult = editedResult || analysisResult;

  // Recommendation icon helper
  const getRecIcon = (rec: string) => {
    const lower = rec.toLowerCase();
    if (lower.includes('تفاوض') || lower.includes('negotiat') || lower.includes('سعر') || lower.includes('price')) return <DollarSign className="w-3.5 h-3.5 text-green-500 shrink-0" />;
    if (lower.includes('خطر') || lower.includes('risk') || lower.includes('احتياط') || lower.includes('contingen')) return <Shield className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    return <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  };

  // --- Comparison Data ---
  const comparisonData = useMemo(() => {
    if (!displayResult?.cost_analysis) return [];
    return displayResult.cost_analysis
      .map((item, idx) => {
        const originalPrice = items[idx]?.unit_price || 0;
        const aiPrice = item.unit_price || 0;
        if (originalPrice <= 0) return null;
        const diff = ((aiPrice - originalPrice) / originalPrice) * 100;
        return {
          name: (items[idx]?.item_number || `${idx + 1}`) + '',
          fullDesc: item.item_description?.substring(0, 30) || '',
          originalPrice,
          aiPrice,
          diff,
        };
      })
      .filter(Boolean) as Array<{ name: string; fullDesc: string; originalPrice: number; aiPrice: number; diff: number }>;
  }, [displayResult, items]);

  const comparisonStats = useMemo(() => {
    if (comparisonData.length === 0) return null;
    const totalOriginal = comparisonData.reduce((s, d) => s + d.originalPrice, 0);
    const totalAI = comparisonData.reduce((s, d) => s + d.aiPrice, 0);
    const avgDiff = comparisonData.reduce((s, d) => s + d.diff, 0) / comparisonData.length;
    const higher = comparisonData.filter(d => d.diff > 0).length;
    const lower = comparisonData.filter(d => d.diff < 0).length;
    const potentialSavings = comparisonData.reduce((s, d) => s + (d.diff < 0 ? (d.originalPrice - d.aiPrice) : 0), 0);
    return { totalOriginal, totalAI, avgDiff, higher, lower, potentialSavings, totalDiffPercent: totalOriginal > 0 ? ((totalAI - totalOriginal) / totalOriginal) * 100 : 0 };
  }, [comparisonData]);

  // --- Export PDF ---
  const exportToPDF = () => {
    if (!displayResult) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(16);
    doc.text(isArabic ? 'تقرير تحليل التكاليف' : 'Cost Analysis Report', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US'), pageWidth / 2, 28, { align: 'center' });

    // Summary table
    doc.setFontSize(12);
    doc.text(isArabic ? 'ملخص التكاليف' : 'Cost Summary', 14, 38);
    
    autoTable(doc, {
      startY: 42,
      head: [[isArabic ? 'الفئة' : 'Category', isArabic ? 'المبلغ' : 'Amount', '%']],
      body: [
        [isArabic ? 'المواد' : 'Materials', formatNumber(displayResult.summary?.total_materials || 0), ((displayResult.summary?.total_materials || 0) / (displayResult.summary?.grand_total || 1) * 100).toFixed(1) + '%'],
        [isArabic ? 'العمالة' : 'Labor', formatNumber(displayResult.summary?.total_labor || 0), ((displayResult.summary?.total_labor || 0) / (displayResult.summary?.grand_total || 1) * 100).toFixed(1) + '%'],
        [isArabic ? 'المعدات' : 'Equipment', formatNumber(displayResult.summary?.total_equipment || 0), ((displayResult.summary?.total_equipment || 0) / (displayResult.summary?.grand_total || 1) * 100).toFixed(1) + '%'],
        [isArabic ? 'غير مباشرة' : 'Indirect', formatNumber(displayResult.summary?.total_indirect_costs || 0), ((displayResult.summary?.total_indirect_costs || 0) / (displayResult.summary?.grand_total || 1) * 100).toFixed(1) + '%'],
        [isArabic ? 'أرباح' : 'Profit', formatNumber(displayResult.summary?.total_profit || 0), ((displayResult.summary?.total_profit || 0) / (displayResult.summary?.grand_total || 1) * 100).toFixed(1) + '%'],
      ],
      foot: [[isArabic ? 'الإجمالي' : 'Grand Total', formatNumber(displayResult.summary?.grand_total || 0), '100%']],
      styles: { fontSize: 9, halign: 'center' },
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    });

    // Items detail table
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(12);
    doc.text(isArabic ? 'تفاصيل البنود' : 'Items Detail', 14, finalY + 10);

    autoTable(doc, {
      startY: finalY + 14,
      head: [[
        isArabic ? 'رقم' : '#',
        isArabic ? 'الوصف' : 'Description',
        isArabic ? 'الكمية' : 'Qty',
        isArabic ? 'سعر الوحدة' : 'Unit Price',
        isArabic ? 'الإجمالي' : 'Total',
        isArabic ? 'الفرق%' : 'Diff%',
      ]],
      body: displayResult.cost_analysis?.map((item, idx) => {
        const origPrice = items[idx]?.unit_price || 0;
        const diff = origPrice > 0 ? ((item.unit_price - origPrice) / origPrice * 100).toFixed(1) : '-';
        return [
          items[idx]?.item_number || idx + 1,
          (item.item_description || '').substring(0, 40),
          items[idx]?.quantity || 1,
          formatNumber(item.unit_price),
          formatNumber(item.total_cost),
          typeof diff === 'string' ? diff : diff + '%',
        ];
      }) || [],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: { 1: { cellWidth: 50 } },
    });

    // Page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`${i} / ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`cost-analysis-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: t('تم التصدير', 'Exported'), description: t('تم حفظ تقرير PDF', 'PDF report saved') });
  };

  // --- Export Excel ---
  const exportToExcel = async () => {
    if (!displayResult) return;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'PMS Cost Analysis';
    
    // Sheet 1: Summary
    const ws1 = wb.addWorksheet(isArabic ? 'الملخص' : 'Summary');
    ws1.columns = [
      { header: isArabic ? 'الفئة' : 'Category', key: 'cat', width: 25 },
      { header: isArabic ? 'المبلغ' : 'Amount', key: 'amount', width: 20 },
      { header: '%', key: 'pct', width: 12 },
    ];
    const gt = displayResult.summary?.grand_total || 1;
    const summaryRows = [
      { cat: isArabic ? 'المواد' : 'Materials', amount: displayResult.summary?.total_materials || 0, pct: ((displayResult.summary?.total_materials || 0) / gt * 100).toFixed(1) + '%' },
      { cat: isArabic ? 'العمالة' : 'Labor', amount: displayResult.summary?.total_labor || 0, pct: ((displayResult.summary?.total_labor || 0) / gt * 100).toFixed(1) + '%' },
      { cat: isArabic ? 'المعدات' : 'Equipment', amount: displayResult.summary?.total_equipment || 0, pct: ((displayResult.summary?.total_equipment || 0) / gt * 100).toFixed(1) + '%' },
      { cat: isArabic ? 'غير مباشرة' : 'Indirect', amount: displayResult.summary?.total_indirect_costs || 0, pct: ((displayResult.summary?.total_indirect_costs || 0) / gt * 100).toFixed(1) + '%' },
      { cat: isArabic ? 'أرباح' : 'Profit', amount: displayResult.summary?.total_profit || 0, pct: ((displayResult.summary?.total_profit || 0) / gt * 100).toFixed(1) + '%' },
      { cat: isArabic ? 'الإجمالي' : 'Grand Total', amount: displayResult.summary?.grand_total || 0, pct: '100%' },
    ];
    summaryRows.forEach(r => ws1.addRow(r));
    // Style header
    ws1.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    });
    // Style total row
    const lastRow = ws1.getRow(ws1.rowCount);
    lastRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EEF2FF' } };
    });

    // Sheet 2: Details
    const ws2 = wb.addWorksheet(isArabic ? 'التفاصيل' : 'Details');
    ws2.columns = [
      { header: isArabic ? 'رقم البند' : 'Item #', key: 'num', width: 12 },
      { header: isArabic ? 'الوصف' : 'Description', key: 'desc', width: 40 },
      { header: isArabic ? 'الكمية' : 'Qty', key: 'qty', width: 10 },
      { header: isArabic ? 'مواد' : 'Materials', key: 'mat', width: 15 },
      { header: isArabic ? 'عمالة' : 'Labor', key: 'lab', width: 15 },
      { header: isArabic ? 'معدات' : 'Equipment', key: 'eq', width: 15 },
      { header: isArabic ? 'مباشرة' : 'Direct', key: 'direct', width: 15 },
      { header: isArabic ? 'غير مباشرة' : 'Indirect', key: 'indirect', width: 15 },
      { header: isArabic ? 'ربح' : 'Profit', key: 'profit', width: 12 },
      { header: isArabic ? 'الإجمالي' : 'Total', key: 'total', width: 15 },
      { header: isArabic ? 'سعر الوحدة' : 'Unit Price', key: 'up', width: 15 },
      { header: isArabic ? 'الفرق%' : 'Diff%', key: 'diff', width: 10 },
    ];
    displayResult.cost_analysis?.forEach((item, idx) => {
      const origPrice = items[idx]?.unit_price || 0;
      const diff = origPrice > 0 ? ((item.unit_price - origPrice) / origPrice * 100).toFixed(1) + '%' : '-';
      ws2.addRow({
        num: items[idx]?.item_number || idx + 1,
        desc: item.item_description || '',
        qty: items[idx]?.quantity || 1,
        mat: item.materials?.total || 0,
        lab: item.labor?.total || 0,
        eq: item.equipment?.total || 0,
        direct: item.total_direct || 0,
        indirect: item.total_indirect || 0,
        profit: item.profit_amount || 0,
        total: item.total_cost || 0,
        up: item.unit_price || 0,
        diff,
      });
    });
    ws2.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    });
    // Number formatting
    ['mat', 'lab', 'eq', 'direct', 'indirect', 'profit', 'total', 'up'].forEach(key => {
      const colIdx = ws2.columns.findIndex(c => c.key === key) + 1;
      if (colIdx > 0) ws2.getColumn(colIdx).numFmt = '#,##0.00';
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `cost-analysis-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: t('تم التصدير', 'Exported'), description: t('تم حفظ تقرير Excel', 'Excel report saved') });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Calculator className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-display text-lg font-semibold">{t("تحليل التكاليف التفصيلي", "Detailed Cost Analysis")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("تحليل التكاليف المباشرة وغير المباشرة لكل بند", "Direct and indirect cost analysis for each item")}
              {items?.length > 0 && (
                <span className="text-xs ms-2">
                  ({t(`${Math.min(items.length, MAX_ITEMS)} بند من ${items.length}`, `${Math.min(items.length, MAX_ITEMS)} of ${items.length} items`)})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'lovable', 'openai'] as const).map((provider) => (
              <Button
                key={provider}
                variant={aiProvider === provider ? "default" : "outline"}
                size="sm"
                onClick={() => setAiProvider(provider)}
                className="text-xs"
              >
                {provider === 'all' ? t('تلقائي', 'Auto') : 
                 provider === 'lovable' ? 'Gemini' : 'GPT'}
              </Button>
            ))}
          </div>
          {displayResult && (
            <Button variant="outline" size="sm" onClick={handleClearCache} className="gap-1.5 text-xs">
              <Trash2 className="w-3.5 h-3.5" />
              {t("مسح الذاكرة", "Clear Cache")}
            </Button>
          )}
          <Button
            onClick={runCostAnalysis}
            disabled={isAnalyzing || !items?.length}
            className="gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("جاري التحليل...", "Analyzing...")}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t("تحليل التكاليف", "Analyze Costs")}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Batch Progress */}
      {isAnalyzing && batchProgress.total > 1 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {t(`الدفعة ${batchProgress.current} من ${batchProgress.total}`, `Batch ${batchProgress.current} of ${batchProgress.total}`)}
              </span>
              <span className="text-sm text-muted-foreground">{batchProgress.percentage}%</span>
            </div>
            <Progress value={batchProgress.percentage} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Cache indicator */}
      {fromCache && displayResult && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <RefreshCw className="w-3.5 h-3.5" />
          {t("محمّل من الذاكرة المؤقتة. اضغط 'مسح الذاكرة' لإعادة التحليل.", "Loaded from cache. Click 'Clear Cache' to re-analyze.")}
        </div>
      )}

      {/* Analysis Results */}
      {displayResult && (
        <div className="space-y-6 animate-slide-up">
          {/* Action Buttons */}
          <div className="flex justify-end gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
              <FileDown className="w-4 h-4" />
              {t("تصدير PDF", "Export PDF")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              {t("تصدير Excel", "Export Excel")}
            </Button>
            <Button onClick={finalizeAnalysis} variant="default" className="gap-2">
              <Check className="w-4 h-4" />
              {t("اعتماد التحليل", "Finalize Analysis")}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Package, label: t("المواد", "Materials"), value: displayResult.summary?.total_materials || 0, gradient: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/20", iconColor: "text-blue-500", valueColor: "text-blue-600" },
              { icon: Users, label: t("العمالة", "Labor"), value: displayResult.summary?.total_labor || 0, gradient: "from-green-500/10 to-green-600/5", border: "border-green-500/20", iconColor: "text-green-500", valueColor: "text-green-600" },
              { icon: Wrench, label: t("المعدات", "Equipment"), value: displayResult.summary?.total_equipment || 0, gradient: "from-orange-500/10 to-orange-600/5", border: "border-orange-500/20", iconColor: "text-orange-500", valueColor: "text-orange-600" },
              { icon: TrendingUp, label: t("الإجمالي الكلي", "Grand Total"), value: displayResult.summary?.grand_total || 0, gradient: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/20", iconColor: "text-purple-500", valueColor: "text-purple-600" },
            ].map(({ icon: Icon, label, value, gradient, border, iconColor, valueColor }, idx) => (
              <Card key={idx} className={`bg-gradient-to-br ${gradient} ${border}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className={`text-xl font-bold ${valueColor}`}>
                    {formatNumber(value)}
                  </p>
                  <p className="text-xs text-muted-foreground">{currency}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cost Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {t("توزيع التكاليف", "Cost Distribution")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: t("المواد", "Materials"), value: displayResult.summary?.total_materials || 0, color: "bg-blue-500" },
                { label: t("العمالة", "Labor"), value: displayResult.summary?.total_labor || 0, color: "bg-green-500" },
                { label: t("المعدات", "Equipment"), value: displayResult.summary?.total_equipment || 0, color: "bg-orange-500" },
                { label: t("التكاليف غير المباشرة", "Indirect Costs"), value: displayResult.summary?.total_indirect_costs || 0, color: "bg-gray-500" },
                { label: t("الأرباح", "Profit"), value: displayResult.summary?.total_profit || 0, color: "bg-purple-500" },
              ].map((item, idx) => {
                const total = displayResult.summary?.grand_total || 1;
                const percentage = (item.value / total) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="text-muted-foreground">
                        {formatNumber(item.value)} {currency} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className={`h-2 [&>div]:${item.color}`} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Pie Chart - Optimized */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                {t('توزيع التكاليف حسب البند', 'Cost Distribution by Item')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const PIE_COLORS = [
                  'hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(24, 95%, 53%)',
                  'hsl(271, 81%, 56%)', 'hsl(340, 82%, 52%)', 'hsl(47, 96%, 53%)',
                  'hsl(199, 89%, 48%)', 'hsl(0, 72%, 51%)', 'hsl(160, 60%, 45%)', 'hsl(291, 64%, 42%)',
                  'hsl(30, 80%, 55%)',
                ];
                const MAX_SLICES = 10;
                const MIN_PERCENT = 0.03;

                const rawItems = (displayResult.cost_analysis || []).map((item, idx) => ({
                  name: item.item_description?.substring(0, 30) || `${t('بند', 'Item')} ${idx + 1}`,
                  fullName: item.item_description || '',
                  value: item.total_cost || 0,
                  itemNumber: items[idx]?.item_number || `${idx + 1}`,
                }));

                const grandTotal = rawItems.reduce((s, i) => s + i.value, 0) || 1;
                const sorted = [...rawItems].sort((a, b) => b.value - a.value);
                
                const topItems = sorted.slice(0, MAX_SLICES).filter(i => i.value / grandTotal >= MIN_PERCENT);
                const othersItems = sorted.slice(topItems.length);
                const othersValue = othersItems.reduce((s, i) => s + i.value, 0);

                const pieData = [
                  ...topItems,
                  ...(othersValue > 0 ? [{
                    name: t('أخرى', 'Others'),
                    fullName: t(`${othersItems.length} بند آخر`, `${othersItems.length} other items`),
                    value: othersValue,
                    itemNumber: '',
                  }] : []),
                ];

                const renderInnerLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                  if (percent < 0.08) return null;
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-semibold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                };

                const CustomPieTooltip = ({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const pct = ((d.value / grandTotal) * 100).toFixed(1);
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-[250px]">
                      {d.itemNumber && <p className="text-xs text-muted-foreground mb-1">{t('بند', 'Item')} {d.itemNumber}</p>}
                      <p className="font-medium text-sm leading-tight mb-1">{d.fullName || d.name}</p>
                      <p className="text-primary font-bold">{formatNumber(d.value)} {currency}</p>
                      <p className="text-xs text-muted-foreground">{pct}% {t('من الإجمالي', 'of total')}</p>
                    </div>
                  );
                };

                const legendData = pieData.slice(0, 8).map((item, idx) => ({
                  value: `${item.name} (${((item.value / grandTotal) * 100).toFixed(1)}%)`,
                  color: PIE_COLORS[idx % PIE_COLORS.length],
                }));

                return (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={65}
                          outerRadius={130}
                          paddingAngle={2}
                          dataKey="value"
                          labelLine={false}
                          label={renderInnerLabel}
                        >
                          {pieData.map((_, idx) => (
                            <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomPieTooltip />} />
                        <Legend
                          layout="horizontal"
                          align="center"
                          verticalAlign="bottom"
                          payload={legendData}
                          wrapperStyle={{ paddingTop: '16px' }}
                          formatter={(value) => <span className="text-xs">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* AI vs Original Price Comparison */}
          {comparisonData.length > 0 && comparisonStats && (
            <>
              {/* Comparison Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-blue-500/20">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t('إجمالي أصلي', 'Original Total')}</p>
                    <p className="text-lg font-bold text-blue-600">{formatNumber(comparisonStats.totalOriginal)}</p>
                    <p className="text-xs text-muted-foreground">{currency}</p>
                  </CardContent>
                </Card>
                <Card className="border-purple-500/20">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t('إجمالي AI', 'AI Total')}</p>
                    <p className="text-lg font-bold text-purple-600">{formatNumber(comparisonStats.totalAI)}</p>
                    <p className="text-xs text-muted-foreground">{currency} ({comparisonStats.totalDiffPercent > 0 ? '+' : ''}{comparisonStats.totalDiffPercent.toFixed(1)}%)</p>
                  </CardContent>
                </Card>
                <Card className="border-green-500/20">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t('بنود أقل تكلفة', 'Lower Cost Items')}</p>
                    <p className="text-lg font-bold text-green-600">{comparisonStats.lower}</p>
                    <p className="text-xs text-muted-foreground">{t('وفر محتمل', 'Potential Savings')}: {formatNumber(comparisonStats.potentialSavings)}</p>
                  </CardContent>
                </Card>
                <Card className="border-red-500/20">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t('بنود أعلى تكلفة', 'Higher Cost Items')}</p>
                    <p className="text-lg font-bold text-red-600">{comparisonStats.higher}</p>
                    <p className="text-xs text-muted-foreground">{t('متوسط الفرق', 'Avg Diff')}: {comparisonStats.avgDiff > 0 ? '+' : ''}{comparisonStats.avgDiff.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>

              {/* Comparison BarChart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    {t('مقارنة سعر الوحدة: أصلي vs ذكاء اصطناعي', 'Unit Price Comparison: Original vs AI')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <RechartsTooltip
                          formatter={(value: number, name: string) => [
                            `${formatNumber(value)} ${currency}`,
                            name === 'originalPrice' ? t('السعر الأصلي', 'Original Price') : t('سعر AI', 'AI Price'),
                          ]}
                          labelFormatter={(label) => {
                            const item = comparisonData.find(d => d.name === label);
                            return item ? `${t('بند', 'Item')} ${label}: ${item.fullDesc}` : label;
                          }}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        />
                        <Legend formatter={(value) => value === 'originalPrice' ? t('السعر الأصلي', 'Original') : t('سعر AI', 'AI Price')} />
                        <Bar dataKey="originalPrice" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="aiPrice" fill="hsl(271, 81%, 56%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Items Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                {t('ملخص البنود', 'Items Summary')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <TooltipProvider>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-right font-medium">{t('رقم البند', 'Item No.')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('الوصف', 'Description')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('الكمية', 'Qty')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('سعر الوحدة', 'Unit Price')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('الإجمالي', 'Total')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('نسبة العمالة', 'Labor %')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('نسبة غير المباشرة', 'Indirect %')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('الفرق', 'Diff')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayResult.cost_analysis?.map((item, idx) => {
                      const laborPercentage = item.total_cost > 0 
                        ? ((item.labor?.total || 0) / item.total_cost * 100).toFixed(1) : '0';
                      const indirectPercentage = item.total_cost > 0 
                        ? ((item.total_indirect || 0) / item.total_cost * 100).toFixed(1) : '0';
                      const quantity = items[idx]?.quantity || 1;
                      const originalUnitPrice = items[idx]?.unit_price || 0;
                      const diff = originalUnitPrice > 0 ? ((item.unit_price - originalUnitPrice) / originalUnitPrice * 100) : 0;
                      
                      return (
                        <tr key={idx} className={`border-b hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? 'bg-muted/10' : ''}`}>
                          <td className="px-3 py-2 font-medium">{items[idx]?.item_number || idx + 1}</td>
                          <td className="px-3 py-2 max-w-[200px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block cursor-help">{item.item_description?.substring(0, 40)}{item.item_description?.length > 40 ? '...' : ''}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm">
                                <p className="text-xs">{item.item_description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-3 py-2">{formatNumber(quantity)}</td>
                          <td className="px-3 py-2">{formatNumber(item.unit_price)} {currency}</td>
                          <td className="px-3 py-2 font-semibold text-primary">{formatNumber(item.total_cost)} {currency}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">{laborPercentage}%</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">{indirectPercentage}%</Badge>
                          </td>
                          <td className="px-3 py-2">
                            {originalUnitPrice > 0 && (
                              <Badge variant="outline" className={diff > 0 ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 font-semibold">
                      <td colSpan={4} className="px-3 py-2 text-right">{t('المجموع الكلي', 'Grand Total')}</td>
                      <td className="px-3 py-2 text-primary">{formatNumber(displayResult.summary?.grand_total || 0)} {currency}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          {displayResult.summary?.grand_total > 0 
                            ? ((displayResult.summary?.total_labor || 0) / displayResult.summary?.grand_total * 100).toFixed(1) : '0'}%
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                          {displayResult.summary?.grand_total > 0 
                            ? ((displayResult.summary?.total_indirect_costs || 0) / displayResult.summary?.grand_total * 100).toFixed(1) : '0'}%
                        </Badge>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{t('تفاصيل البنود', 'Item Details')}</span>
                <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors">
                  {t('اضغط للتعديل', 'Click to edit values')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {displayResult.cost_analysis?.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedItem === idx ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setSelectedItem(selectedItem === idx ? null : idx)}
                    >
                      <div>
                        <h4 className="font-medium">{item.item_description}</h4>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {t('مباشرة', 'Direct')}: {formatNumber(item.total_direct)} {currency}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {t('غير مباشرة', 'Indirect')}: {formatNumber(item.total_indirect)} {currency}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-left flex items-center gap-3">
                        <div>
                          <p className="font-bold text-primary">
                            {formatNumber(item.total_cost)} {currency}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('سعر الوحدة', 'Unit Price')}: {formatNumber(item.unit_price)}
                          </p>
                        </div>
                        {editingItem !== idx ? (
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditItem(idx); }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSaveItem(idx); }}>
                              <Save className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}>
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedItem === idx && (
                      <div className="mt-4 pt-4 border-t space-y-4 animate-slide-up">
                        {/* Materials */}
                        {item.materials?.items?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Package className="w-4 h-4 text-blue-500" />
                              {t('المواد', 'Materials')}
                            </h5>
                            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                              {item.materials.items.map((mat, midx) => (
                                <div key={midx} className="flex justify-between items-center text-sm gap-2">
                                  <span className="flex-1">{mat.name}</span>
                                  {editingItem === idx ? (
                                    <>
                                      <Input type="number" value={mat.quantity} onChange={(e) => updateMaterialItem(idx, midx, 'quantity', parseFloat(e.target.value) || 0)} className="w-20 h-8 text-xs" />
                                      <span className="text-xs text-muted-foreground">{mat.unit} ×</span>
                                      <Input type="number" value={mat.unit_price} onChange={(e) => updateMaterialItem(idx, midx, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24 h-8 text-xs" />
                                      <span className="w-24 text-right font-medium">{formatNumber(mat.total)} {currency}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-muted-foreground">({mat.quantity} {mat.unit} × {mat.unit_price})</span>
                                      <span>{formatNumber(mat.total)} {currency}</span>
                                    </>
                                  )}
                                </div>
                              ))}
                              <div className="border-t pt-2 font-medium flex justify-between">
                                <span>{t('إجمالي المواد', 'Total Materials')}</span>
                                <span>{formatNumber(item.materials.total)} {currency}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Labor */}
                        {item.labor?.items?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Users className="w-4 h-4 text-green-500" />
                              {t('العمالة', 'Labor')}
                            </h5>
                            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                              {item.labor.items.map((lab, lidx) => (
                                <div key={lidx} className="flex justify-between items-center text-sm gap-2">
                                  <span className="flex-1">{lab.role}</span>
                                  {editingItem === idx ? (
                                    <>
                                      <Input type="number" value={lab.hours} onChange={(e) => updateLaborItem(idx, lidx, 'hours', parseFloat(e.target.value) || 0)} className="w-20 h-8 text-xs" />
                                      <span className="text-xs text-muted-foreground">{t('ساعة', 'hrs')} ×</span>
                                      <Input type="number" value={lab.hourly_rate} onChange={(e) => updateLaborItem(idx, lidx, 'hourly_rate', parseFloat(e.target.value) || 0)} className="w-24 h-8 text-xs" />
                                      <span className="w-24 text-right font-medium">{formatNumber(lab.total)} {currency}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-muted-foreground">({lab.hours} {t('ساعة', 'hrs')} × {lab.hourly_rate})</span>
                                      <span>{formatNumber(lab.total)} {currency}</span>
                                    </>
                                  )}
                                </div>
                              ))}
                              <div className="border-t pt-2 font-medium flex justify-between">
                                <span>{t('إجمالي العمالة', 'Total Labor')}</span>
                                <span>{formatNumber(item.labor.total)} {currency}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Indirect Costs */}
                        <div>
                          <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-500" />
                            {t('التكاليف غير المباشرة', 'Indirect Costs')}
                          </h5>
                          <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
                            {[
                              { label: t('مصاريف عمومية', 'Overhead'), field: 'overhead' },
                              { label: t('إدارية', 'Admin'), field: 'admin' },
                              { label: t('تأمين', 'Insurance'), field: 'insurance' },
                              { label: t('احتياطي', 'Contingency'), field: 'contingency' },
                            ].map(({ label, field }) => (
                              <div key={field} className="flex justify-between items-center gap-2">
                                <span>{label}</span>
                                {editingItem === idx ? (
                                  <Input type="number" value={(item as any)[field] || 0} onChange={(e) => updateIndirectCost(idx, field, parseFloat(e.target.value) || 0)} className="w-28 h-8 text-xs" />
                                ) : (
                                  <span>{formatNumber((item as any)[field])} {currency}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Profit Margin */}
                        <div>
                          <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-500" />
                            {t('هامش الربح', 'Profit Margin')}
                          </h5>
                          <div className="bg-muted/50 rounded-lg p-3">
                            <div className="flex justify-between items-center gap-2">
                              <span>{t('النسبة (%)', 'Margin (%)')}</span>
                              {editingItem === idx ? (
                                <Input type="number" value={item.profit_margin || 10} onChange={(e) => updateIndirectCost(idx, 'profit_margin', parseFloat(e.target.value) || 0)} className="w-28 h-8 text-xs" />
                              ) : (
                                <span>{item.profit_margin || 10}%</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Recommendations */}
                        {item.recommendations?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              {t('التوصيات', 'Recommendations')}
                            </h5>
                            <ul className="bg-amber-500/10 rounded-lg p-3 space-y-2">
                              {item.recommendations.map((rec, ridx) => (
                                <li key={ridx} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                                  {getRecIcon(rec)}
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          {displayResult.summary?.key_insights?.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {t(`رؤى الذكاء الاصطناعي (${displayResult.ai_provider})`, `AI Insights (${displayResult.ai_provider})`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {displayResult.summary.key_insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!displayResult && !isAnalyzing && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Calculator className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">{t("لا يوجد تحليل تكاليف بعد", "No Cost Analysis Yet")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("قم بتشغيل تحليل التكاليف للحصول على تفصيل دقيق لكل بند", "Run cost analysis to get detailed breakdown for each BOQ item")}
            </p>
            <Button onClick={runCostAnalysis} disabled={!items?.length}>
              {t("بدء التحليل", "Start Analysis")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

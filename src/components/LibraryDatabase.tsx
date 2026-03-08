import { useState, lazy, Suspense, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Package, Users, Truck, Database, Loader2, Droplets, Wrench, BarChart3, PackagePlus, Trash2, Download, Lightbulb, Mountain, Languages, FileDown, ChevronRight, DollarSign, TrendingUp, ArrowRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { MaterialsTab } from "./library/MaterialsTab";
import { LaborTab } from "./library/LaborTab";
import { EquipmentTab } from "./library/EquipmentTab";
const LibraryQuotationReport = lazy(() => import("./library/LibraryQuotationReport").then(m => ({ default: m.LibraryQuotationReport })));
import { useMaterialPrices } from "@/hooks/useMaterialPrices";
import { useLaborRates } from "@/hooks/useLaborRates";
import { useEquipmentRates } from "@/hooks/useEquipmentRates";
import { useSampleLibraryData } from "@/hooks/useSampleLibraryData";
import { PriceValiditySummary } from "./library/PriceValiditySummary";
import { getValidityStats } from "./library/PriceValidityIndicator";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const LibraryDatabase = () => {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const { materials, refreshMaterials } = useMaterialPrices();
  const { laborRates, refreshLaborRates } = useLaborRates();
  const { equipmentRates, refreshEquipmentRates } = useEquipmentRates();
  const { addAllSampleData, addWaterSewageMaterials, addNetworkLaborEquipment, addAllNetworkData, checkExistingNetworkMaterials, deleteAllSampleData, deleteNetworkDataOnly, addEarthworksAsphaltMaterials, checkExistingEarthworksMaterials, sampleCounts } = useSampleLibraryData();
  const [isAddingSampleData, setIsAddingSampleData] = useState(false);
  const [isAddingNetworkData, setIsAddingNetworkData] = useState(false);
  const [isAddingNetworkLE, setIsAddingNetworkLE] = useState(false);
  const [isAddingAllNetwork, setIsAddingAllNetwork] = useState(false);
  const [isAddingEarthworks, setIsAddingEarthworks] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState<number | null>(null);
  const [validityFilter, setValidityFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("materials");
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  const isAnyLoading = isAddingSampleData || isAddingNetworkData || isAddingNetworkLE || isAddingAllNetwork || isDeletingAll || isAddingEarthworks;

  const handleAddSampleData = useCallback(async () => {
    setIsAddingSampleData(true);
    const success = await addAllSampleData();
    if (success) {
      await Promise.all([refreshMaterials(), refreshLaborRates(), refreshEquipmentRates()]);
    }
    setIsAddingSampleData(false);
  }, [addAllSampleData, refreshMaterials, refreshLaborRates, refreshEquipmentRates]);

  const handleCheckAndAddNetworkData = useCallback(async () => {
    const existing = await checkExistingNetworkMaterials();
    setDuplicateCount(existing);
  }, [checkExistingNetworkMaterials]);

  const handleAddNetworkData = useCallback(async () => {
    setIsAddingNetworkData(true);
    setShowProgress(true);
    setProgress(0);
    const success = await addWaterSewageMaterials((p) => setProgress(p));
    if (success) {
      toast.success(isArabic ? `تم إضافة ${sampleCounts.waterSewage} مادة شبكات` : `Added ${sampleCounts.waterSewage} network materials`);
      await refreshMaterials();
    } else {
      toast.error(isArabic ? "فشل في إضافة مواد الشبكات" : "Failed to add network materials");
    }
    setIsAddingNetworkData(false);
    setShowProgress(false);
    setProgress(0);
    setDuplicateCount(null);
  }, [addWaterSewageMaterials, refreshMaterials, isArabic, sampleCounts.waterSewage]);

  const handleAddNetworkLE = useCallback(async () => {
    setIsAddingNetworkLE(true);
    setShowProgress(true);
    setProgress(0);
    const success = await addNetworkLaborEquipment((p) => setProgress(p));
    if (success) {
      await Promise.all([refreshLaborRates(), refreshEquipmentRates()]);
    }
    setIsAddingNetworkLE(false);
    setShowProgress(false);
    setProgress(0);
  }, [addNetworkLaborEquipment, refreshLaborRates, refreshEquipmentRates]);

  const handleAddAllNetworkData = useCallback(async () => {
    setIsAddingAllNetwork(true);
    setShowProgress(true);
    setProgress(0);
    const success = await addAllNetworkData((p) => setProgress(p));
    if (success) {
      toast.success(isArabic 
        ? `تم إضافة ${sampleCounts.waterSewage} مادة + ${sampleCounts.networkLabor} عمالة + ${sampleCounts.networkEquipment} معدة`
        : `Added ${sampleCounts.waterSewage} materials + ${sampleCounts.networkLabor} labor + ${sampleCounts.networkEquipment} equipment`
      );
      await Promise.all([refreshMaterials(), refreshLaborRates(), refreshEquipmentRates()]);
    } else {
      toast.error(isArabic ? "فشل في إضافة بيانات الشبكات" : "Failed to add network data");
    }
    setIsAddingAllNetwork(false);
    setShowProgress(false);
    setProgress(0);
  }, [addAllNetworkData, refreshMaterials, refreshLaborRates, refreshEquipmentRates, isArabic, sampleCounts]);

  const handleDeleteAllData = useCallback(async () => {
    setIsDeletingAll(true);
    const success = await deleteAllSampleData();
    if (success) {
      await Promise.all([refreshMaterials(), refreshLaborRates(), refreshEquipmentRates()]);
    }
    setIsDeletingAll(false);
  }, [deleteAllSampleData, refreshMaterials, refreshLaborRates, refreshEquipmentRates]);

  const handleExportLibrary = useCallback(async () => {
    setIsExporting(true);
    try {
      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');
      const workbook = new ExcelJS.Workbook();

      // Materials sheet
      const matSheet = workbook.addWorksheet(isArabic ? 'المواد' : 'Materials');
      matSheet.columns = [
        { header: isArabic ? 'الاسم' : 'Name', key: 'name', width: 30 },
        { header: isArabic ? 'الاسم العربي' : 'Arabic Name', key: 'name_ar', width: 30 },
        { header: isArabic ? 'الفئة' : 'Category', key: 'category', width: 15 },
        { header: isArabic ? 'الوحدة' : 'Unit', key: 'unit', width: 10 },
        { header: isArabic ? 'السعر' : 'Price', key: 'unit_price', width: 12 },
        { header: isArabic ? 'العملة' : 'Currency', key: 'currency', width: 10 },
        { header: isArabic ? 'المورد' : 'Supplier', key: 'supplier_name', width: 20 },
        { header: isArabic ? 'العلامة' : 'Brand', key: 'brand', width: 15 },
        { header: isArabic ? 'تاريخ السعر' : 'Price Date', key: 'price_date', width: 12 },
        { header: isArabic ? 'صالح حتى' : 'Valid Until', key: 'valid_until', width: 12 },
      ];
      materials.forEach(m => matSheet.addRow(m));
      // Style header
      matSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      });
      matSheet.addRow([]);
      matSheet.addRow([isArabic ? 'المجموع' : 'Total', '', '', '', materials.reduce((s, m) => s + (m.unit_price || 0), 0)]);

      // Labor sheet
      const labSheet = workbook.addWorksheet(isArabic ? 'العمالة' : 'Labor');
      labSheet.columns = [
        { header: isArabic ? 'الكود' : 'Code', key: 'code', width: 10 },
        { header: isArabic ? 'الاسم' : 'Name', key: 'name', width: 25 },
        { header: isArabic ? 'الاسم العربي' : 'Arabic Name', key: 'name_ar', width: 25 },
        { header: isArabic ? 'الفئة' : 'Category', key: 'category', width: 15 },
        { header: isArabic ? 'المعدل اليومي' : 'Daily Rate', key: 'unit_rate', width: 12 },
        { header: isArabic ? 'المعدل بالساعة' : 'Hourly Rate', key: 'hourly_rate', width: 12 },
        { header: isArabic ? 'مستوى المهارة' : 'Skill Level', key: 'skill_level', width: 12 },
      ];
      laborRates.forEach(l => labSheet.addRow(l));
      labSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
      });

      // Equipment sheet
      const eqSheet = workbook.addWorksheet(isArabic ? 'المعدات' : 'Equipment');
      eqSheet.columns = [
        { header: isArabic ? 'الكود' : 'Code', key: 'code', width: 10 },
        { header: isArabic ? 'الاسم' : 'Name', key: 'name', width: 25 },
        { header: isArabic ? 'الاسم العربي' : 'Arabic Name', key: 'name_ar', width: 25 },
        { header: isArabic ? 'الفئة' : 'Category', key: 'category', width: 15 },
        { header: isArabic ? 'معدل الإيجار' : 'Rental Rate', key: 'rental_rate', width: 12 },
        { header: isArabic ? 'يشمل مشغل' : 'Incl. Operator', key: 'includes_operator', width: 12 },
        { header: isArabic ? 'يشمل وقود' : 'Incl. Fuel', key: 'includes_fuel', width: 12 },
      ];
      equipmentRates.forEach(e => eqSheet.addRow({
        ...e,
        includes_operator: e.includes_operator ? (isArabic ? 'نعم' : 'Yes') : (isArabic ? 'لا' : 'No'),
        includes_fuel: e.includes_fuel ? (isArabic ? 'نعم' : 'Yes') : (isArabic ? 'لا' : 'No'),
      }));
      eqSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
      });

      // Apply RTL for Arabic name columns
      [matSheet, labSheet, eqSheet].forEach(sheet => {
        sheet.getColumn('name_ar').alignment = { horizontal: 'right', readingOrder: 2 as any };
        sheet.getColumn('name_ar').font = { name: 'Arial' };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const date = new Date().toISOString().split('T')[0];
      saveAs(new Blob([buffer]), `Library_Export_${date}.xlsx`);
      toast.success(isArabic ? 'تم تصدير المكتبة بنجاح' : 'Library exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(isArabic ? 'فشل في تصدير المكتبة' : 'Failed to export library');
    }
    setIsExporting(false);
  }, [materials, laborRates, equipmentRates, isArabic]);

  const handleAddEarthworksData = useCallback(async () => {
    setIsAddingEarthworks(true);
    setShowProgress(true);
    setProgress(0);
    const success = await addEarthworksAsphaltMaterials((p) => setProgress(p));
    if (success) {
      toast.success(isArabic ? `تم إضافة ${sampleCounts.earthworksAsphalt} مادة حفر وأسفلت` : `Added ${sampleCounts.earthworksAsphalt} earthworks & asphalt materials`);
      await refreshMaterials();
    } else {
      toast.error(isArabic ? "فشل في إضافة مواد الحفر والأسفلت" : "Failed to add earthworks materials");
    }
    setIsAddingEarthworks(false);
    setShowProgress(false);
    setProgress(0);
  }, [addEarthworksAsphaltMaterials, refreshMaterials, isArabic, sampleCounts.earthworksAsphalt]);

  const currentTabData = useMemo(() => {
    switch (activeTab) {
      case "materials": return materials.map(m => ({ price_date: m.price_date, valid_until: m.valid_until }));
      case "labor": return laborRates.map(l => ({ price_date: l.price_date, valid_until: l.valid_until }));
      case "equipment": return equipmentRates.map(e => ({ price_date: e.price_date, valid_until: e.valid_until }));
      default: return [];
    }
  }, [activeTab, materials, laborRates, equipmentRates]);

  // All data for cross-tab suggestions
  const allLibraryData = useMemo(() => [
    ...materials.map(m => ({ price_date: m.price_date, valid_until: m.valid_until })),
    ...laborRates.map(l => ({ price_date: l.price_date, valid_until: l.valid_until })),
    ...equipmentRates.map(e => ({ price_date: e.price_date, valid_until: e.valid_until })),
  ], [materials, laborRates, equipmentRates]);

  const validityStats = getValidityStats(currentTabData);
  const totalItems = materials.length + laborRates.length + equipmentRates.length;
  const showEmptyState = totalItems === 0;

  // Smart suggestions engine
  const smartSuggestions = useMemo(() => {
    const suggestions: { id: string; icon: React.ReactNode; text: string; action: () => void; actionLabel: string; priority: number }[] = [];
    
    // Check if earthworks/asphalt materials exist
    const hasEarthworks = materials.some(m => ['earthworks', 'asphalt', 'road_base', 'road_accessories', 'concrete_works', 'safety_temporary'].includes(m.category));
    if (!hasEarthworks && materials.length > 0) {
      suggestions.push({
        id: 'add_earthworks',
        icon: <Mountain className="h-4 w-4" />,
        text: isArabic ? `أضف مواد الأعمال الترابية والأسفلت (${sampleCounts.earthworksAsphalt} مادة)` : `Add earthworks & asphalt materials (${sampleCounts.earthworksAsphalt} items)`,
        action: handleAddEarthworksData,
        actionLabel: isArabic ? 'إضافة' : 'Add',
        priority: 1,
      });
    }

    // Check if network materials exist but no labor/equipment
    const hasNetworkMaterials = materials.some(m => ['pipes_pvc', 'pipes_hdpe', 'pipes_di', 'pipes_grp'].includes(m.category));
    if (hasNetworkMaterials && laborRates.length === 0 && equipmentRates.length === 0) {
      suggestions.push({
        id: 'add_network_le',
        icon: <Wrench className="h-4 w-4" />,
        text: isArabic ? 'أضف عمالة ومعدات الشبكات المتخصصة' : 'Add specialized network labor & equipment',
        action: handleAddNetworkLE,
        actionLabel: isArabic ? 'إضافة' : 'Add',
        priority: 2,
      });
    }

    // Check expired prices
    if (totalItems > 0) {
      const allData = getCurrentTabData();
      const stats = getValidityStats(allData);
      const expiredPct = allData.length > 0 ? (stats.expired / allData.length) * 100 : 0;
      if (expiredPct > 30) {
        suggestions.push({
          id: 'expired_prices',
          icon: <Lightbulb className="h-4 w-4" />,
          text: isArabic ? `${stats.expired} سعر منتهي الصلاحية (${Math.round(expiredPct)}%) — حدّث الأسعار` : `${stats.expired} expired prices (${Math.round(expiredPct)}%) — update prices`,
          action: () => setValidityFilter('expired'),
          actionLabel: isArabic ? 'عرض المنتهية' : 'Show Expired',
          priority: 3,
        });
      }
    }

    // Check missing Arabic names
    const missingArabic = materials.filter(m => !m.name_ar || m.name_ar.trim() === '').length;
    if (missingArabic > 5) {
      suggestions.push({
        id: 'missing_arabic',
        icon: <Languages className="h-4 w-4" />,
        text: isArabic ? `${missingArabic} مادة بدون اسم عربي — أكمل الترجمة` : `${missingArabic} materials without Arabic name — complete translation`,
        action: () => { setActiveTab('materials'); },
        actionLabel: isArabic ? 'عرض' : 'View',
        priority: 5,
      });
    }

    // No suppliers linked
    const hasSuppliers = materials.some(m => m.supplier_name && m.supplier_name.trim() !== '');
    if (materials.length > 10 && !hasSuppliers) {
      suggestions.push({
        id: 'no_suppliers',
        icon: <Users className="h-4 w-4" />,
        text: isArabic ? 'أضف موردين لتحسين مقارنات الأسعار' : 'Add suppliers to improve price comparisons',
        action: () => navigate('/procurement'),
        actionLabel: isArabic ? 'الموردين' : 'Partners',
        priority: 4,
      });
    }

    // Library is complete — suggest export
    if (totalItems > 50 && suggestions.length === 0) {
      suggestions.push({
        id: 'export_backup',
        icon: <FileDown className="h-4 w-4" />,
        text: isArabic ? 'المكتبة جاهزة! صدّر نسخة احتياطية بصيغة Excel' : 'Library is ready! Export a backup in Excel format',
        action: handleExportLibrary,
        actionLabel: isArabic ? 'تصدير' : 'Export',
        priority: 10,
      });
    }

    return suggestions
      .filter(s => !dismissedSuggestions.includes(s.id))
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);
  }, [materials, laborRates, equipmentRates, totalItems, isArabic, sampleCounts.earthworksAsphalt, dismissedSuggestions, handleAddEarthworksData, handleAddNetworkLE, handleExportLibrary, navigate, activeTab]);

  const ProgressBar = () => showProgress ? (
    <div className="mt-3 space-y-1">
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-muted-foreground text-center">{progress}%</p>
    </div>
  ) : null;

  const DuplicateWarning = () => duplicateCount && duplicateCount > 0 ? (
    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm text-yellow-700 dark:text-yellow-400">
      {isArabic 
        ? `⚠️ يوجد ${duplicateCount} مادة شبكات موجودة بالفعل. سيتم إضافة نسخ جديدة.`
        : `⚠️ ${duplicateCount} network materials already exist. New copies will be added.`
      }
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {/* Smart Suggestions */}
      {!showEmptyState && smartSuggestions.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Lightbulb className="h-4 w-4" />
            {isArabic ? 'اقتراحات وتوصيات' : 'Suggestions & Recommendations'}
          </div>
          <div className="space-y-2">
            {smartSuggestions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 bg-background/80 rounded-md p-2.5 border border-border/50">
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  <span className="text-primary">{s.icon}</span>
                  {s.text}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={s.action} disabled={isAnyLoading}>
                    {s.actionLabel}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setDismissedSuggestions(prev => [...prev, s.id])}>
                    ✕
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showEmptyState && (
        <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed rounded-lg bg-muted/30">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{isArabic ? "المكتبة فارغة" : "Library is Empty"}</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            {isArabic ? "أضف بيانات تجريبية للبدء في استخدام المكتبة، أو قم باستيراد بياناتك من ملف Excel." : "Add sample data to start using the library, or import your own data from an Excel file."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="gap-2" disabled={isAnyLoading}>
                  {isAddingSampleData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  {isAddingSampleData ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "إضافة بيانات تجريبية" : "Add Sample Data")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isArabic ? "إضافة بيانات تجريبية" : "Add Sample Data"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isArabic ? "سيتم إضافة البيانات التجريبية التالية:" : "The following sample data will be added:"}
                  </AlertDialogDescription>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>{sampleCounts.materials} {isArabic ? "مادة" : "Materials"}</li>
                    <li>{sampleCounts.labor} {isArabic ? "حرفة" : "Labor roles"}</li>
                    <li>{sampleCounts.equipment} {isArabic ? "معدة" : "Equipment"}</li>
                  </ul>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAddSampleData}>{isArabic ? "إضافة" : "Add"}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog onOpenChange={(open) => { if (open) handleCheckAndAddNetworkData(); else setDuplicateCount(null); }}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={isAnyLoading}>
                  {isAddingNetworkData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
                  {isAddingNetworkData ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? `إضافة مواد الشبكات (${sampleCounts.waterSewage})` : `Add Network Materials (${sampleCounts.waterSewage})`)}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isArabic ? "إضافة مواد شبكات المياه والصرف الصحي" : "Add Water & Sewage Network Materials"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isArabic ? `سيتم إضافة ${sampleCounts.waterSewage} مادة تشمل:` : `${sampleCounts.waterSewage} materials will be added including:`}
                  </AlertDialogDescription>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>{isArabic ? "مواسير uPVC, HDPE, DI, GRP" : "uPVC, HDPE, DI, GRP Pipes"}</li>
                    <li>{isArabic ? "محابس ووصلات" : "Valves & Fittings"}</li>
                    <li>{isArabic ? "غرف تفتيش ومضخات" : "Manholes & Pumps"}</li>
                  </ul>
                  <DuplicateWarning />
                  <ProgressBar />
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isAddingNetworkData}>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAddNetworkData} disabled={isAddingNetworkData}>
                    {isAddingNetworkData ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "إضافة" : "Add")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={isAnyLoading}>
                  {isAddingNetworkLE ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                  {isAddingNetworkLE ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "عمالة ومعدات الشبكات" : "Network Labor & Equipment")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isArabic ? "إضافة عمالة ومعدات شبكات" : "Add Network Labor & Equipment"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isArabic ? "سيتم إضافة:" : "Will be added:"}
                  </AlertDialogDescription>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>{sampleCounts.networkLabor} {isArabic ? "عمالة متخصصة (فني مواسير، لحام، غواص...)" : "Specialized labor (pipe fitter, welder, diver...)"}</li>
                    <li>{sampleCounts.networkEquipment} {isArabic ? "معدة متخصصة (لحام HDPE، نزح مياه، CCTV...)" : "Specialized equipment (HDPE fusion, dewatering, CCTV...)"}</li>
                  </ul>
                  <ProgressBar />
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isAddingNetworkLE}>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAddNetworkLE} disabled={isAddingNetworkLE}>
                    {isAddingNetworkLE ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "إضافة" : "Add")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Combined Add All Network Data Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" className="gap-2" disabled={isAnyLoading}>
                  {isAddingAllNetwork ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                  {isAddingAllNetwork ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "إضافة جميع بيانات الشبكات" : "Add All Network Data")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isArabic ? "إضافة جميع بيانات الشبكات" : "Add All Network Data"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isArabic ? "سيتم إضافة جميع البيانات التالية دفعة واحدة:" : "All the following data will be added at once:"}
                  </AlertDialogDescription>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>{sampleCounts.waterSewage} {isArabic ? "مادة شبكات" : "Network materials"}</li>
                    <li>{sampleCounts.networkLabor} {isArabic ? "عمالة متخصصة" : "Specialized labor"}</li>
                    <li>{sampleCounts.networkEquipment} {isArabic ? "معدة متخصصة" : "Specialized equipment"}</li>
                  </ul>
                  <div className="mt-2 p-2 bg-muted rounded text-sm font-medium text-center">
                    {isArabic ? `المجموع: ${sampleCounts.waterSewage + sampleCounts.networkLabor + sampleCounts.networkEquipment} عنصر` : `Total: ${sampleCounts.waterSewage + sampleCounts.networkLabor + sampleCounts.networkEquipment} items`}
                  </div>
                  <ProgressBar />
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isAddingAllNetwork}>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAddAllNetworkData} disabled={isAddingAllNetwork}>
                    {isAddingAllNetwork ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "إضافة الكل" : "Add All")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Contextual add buttons when library is not empty */}
      {!showEmptyState && (
        <div className="flex justify-end gap-2 flex-wrap">
          {/* Delete All Data */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2" disabled={isAnyLoading}>
                {isDeletingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isDeletingAll ? (isArabic ? "جاري الحذف..." : "Deleting...") : (isArabic ? "حذف جميع البيانات" : "Delete All Data")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{isArabic ? "⚠️ حذف جميع البيانات" : "⚠️ Delete All Data"}</AlertDialogTitle>
                <AlertDialogDescription>
                  {isArabic ? "هل أنت متأكد؟ سيتم حذف جميع البيانات التالية نهائياً:" : "Are you sure? The following data will be permanently deleted:"}
                </AlertDialogDescription>
                <ul className="list-disc list-inside text-sm text-destructive font-medium">
                  <li>{materials.length} {isArabic ? "مادة" : "Materials"}</li>
                  <li>{laborRates.length} {isArabic ? "عمالة" : "Labor"}</li>
                  <li>{equipmentRates.length} {isArabic ? "معدة" : "Equipment"}</li>
                </ul>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isArabic ? "حذف الكل" : "Delete All"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Export Library */}
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportLibrary} disabled={isAnyLoading || isExporting || totalItems === 0}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? (isArabic ? "جاري التصدير..." : "Exporting...") : (isArabic ? "تصدير المكتبة" : "Export Library")}
          </Button>
          {activeTab === "materials" && (
            <AlertDialog onOpenChange={(open) => { if (open) handleCheckAndAddNetworkData(); else setDuplicateCount(null); }}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" disabled={isAnyLoading}>
                  {isAddingNetworkData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
                  {isAddingNetworkData ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? `إضافة مواد الشبكات (${sampleCounts.waterSewage})` : `Add Network Materials (${sampleCounts.waterSewage})`)}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isArabic ? "إضافة مواد شبكات" : "Add Network Materials"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isArabic ? `سيتم إضافة ${sampleCounts.waterSewage} مادة متخصصة.` : `${sampleCounts.waterSewage} specialized materials will be added.`}
                  </AlertDialogDescription>
                  <DuplicateWarning />
                  <ProgressBar />
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isAddingNetworkData}>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAddNetworkData} disabled={isAddingNetworkData}>
                    {isAddingNetworkData ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "إضافة" : "Add")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {activeTab === "materials" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" disabled={isAnyLoading}>
                  {isAddingEarthworks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mountain className="h-4 w-4" />}
                  {isAddingEarthworks ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? `مواد الحفر والأسفلت (${sampleCounts.earthworksAsphalt})` : `Earthworks & Asphalt (${sampleCounts.earthworksAsphalt})`)}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isArabic ? "إضافة مواد الأعمال الترابية والأسفلت" : "Add Earthworks & Asphalt Materials"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isArabic ? `سيتم إضافة ${sampleCounts.earthworksAsphalt} مادة تشمل:` : `${sampleCounts.earthworksAsphalt} materials will be added including:`}
                  </AlertDialogDescription>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>{isArabic ? "أعمال ترابية (حفر، ردم، فرشة)" : "Earthworks (trenching, backfill, bedding)"}</li>
                    <li>{isArabic ? "أسفلت ورصف (طبقات سطحية، رابطة، أساسية)" : "Asphalt (wearing, binder, base courses)"}</li>
                    <li>{isArabic ? "طبقات أساس طرق ومجروشات" : "Road base layers & aggregates"}</li>
                    <li>{isArabic ? "ملحقات طرق (أرصفة، حواجز، إنارة)" : "Road accessories (curbs, barriers, lighting)"}</li>
                    <li>{isArabic ? "أعمال خرسانية وسلامة مؤقتة" : "Concrete works & temporary safety"}</li>
                  </ul>
                  <ProgressBar />
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isAddingEarthworks}>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAddEarthworksData} disabled={isAddingEarthworks}>
                    {isAddingEarthworks ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "إضافة" : "Add")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {(activeTab === "labor" || activeTab === "equipment") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" disabled={isAnyLoading}>
                  {isAddingNetworkLE ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                  {isAddingNetworkLE ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "عمالة ومعدات الشبكات" : "Network Labor & Equipment")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isArabic ? "إضافة عمالة ومعدات شبكات" : "Add Network Labor & Equipment"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isArabic 
                      ? `سيتم إضافة ${sampleCounts.networkLabor} عمالة و ${sampleCounts.networkEquipment} معدة متخصصة.`
                      : `${sampleCounts.networkLabor} labor roles and ${sampleCounts.networkEquipment} equipment items will be added.`
                    }
                  </AlertDialogDescription>
                  <ProgressBar />
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isAddingNetworkLE}>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAddNetworkLE} disabled={isAddingNetworkLE}>
                    {isAddingNetworkLE ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "إضافة" : "Add")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {/* Add All Network Data - always visible */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" disabled={isAnyLoading}>
                {isAddingAllNetwork ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                {isAddingAllNetwork ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "إضافة جميع بيانات الشبكات" : "Add All Network Data")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{isArabic ? "إضافة جميع بيانات الشبكات" : "Add All Network Data"}</AlertDialogTitle>
                <AlertDialogDescription>
                  {isArabic ? "سيتم إضافة:" : "Will be added:"}
                </AlertDialogDescription>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  <li>{sampleCounts.waterSewage} {isArabic ? "مادة" : "Materials"}</li>
                  <li>{sampleCounts.networkLabor} {isArabic ? "عمالة" : "Labor"}</li>
                  <li>{sampleCounts.networkEquipment} {isArabic ? "معدة" : "Equipment"}</li>
                </ul>
                <ProgressBar />
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isAddingAllNetwork}>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                <AlertDialogAction onClick={handleAddAllNetworkData} disabled={isAddingAllNetwork}>
                  {isAddingAllNetwork ? (isArabic ? "جاري الإضافة..." : "Adding...") : (isArabic ? "إضافة الكل" : "Add All")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} dir={isArabic ? "rtl" : "ltr"}>
        <TabsList className="grid w-full grid-cols-4 h-12 tabs-navigation-safe">
          <TabsTrigger value="materials" className="gap-2 text-sm">
            <Package className="h-4 w-4" />
            {isArabic ? "المواد" : "Materials"}
            {materials.length > 0 && <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">{materials.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="labor" className="gap-2 text-sm">
            <Users className="h-4 w-4" />
            {isArabic ? "العمالة" : "Labor"}
            {laborRates.length > 0 && <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">{laborRates.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2 text-sm">
            <Truck className="h-4 w-4" />
            {isArabic ? "المعدات" : "Equipment"}
            {equipmentRates.length > 0 && <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">{equipmentRates.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-2 text-sm">
            <BarChart3 className="h-4 w-4" />
            {isArabic ? "مقارنة العروض" : "Comparison"}
          </TabsTrigger>
        </TabsList>

        {activeTab !== 'comparison' && getCurrentTabData().length > 0 && (
          <div className="mt-4">
            <PriceValiditySummary stats={validityStats} onFilterChange={setValidityFilter} activeFilter={validityFilter} />
          </div>
        )}

        <TabsContent value="materials" className="mt-4"><MaterialsTab validityFilter={validityFilter} /></TabsContent>
        <TabsContent value="labor" className="mt-4"><LaborTab validityFilter={validityFilter} /></TabsContent>
        <TabsContent value="equipment" className="mt-4"><EquipmentTab validityFilter={validityFilter} /></TabsContent>
        <TabsContent value="comparison" className="mt-4">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <LibraryQuotationReport />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};
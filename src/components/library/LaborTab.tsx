import { useState, useMemo, useCallback, useDeferredValue, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Download, Search, Trash2, Edit2, Check, X, Users, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useLaborRates, LABOR_CATEGORIES, LABOR_UNITS, SKILL_LEVELS, CURRENCIES } from "@/hooks/useLaborRates";
import { useLanguage } from "@/hooks/useLanguage";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PriceValidityIndicator, getValidityStatus } from "./PriceValidityIndicator";
import { toast } from "sonner";

const getLaborCategoryBadgeColor = (category?: string) => {
  if (!category) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  if (['pipe_fitter', 'diver'].includes(category)) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (['supervisor', 'engineer', 'foreman', 'safety_officer', 'surveyor'].includes(category)) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (['operator', 'driver', 'technician'].includes(category)) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  if (['mason', 'carpenter', 'electrician', 'plumber', 'painter', 'welder', 'insulator'].includes(category)) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
};

const ITEMS_PER_PAGE = 25;

const LABOR_CATEGORY_GROUPS = [
  { label: 'عام', label_en: 'General', categories: ['general', 'helper', 'other'] },
  { label: 'حرف أساسية', label_en: 'Core Trades', categories: ['mason', 'carpenter', 'electrician', 'plumber', 'painter', 'welder', 'insulator'] },
  { label: 'شبكات ومواسير', label_en: 'Networks & Pipes', categories: ['pipe_fitter', 'diver'] },
  { label: 'إشراف وهندسة', label_en: 'Management', categories: ['supervisor', 'engineer', 'foreman', 'safety_officer', 'surveyor'] },
  { label: 'تشغيل ونقل', label_en: 'Operations', categories: ['operator', 'driver', 'technician'] },
];

interface LaborTabProps {
  validityFilter?: string | null;
}

export const LaborTab = memo(function LaborTab({ validityFilter }: LaborTabProps) {
  const { isArabic } = useLanguage();
  const { laborRates, loading, addLaborRate, updateLaborRate, deleteLaborRate, importFromExcel, calculateHourlyRate } = useLaborRates();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState({
    code: "", name: "", name_ar: "", category: "general", skill_level: "skilled",
    unit: "day", unit_rate: "", currency: "SAR", working_hours_per_day: "8", hourly_rate: "0", overtime_percentage: "0",
  });

  // Inline editing
  const startEdit = useCallback((labor: any) => {
    setEditingId(labor.id);
    setEditData({ name: labor.name, unit_rate: labor.unit_rate, skill_level: labor.skill_level || 'skilled' });
  }, []);
  const cancelEdit = useCallback(() => { setEditingId(null); setEditData({}); }, []);
  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    try {
      await updateLaborRate(editingId, { ...editData, unit_rate: parseFloat(editData.unit_rate) || 0 });
      toast.success(isArabic ? "تم تحديث العمالة" : "Labor updated");
      setEditingId(null);
    } catch { toast.error(isArabic ? "فشل التحديث" : "Update failed"); }
  }, [editingId, editData, updateLaborRate, isArabic]);

  // Excel export
  const exportToExcel = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Labor');
    const headers = ['Code', 'Name', 'Name (AR)', 'Category', 'Skill Level', 'Unit', 'Daily Rate', 'Hourly Rate', 'Currency'];
    sheet.addRow(headers);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2744' } };
    headerRow.alignment = { horizontal: 'center' };

    filteredLabor.forEach(l => {
      const catInfo = LABOR_CATEGORIES.find(c => c.value === l.category);
      const skillInfo = SKILL_LEVELS.find(s => s.value === l.skill_level);
      sheet.addRow([
        l.code, l.name, l.name_ar || '', catInfo ? catInfo.label_en : (l.category || ''),
        skillInfo ? skillInfo.label_en : (l.skill_level || ''), l.unit, l.unit_rate, l.hourly_rate || '', l.currency || 'SAR'
      ]);
    });

    sheet.getColumn(3).alignment = { horizontal: 'right', readingOrder: 2 as any };
    sheet.getColumn(7).numFmt = '#,##0.00';
    sheet.getColumn(8).numFmt = '#,##0.00';
    sheet.columns.forEach(col => { col.width = 18; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Library_Labor_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(isArabic ? "تم تصدير العمالة بنجاح" : "Labor exported successfully");
  };

  const computedHourlyRate = useMemo(() => {
    if (formData.unit === 'day') { const d = parseFloat(formData.unit_rate) || 0; const h = parseFloat(formData.working_hours_per_day) || 8; return calculateHourlyRate(d, h).toString(); }
    return formData.hourly_rate;
  }, [formData.unit_rate, formData.working_hours_per_day, formData.unit, formData.hourly_rate, calculateHourlyRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addLaborRate({
      code: formData.code || `L${Date.now()}`, name: formData.name, name_ar: formData.name_ar,
      unit: formData.unit, unit_rate: parseFloat(formData.unit_rate) || 0,
      overtime_percentage: parseFloat(formData.overtime_percentage) || 0, category: formData.category,
      skill_level: formData.skill_level, currency: formData.currency,
      working_hours_per_day: parseInt(formData.working_hours_per_day) || 8,
      hourly_rate: parseFloat(computedHourlyRate) || 0,
    });
    setFormData({ code: "", name: "", name_ar: "", category: "general", skill_level: "skilled", unit: "day", unit_rate: "", currency: "SAR", working_hours_per_day: "8", hourly_rate: "0", overtime_percentage: "0" });
    setIsAddOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.worksheets[0]; const data: any[] = []; const headers: string[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) { row.eachCell((cell) => { headers.push(cell.value?.toString() || ''); }); }
      else { const rowData: any = {}; row.eachCell((cell, colNumber) => { rowData[headers[colNumber - 1]] = cell.value; }); data.push(rowData); }
    });
    await importFromExcel(data); e.target.value = '';
  };

  const filteredLabor = useMemo(() => {
    return laborRates.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(deferredSearch.toLowerCase()) || (l.name_ar && l.name_ar.includes(deferredSearch)) || l.code.toLowerCase().includes(deferredSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (categoryFilter !== "all" && l.category !== categoryFilter) return false;
      if (validityFilter) { return getValidityStatus(l.valid_until, l.price_date) === validityFilter; }
      return true;
    });
  }, [laborRates, deferredSearch, categoryFilter, validityFilter]);

  const totalPages = Math.ceil(filteredLabor.length / ITEMS_PER_PAGE);
  const paginatedLabor = useMemo(() => { const s = (currentPage - 1) * ITEMS_PER_PAGE; return filteredLabor.slice(s, s + ITEMS_PER_PAGE); }, [filteredLabor, currentPage]);
  useMemo(() => { setCurrentPage(1); }, [search, categoryFilter, validityFilter]);

  const getSkillLevelLabel = (level?: string) => { if (!level) return "-"; const f = SKILL_LEVELS.find(s => s.value === level); return f ? (isArabic ? f.label : f.label_en) : level; };
  const getCurrencyLabel = (currency?: string) => { if (!currency) return "ر.س"; const f = CURRENCIES.find(c => c.value === currency); return f ? f.label : currency; };
  const getSkillLevelVariant = (level?: string): "default" | "secondary" | "outline" => { switch (level) { case 'skilled': return 'default'; case 'semi-skilled': return 'secondary'; default: return 'outline'; } };

  if (loading) return (<div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={isArabic ? "بحث في العمالة..." : "Search labor..."} value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder={isArabic ? "كل التصنيفات" : "All Categories"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل التصنيفات" : "All Categories"}</SelectItem>
              {LABOR_CATEGORY_GROUPS.map(group => (
                <SelectGroup key={group.label}><SelectLabel>{isArabic ? group.label : group.label_en}</SelectLabel>
                  {group.categories.map(catVal => { const cat = LABOR_CATEGORIES.find(c => c.value === catVal); return cat ? <SelectItem key={cat.value} value={cat.value}>{isArabic ? cat.label : cat.label_en}</SelectItem> : null; })}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportToExcel}><Download className="h-4 w-4" />{isArabic ? "تصدير" : "Export"}</Button>
          <label>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            <Button variant="outline" size="sm" className="gap-2" asChild><span className="cursor-pointer"><Upload className="h-4 w-4" />{isArabic ? "استيراد" : "Import"}</span></Button>
          </label>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4" />{isArabic ? "إضافة عمالة" : "Add Labor"}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{isArabic ? "إضافة عمالة جديدة" : "Add New Labor"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{isArabic ? "الحرفة *" : "Job Title *"}</Label><Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>{isArabic ? "الحرفة (عربي)" : "Job Title (Arabic)"}</Label><Input value={formData.name_ar} onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>{isArabic ? "الكود" : "Code"}</Label><Input value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} placeholder="L001" /></div>
                  <div className="space-y-2"><Label>{isArabic ? "الفئة" : "Category"}</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{LABOR_CATEGORIES.map(cat => (<SelectItem key={cat.value} value={cat.value}>{isArabic ? cat.label : cat.label_en}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>{isArabic ? "مستوى المهارة" : "Skill Level"}</Label>
                    <Select value={formData.skill_level} onValueChange={(v) => setFormData(prev => ({ ...prev, skill_level: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SKILL_LEVELS.map(level => (<SelectItem key={level.value} value={level.value}>{isArabic ? level.label : level.label_en}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>{isArabic ? "الوحدة" : "Unit"}</Label>
                    <Select value={formData.unit} onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{LABOR_UNITS.map(unit => (<SelectItem key={unit.value} value={unit.value}>{isArabic ? unit.label : unit.label_en}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>{isArabic ? "سعر اليوم *" : "Daily Rate *"}</Label><Input type="number" step="0.01" value={formData.unit_rate} onChange={(e) => setFormData(prev => ({ ...prev, unit_rate: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>{isArabic ? "العملة" : "Currency"}</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(curr => (<SelectItem key={curr.value} value={curr.value}>{curr.label} ({curr.label_en})</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{isArabic ? "ساعات العمل/يوم" : "Working Hours/Day"}</Label><Input type="number" min="1" max="24" value={formData.working_hours_per_day} onChange={(e) => setFormData(prev => ({ ...prev, working_hours_per_day: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className="flex items-center gap-1">{isArabic ? "سعر الساعة" : "Hourly Rate"}<span className="text-xs text-muted-foreground">({isArabic ? "محسوب" : "calculated"})</span></Label><Input type="number" value={computedHourlyRate} disabled className="bg-muted" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{isArabic ? "نسبة الإضافي %" : "Overtime %"}</Label><Input type="number" step="0.1" value={formData.overtime_percentage} onChange={(e) => setFormData(prev => ({ ...prev, overtime_percentage: e.target.value }))} /></div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" /><span>{isArabic ? "يتم حساب سعر الساعة تلقائياً من السعر اليومي وساعات العمل" : "Hourly rate is calculated automatically from daily rate and working hours"}</span>
                </div>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">{isArabic ? "إنشاء" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredLabor.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-[hsl(218,50%,18%)]/5 dark:bg-[hsl(218,45%,18%)]/10 rounded-lg border">
          <span className="text-sm font-medium text-[hsl(218,50%,18%)] dark:text-white/70">{isArabic ? `${filteredLabor.length} عمالة` : `${filteredLabor.length} labor items`}</span>
          <span className="text-xs text-muted-foreground">
            {isArabic ? `عرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredLabor.length)} من ${filteredLabor.length}` : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredLabor.length)} of ${filteredLabor.length}`}
          </span>
        </div>
      )}

      {filteredLabor.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Users className="h-12 w-12 mb-4 opacity-50" /><p>{isArabic ? "لا توجد عمالة. أضف أول عمالة للبدء." : "No labor. Add your first labor to get started."}</p></div>
      ) : (
        <>
          <div className="rounded-lg border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[hsl(218,50%,18%)]/5 dark:bg-[hsl(218,45%,18%)]/20">
                  <TableHead className="text-right font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "الكود" : "Code"}</TableHead>
                  <TableHead className="text-right font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "المسمى الوظيفي" : "Job Title"}</TableHead>
                  <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "التصنيف" : "Category"}</TableHead>
                  <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "مستوى المهارة" : "Skill Level"}</TableHead>
                  <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "سعر اليوم" : "Daily Rate"}</TableHead>
                  <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "سعر الساعة" : "Hourly Rate"}</TableHead>
                  <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "الصلاحية" : "Validity"}</TableHead>
                  <TableHead className="text-center w-24 font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLabor.map((labor) => {
                  const catInfo = LABOR_CATEGORIES.find(c => c.value === labor.category);
                  return (
                    <TableRow key={labor.id} className="hover:bg-[hsl(217,91%,60%)]/5 dark:hover:bg-[hsl(217,91%,60%)]/10 transition-colors">
                      <TableCell className="font-mono text-sm text-[hsl(218,50%,18%)] dark:text-white/70">{labor.code}</TableCell>
                      <TableCell>
                        {editingId === labor.id ? (
                          <Input className="h-8 w-full" value={editData.name} onChange={(e) => setEditData(prev => ({...prev, name: e.target.value}))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} autoFocus />
                        ) : (isArabic && labor.name_ar ? labor.name_ar : labor.name)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-xs border-0 ${getLaborCategoryBadgeColor(labor.category)}`}>{catInfo ? (isArabic ? catInfo.label : catInfo.label_en) : labor.category || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === labor.id ? (
                          <Select value={editData.skill_level} onValueChange={(v) => setEditData(prev => ({...prev, skill_level: v}))}>
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>{SKILL_LEVELS.map(s => <SelectItem key={s.value} value={s.value}>{isArabic ? s.label : s.label_en}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : <Badge variant={getSkillLevelVariant(labor.skill_level)}>{getSkillLevelLabel(labor.skill_level)}</Badge>}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {editingId === labor.id ? (
                          <Input type="number" step="0.01" className="h-8 w-24 text-center" value={editData.unit_rate}
                            onChange={(e) => setEditData(prev => ({...prev, unit_rate: e.target.value}))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} />
                        ) : <>{labor.unit_rate.toLocaleString()} {getCurrencyLabel(labor.currency)}</>}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {labor.hourly_rate ? `${labor.hourly_rate.toLocaleString()} ${getCurrencyLabel(labor.currency)}` : "-"}
                      </TableCell>
                      <TableCell className="text-center"><PriceValidityIndicator priceDate={labor.price_date} validUntil={labor.valid_until} showLabel={true} /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {editingId === labor.id ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-100 hover:text-green-700 text-green-600" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-700 text-red-500" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30" onClick={() => startEdit(labor)}><Edit2 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 text-destructive" onClick={() => deleteLaborRate(labor.id)}><Trash2 className="h-4 w-4" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-muted-foreground">
                {isArabic ? `عرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredLabor.length)} من ${filteredLabor.length}` : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredLabor.length)} of ${filteredLabor.length}`}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronRight className="h-4 w-4" /></Button>
                <span className="text-sm px-2">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronLeft className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});

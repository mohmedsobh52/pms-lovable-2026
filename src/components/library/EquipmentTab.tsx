import { useState, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Download, Search, Trash2, Edit2, Check, X, Truck, User, Fuel, ChevronLeft, ChevronRight } from "lucide-react";
import { useEquipmentRates, EQUIPMENT_CATEGORIES, EQUIPMENT_UNITS, CURRENCIES } from "@/hooks/useEquipmentRates";
import { useMaterialPrices } from "@/hooks/useMaterialPrices";
import { useLanguage } from "@/hooks/useLanguage";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PriceValidityIndicator, getValidityStatus } from "./PriceValidityIndicator";
import { toast } from "sonner";

const getEquipmentCategoryBadgeColor = (category?: string) => {
  if (!category) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  if (['excavator', 'loader', 'truck', 'compactor', 'trencher'].includes(category)) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  if (['crane', 'forklift', 'mixer', 'pump', 'scaffold'].includes(category)) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
  if (['pipe_laying', 'dewatering', 'testing'].includes(category)) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (['generator', 'compressor', 'welding', 'cutting'].includes(category)) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
  if (['survey'].includes(category)) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
};

const ITEMS_PER_PAGE = 25;

const EQUIPMENT_CATEGORY_GROUPS = [
  { label: 'عام', label_en: 'General', categories: ['other'] },
  { label: 'حفر ونقل', label_en: 'Earthwork & Transport', categories: ['excavator', 'loader', 'truck', 'compactor', 'trencher'] },
  { label: 'رفع وصب', label_en: 'Lifting & Concrete', categories: ['crane', 'forklift', 'mixer', 'pump', 'scaffold'] },
  { label: 'شبكات ومواسير', label_en: 'Networks & Pipes', categories: ['pipe_laying', 'dewatering', 'testing'] },
  { label: 'طاقة وورش', label_en: 'Power & Workshops', categories: ['generator', 'compressor', 'welding', 'cutting'] },
  { label: 'مساحة', label_en: 'Survey', categories: ['survey'] },
];

interface EquipmentTabProps {
  validityFilter?: string | null;
}

export const EquipmentTab = memo(function EquipmentTab({ validityFilter }: EquipmentTabProps) {
  const { isArabic } = useLanguage();
  const { equipmentRates, loading, addEquipmentRate, updateEquipmentRate, deleteEquipmentRate, importFromExcel } = useEquipmentRates();
  const { suppliers } = useMaterialPrices();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState({
    code: "", name: "", name_ar: "", category: "other", unit: "day",
    description: "", hourly_rate: "", rental_rate: "", monthly_rate: "",
    currency: "SAR", supplier_name: "", includes_operator: false, includes_fuel: false,
  });

  // Inline editing
  const startEdit = (eq: any) => {
    setEditingId(eq.id);
    setEditData({ name: eq.name, rental_rate: eq.rental_rate });
  };
  const cancelEdit = () => { setEditingId(null); setEditData({}); };
  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateEquipmentRate(editingId, { ...editData, rental_rate: parseFloat(editData.rental_rate) || 0 });
      toast.success(isArabic ? "تم تحديث المعدة" : "Equipment updated");
      setEditingId(null);
    } catch { toast.error(isArabic ? "فشل التحديث" : "Update failed"); }
  };

  // Excel export
  const exportToExcel = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Equipment');
    const headers = ['Code', 'Name', 'Name (AR)', 'Category', 'Daily Rate', 'Hourly Rate', 'Monthly Rate', 'Currency', 'Includes Operator', 'Includes Fuel'];
    sheet.addRow(headers);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2744' } };
    headerRow.alignment = { horizontal: 'center' };

    filteredEquipment.forEach(e => {
      const catInfo = EQUIPMENT_CATEGORIES.find(c => c.value === e.category);
      sheet.addRow([
        e.code, e.name, e.name_ar || '', catInfo ? catInfo.label_en : (e.category || ''),
        e.rental_rate, e.hourly_rate || '', e.monthly_rate || '', e.currency || 'SAR',
        e.includes_operator ? 'Yes' : 'No', e.includes_fuel ? 'Yes' : 'No'
      ]);
    });

    sheet.getColumn(3).alignment = { horizontal: 'right', readingOrder: 2 as any };
    [5, 6, 7].forEach(i => { sheet.getColumn(i).numFmt = '#,##0.00'; });
    sheet.columns.forEach(col => { col.width = 18; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Library_Equipment_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(isArabic ? "تم تصدير المعدات بنجاح" : "Equipment exported successfully");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addEquipmentRate({
      code: formData.code || `E${Date.now()}`, name: formData.name, name_ar: formData.name_ar, unit: formData.unit,
      rental_rate: parseFloat(formData.rental_rate) || 0, operation_rate: 0,
      hourly_rate: parseFloat(formData.hourly_rate) || 0, monthly_rate: parseFloat(formData.monthly_rate) || 0,
      supplier_name: formData.supplier_name, category: formData.category, currency: formData.currency,
      description: formData.description, includes_operator: formData.includes_operator, includes_fuel: formData.includes_fuel,
    });
    setFormData({ code: "", name: "", name_ar: "", category: "other", unit: "day", description: "", hourly_rate: "", rental_rate: "", monthly_rate: "", currency: "SAR", supplier_name: "", includes_operator: false, includes_fuel: false });
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

  const filteredEquipment = useMemo(() => {
    return equipmentRates.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || (e.name_ar && e.name_ar.includes(search)) || e.code.toLowerCase().includes(search.toLowerCase()) || (e.description && e.description.toLowerCase().includes(search.toLowerCase()));
      if (!matchesSearch) return false;
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (validityFilter) { return getValidityStatus(e.valid_until, e.price_date) === validityFilter; }
      return true;
    });
  }, [equipmentRates, search, categoryFilter, validityFilter]);

  const totalPages = Math.ceil(filteredEquipment.length / ITEMS_PER_PAGE);
  const paginatedEquipment = useMemo(() => { const s = (currentPage - 1) * ITEMS_PER_PAGE; return filteredEquipment.slice(s, s + ITEMS_PER_PAGE); }, [filteredEquipment, currentPage]);
  useMemo(() => { setCurrentPage(1); }, [search, categoryFilter, validityFilter]);

  const getCurrencyLabel = (currency?: string) => { if (!currency) return "ر.س"; const f = CURRENCIES.find(c => c.value === currency); return f ? f.label : currency; };

  if (loading) return (<div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={isArabic ? "بحث في المعدات..." : "Search equipment..."} value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder={isArabic ? "كل التصنيفات" : "All Categories"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل التصنيفات" : "All Categories"}</SelectItem>
              {EQUIPMENT_CATEGORY_GROUPS.map(group => (
                <SelectGroup key={group.label}><SelectLabel>{isArabic ? group.label : group.label_en}</SelectLabel>
                  {group.categories.map(catVal => { const cat = EQUIPMENT_CATEGORIES.find(c => c.value === catVal); return cat ? <SelectItem key={cat.value} value={cat.value}>{isArabic ? cat.label : cat.label_en}</SelectItem> : null; })}
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
            <DialogTrigger asChild><Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4" />{isArabic ? "إضافة معدة" : "Add Equipment"}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{isArabic ? "إضافة معدة جديدة" : "Add New Equipment"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{isArabic ? "اسم المعدة *" : "Equipment Name *"}</Label><Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>{isArabic ? "الاسم (عربي)" : "Name (Arabic)"}</Label><Input value={formData.name_ar} onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>{isArabic ? "الكود" : "Code"}</Label><Input value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} placeholder="E001" /></div>
                  <div className="space-y-2"><Label>{isArabic ? "الفئة" : "Category"}</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EQUIPMENT_CATEGORIES.map(cat => (<SelectItem key={cat.value} value={cat.value}>{isArabic ? cat.label : cat.label_en}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>{isArabic ? "الوحدة" : "Unit"}</Label>
                    <Select value={formData.unit} onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EQUIPMENT_UNITS.map(unit => (<SelectItem key={unit.value} value={unit.value}>{isArabic ? unit.label : unit.label_en}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>{isArabic ? "الوصف / المواصفات" : "Description / Specifications"}</Label><Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} /></div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2"><Label>{isArabic ? "سعر الساعة" : "Hourly Rate"}</Label><Input type="number" step="0.01" value={formData.hourly_rate} onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>{isArabic ? "سعر اليوم *" : "Daily Rate *"}</Label><Input type="number" step="0.01" value={formData.rental_rate} onChange={(e) => setFormData(prev => ({ ...prev, rental_rate: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>{isArabic ? "سعر الشهر" : "Monthly Rate"}</Label><Input type="number" step="0.01" value={formData.monthly_rate} onChange={(e) => setFormData(prev => ({ ...prev, monthly_rate: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>{isArabic ? "العملة" : "Currency"}</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(curr => (<SelectItem key={curr.value} value={curr.value}>{curr.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>{isArabic ? "المورد" : "Supplier"}</Label>
                  <Select value={formData.supplier_name} onValueChange={(v) => setFormData(prev => ({ ...prev, supplier_name: v }))}><SelectTrigger><SelectValue placeholder={isArabic ? "اختر المورد" : "Select supplier"} /></SelectTrigger>
                    <SelectContent>{suppliers.map(s => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-3"><Label>{isArabic ? "السعر يشمل" : "Price Includes"}</Label>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><Checkbox id="includes_operator" checked={formData.includes_operator} onCheckedChange={(c) => setFormData(prev => ({ ...prev, includes_operator: c === true }))} /><label htmlFor="includes_operator" className="text-sm flex items-center gap-1 cursor-pointer"><User className="h-4 w-4" />{isArabic ? "المشغل" : "Operator"}</label></div>
                    <div className="flex items-center gap-2"><Checkbox id="includes_fuel" checked={formData.includes_fuel} onCheckedChange={(c) => setFormData(prev => ({ ...prev, includes_fuel: c === true }))} /><label htmlFor="includes_fuel" className="text-sm flex items-center gap-1 cursor-pointer"><Fuel className="h-4 w-4" />{isArabic ? "الوقود" : "Fuel"}</label></div>
                  </div>
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

      {filteredEquipment.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-[hsl(218,50%,18%)]/5 dark:bg-[hsl(218,45%,18%)]/10 rounded-lg border">
          <span className="text-sm font-medium text-[hsl(218,50%,18%)] dark:text-white/70">{isArabic ? `${filteredEquipment.length} معدة` : `${filteredEquipment.length} equipment items`}</span>
          <span className="text-xs text-muted-foreground">
            {isArabic ? `عرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredEquipment.length)} من ${filteredEquipment.length}` : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredEquipment.length)} of ${filteredEquipment.length}`}
          </span>
        </div>
      )}

      {filteredEquipment.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Truck className="h-12 w-12 mb-4 opacity-50" /><p>{isArabic ? "لا توجد معدات. أضف أول معدة للبدء." : "No equipment. Add your first equipment to get started."}</p></div>
      ) : (
        <>
          <div className="rounded-lg border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[hsl(218,50%,18%)]/5 dark:bg-[hsl(218,45%,18%)]/20">
                  <TableHead className="text-right font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "الكود" : "Code"}</TableHead>
                  <TableHead className="text-right font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "اسم المعدة" : "Equipment Name"}</TableHead>
                  <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "التصنيف" : "Category"}</TableHead>
                  <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "سعر اليوم" : "Daily Rate"}</TableHead>
                  <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "يشمل" : "Includes"}</TableHead>
                  <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "الصلاحية" : "Validity"}</TableHead>
                  <TableHead className="text-center w-24 font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEquipment.map((equipment) => {
                  const catInfo = EQUIPMENT_CATEGORIES.find(c => c.value === equipment.category);
                  return (
                    <TableRow key={equipment.id} className="hover:bg-[hsl(217,91%,60%)]/5 dark:hover:bg-[hsl(217,91%,60%)]/10 transition-colors">
                      <TableCell className="font-mono text-sm text-[hsl(218,50%,18%)] dark:text-white/70">{equipment.code}</TableCell>
                      <TableCell>
                        {editingId === equipment.id ? (
                          <Input className="h-8 w-full" value={editData.name} onChange={(e) => setEditData(prev => ({...prev, name: e.target.value}))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} autoFocus />
                        ) : (
                          <div>
                            <div>{isArabic && equipment.name_ar ? equipment.name_ar : equipment.name}</div>
                            {equipment.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{equipment.description}</div>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-xs border-0 ${getEquipmentCategoryBadgeColor(equipment.category)}`}>{catInfo ? (isArabic ? catInfo.label : catInfo.label_en) : equipment.category || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {editingId === equipment.id ? (
                          <Input type="number" step="0.01" className="h-8 w-24 text-center" value={editData.rental_rate}
                            onChange={(e) => setEditData(prev => ({...prev, rental_rate: e.target.value}))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} />
                        ) : <>{equipment.rental_rate.toLocaleString()} {getCurrencyLabel(equipment.currency)}</>}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {equipment.includes_operator && <Badge variant="secondary" className="gap-1 text-xs"><User className="h-3 w-3" /></Badge>}
                          {equipment.includes_fuel && <Badge variant="secondary" className="gap-1 text-xs"><Fuel className="h-3 w-3" /></Badge>}
                          {!equipment.includes_operator && !equipment.includes_fuel && "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center"><PriceValidityIndicator priceDate={equipment.price_date} validUntil={equipment.valid_until} showLabel={true} /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {editingId === equipment.id ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-100 hover:text-green-700 text-green-600" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-700 text-red-500" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30" onClick={() => startEdit(equipment)}><Edit2 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 text-destructive" onClick={() => deleteEquipmentRate(equipment.id)}><Trash2 className="h-4 w-4" /></Button>
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
                {isArabic ? `عرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredEquipment.length)} من ${filteredEquipment.length}` : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredEquipment.length)} of ${filteredEquipment.length}`}
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

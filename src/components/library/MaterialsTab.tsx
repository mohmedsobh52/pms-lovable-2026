import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Download, Search, Trash2, Edit2, Check, X, Package, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useMaterialPrices, MATERIAL_CATEGORIES, CURRENCIES, CATEGORY_GROUPS } from "@/hooks/useMaterialPrices";
import { useLanguage } from "@/hooks/useLanguage";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PriceValidityIndicator, getValidityStatus } from "./PriceValidityIndicator";
import { toast } from "sonner";

const getMaterialCategoryBadgeColor = (category: string) => {
  if (category.startsWith('pipes_')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (['fittings_valves', 'manholes', 'pumps_stations', 'water_tanks', 'water_treatment'].includes(category))
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
  if (['concrete', 'steel', 'cement', 'aggregates', 'bricks_blocks'].includes(category))
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  if (['excavation_backfill', 'asphalt', 'soil_improvement'].includes(category))
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  if (['insulation', 'waterproofing', 'paints_coatings', 'sealants'].includes(category))
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (['electrical', 'plumbing', 'hvac'].includes(category))
    return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
};

interface MaterialsTabProps {
  validityFilter?: string | null;
}

const ITEMS_PER_PAGE = 25;

export const MaterialsTab = memo(function MaterialsTab({ validityFilter }: MaterialsTabProps) {
  const { isArabic } = useLanguage();
  const { materials, suppliers, loading, addMaterial, updateMaterial, deleteMaterial, importFromExcel } = useMaterialPrices();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState({
    name: "", name_ar: "", code: "", category: "other", waste_percentage: "0",
    unit: "m3", unit_price: "", currency: "SAR", supplier_name: "",
    brand: "", description: "", specifications: "",
  });

  // Inline editing
  const startEdit = useCallback((material: any) => {
    setEditingId(material.id);
    setEditData({ name: material.name, unit_price: material.unit_price, unit: material.unit, brand: material.brand || '' });
  }, []);
  const cancelEdit = useCallback(() => { setEditingId(null); setEditData({}); }, []);
  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    try {
      await updateMaterial(editingId, { ...editData, unit_price: parseFloat(editData.unit_price) || 0 });
      toast.success(isArabic ? "تم تحديث المادة" : "Material updated");
      setEditingId(null);
    } catch { toast.error(isArabic ? "فشل التحديث" : "Update failed"); }
  }, [editingId, editData, updateMaterial, isArabic]);

  // Excel export
  const exportToExcel = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Materials');
    const headers = ['Code', 'Name', 'Name (AR)', 'Category', 'Unit', 'Unit Price', 'Currency', 'Brand', 'Supplier', 'Specifications'];
    sheet.addRow(headers);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2744' } };
    headerRow.alignment = { horizontal: 'center' };
    
    filteredMaterials.forEach((m, i) => {
      sheet.addRow([
        `M${String(i + 1).padStart(3, '0')}`, m.name, m.name_ar || '', getCategoryLabel(m.category),
        m.unit, m.unit_price, m.currency || 'SAR', m.brand || '', m.supplier_name || '', m.specifications || ''
      ]);
    });

    // RTL for Arabic column
    sheet.getColumn(3).alignment = { horizontal: 'right', readingOrder: 2 as any };
    sheet.getColumn(6).numFmt = '#,##0.00';
    sheet.columns.forEach(col => { col.width = 18; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Library_Materials_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isArabic ? "تم تصدير المواد بنجاح" : "Materials exported successfully");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMaterial({
      name: formData.name, name_ar: formData.name_ar, unit: formData.unit,
      unit_price: parseFloat(formData.unit_price) || 0, supplier_name: formData.supplier_name,
      category: formData.category, currency: formData.currency, brand: formData.brand,
      description: formData.description, specifications: formData.specifications,
      waste_percentage: parseFloat(formData.waste_percentage) || 0,
      price_date: new Date().toISOString().split('T')[0], is_verified: false,
    });
    setFormData({ name: "", name_ar: "", code: "", category: "other", waste_percentage: "0", unit: "m3", unit_price: "", currency: "SAR", supplier_name: "", brand: "", description: "", specifications: "" });
    setIsAddOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];
    const data: any[] = [];
    const headers: string[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) { row.eachCell((cell) => { headers.push(cell.value?.toString() || ''); }); }
      else { const rowData: any = {}; row.eachCell((cell, colNumber) => { rowData[headers[colNumber - 1]] = cell.value; }); data.push(rowData); }
    });
    await importFromExcel(data);
    e.target.value = '';
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.name_ar && m.name_ar.includes(search)) || m.category.toLowerCase().includes(search.toLowerCase()) || (m.brand && m.brand.toLowerCase().includes(search.toLowerCase()));
      if (!matchesSearch) return false;
      if (categoryFilter && categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (validityFilter) { const status = getValidityStatus(m.valid_until, m.price_date); return status === validityFilter; }
      return true;
    });
  }, [materials, search, categoryFilter, validityFilter]);

  const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
  const paginatedMaterials = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMaterials.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMaterials, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [search, categoryFilter, validityFilter]);

  const getCurrencyLabel = (currency: string) => { const found = CURRENCIES.find(c => c.value === currency); return found ? found.label : currency; };
  const getCategoryLabel = (catValue: string) => { const found = MATERIAL_CATEGORIES.find(c => c.value === catValue); return found ? (isArabic ? found.label : found.label_en) : catValue; };

  if (loading) {
    return (<div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>);
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2 min-w-[200px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={isArabic ? "بحث في المواد..." : "Search materials..."} value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={isArabic ? "كل التصنيفات" : "All Categories"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل التصنيفات" : "All Categories"}</SelectItem>
              {CATEGORY_GROUPS.map(group => (
                <SelectGroup key={group.key}>
                  <SelectLabel>{isArabic ? group.label : group.label_en}</SelectLabel>
                  {MATERIAL_CATEGORIES.filter(c => c.group === group.key).map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{isArabic ? cat.label : cat.label_en}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportToExcel}>
            <Download className="h-4 w-4" />
            {isArabic ? "تصدير" : "Export"}
          </Button>
          <label>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <span className="cursor-pointer"><Upload className="h-4 w-4" />{isArabic ? "استيراد" : "Import"}</span>
            </Button>
          </label>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4" />{isArabic ? "إضافة مادة" : "Add Material"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isArabic ? "إضافة مادة جديدة" : "Add New Material"}</DialogTitle>
                <DialogDescription>{isArabic ? "أدخل بيانات المادة الجديدة" : "Enter the new material details"}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{isArabic ? "اسم المادة *" : "Material Name *"}</Label><Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>{isArabic ? "الاسم (عربي)" : "Name (Arabic)"}</Label><Input value={formData.name_ar} onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>{isArabic ? "الكود" : "Code"}</Label><Input value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} placeholder="M001" /></div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "الفئة" : "Category"}</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORY_GROUPS.map(group => (<SelectGroup key={group.key}><SelectLabel>{isArabic ? group.label : group.label_en}</SelectLabel>{MATERIAL_CATEGORIES.filter(c => c.group === group.key).map(cat => (<SelectItem key={cat.value} value={cat.value}>{isArabic ? cat.label : cat.label_en}</SelectItem>))}</SelectGroup>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>{isArabic ? "نسبة الهدر %" : "Waste %"}</Label><Input type="number" step="0.1" value={formData.waste_percentage} onChange={(e) => setFormData(prev => ({ ...prev, waste_percentage: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "الوحدة" : "Unit"}</Label>
                    <Select value={formData.unit} onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m3">م³ / m³</SelectItem><SelectItem value="m2">م² / m²</SelectItem><SelectItem value="m">م.ط / m</SelectItem>
                        <SelectItem value="kg">كجم / kg</SelectItem><SelectItem value="ton">طن / ton</SelectItem><SelectItem value="unit">وحدة / unit</SelectItem><SelectItem value="bag">كيس / bag</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>{isArabic ? "سعر الوحدة *" : "Unit Price *"}</Label><Input type="number" step="0.01" value={formData.unit_price} onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))} required /></div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "العملة" : "Currency"}</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(curr => (<SelectItem key={curr.value} value={curr.value}>{curr.label} ({curr.label_en})</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label>{isArabic ? "المورد" : "Supplier"}</Label>
                    {suppliers.length > 0 ? (
                      <Select 
                        value={formData.supplier_name || undefined} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, supplier_name: v === '__other__' ? '' : v }))}
                      >
                        <SelectTrigger><SelectValue placeholder={isArabic ? "اختر المورد" : "Select supplier"} /></SelectTrigger>
                        <SelectContent>
                          {suppliers.map(s => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                          <SelectItem value="__other__">{isArabic ? "أخرى (كتابة يدوية)" : "Other (type manually)"}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        value={formData.supplier_name} 
                        onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))} 
                        placeholder={isArabic ? "اكتب اسم المورد" : "Enter supplier name"} 
                      />
                    )}
                    {suppliers.length > 0 && formData.supplier_name === '' && (
                      <Input 
                        value="" 
                        onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))} 
                        placeholder={isArabic ? "اكتب اسم المورد" : "Type supplier name"} 
                        className="mt-1"
                      />
                    )}
                  </div>
                  <div className="space-y-2"><Label>{isArabic ? "العلامة التجارية" : "Brand"}</Label><Input value={formData.brand} onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))} placeholder={isArabic ? "مثال: سافيتو" : "e.g. Saveto"} /></div>
                </div>
                <div className="space-y-2"><Label>{isArabic ? "الوصف" : "Description"}</Label><Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} /></div>
                <div className="space-y-2"><Label>{isArabic ? "المواصفات الفنية" : "Technical Specifications"}</Label><Textarea value={formData.specifications} onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))} rows={2} /></div>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">{isArabic ? "إنشاء" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Results count bar */}
      {filteredMaterials.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-[hsl(218,50%,18%)]/5 dark:bg-[hsl(218,45%,18%)]/10 rounded-lg border">
          <span className="text-sm font-medium text-[hsl(218,50%,18%)] dark:text-white/70">
            {isArabic ? `${filteredMaterials.length} مادة` : `${filteredMaterials.length} materials`}
          </span>
          <span className="text-xs text-muted-foreground">
            {isArabic 
              ? `عرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredMaterials.length)} من ${filteredMaterials.length}`
              : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredMaterials.length)} of ${filteredMaterials.length}`
            }
          </span>
        </div>
      )}

      {/* Table */}
      {filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-50" />
          <p>{isArabic ? "لا توجد مواد. أضف أول مادة للبدء." : "No materials. Add your first material to get started."}</p>
        </div>
      ) : (
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[hsl(218,50%,18%)]/5 dark:bg-[hsl(218,45%,18%)]/20">
                <TableHead className="text-right font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "الكود" : "Code"}</TableHead>
                <TableHead className="text-right font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "الاسم" : "Name"}</TableHead>
                <TableHead className="text-right font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "التصنيف" : "Category"}</TableHead>
                <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "سعر الوحدة" : "Unit Price"}</TableHead>
                <TableHead className="text-right font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "العلامة التجارية" : "Brand"}</TableHead>
                <TableHead className="text-center font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "الصلاحية" : "Validity"}</TableHead>
                <TableHead className="text-center w-24 font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMaterials.map((material, index) => (
                <TableRow key={material.id} className="hover:bg-[hsl(217,91%,60%)]/5 dark:hover:bg-[hsl(217,91%,60%)]/10 transition-colors">
                  <TableCell className="font-mono text-sm text-[hsl(218,50%,18%)] dark:text-white/70">{`M${String((currentPage - 1) * ITEMS_PER_PAGE + index + 1).padStart(3, '0')}`}</TableCell>
                  <TableCell>
                    {editingId === material.id ? (
                      <Input className="h-8 w-full" value={editData.name} onChange={(e) => setEditData(prev => ({...prev, name: e.target.value}))}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} autoFocus />
                    ) : (
                      <div>
                        <div>{isArabic && material.name_ar ? material.name_ar : material.name}</div>
                        {material.specifications && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{material.specifications}</div>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge className={`text-xs border-0 ${getMaterialCategoryBadgeColor(material.category)}`}>{getCategoryLabel(material.category)}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {editingId === material.id ? (
                      <Input className="h-8 w-16 text-center" value={editData.unit} onChange={(e) => setEditData(prev => ({...prev, unit: e.target.value}))}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} />
                    ) : material.unit}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {editingId === material.id ? (
                      <Input type="number" step="0.01" className="h-8 w-24 text-center" value={editData.unit_price}
                        onChange={(e) => setEditData(prev => ({...prev, unit_price: e.target.value}))}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} />
                    ) : (
                      <>{material.unit_price.toLocaleString()} {getCurrencyLabel(material.currency)}</>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === material.id ? (
                      <Input className="h-8 w-24" value={editData.brand} onChange={(e) => setEditData(prev => ({...prev, brand: e.target.value}))}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} />
                    ) : (material.brand || "-")}
                  </TableCell>
                  <TableCell className="text-center">
                    <PriceValidityIndicator priceDate={material.price_date} validUntil={material.valid_until} showLabel={true} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {editingId === material.id ? (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-100 hover:text-green-700 text-green-600" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-700 text-red-500" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30" onClick={() => startEdit(material)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 text-destructive" onClick={() => deleteMaterial(material.id)}><Trash2 className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-3">
          <span className="text-sm text-muted-foreground">
            {isArabic 
              ? `عرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredMaterials.length)} من ${filteredMaterials.length}`
              : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredMaterials.length)} of ${filteredMaterials.length}`
            }
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronRight className="h-4 w-4" /></Button>
            <span className="text-sm min-w-[60px] text-center">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronLeft className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
});

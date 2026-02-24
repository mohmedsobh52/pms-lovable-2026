import { useState, useMemo, useCallback } from "react";
import {
  Package, Search, Filter, Download, Trash2, Plus, Wand2, RefreshCw,
  ArrowUpDown, Hash, FileText, CheckCircle, MoreVertical, DollarSign,
  Edit, XCircle, Loader2, History, Upload, FileUp,
  BarChart3, CircleDollarSign, ListChecks, Calculator, AlertTriangle, BarChart
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectItem, PricingStats } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProjectBOQTabProps {
  items: ProjectItem[];
  filteredItems: ProjectItem[];
  displayedItems: ProjectItem[];
  pricingStats: PricingStats;
  selectedItems: Set<string>;
  itemsSearch: string;
  sortMode: 'file_order' | 'item_number';
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  startIndex: number;
  zeroQuantityCount: number;
  isAutoPricing: boolean;
  isArabic: boolean;
  currency: string;
  onSearchChange: (value: string) => void;
  onSortModeChange: (mode: 'file_order' | 'item_number') => void;
  onSelectedItemsChange: (items: Set<string>) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: string) => void;
  onAutoPricing: () => void;
  onAddItem: () => void;
  onUploadBOQ?: () => void;
  onQuickPrice: (itemId: string) => void;
  onDetailedPrice: (item: ProjectItem) => void;
  onEditItem: (item: ProjectItem) => void;
  onDeleteItem: (itemId: string) => void;
  onUnconfirmItem: (itemId: string) => void;
  onDeleteZeroQuantityItems: () => void;
  formatCurrency: (value: number) => string;
  onInlineEdit?: (itemId: string, field: string, value: number) => void;
}

export function ProjectBOQTab({
  items,
  filteredItems,
  displayedItems,
  pricingStats,
  selectedItems,
  itemsSearch,
  sortMode,
  currentPage,
  itemsPerPage,
  totalPages,
  startIndex,
  zeroQuantityCount,
  isAutoPricing,
  isArabic,
  currency,
  onSearchChange,
  onSortModeChange,
  onSelectedItemsChange,
  onPageChange,
  onItemsPerPageChange,
  onAutoPricing,
  onAddItem,
  onUploadBOQ,
  onQuickPrice,
  onDetailedPrice,
  onEditItem,
  onDeleteItem,
  onUnconfirmItem,
  onDeleteZeroQuantityItems,
  formatCurrency,
  onInlineEdit,
}: ProjectBOQTabProps) {
  const effectiveItemsPerPage = itemsPerPage >= filteredItems.length ? filteredItems.length : itemsPerPage;
  const hasArabicDescriptions = items.some(item => item.description_ar && item.description_ar.trim() !== '');
  const isMobile = useIsMobile();

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: 'unit_price' | 'quantity' } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showOutlierList, setShowOutlierList] = useState(false);

  // Outlier detection
  const outlierItems = useMemo(() => {
    const pricedItems = items.filter(i => i.unit_price && i.unit_price > 0);
    if (pricedItems.length < 3) return [];

    // Group by category
    const categories: Record<string, number[]> = {};
    pricedItems.forEach(item => {
      const cat = item.category || '_general';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(item.unit_price!);
    });

    // Calculate averages
    const categoryAvg: Record<string, number> = {};
    Object.entries(categories).forEach(([cat, prices]) => {
      categoryAvg[cat] = prices.reduce((s, p) => s + p, 0) / prices.length;
    });

    // Find outliers
    return pricedItems.filter(item => {
      const cat = item.category || '_general';
      const avg = categoryAvg[cat];
      if (!avg) return false;
      const ratio = item.unit_price! / avg;
      return ratio > 2 || ratio < 0.3;
    });
  }, [items]);

  // Inline edit handlers
  const handleStartEdit = useCallback((itemId: string, field: 'unit_price' | 'quantity', currentValue: number | null) => {
    if (!onInlineEdit) return;
    setEditingCell({ itemId, field });
    setEditValue(currentValue?.toString() || "0");
  }, [onInlineEdit]);

  const handleCommitEdit = useCallback(() => {
    if (!editingCell || !onInlineEdit) return;
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onInlineEdit(editingCell.itemId, editingCell.field, numValue);
    }
    setEditingCell(null);
    setEditValue("");
  }, [editingCell, editValue, onInlineEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const isOutlier = useCallback((itemId: string) => {
    return outlierItems.some(o => o.id === itemId);
  }, [outlierItems]);

  // If no items at all, show empty state
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileUp className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {isArabic ? "لا توجد بنود في جدول الكميات" : "No BOQ Items Yet"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {isArabic 
                ? "قم برفع ملف BOQ (Excel أو PDF) لاستخراج البنود تلقائياً، أو أضف بنوداً يدوياً"
                : "Upload a BOQ file (Excel or PDF) to extract items automatically, or add items manually"}
            </p>
            <div className="flex items-center gap-3">
              {onUploadBOQ && (
                <Button onClick={onUploadBOQ} className="gap-2" size="lg">
                  <Upload className="w-5 h-5" />
                  {isArabic ? "رفع ملف BOQ" : "Upload BOQ File"}
                </Button>
              )}
              <Button variant="outline" onClick={onAddItem} className="gap-2" size="lg">
                <Plus className="w-5 h-5" />
                {isArabic ? "إضافة بند يدوياً" : "Add Item Manually"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render inline edit cell
  const renderEditableCell = (item: ProjectItem, field: 'unit_price' | 'quantity', displayValue: string) => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field;
    
    if (isEditing) {
      return (
        <Input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCommitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommitEdit();
            if (e.key === 'Escape') handleCancelEdit();
          }}
          className="h-7 w-24 text-right text-sm"
          autoFocus
          min={0}
          step="any"
        />
      );
    }

    return (
      <span
        className={cn(
          onInlineEdit && "cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 rounded transition-colors",
        )}
        onDoubleClick={() => handleStartEdit(item.id, field, field === 'unit_price' ? item.unit_price : item.quantity)}
        title={onInlineEdit ? (isArabic ? "انقر مرتين للتعديل" : "Double-click to edit") : undefined}
      >
        {displayValue}
      </span>
    );
  };

  // Mobile card layout
  const renderMobileCard = (item: ProjectItem) => (
    <Card 
      key={item.id} 
      className={cn(
        "mb-3",
        item.unit_price && item.unit_price > 0
          ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/10"
          : "border-red-500/20 bg-red-50/20 dark:bg-red-950/10",
        isOutlier(item.id) && "border-dashed border-destructive/50"
      )}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={selectedItems.has(item.id)}
              onCheckedChange={(checked) => {
                const newSet = new Set(selectedItems);
                if (checked) newSet.add(item.id);
                else newSet.delete(item.id);
                onSelectedItemsChange(newSet);
              }}
            />
            <span className="font-mono text-sm font-bold">{item.item_number}</span>
            {isOutlier(item.id) && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
          </div>
          <Badge 
            variant={item.unit_price && item.unit_price > 0 ? "default" : "secondary"}
            className={item.unit_price && item.unit_price > 0 
              ? "bg-green-500/10 text-green-600 border-green-500/20" 
              : ""}
          >
            {item.unit_price && item.unit_price > 0 
              ? (isArabic ? "مسعر" : "Priced") 
              : (isArabic ? "غير مسعر" : "Unpriced")}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed line-clamp-2">{item.description || '-'}</p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">{isArabic ? "الوحدة" : "Unit"}</span>
            <p className="font-medium">{item.unit || '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">{isArabic ? "الكمية" : "Qty"}</span>
            <p className="font-medium">{item.quantity?.toLocaleString() || '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">{isArabic ? "سعر الوحدة" : "Unit Price"}</span>
            <p className="font-medium">{item.unit_price && item.unit_price > 0 ? formatCurrency(item.unit_price) : '-'}</p>
          </div>
        </div>
        {item.total_price && item.total_price > 0 && (
          <div className="text-right font-bold text-sm">
            {isArabic ? "الإجمالي" : "Total"}: {currency} {formatCurrency(item.total_price)}
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1 gap-1 h-8 text-xs" onClick={() => onQuickPrice(item.id)}>
            <DollarSign className="w-3 h-3" />{isArabic ? "تسعير" : "Price"}
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1 h-8 text-xs" onClick={() => onEditItem(item)}>
            <Edit className="w-3 h-3" />{isArabic ? "تعديل" : "Edit"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1 h-8 text-xs text-destructive" onClick={() => onDeleteItem(item.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Outlier Price Alert */}
      {outlierItems.length > 0 && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>{isArabic ? "تنبيه: أسعار شاذة" : "Warning: Outlier Prices"}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs"
              onClick={() => setShowOutlierList(!showOutlierList)}
            >
              {showOutlierList 
                ? (isArabic ? "إخفاء" : "Hide") 
                : (isArabic ? `عرض (${outlierItems.length})` : `Show (${outlierItems.length})`)}
            </Button>
          </AlertTitle>
          <AlertDescription>
            {isArabic 
              ? `يوجد ${outlierItems.length} بند بأسعار تتجاوز 200% أو تقل عن 30% من متوسط الفئة`
              : `${outlierItems.length} items have prices exceeding 200% or below 30% of category average`}
            {showOutlierList && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {outlierItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-xs bg-background/50 rounded px-2 py-1">
                    <span className="font-mono">{item.item_number}</span>
                    <span className="truncate mx-2 flex-1">{item.description?.slice(0, 50)}</span>
                    <span className="font-bold">{formatCurrency(item.unit_price!)}</span>
                  </div>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Row */}
      <TooltipProvider>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="border-border/50 hover:shadow-md transition-shadow cursor-default">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pricingStats.totalItems}</p>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? "إجمالي البنود" : "Total Items"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>{isArabic ? "عدد جميع البنود في جدول الكميات" : "Total number of BOQ items"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="border-border/50 hover:shadow-md transition-shadow cursor-default">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CircleDollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{pricingStats.pricedItems}</p>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? "بنود مسعرة" : "Priced Items"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>{isArabic ? "البنود التي تم تسعيرها" : "Items with assigned prices"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="border-border/50 hover:shadow-md transition-shadow cursor-default">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <ListChecks className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{pricingStats.confirmedItems}</p>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? "بنود مؤكدة" : "Confirmed"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>{isArabic ? "البنود المسعرة والمؤكدة بالكامل" : "Fully priced and confirmed items"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="border-border/50 hover:shadow-md transition-shadow cursor-default">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gold/10">
                    <Calculator className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {currency} {formatCurrency(pricingStats.totalValue)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? "إجمالي القيمة" : "Total Value"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>{isArabic ? "إجمالي قيمة جدول الكميات" : "Total BOQ value"}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Enhanced Progress Bar */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {isArabic ? "تقدم التسعير" : "Pricing Progress"}
            </span>
            <span className="text-sm font-bold">{pricingStats.pricingPercentage}%</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pricingStats.pricingPercentage < 30 ? "bg-destructive" :
                pricingStats.pricingPercentage < 70 ? "bg-warning" :
                pricingStats.pricingPercentage >= 75 ? "bg-gold" : "bg-success"
              )}
              style={{ width: `${pricingStats.pricingPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
            <span>{pricingStats.pricedItems} / {pricingStats.totalItems} {isArabic ? "مسعر" : "priced"}</span>
            <span>{pricingStats.confirmedItems} {isArabic ? "مؤكد" : "confirmed"}</span>
          </div>
        </CardContent>
      </Card>

      {/* BOQ Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {isArabic ? "جدول الكميات" : "Bill of Quantities"}
              <Badge variant="secondary">{items.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap project-actions-section">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? "بحث في البنود..." : "Search items..."}
                  value={itemsSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9 w-48 md:w-64"
                />
              </div>
              {/* Sort Mode Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {sortMode === 'file_order' 
                        ? (isArabic ? "ترتيب الملف" : "File Order")
                        : (isArabic ? "ترتيب رقمي" : "Numeric Order")
                      }
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isArabic ? "start" : "end"} className="bg-popover">
                  <DropdownMenuItem 
                    onClick={() => onSortModeChange('file_order')}
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {isArabic ? "ترتيب الملف الأصلي" : "Original File Order"}
                    {sortMode === 'file_order' && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onSortModeChange('item_number')}
                    className="gap-2"
                  >
                    <Hash className="w-4 h-4" />
                    {isArabic ? "ترتيب حسب رقم البند" : "Sort by Item Number"}
                    {sortMode === 'item_number' && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="icon" className="hidden sm:flex">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="hidden sm:flex">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="hidden sm:flex">
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="gap-2 text-destructive hover:text-destructive hidden sm:flex"
                onClick={onDeleteZeroQuantityItems}
                disabled={zeroQuantityCount === 0}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline">{isArabic ? "مسح الكميات الصفرية" : "Delete Zero Qty"}</span>
                {zeroQuantityCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {zeroQuantityCount}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={onAutoPricing}
                disabled={isAutoPricing || pricingStats.unpricedItems === 0}
              >
                {isAutoPricing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isArabic ? "تسعير تلقائي" : "Auto Price"}</span>
              </Button>
              {onUploadBOQ && (
                <Button 
                  variant="outline" 
                  className="gap-2 hidden sm:flex"
                  onClick={onUploadBOQ}
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden md:inline">{isArabic ? "رفع BOQ" : "Upload BOQ"}</span>
                </Button>
              )}
              <Button 
                className="gap-2"
                onClick={onAddItem}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? "إضافة بند" : "Add Item"}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile: Card Layout */}
          {isMobile ? (
            <div>
              {filteredItems.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {isArabic ? "لا توجد بنود" : "No items found"}
                </p>
              ) : (
                displayedItems.map(renderMobileCard)
              )}
            </div>
          ) : (
            /* Desktop: Table Layout */
            <div className="rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background border-b">
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onSelectedItemsChange(new Set(filteredItems.map(i => i.id)));
                          } else {
                            onSelectedItemsChange(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-[100px]">{isArabic ? "رقم البند" : "Item No."}</TableHead>
                    <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                    {hasArabicDescriptions && (
                      <TableHead className="min-w-[250px]">الوصف العربي</TableHead>
                    )}
                    <TableHead className="w-[80px]">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                    <TableHead className="w-[100px] text-right">{isArabic ? "الكمية" : "Qty"}</TableHead>
                    <TableHead className="w-[120px] text-right">{isArabic ? "سعر الوحدة" : "Unit Price"}</TableHead>
                    <TableHead className="w-[140px] text-right">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead className="w-[100px]">{isArabic ? "الحالة" : "Status"}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={hasArabicDescriptions ? 10 : 9} className="text-center py-8 text-muted-foreground">
                        {isArabic ? "لا توجد بنود" : "No items found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedItems.map((item) => (
                      <TableRow 
                        key={item.id}
                        className={cn(
                          item.unit_price && item.unit_price > 0
                            ? "bg-green-50/50 dark:bg-green-950/20 hover:bg-green-100/50 dark:hover:bg-green-950/30"
                            : "bg-red-50/30 dark:bg-red-950/10 hover:bg-red-100/30 dark:hover:bg-red-950/20",
                          isOutlier(item.id) && "border-l-2 border-l-destructive border-dashed"
                        )}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedItems);
                              if (checked) newSet.add(item.id);
                              else newSet.delete(item.id);
                              onSelectedItemsChange(newSet);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            {item.item_number}
                            {isOutlier(item.id) && <AlertTriangle className="w-3 h-3 text-destructive" />}
                          </span>
                        </TableCell>
                        <TableCell className="min-w-[350px] max-w-[500px] whitespace-pre-wrap break-words text-sm leading-relaxed">{item.description || '-'}</TableCell>
                        {hasArabicDescriptions && (
                          <TableCell className="min-w-[250px] max-w-[400px] whitespace-pre-wrap break-words text-sm leading-relaxed" dir="rtl">
                            {item.description_ar || '-'}
                          </TableCell>
                        )}
                        <TableCell>{item.unit || '-'}</TableCell>
                        <TableCell className="text-right">
                          {renderEditableCell(item, 'quantity', item.quantity?.toLocaleString() || '-')}
                        </TableCell>
                        <TableCell className="text-right">
                          {renderEditableCell(item, 'unit_price', item.unit_price && item.unit_price > 0 ? formatCurrency(item.unit_price) : '-')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.total_price && item.total_price > 0 ? formatCurrency(item.total_price) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={item.unit_price && item.unit_price > 0 ? "default" : "secondary"}
                            className={item.unit_price && item.unit_price > 0 
                              ? "bg-green-500/10 text-green-600 border-green-500/20" 
                              : ""}
                          >
                            {item.unit_price && item.unit_price > 0 
                              ? (isArabic ? "مسعر" : "Priced") 
                              : (isArabic ? "غير مسعر" : "Unpriced")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isArabic ? "start" : "end"}>
                              <DropdownMenuItem 
                                onClick={() => onQuickPrice(item.id)}
                                className="gap-2"
                              >
                                <DollarSign className="w-4 h-4" />
                                {isArabic ? "تسعير سريع" : "Quick Price"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onDetailedPrice(item)}
                                className="gap-2"
                              >
                                <History className="w-4 h-4" />
                                {isArabic ? "بحث تاريخي" : "Historical Lookup"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onDetailedPrice(item)}
                                className="gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                {isArabic ? "تسعير مفصل" : "Detailed Price"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => onEditItem(item)}
                                className="gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                {isArabic ? "تعديل" : "Edit"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onUnconfirmItem(item.id)}
                                className="gap-2"
                                disabled={!item.unit_price || item.unit_price === 0}
                              >
                                <XCircle className="w-4 h-4" />
                                {isArabic ? "إلغاء التحقق" : "Clear Price"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => onDeleteItem(item.id)}
                                className="gap-2 text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                                {isArabic ? "حذف" : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between mt-4 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {isArabic 
                    ? `عرض ${startIndex + 1}-${Math.min(startIndex + effectiveItemsPerPage, filteredItems.length)} من ${filteredItems.length} بند` 
                    : `Showing ${startIndex + 1}-${Math.min(startIndex + effectiveItemsPerPage, filteredItems.length)} of ${filteredItems.length} items`}
                </p>
                
                {/* Items Per Page Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? "بنود/صفحة:" : "Per page:"}
                  </span>
                  <Select
                    value={itemsPerPage >= filteredItems.length && itemsPerPage > 200 ? "all" : itemsPerPage.toString()}
                    onValueChange={onItemsPerPageChange}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    {isArabic ? "السابق" : "Previous"}
                  </Button>
                  <span className="text-sm">
                    {isArabic ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    {isArabic ? "التالي" : "Next"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

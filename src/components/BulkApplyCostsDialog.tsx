import { useState, useMemo } from "react";
import { Layers, Check, CheckSquare, Square, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { CostTemplate } from "@/hooks/useDynamicCostCalculator";
import { toast } from "sonner";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface BulkApplyCostsDialogProps {
  items: BOQItem[];
  savedTemplate: CostTemplate | null;
  onApplyToItems: (items: Array<{ itemId: string; quantity: number }>) => number;
  currency?: string;
}

export function BulkApplyCostsDialog({
  items,
  savedTemplate,
  onApplyToItems,
  currency = "SAR",
}: BulkApplyCostsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleToggleItem = (itemNumber: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemNumber)) {
        newSet.delete(itemNumber);
      } else {
        newSet.add(itemNumber);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.item_number)));
    }
  };

  const handleApply = () => {
    if (selectedItems.size === 0) {
      toast.error("يرجى اختيار بند واحد على الأقل");
      return;
    }

    const itemsToApply = items
      .filter(item => selectedItems.has(item.item_number))
      .map(item => ({ itemId: item.item_number, quantity: item.quantity }));

    const appliedCount = onApplyToItems(itemsToApply);
    
    if (appliedCount > 0) {
      toast.success(`تم تطبيق القالب على ${appliedCount} بند بنجاح`);
      setIsOpen(false);
      setSelectedItems(new Set());
    } else {
      toast.error("لم يتم تطبيق القالب");
    }
  };

  const formatNumber = (num: number) => num.toLocaleString('ar-SA', { maximumFractionDigits: 2 });

  const templateSummary = useMemo(() => {
    if (!savedTemplate) return null;
    
    const { costs } = savedTemplate;
    const totalLabor = costs.generalLabor + costs.equipmentOperator;
    const totalIndirect = costs.overhead + costs.admin + costs.insurance + costs.contingency;
    const totalDirect = costs.materials + costs.equipment + totalLabor + costs.subcontractor;
    const baseCost = totalDirect + totalIndirect;
    const profitAmount = baseCost * (costs.profitMargin / 100);
    const unitPrice = baseCost + profitAmount;

    return {
      totalLabor,
      totalIndirect,
      totalDirect,
      profitAmount,
      unitPrice,
      profitMargin: costs.profitMargin,
    };
  }, [savedTemplate]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          disabled={!savedTemplate}
        >
          <Layers className="w-4 h-4" />
          تطبيق على عدة بنود
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            تطبيق القالب على عدة بنود
          </DialogTitle>
          <DialogDescription>
            اختر البنود التي تريد تطبيق قالب التكاليف عليها
          </DialogDescription>
        </DialogHeader>

        {/* Template Summary */}
        {savedTemplate && templateSummary && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">القالب المحفوظ: {savedTemplate.name}</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">العمالة</div>
                  <div className="font-semibold">{formatNumber(templateSummary.totalLabor)} {currency}</div>
                </div>
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">غير مباشرة</div>
                  <div className="font-semibold">{formatNumber(templateSummary.totalIndirect)} {currency}</div>
                </div>
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">هامش الربح</div>
                  <div className="font-semibold">{templateSummary.profitMargin}%</div>
                </div>
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">سعر الوحدة</div>
                  <div className="font-bold text-primary">{formatNumber(templateSummary.unitPrice)} {currency}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!savedTemplate && (
          <Card className="border-dashed border-destructive/30 bg-destructive/5">
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">
                لا يوجد قالب محفوظ. يرجى حفظ قالب من أحد البنود أولاً.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Items Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">اختر البنود ({selectedItems.size} / {items.length})</span>
            <Button variant="ghost" size="sm" onClick={handleSelectAll} className="gap-1">
              {selectedItems.size === items.length ? (
                <>
                  <CheckSquare className="w-4 h-4" />
                  إلغاء تحديد الكل
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  تحديد الكل
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-2 space-y-1">
              {items.map((item) => (
                <div
                  key={item.item_number}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedItems.has(item.item_number)
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() => handleToggleItem(item.item_number)}
                >
                  <Checkbox
                    checked={selectedItems.has(item.item_number)}
                    onCheckedChange={() => handleToggleItem(item.item_number)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.item_number}
                      </Badge>
                      <span className="text-sm truncate">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>الكمية: {item.quantity} {item.unit}</span>
                      {item.unit_price && (
                        <span>السعر الحالي: {formatNumber(item.unit_price)} {currency}</span>
                      )}
                    </div>
                  </div>
                  {selectedItems.has(item.item_number) && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedItems.size > 0 && savedTemplate && templateSummary && (
              <span>
                الإجمالي المتوقع: {formatNumber(templateSummary.unitPrice * selectedItems.size)} {currency}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={selectedItems.size === 0 || !savedTemplate}
              className="gap-1"
            >
              <Check className="w-4 h-4" />
              تطبيق على {selectedItems.size} بند
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, Sparkles, Brain, History, DollarSign, TrendingUp } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

// These are the existing components we'll embed
import { AutoPriceDialog } from "@/components/project-details/AutoPriceDialog";
import { MarketRateSuggestions } from "./MarketRateSuggestions";
import { EnhancedPricingAnalysis } from "./EnhancedPricingAnalysis";
import { BulkHistoricalPricing } from "./BulkHistoricalPricing";

interface BOQItem {
  item_number: string;
  description: string;
  description_ar?: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface UnifiedPricingDialogProps {
  items: BOQItem[];
  savedProjectId?: string;
  currency: string;
  onApplyRate?: (itemNumber: string, newRate: number) => void;
  onApplyAIRates?: (rates: Array<{ itemId: string; rate: number }>) => void;
  onApplyAIRatesToCalcPrice?: (rates: Array<{ itemId: string; rate: number }>) => void;
  onApplyAutoPricing?: (items: { id: string; price: number; source: string }[]) => Promise<void>;
  onApplyHistoricalPrices?: (prices: Array<{ itemNumber: string; price: number }>) => void;
}

export function UnifiedPricingDialog({
  items,
  savedProjectId,
  currency,
  onApplyRate,
  onApplyAIRates,
  onApplyAIRatesToCalcPrice,
  onApplyAutoPricing,
  onApplyHistoricalPrices,
}: UnifiedPricingDialogProps) {
  const { isArabic } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("auto");
  const [showAutoPriceInline, setShowAutoPriceInline] = useState(false);

  const stats = useMemo(() => {
    const total = items.length;
    const priced = items.filter(i => (i.unit_price && i.unit_price > 0)).length;
    const unpriced = total - priced;
    const totalValue = items.reduce((sum, i) => sum + ((i.unit_price || 0) * (i.quantity || 0)), 0);
    return { total, priced, unpriced, totalValue };
  }, [items]);

  // Convert items for AutoPriceDialog format
  const projectItems = useMemo(() => items.map(i => ({
    id: i.item_number,
    item_number: i.item_number,
    description: i.description,
    description_ar: i.description_ar || null,
    unit: i.unit,
    quantity: i.quantity,
    unit_price: i.unit_price || null,
    total_price: i.total_price || null,
    category: i.category || null,
    subcategory: null,
    specifications: null,
    is_section: false,
    sort_order: null,
  })), [items]);

  const handleApplyAutoPricing = async (pricedItems: { id: string; price: number; source: string }[]) => {
    if (onApplyAutoPricing) {
      await onApplyAutoPricing(pricedItems);
    }
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-sm"
      >
        <Wand2 className="w-4 h-4" />
        <span className="hidden sm:inline">{isArabic ? "تسعير شامل" : "Unified Pricing"}</span>
        {stats.unpriced > 0 && (
          <Badge variant="secondary" className="ml-1 bg-white/20 text-white text-xs px-1.5">
            {stats.unpriced}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wand2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-lg">{isArabic ? "مركز التسعير الشامل" : "Unified Pricing Center"}</span>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="outline" className="text-xs gap-1">
                    <DollarSign className="w-3 h-3" />
                    {stats.priced}/{stats.total} {isArabic ? "مسعّر" : "priced"}
                  </Badge>
                  {stats.totalValue > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {stats.totalValue.toLocaleString()} {currency}
                    </Badge>
                  )}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-4 mb-4">
                <TabsTrigger value="auto" className="gap-1.5 text-xs sm:text-sm">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isArabic ? "تلقائي" : "Auto"}</span>
                </TabsTrigger>
                <TabsTrigger value="suggest" className="gap-1.5 text-xs sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isArabic ? "اقتراح AI" : "AI Suggest"}</span>
                </TabsTrigger>
                <TabsTrigger value="enhanced" className="gap-1.5 text-xs sm:text-sm">
                  <Brain className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isArabic ? "متقدم" : "Advanced"}</span>
                </TabsTrigger>
                <TabsTrigger value="historical" className="gap-1.5 text-xs sm:text-sm">
                  <History className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isArabic ? "تاريخي" : "Historical"}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="auto" className="mt-0">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {isArabic
                      ? "مطابقة تلقائية من المكتبة والأسعار المرجعية والتاريخية وعروض الأسعار"
                      : "Auto-match from library, reference prices, historical data & quotations"}
                  </p>
                  <Button onClick={() => setShowAutoPriceInline(true)} className="gap-2">
                    <Wand2 className="w-4 h-4" />
                    {isArabic ? "فتح التسعير التلقائي" : "Open Auto Pricing"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="suggest" className="mt-0">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {isArabic
                      ? "اقتراحات AI لأسعار السوق مع مستويات الثقة ومعاملات المدينة"
                      : "AI market rate suggestions with confidence levels and city factors"}
                  </p>
                  <MarketRateSuggestions
                    items={items}
                    projectId={savedProjectId}
                    onApplyRate={onApplyRate}
                    onApplyAIRates={onApplyAIRates}
                    onApplyAIRatesToCalcPrice={onApplyAIRatesToCalcPrice}
                  />
                </div>
              </TabsContent>

              <TabsContent value="enhanced" className="mt-0">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {isArabic
                      ? "تحليل متعدد المحللات (خبير بناء + محلل سوق + مهندس كميات + قاعدة تاريخية)"
                      : "Multi-analyzer pricing (Construction Expert + Market Analyst + QS + Historical DB)"}
                  </p>
                  <EnhancedPricingAnalysis
                    items={items}
                    onApplyRates={onApplyAIRates}
                  />
                </div>
              </TabsContent>

              <TabsContent value="historical" className="mt-0">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {isArabic
                      ? "مقارنة شاملة مع الأسعار التاريخية من مشاريعك السابقة (3 مصادر)"
                      : "Bulk comparison with historical prices from your past projects (3 sources)"}
                  </p>
                  <BulkHistoricalPricing
                    items={items}
                    onApplyPrices={(prices) => {
                      if (onApplyHistoricalPrices) onApplyHistoricalPrices(prices);
                    }}
                    currency={currency}
                    currentProjectId={savedProjectId}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="px-6 py-3 border-t bg-muted/30">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{isArabic ? `إجمالي البنود: ${stats.total}` : `Total items: ${stats.total}`}</span>
                <span className="text-emerald-600">
                  {isArabic ? `مسعّر: ${stats.priced}` : `Priced: ${stats.priced}`}
                </span>
                <span className="text-amber-600">
                  {isArabic ? `غير مسعّر: ${stats.unpriced}` : `Unpriced: ${stats.unpriced}`}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                {isArabic ? "إغلاق" : "Close"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AutoPrice Dialog (standalone) */}
      {showAutoPriceInline && (
        <AutoPriceDialog
          isOpen={showAutoPriceInline}
          onClose={() => setShowAutoPriceInline(false)}
          items={projectItems}
          onApplyPricing={handleApplyAutoPricing}
          isArabic={isArabic}
          currency={currency}
        />
      )}
    </>
  );
}

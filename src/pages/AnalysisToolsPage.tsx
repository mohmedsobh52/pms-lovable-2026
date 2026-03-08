import { useMemo } from "react";
import { BOQComparison } from "@/components/BOQComparison";
import { MarketRateSuggestions } from "@/components/MarketRateSuggestions";
import { CostAnalysis } from "@/components/CostAnalysis";
import { AIVsLocalPriceComparison } from "@/components/AIVsLocalPriceComparison";
import { InfraDepthPricing } from "@/components/InfraDepthPricing";
import { RoadLayersPricing } from "@/components/RoadLayersPricing";
import { NetworkPricing } from "@/components/NetworkPricing";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  Database, DollarSign, FileStack, TrendingUp,
  Shovel, Route, Droplets, BarChart3, CheckCircle, AlertCircle, Calculator
} from "lucide-react";

const AnalysisToolsPage = () => {
  const { analysisData, setAnalysisData } = useAnalysisData();
  const { isArabic } = useLanguage();

  const items = analysisData?.items || [];
  const totalItems = items.length;
  const pricedItems = items.filter((i: any) => i.unit_price && i.unit_price > 0).length;
  const unpricedItems = totalItems - pricedItems;
  const avgPrice = pricedItems > 0
    ? items.reduce((s: number, i: any) => s + (i.unit_price || 0), 0) / pricedItems
    : 0;

  const handleApplyRate = (itemNumber: string, rate: number) => {
    if (!analysisData?.items) return;
    const updatedItems = analysisData.items.map((item: any) => {
      if (item.item_number === itemNumber) {
        return { ...item, unit_price: rate, total_price: (item.quantity || 1) * rate };
      }
      return item;
    });
    setAnalysisData({ ...analysisData, items: updatedItems });
  };

  const suggestions = useMemo<SmartSuggestion[]>(() => {
    const s: SmartSuggestion[] = [];
    if (totalItems === 0) {
      s.push({
        id: "no-items",
        icon: <AlertCircle className="h-4 w-4" />,
        text: isArabic ? "لا توجد بنود — ارفع ملف BOQ لبدء التحليل" : "No items — upload a BOQ file to start",
        action: () => {},
        actionLabel: isArabic ? "رفع ملف" : "Upload",
      });
    }
    if (unpricedItems > 0) {
      s.push({
        id: "unpriced",
        icon: <DollarSign className="h-4 w-4" />,
        text: isArabic ? `${unpricedItems} بند بدون تسعير — استخدم أسعار السوق أو المقارنة` : `${unpricedItems} unpriced items — use market rates`,
        action: () => {},
        actionLabel: isArabic ? "تسعير" : "Price",
      });
    }
    if (totalItems > 0 && pricedItems === totalItems) {
      s.push({
        id: "all-priced",
        icon: <CheckCircle className="h-4 w-4" />,
        text: isArabic ? "جميع البنود مسعّرة — جرّب أدوات البنية التحتية" : "All items priced — try infrastructure tools",
        action: () => {},
        actionLabel: isArabic ? "استكشاف" : "Explore",
      });
    }
    return s;
  }, [totalItems, unpricedItems, pricedItems, isArabic]);

  const kpiCards = [
    { label: isArabic ? "إجمالي البنود" : "Total Items", value: totalItems, icon: BarChart3, color: "text-primary" },
    { label: isArabic ? "بنود مسعّرة" : "Priced", value: pricedItems, icon: CheckCircle, color: "text-green-600" },
    { label: isArabic ? "غير مسعّرة" : "Unpriced", value: unpricedItems, icon: AlertCircle, color: "text-destructive" },
    { label: isArabic ? "متوسط السعر" : "Avg. Price", value: avgPrice.toLocaleString("en-US", { maximumFractionDigits: 0 }), icon: Calculator, color: "text-primary" },
  ];

  return (
    <PageLayout>
      <PageHeader
        icon={TrendingUp}
        title={isArabic ? "أدوات التحليل والتسعير" : "Analysis & Pricing Tools"}
        subtitle={isArabic ? "تحليل التكاليف وتسعير البنية التحتية المتكاملة" : "Cost analysis & integrated infrastructure pricing"}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {kpiCards.map((card, i) => (
          <Card key={i} className="border-primary/10">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <card.icon className={`h-8 w-8 ${card.color}`} />
              <div>
                <div className="text-xl font-bold">{card.value}</div>
                <div className="text-xs text-muted-foreground">{card.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Suggestions */}
      <div className="mb-4">
        <SmartSuggestionsBanner suggestions={suggestions} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cost-analysis" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto tabs-navigation-safe">
          <TabsTrigger value="cost-analysis" className="flex items-center gap-1.5 text-xs md:text-sm">
            <DollarSign className="h-4 w-4" />
            {isArabic ? "تكاليف" : "Costs"}
          </TabsTrigger>
          <TabsTrigger value="price-comparison" className="flex items-center gap-1.5 text-xs md:text-sm">
            <Database className="h-4 w-4" />
            {isArabic ? "مقارنة" : "Compare"}
          </TabsTrigger>
          <TabsTrigger value="boq-compare" className="flex items-center gap-1.5 text-xs md:text-sm">
            <FileStack className="h-4 w-4" />
            BOQ
          </TabsTrigger>
          <TabsTrigger value="market-rates" className="flex items-center gap-1.5 text-xs md:text-sm">
            <TrendingUp className="h-4 w-4" />
            {isArabic ? "سوق" : "Market"}
          </TabsTrigger>
          <TabsTrigger value="excavation" className="flex items-center gap-1.5 text-xs md:text-sm">
            <Shovel className="h-4 w-4" />
            {isArabic ? "حفر" : "Excavation"}
          </TabsTrigger>
          <TabsTrigger value="roads" className="flex items-center gap-1.5 text-xs md:text-sm">
            <Route className="h-4 w-4" />
            {isArabic ? "طرق" : "Roads"}
          </TabsTrigger>
          <TabsTrigger value="networks" className="flex items-center gap-1.5 text-xs md:text-sm">
            <Droplets className="h-4 w-4" />
            {isArabic ? "شبكات" : "Networks"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cost-analysis">
          <CostAnalysis items={items} currency={analysisData?.summary?.currency || "SAR"} />
        </TabsContent>
        <TabsContent value="price-comparison">
          <AIVsLocalPriceComparison items={items} onApplyLocalPrice={handleApplyRate} onApplyAIPrice={handleApplyRate} />
        </TabsContent>
        <TabsContent value="boq-compare">
          <BOQComparison />
        </TabsContent>
        <TabsContent value="market-rates">
          <MarketRateSuggestions items={items} onApplyRate={handleApplyRate} />
        </TabsContent>
        <TabsContent value="excavation">
          <InfraDepthPricing />
        </TabsContent>
        <TabsContent value="roads">
          <RoadLayersPricing />
        </TabsContent>
        <TabsContent value="networks">
          <NetworkPricing />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default AnalysisToolsPage;

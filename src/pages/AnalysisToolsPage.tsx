import { BOQComparison } from "@/components/BOQComparison";
import { MarketRateSuggestions } from "@/components/MarketRateSuggestions";
import { CostAnalysis } from "@/components/CostAnalysis";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";

const AnalysisToolsPage = () => {
  const { analysisData, setAnalysisData } = useAnalysisData();
  const { isArabic } = useLanguage();

  const handleApplyRate = (itemNumber: string, rate: number) => {
    if (!analysisData?.items) return;
    
    const updatedItems = analysisData.items.map((item: any) => {
      if (item.item_number === itemNumber) {
        return {
          ...item,
          unit_price: rate,
          total_price: (item.quantity || 1) * rate
        };
      }
      return item;
    });

    setAnalysisData({
      ...analysisData,
      items: updatedItems
    });
  };

  return (
    <PageLayout>
      <Tabs defaultValue="cost-analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cost-analysis">
            {isArabic ? "تحليل التكاليف" : "Cost Analysis"}
          </TabsTrigger>
          <TabsTrigger value="boq-compare">
            {isArabic ? "مقارنة BOQ" : "BOQ Compare"}
          </TabsTrigger>
          <TabsTrigger value="market-rates">
            {isArabic ? "أسعار السوق" : "Market Rates"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cost-analysis">
          <CostAnalysis 
            items={analysisData?.items || []} 
            currency={analysisData?.summary?.currency || "SAR"} 
          />
        </TabsContent>
        <TabsContent value="boq-compare">
          <BOQComparison />
        </TabsContent>
        <TabsContent value="market-rates">
          <MarketRateSuggestions 
            items={analysisData?.items || []}
            onApplyRate={handleApplyRate}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default AnalysisToolsPage;

import { ComprehensiveReport } from "@/components/ComprehensiveReport";
import { BOQVersionComparison } from "@/components/BOQVersionComparison";
import { P6Export } from "@/components/P6Export";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";

const ReportsPage = () => {
  const { analysisData, wbsData } = useAnalysisData();
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <Tabs defaultValue="comprehensive" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comprehensive">
            {isArabic ? "التقرير الشامل" : "Comprehensive Report"}
          </TabsTrigger>
          <TabsTrigger value="version-compare">
            {isArabic ? "مقارنة الإصدارات" : "Version Compare"}
          </TabsTrigger>
          <TabsTrigger value="p6-export">
            {isArabic ? "تصدير P6" : "P6 Export"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="comprehensive">
          <ComprehensiveReport 
            analysisData={analysisData}
            wbsData={wbsData}
          />
        </TabsContent>
        <TabsContent value="version-compare">
          <BOQVersionComparison 
            currentItems={analysisData?.items || []}
            currentTotalValue={analysisData?.summary?.total_value}
          />
        </TabsContent>
        <TabsContent value="p6-export">
          <P6Export 
            items={analysisData?.items || []}
            currency={analysisData?.summary?.currency || "SAR"}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default ReportsPage;

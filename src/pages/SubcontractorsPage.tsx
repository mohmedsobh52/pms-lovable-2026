import { SubcontractorManagement } from "@/components/SubcontractorManagement";
import { SubcontractorBOQLink } from "@/components/SubcontractorBOQLink";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";

const SubcontractorsPage = () => {
  const { analysisData } = useAnalysisData();
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <Tabs defaultValue="management" className="space-y-4">
        <TabsList>
          <TabsTrigger value="management">
            {isArabic ? "إدارة المقاولين" : "Management"}
          </TabsTrigger>
          <TabsTrigger value="boq-link">
            {isArabic ? "ربط بالبنود" : "BOQ Link"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="management">
          <SubcontractorManagement />
        </TabsContent>
        <TabsContent value="boq-link">
          <SubcontractorBOQLink 
            boqItems={analysisData?.items || []} 
            projectId={undefined}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default SubcontractorsPage;

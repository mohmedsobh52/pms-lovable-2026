import { ProcurementResourcesSchedule } from "@/components/ProcurementResourcesSchedule";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { PageLayout } from "@/components/PageLayout";

const ProcurementPage = () => {
  const { analysisData } = useAnalysisData();

  return (
    <PageLayout>
      <ProcurementResourcesSchedule 
        items={analysisData?.items || []} 
        currency={analysisData?.summary?.currency || "SAR"} 
      />
    </PageLayout>
  );
};

export default ProcurementPage;

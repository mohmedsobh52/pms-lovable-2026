import { MainDashboard } from "@/components/MainDashboard";
import { MainDashboardOverview } from "@/components/MainDashboardOverview";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { PageLayout } from "@/components/PageLayout";

const DashboardPage = () => {
  const { user } = useAuth();
  const { setAnalysisData, setWbsData } = useAnalysisData();

  if (!user) {
    return (
      <PageLayout>
        <MainDashboardOverview />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <MainDashboard 
        onLoadProject={(loadedAnalysis, loadedWbs, projectId) => {
          setAnalysisData(loadedAnalysis);
          setWbsData(loadedWbs);
        }}
      />
    </PageLayout>
  );
};

export default DashboardPage;

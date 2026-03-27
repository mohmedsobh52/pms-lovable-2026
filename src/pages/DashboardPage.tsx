import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainDashboard } from "@/components/MainDashboard";
import { MainDashboardOverview } from "@/components/MainDashboardOverview";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import { Upload, FolderOpen, BarChart3, Settings } from "lucide-react";

const DashboardPage = () => {
  const { user } = useAuth();
  const { analysisData, setAnalysisData, setWbsData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const suggestions = useMemo((): SmartSuggestion[] => {
    const list: SmartSuggestion[] = [];
    if (!user) return list;
    if (!analysisData?.items?.length) {
      list.push({
        id: 'upload-boq',
        icon: <Upload className="h-4 w-4" />,
        text: isArabic ? 'ابدأ بتحميل ملف BOQ لتحليله' : 'Start by uploading a BOQ file for analysis',
        action: () => navigate('/projects'),
        actionLabel: isArabic ? 'تحميل' : 'Upload',
      });
      list.push({
        id: 'open-saved',
        icon: <FolderOpen className="h-4 w-4" />,
        text: isArabic ? 'افتح مشروعاً محفوظاً سابقاً' : 'Open a previously saved project',
        action: () => navigate('/saved-projects'),
        actionLabel: isArabic ? 'المشاريع' : 'Projects',
      });
    } else {
      list.push({
        id: 'view-reports',
        icon: <BarChart3 className="h-4 w-4" />,
        text: isArabic ? 'اطلع على التقارير والتحليلات' : 'View reports and analytics',
        action: () => navigate('/reports'),
        actionLabel: isArabic ? 'التقارير' : 'Reports',
      });
    }
    return list;
  }, [user, analysisData, isArabic, navigate]);

  if (!user) {
    return (
      <PageLayout>
        <MainDashboardOverview />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SmartSuggestionsBanner suggestions={suggestions} />
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

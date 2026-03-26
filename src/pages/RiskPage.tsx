import { RiskManagement } from "@/components/RiskManagement";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { AlertTriangle, ShieldCheck, FileText, TrendingUp } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const RiskPage = () => {
  const { isArabic } = useLanguage();
  const { analysisData } = useAnalysisData();
  const navigate = useNavigate();

  const suggestions = useMemo((): SmartSuggestion[] => {
    const list: SmartSuggestion[] = [];
    if (!analysisData?.items?.length) {
      list.push({ id: 'no_data', icon: <FileText className="h-4 w-4" />, text: isArabic ? 'حمّل بيانات مشروع أولاً لتحليل المخاطر بدقة' : 'Load project data first for accurate risk analysis', action: () => navigate('/projects'), actionLabel: isArabic ? 'المشاريع' : 'Projects' });
    }
    list.push({ id: 'ai_risk', icon: <ShieldCheck className="h-4 w-4" />, text: isArabic ? 'استخدم التحليل الذكي لاكتشاف المخاطر تلقائياً' : 'Use AI analysis to detect risks automatically', action: () => {}, actionLabel: isArabic ? 'تحليل' : 'Analyze' });
    if (analysisData?.items?.length) {
      list.push({ id: 'report', icon: <TrendingUp className="h-4 w-4" />, text: isArabic ? 'صدّر تقرير المخاطر كملف PDF' : 'Export risk report as PDF', action: () => {}, actionLabel: isArabic ? 'تصدير' : 'Export' });
    }
    return list.slice(0, 3);
  }, [analysisData, isArabic, navigate]);

  return (
    <PageLayout>
      <PageHeader
        icon={AlertTriangle}
        title={isArabic ? "إدارة المخاطر" : "Risk Management"}
        subtitle={isArabic ? "تقييم وتحليل ومتابعة المخاطر" : "Assess, analyze and monitor risks"}
      />
      <SmartSuggestionsBanner suggestions={suggestions} />
      <RiskManagement />
    </PageLayout>
  );
};

export default RiskPage;

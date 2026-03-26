import { P6Export } from "@/components/P6Export";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import { useMemo } from "react";
import { FileText, Calendar, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

const P6ExportPage = () => {
  const { analysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const suggestions = useMemo((): SmartSuggestion[] => {
    const list: SmartSuggestion[] = [];
    if (!analysisData?.items?.length) {
      list.push({ id: 'no_data', icon: <Upload className="h-4 w-4" />, text: isArabic ? 'حمّل بيانات BOQ أولاً لتصدير الجدول الزمني' : 'Load BOQ data first to export schedule', action: () => navigate('/projects'), actionLabel: isArabic ? 'المشاريع' : 'Projects' });
    } else {
      list.push({ id: 'export_p6', icon: <Calendar className="h-4 w-4" />, text: isArabic ? 'صدّر الجدول الزمني بصيغة P6 XML' : 'Export schedule in P6 XML format', action: () => {}, actionLabel: isArabic ? 'تصدير' : 'Export' });
    }
    return list;
  }, [analysisData, isArabic, navigate]);

  return (
    <PageLayout>
      <SmartSuggestionsBanner suggestions={suggestions} />
      <P6Export
        items={analysisData?.items || []} 
        currency={analysisData?.summary?.currency || "SAR"} 
      />
    </PageLayout>
  );
};

export default P6ExportPage;

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BOQVersionComparison } from "@/components/BOQVersionComparison";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import { Upload, GitCompare } from "lucide-react";

const CompareVersionsPage = () => {
  const { analysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const suggestions = useMemo((): SmartSuggestion[] => {
    const list: SmartSuggestion[] = [];
    if (!analysisData?.items?.length) {
      list.push({
        id: 'no-data',
        icon: <Upload className="h-4 w-4" />,
        text: isArabic ? 'حمّل بيانات BOQ أولاً للمقارنة' : 'Load BOQ data first to compare versions',
        action: () => navigate('/projects'),
        actionLabel: isArabic ? 'تحميل' : 'Upload',
      });
    } else {
      list.push({
        id: 'compare-tip',
        icon: <GitCompare className="h-4 w-4" />,
        text: isArabic ? 'حمّل نسخة ثانية من BOQ لمقارنة الفروقات' : 'Upload a second BOQ version to compare differences',
        action: () => {},
        actionLabel: isArabic ? 'مقارنة' : 'Compare',
      });
    }
    return list;
  }, [analysisData, isArabic, navigate]);

  return (
    <PageLayout>
      <SmartSuggestionsBanner suggestions={suggestions} />
      <BOQVersionComparison 
        currentItems={analysisData?.items || []}
        currentTotalValue={analysisData?.summary?.total_value}
      />
    </PageLayout>
  );
};

export default CompareVersionsPage;

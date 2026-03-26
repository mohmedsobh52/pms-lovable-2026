import { BOQTemplates } from "@/components/BOQTemplates";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/PageLayout";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import { useMemo } from "react";
import { FileText, Upload, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TemplatesPage = () => {
  const { analysisData, setAnalysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const suggestions = useMemo((): SmartSuggestion[] => {
    const list: SmartSuggestion[] = [];
    if (!analysisData?.items?.length) {
      list.push({ id: 'no_items', icon: <Upload className="h-4 w-4" />, text: isArabic ? 'اختر قالباً لبدء مشروع جديد بسرعة' : 'Pick a template to quickly start a new project', action: () => {}, actionLabel: isArabic ? 'اختيار' : 'Choose' });
    } else {
      list.push({ id: 'save_template', icon: <FileText className="h-4 w-4" />, text: isArabic ? 'احفظ بنودك الحالية كقالب لإعادة استخدامها' : 'Save current items as a reusable template', action: () => {}, actionLabel: isArabic ? 'حفظ' : 'Save' });
    }
    list.push({ id: 'ai_template', icon: <Sparkles className="h-4 w-4" />, text: isArabic ? 'أنشئ قالباً ذكياً بالذكاء الاصطناعي' : 'Generate a smart template with AI', action: () => {}, actionLabel: isArabic ? 'إنشاء' : 'Generate' });
    return list.slice(0, 3);
  }, [analysisData, isArabic]);

  return (
    <PageLayout>
      <SmartSuggestionsBanner suggestions={suggestions} />
      <BOQTemplates
        currentItems={analysisData?.items || []}
        onUseTemplate={(items) => {
          setAnalysisData(prev => prev ? { ...prev, items } : { items, summary: {} });
          toast({
            title: isArabic ? "تم تطبيق القالب" : "Template Applied",
            description: isArabic ? "تم استيراد بنود القالب" : "Template items imported"
          });
        }}
      />
    </PageLayout>
  );
};

export default TemplatesPage;

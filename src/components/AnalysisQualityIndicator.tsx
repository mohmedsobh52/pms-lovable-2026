import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, CheckCircle, FileText, Tag, Ruler, Hash, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface BOQItem {
  item_number: string;
  description: string;
  description_ar?: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface AnalysisQualityIndicatorProps {
  items: BOQItem[];
  onEnhanceWithAI?: () => void;
  isEnriching?: boolean;
}

interface QualityMetric {
  label: string;
  labelAr: string;
  score: number;
  weight: number;
  icon: React.ReactNode;
  recommendation?: string;
  recommendationAr?: string;
}

export function AnalysisQualityIndicator({ items, onEnhanceWithAI, isEnriching }: AnalysisQualityIndicatorProps) {
  const { isArabic } = useLanguage();

  const { qualityScore, metrics, recommendations } = useMemo(() => {
    if (!items || items.length === 0) return { qualityScore: 0, metrics: [], recommendations: [] };

    const total = items.length;

    // 1. Description completeness (bilingual)
    const withBilingualDesc = items.filter(i => 
      i.description && i.description.trim().length > 3 &&
      i.description_ar && /[\u0600-\u06FF]/.test(i.description_ar)
    ).length;
    const descScore = withBilingualDesc / total;

    // 2. Category completeness
    const withCategory = items.filter(i => i.category && i.category.trim().length > 0).length;
    const catScore = withCategory / total;

    // 3. Unit completeness
    const validUnits = new Set(["m", "m2", "m3", "kg", "ton", "no", "ls", "day", "hr", "set", "roll", "l.m", "sqm", "cum", "ea", "pcs", "م", "م2", "م3", "كجم", "طن", "عدد", "مقطوع", "يوم"]);
    const withValidUnit = items.filter(i => {
      if (!i.unit) return false;
      const u = i.unit.toLowerCase().trim();
      return u.length > 0 && (validUnits.has(u) || u.length <= 10);
    }).length;
    const unitScore = withValidUnit / total;

    // 4. Quantity > 0
    const withQuantity = items.filter(i => i.quantity > 0).length;
    const qtyScore = withQuantity / total;

    // 5. Pricing completeness
    const withPrice = items.filter(i => (i.unit_price && i.unit_price > 0) || (i.total_price && i.total_price > 0)).length;
    const priceScore = withPrice / total;

    const metricsArr: QualityMetric[] = [
      { label: "Descriptions", labelAr: "الأوصاف", score: descScore, weight: 0.25, icon: <FileText className="w-3.5 h-3.5" />, recommendation: "Add bilingual descriptions", recommendationAr: "أضف أوصاف ثنائية اللغة" },
      { label: "Categories", labelAr: "التصنيفات", score: catScore, weight: 0.20, icon: <Tag className="w-3.5 h-3.5" />, recommendation: "Classify items using AI", recommendationAr: "صنّف البنود باستخدام AI" },
      { label: "Units", labelAr: "الوحدات", score: unitScore, weight: 0.15, icon: <Ruler className="w-3.5 h-3.5" />, recommendation: "Verify measurement units", recommendationAr: "تحقق من وحدات القياس" },
      { label: "Quantities", labelAr: "الكميات", score: qtyScore, weight: 0.15, icon: <Hash className="w-3.5 h-3.5" />, recommendation: "Add missing quantities", recommendationAr: "أضف الكميات الناقصة" },
      { label: "Pricing", labelAr: "التسعير", score: priceScore, weight: 0.25, icon: <DollarSign className="w-3.5 h-3.5" />, recommendation: "Use Unified Pricing", recommendationAr: "استخدم التسعير الشامل" },
    ];

    const overall = metricsArr.reduce((sum, m) => sum + m.score * m.weight, 0) * 100;
    const recs = metricsArr.filter(m => m.score < 0.7).map(m => isArabic ? m.recommendationAr! : m.recommendation!);

    return { qualityScore: Math.round(overall), metrics: metricsArr, recommendations: recs };
  }, [items, isArabic]);

  const getColor = (score: number) => {
    if (score >= 80) return { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" };
    if (score >= 50) return { bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" };
    return { bg: "bg-red-500", text: "text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-800" };
  };

  const colors = getColor(qualityScore);

  if (!items || items.length === 0) return null;

  return (
    <div className={cn("p-4 rounded-xl border bg-card/50 backdrop-blur-sm", colors.border)}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Score + Label */}
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center justify-center w-12 h-12 rounded-full border-2", colors.border)}>
            <span className={cn("text-lg font-bold", colors.text)}>{qualityScore}%</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              {qualityScore >= 80 ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
              <span className="font-semibold text-sm">
                {isArabic ? "جودة التحليل" : "Analysis Quality"}
              </span>
              <Badge variant="secondary" className="text-xs">
                {qualityScore >= 80 ? (isArabic ? "ممتاز" : "Excellent") : qualityScore >= 50 ? (isArabic ? "متوسط" : "Fair") : (isArabic ? "ضعيف" : "Poor")}
              </Badge>
            </div>
            <Progress value={qualityScore} className="h-2 w-40 mt-1" />
          </div>
        </div>

        {/* Metric pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs">
              {m.icon}
              <span className="text-muted-foreground">{isArabic ? m.labelAr : m.label}:</span>
              <span className={cn("font-medium", m.score >= 0.7 ? "text-emerald-600 dark:text-emerald-400" : m.score >= 0.4 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
                {Math.round(m.score * 100)}%
              </span>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && qualityScore < 90 && (
          <div className="flex items-center gap-2 flex-wrap">
            {recommendations.slice(0, 2).map((rec, i) => (
              <Badge key={i} variant="outline" className="text-xs gap-1 font-normal">
                <Sparkles className="w-3 h-3" />
                {rec}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

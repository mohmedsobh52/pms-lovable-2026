import { useState } from "react";
import { Eye, EyeOff, FileText, Users, ClipboardList, DollarSign, Calendar, Sparkles, Building2, FolderOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: React.ReactNode;
  source: "library" | "ai";
  enabled: boolean;
}

const initialSections: Section[] = [
  {
    id: "company-profile",
    titleAr: "ملف الشركة",
    titleEn: "Company Profile",
    descriptionAr: "نظرة عامة على الشركة، التراخيص، رقم السجل التجاري، الشهادات وسنوات الخبرة",
    descriptionEn: "Company overview, licenses, commercial registration, certificates and experience",
    icon: <Building2 className="w-5 h-5" />,
    source: "library",
    enabled: true,
  },
  {
    id: "previous-projects",
    titleAr: "المشاريع السابقة",
    titleEn: "Previous Projects",
    descriptionAr: "مشاريع مكتملة مماثلة مع مراجع العملاء والقيم والصور",
    descriptionEn: "Similar completed projects with client references, values and images",
    icon: <FolderOpen className="w-5 h-5" />,
    source: "library",
    enabled: true,
  },
  {
    id: "team",
    titleAr: "الفريق",
    titleEn: "Team",
    descriptionAr: "السير الذاتية للأفراد الرئيسيين، المهندسين، مديري المشاريع وأفراد السلامة",
    descriptionEn: "CVs of key personnel, engineers, project managers and safety officers",
    icon: <Users className="w-5 h-5" />,
    source: "library",
    enabled: true,
  },
  {
    id: "methodology",
    titleAr: "المنهجية",
    titleEn: "Methodology",
    descriptionAr: "منهجية البناء، استراتيجية المراحل، توريد المواد",
    descriptionEn: "Construction methodology, phasing strategy, material procurement",
    icon: <Sparkles className="w-5 h-5" />,
    source: "ai",
    enabled: true,
  },
  {
    id: "boq-summary",
    titleAr: "ملخص جدول الكميات",
    titleEn: "BOQ Summary",
    descriptionAr: "بنود جدول الكميات مجمعة حسب الفئة مع الإجماليات",
    descriptionEn: "BOQ items grouped by category with totals",
    icon: <ClipboardList className="w-5 h-5" />,
    source: "library",
    enabled: true,
  },
  {
    id: "pricing-summary",
    titleAr: "ملخص التسعير / العطاء",
    titleEn: "Pricing / Tender Summary",
    descriptionAr: "التكاليف المباشرة وغير المباشرة والنفقات العامة والأرباح وسعر العطاء النهائي",
    descriptionEn: "Direct and indirect costs, overheads, profits and final tender price",
    icon: <DollarSign className="w-5 h-5" />,
    source: "library",
    enabled: true,
  },
  {
    id: "project-schedule",
    titleAr: "جدول المشروع",
    titleEn: "Project Schedule",
    descriptionAr: "جدول زمني مع المعالم الرئيسية والمراحل والمدد المقدرة",
    descriptionEn: "Timeline with key milestones, phases and estimated durations",
    icon: <Calendar className="w-5 h-5" />,
    source: "ai",
    enabled: true,
  },
  {
    id: "summary-conclusion",
    titleAr: "الملخص والختام",
    titleEn: "Summary & Conclusion",
    descriptionAr: "ملخص ختامي يبرز نقاط قوة الشركة والتزامها بتنفيذ المشروع",
    descriptionEn: "Closing summary highlighting company strengths and commitment",
    icon: <FileText className="w-5 h-5" />,
    source: "ai",
    enabled: true,
  },
];

interface TechnicalOfferSectionsProps {
  onBack: () => void;
}

export function TechnicalOfferSections({ onBack }: TechnicalOfferSectionsProps) {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>(initialSections);

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const allSelected = sections.every(s => s.enabled);

  const toggleAll = () => {
    const newState = !allSelected;
    setSections(prev => prev.map(s => ({ ...s, enabled: newState })));
  };

  const enabledCount = sections.filter(s => s.enabled).length;

  const handleContinue = () => {
    const selectedSections = sections.filter(s => s.enabled).map(s => s.id);
    // Store selected sections and navigate - for now show toast
    navigate("/projects/new", { state: { technicalOfferSections: selectedSections } });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1 space-y-1">
          <h2 className="text-2xl font-bold">
            {isArabic ? "اختيار الأقسام" : "Select Sections"}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            {isArabic
              ? "حدد الأقسام التي تريد تضمينها في عرضك الفني. قم بتفعيل الأقسام التي تحتاجها. يوضح مصدر البيانات من أين سأجلب المحتوى."
              : "Select the sections to include in your technical offer. Enable the sections you need. Data source shows where content will be pulled from."}
          </p>
        </div>
      </div>

      {/* Select/Deselect All */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={toggleAll} className="text-primary font-medium">
          {allSelected
            ? (isArabic ? "إلغاء تحديد الكل" : "Deselect All")
            : (isArabic ? "تحديد الكل" : "Select All")}
        </Button>
      </div>

      {/* Sections List */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.id}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer",
              section.enabled
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-card opacity-60"
            )}
            onClick={() => toggleSection(section.id)}
          >
            {/* Toggle */}
            <Switch
              checked={section.enabled}
              onCheckedChange={() => toggleSection(section.id)}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Icon */}
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              section.source === "ai"
                ? "bg-primary/15 text-primary"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            )}>
              {section.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 justify-end flex-row-reverse sm:flex-row sm:justify-start">
                <h3 className="font-semibold text-sm">
                  {isArabic ? section.titleAr : section.titleEn}
                </h3>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs shrink-0",
                    section.source === "ai"
                    ? "border-primary/40 text-primary bg-primary/10"
                      : "border-accent text-accent-foreground bg-accent/50"
                  )}
                >
                  {section.source === "ai"
                    ? (isArabic ? "مولد بالذكاء الاصطناعي" : "AI Generated")
                    : (isArabic ? "من المكتبة" : "From Library")}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs mt-1">
                {isArabic ? section.descriptionAr : section.descriptionEn}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <Button size="lg" className="px-12" onClick={handleContinue} disabled={enabledCount === 0}>
          {isArabic ? "المتابعة إلى العرض الفني" : "Continue to Technical Offer"}
          {enabledCount > 0 && (
            <Badge variant="secondary" className="ms-2 text-xs">
              {enabledCount}/{sections.length}
            </Badge>
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 me-1" />
          {isArabic ? "رجوع" : "Back"}
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, Building2, FolderOpen, Users, Lightbulb, ClipboardList, DollarSign, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";

interface Section {
  id: string;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ReactNode;
  source: "library" | "ai";
  enabled: boolean;
}

const defaultSections: Section[] = [
  { id: "company_profile", label: "Company Profile", labelAr: "ملف الشركة", description: "Company overview, licenses, commercial registration, certificates and years of experience", descriptionAr: "نظرة عامة على الشركة، التراخيص، رقم السجل التجاري، الشهادات وسنوات الخبرة", icon: <Building2 className="w-5 h-5" />, source: "library", enabled: true },
  { id: "previous_projects", label: "Previous Projects", labelAr: "المشاريع السابقة", description: "Completed similar projects with client references, values and photos", descriptionAr: "مشاريع مكتملة مماثلة مع مراجع العملاء والقيم والصور", icon: <FolderOpen className="w-5 h-5" />, source: "library", enabled: true },
  { id: "team", label: "Team", labelAr: "الفريق", description: "CVs of key personnel, engineers, project managers and safety staff", descriptionAr: "السير الذاتية للأفراد الرئيسيين، المهندسين، مديري المشاريع وأفراد السلامة", icon: <Users className="w-5 h-5" />, source: "library", enabled: true },
  { id: "methodology", label: "Methodology", labelAr: "المنهجية", description: "Construction methodology, phasing strategy, material supply", descriptionAr: "منهجية البناء، استراتيجية المراحل، توريد المواد", icon: <Lightbulb className="w-5 h-5" />, source: "ai", enabled: true },
  { id: "boq_summary", label: "BOQ Summary", labelAr: "ملخص جدول الكميات", description: "BOQ items grouped by category with totals", descriptionAr: "بنود جدول الكميات مجمعة حسب الفئة مع الإجماليات", icon: <ClipboardList className="w-5 h-5" />, source: "library", enabled: true },
  { id: "pricing_summary", label: "Pricing Summary / Bid", labelAr: "ملخص التسعير / العطاء", description: "Direct and indirect costs, overheads, profit and final bid price", descriptionAr: "التكاليف المباشرة وغير المباشرة والنفقات العامة والأرباح وسعر العطاء النهائي", icon: <DollarSign className="w-5 h-5" />, source: "library", enabled: true },
  { id: "project_schedule", label: "Project Schedule", labelAr: "جدول المشروع", description: "Timeline with key milestones, phases and estimated durations", descriptionAr: "جدول زمني مع المعالم الرئيسية والمراحل والمدد المقدرة", icon: <CalendarDays className="w-5 h-5" />, source: "ai", enabled: true },
  { id: "summary_conclusion", label: "Summary & Conclusion", labelAr: "الملخص والختام", description: "Final summary highlighting company strengths and commitment to project execution", descriptionAr: "ملخص ختامي يبرز نقاط قوة الشركة والتزامها بتنفيذ المشروع", icon: <FileText className="w-5 h-5" />, source: "ai", enabled: true },
];

interface TechnicalOfferSectionsProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
}

export function TechnicalOfferSections({ projectId, projectName, onBack }: TechnicalOfferSectionsProps) {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>(defaultSections);

  const enabledCount = sections.filter(s => s.enabled).length;
  const allEnabled = enabledCount === sections.length;

  const toggleAll = () => {
    const newVal = !allEnabled;
    setSections(prev => prev.map(s => ({ ...s, enabled: newVal })));
  };

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleContinue = () => {
    const selected = sections.filter(s => s.enabled).map(s => s.id);
    navigate(`/projects/${projectId}`, { state: { technicalOfferSections: selected } });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{isArabic ? "اختيار الأقسام" : "Select Sections"}</h2>
          <p className="text-xs text-muted-foreground">{projectName}</p>
        </div>
      </div>

      {/* Description + Select All */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-lg">
          {isArabic
            ? "حدد الأقسام التي تريد تضمينها في عرضك الفني. قم بتفعيل الأقسام التي تحتاجها. يوضح مصدر البيانات من أين سأحصل على المحتوى."
            : "Select the sections you want to include in your technical offer. Toggle the sections you need. The data source shows where the content will come from."}
        </p>
        <Button variant="link" size="sm" onClick={toggleAll} className="shrink-0">
          {allEnabled
            ? (isArabic ? "إلغاء تحديد الكل" : "Deselect All")
            : (isArabic ? "تحديد الكل" : "Select All")}
        </Button>
      </div>

      {/* Sections List */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${
              section.enabled
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-muted/30 opacity-60"
            }`}
          >
            <Switch
              checked={section.enabled}
              onCheckedChange={() => toggleSection(section.id)}
            />
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
              {section.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {isArabic ? section.labelAr : section.label}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    section.source === "ai"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-primary text-primary"
                  }`}
                >
                  {section.source === "ai"
                    ? (isArabic ? "مولد بالذكاء الاصطناعي" : "AI Generated")
                    : (isArabic ? "من المكتبة" : "From Library")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {isArabic ? section.descriptionAr : section.description}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => toggleSection(section.id)}>
              {section.enabled ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center space-y-3 pt-2">
        <p className="text-sm text-muted-foreground">
          {isArabic ? `${enabledCount} من ${sections.length} أقسام محددة` : `${enabledCount} of ${sections.length} sections selected`}
        </p>
        <Button size="lg" className="px-12" onClick={handleContinue} disabled={enabledCount === 0}>
          <Check className="w-4 h-4 me-2" />
          {isArabic ? "المتابعة إلى العرض الفني" : "Continue to Technical Offer"}
        </Button>
      </div>
    </div>
  );
}

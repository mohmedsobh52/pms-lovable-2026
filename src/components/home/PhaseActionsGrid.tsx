import { Link } from "react-router-dom";
import { 
  Plus, 
  Zap, 
  FileUp, 
  Library, 
  DollarSign,
  Receipt, 
  FileText, 
  Users,
  Package,
  Calendar,
  BarChart3,
  Shield,
  TrendingUp,
  LayoutDashboard,
  Briefcase,
  Settings,
  LucideIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface PhaseAction {
  icon: LucideIcon;
  label: { ar: string; en: string };
  description: { ar: string; en: string };
  href: string;
}

interface PhaseConfig {
  id: number;
  colorClass: string;
  bgGradient: string;
  borderColor: string;
  actions: PhaseAction[];
}

const phaseConfigs: PhaseConfig[] = [
  {
    id: 1,
    colorClass: "text-cyan-500",
    bgGradient: "from-cyan-500 to-blue-500",
    borderColor: "border-cyan-500/30 hover:border-cyan-500/60",
    actions: [
      { 
        icon: Plus, 
        label: { ar: "مشروع جديد", en: "New Project" }, 
        description: { ar: "إنشاء مشروع فارغ", en: "Create empty project" },
        href: "/projects/new" 
      },
      { 
        icon: Zap, 
        label: { ar: "الاستخراج السريع", en: "Fast Extraction" }, 
        description: { ar: "رفع ملفات متعددة", en: "Upload multiple files" },
        href: "/fast-extraction" 
      },
      { 
        icon: Briefcase, 
        label: { ar: "المشاريع", en: "Projects" }, 
        description: { ar: "جميع المشاريع", en: "All projects" },
        href: "/projects" 
      }
    ]
  },
  {
    id: 2,
    colorClass: "text-blue-500",
    bgGradient: "from-blue-500 to-indigo-500",
    borderColor: "border-blue-500/30 hover:border-blue-500/60",
    actions: [
      { 
        icon: FileUp, 
        label: { ar: "تحليل BOQ", en: "Analyze BOQ" }, 
        description: { ar: "تحليل جدول الكميات", en: "Analyze bill of quantities" },
        href: "/projects?tab=analyze" 
      },
      { 
        icon: Library, 
        label: { ar: "المكتبة", en: "Library" }, 
        description: { ar: "المواد والعمالة", en: "Materials & labor" },
        href: "/library" 
      },
      { 
        icon: DollarSign, 
        label: { ar: "أسعار المواد", en: "Material Prices" }, 
        description: { ar: "قاعدة بيانات الأسعار", en: "Price database" },
        href: "/material-prices" 
      }
    ]
  },
  {
    id: 3,
    colorClass: "text-green-500",
    bgGradient: "from-green-500 to-emerald-500",
    borderColor: "border-green-500/30 hover:border-green-500/60",
    actions: [
      { 
        icon: Receipt, 
        label: { ar: "عروض الأسعار", en: "Quotations" }, 
        description: { ar: "إدارة العروض", en: "Manage quotations" },
        href: "/quotations" 
      },
      { 
        icon: TrendingUp, 
        label: { ar: "التسعير التاريخي", en: "Historical Pricing" }, 
        description: { ar: "مقارنة الأسعار", en: "Price comparison" },
        href: "/historical-pricing" 
      },
      { 
        icon: BarChart3, 
        label: { ar: "تحليل التكاليف", en: "Cost Analysis" }, 
        description: { ar: "تفاصيل التكاليف", en: "Cost details" },
        href: "/cost-analysis" 
      }
    ]
  },
  {
    id: 4,
    colorClass: "text-orange-500",
    bgGradient: "from-orange-500 to-amber-500",
    borderColor: "border-orange-500/30 hover:border-orange-500/60",
    actions: [
      { 
        icon: FileText, 
        label: { ar: "العقود", en: "Contracts" }, 
        description: { ar: "إدارة العقود", en: "Manage contracts" },
        href: "/contracts" 
      },
      { 
        icon: Users, 
        label: { ar: "مقاولي الباطن", en: "Subcontractors" }, 
        description: { ar: "إدارة المقاولين", en: "Manage subcontractors" },
        href: "/subcontractors" 
      },
      { 
        icon: Settings, 
        label: { ar: "القوالب", en: "Templates" }, 
        description: { ar: "قوالب العقود", en: "Contract templates" },
        href: "/templates" 
      }
    ]
  },
  {
    id: 5,
    colorClass: "text-purple-500",
    bgGradient: "from-purple-500 to-violet-500",
    borderColor: "border-purple-500/30 hover:border-purple-500/60",
    actions: [
      { 
        icon: Package, 
        label: { ar: "المشتريات", en: "Procurement" }, 
        description: { ar: "إدارة المشتريات", en: "Manage procurement" },
        href: "/procurement" 
      },
      { 
        icon: Users, 
        label: { ar: "الموارد", en: "Resources" }, 
        description: { ar: "العمالة والمعدات", en: "Labor & equipment" },
        href: "/resources" 
      },
      { 
        icon: Calendar, 
        label: { ar: "الجدول الزمني", en: "Calendar" }, 
        description: { ar: "تخطيط المهام", en: "Task planning" },
        href: "/calendar" 
      }
    ]
  },
  {
    id: 6,
    colorClass: "text-rose-500",
    bgGradient: "from-rose-500 to-pink-500",
    borderColor: "border-rose-500/30 hover:border-rose-500/60",
    actions: [
      { 
        icon: LayoutDashboard, 
        label: { ar: "لوحة المعلومات", en: "Dashboard" }, 
        description: { ar: "نظرة عامة", en: "Overview" },
        href: "/dashboard" 
      },
      { 
        icon: BarChart3, 
        label: { ar: "التقارير", en: "Reports" }, 
        description: { ar: "تقارير مفصلة", en: "Detailed reports" },
        href: "/reports" 
      },
      { 
        icon: Shield, 
        label: { ar: "إدارة المخاطر", en: "Risk Management" }, 
        description: { ar: "تتبع المخاطر", en: "Track risks" },
        href: "/risk" 
      }
    ]
  }
];

interface PhaseActionsGridProps {
  activePhase: number;
}

export function PhaseActionsGrid({ activePhase }: PhaseActionsGridProps) {
  const { isArabic } = useLanguage();
  
  const currentPhaseConfig = phaseConfigs.find(p => p.id === activePhase);
  
  if (!currentPhaseConfig) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Phase indicator */}
      <div className="flex items-center gap-3 mb-6">
        <div className={cn(
          "w-3 h-3 rounded-full bg-gradient-to-r",
          currentPhaseConfig.bgGradient,
          "animate-pulse shadow-lg"
        )} />
        <p className="text-sm text-muted-foreground">
          {isArabic ? "الإجراءات المتاحة" : "Available Actions"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentPhaseConfig.actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <Link 
              key={action.href} 
              to={action.href}
              className="animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Card className={cn(
                "group h-full transition-all duration-300 cursor-pointer border-2",
                currentPhaseConfig.borderColor,
                "hover:shadow-xl hover:-translate-y-1",
                "bg-gradient-to-br from-card to-muted/20"
              )}>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    `bg-gradient-to-br ${currentPhaseConfig.bgGradient}`,
                    "group-hover:scale-110 transition-transform duration-300 shadow-lg"
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {isArabic ? action.label.ar : action.label.en}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {isArabic ? action.description.ar : action.description.en}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

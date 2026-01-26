import { useState } from "react";
import { 
  Rocket, 
  BarChart3, 
  DollarSign, 
  FileText, 
  Settings, 
  TrendingUp,
  ChevronRight,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface LifecyclePhase {
  id: number;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  icon: LucideIcon;
  colorClass: string;
  bgGradient: string;
  glowClass: string;
}

const lifecyclePhases: LifecyclePhase[] = [
  {
    id: 1,
    name: { ar: "البدء", en: "Initiation" },
    description: { ar: "إنشاء مشروع جديد أو استيراد ملفات", en: "Create new project or import files" },
    icon: Rocket,
    colorClass: "text-cyan-500",
    bgGradient: "from-cyan-500 to-blue-500",
    glowClass: "shadow-cyan-500/30"
  },
  {
    id: 2,
    name: { ar: "التحليل", en: "Analysis" },
    description: { ar: "تحليل BOQ والمكتبة والمواد", en: "BOQ analysis, library & materials" },
    icon: BarChart3,
    colorClass: "text-blue-500",
    bgGradient: "from-blue-500 to-indigo-500",
    glowClass: "shadow-blue-500/30"
  },
  {
    id: 3,
    name: { ar: "التسعير", en: "Pricing" },
    description: { ar: "عروض الأسعار والتسعير المفصل", en: "Quotations & detailed pricing" },
    icon: DollarSign,
    colorClass: "text-green-500",
    bgGradient: "from-green-500 to-emerald-500",
    glowClass: "shadow-green-500/30"
  },
  {
    id: 4,
    name: { ar: "التعاقد", en: "Contracting" },
    description: { ar: "العقود ومقاولي الباطن", en: "Contracts & subcontractors" },
    icon: FileText,
    colorClass: "text-orange-500",
    bgGradient: "from-orange-500 to-amber-500",
    glowClass: "shadow-orange-500/30"
  },
  {
    id: 5,
    name: { ar: "التنفيذ", en: "Execution" },
    description: { ar: "المشتريات والموارد والجدولة", en: "Procurement, resources & scheduling" },
    icon: Settings,
    colorClass: "text-purple-500",
    bgGradient: "from-purple-500 to-violet-500",
    glowClass: "shadow-purple-500/30"
  },
  {
    id: 6,
    name: { ar: "المراقبة", en: "Monitoring" },
    description: { ar: "التقارير والمخاطر ولوحات المعلومات", en: "Reports, risks & dashboards" },
    icon: TrendingUp,
    colorClass: "text-rose-500",
    bgGradient: "from-rose-500 to-pink-500",
    glowClass: "shadow-rose-500/30"
  }
];

interface LifecycleFlowProps {
  activePhase: number;
  onPhaseChange: (phaseId: number) => void;
}

export function LifecycleFlow({ activePhase, onPhaseChange }: LifecycleFlowProps) {
  const { isArabic } = useLanguage();

  return (
    <div className="relative py-8">
      {/* Connection Line Background */}
      <div className="absolute top-1/2 left-8 right-8 h-1.5 bg-gradient-to-r from-cyan-500/20 via-green-500/20 via-orange-500/20 to-rose-500/20 transform -translate-y-1/2 rounded-full hidden md:block" />
      
      {/* Animated Progress Line */}
      <div 
        className="absolute top-1/2 left-8 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 via-green-500 via-orange-500 via-purple-500 to-rose-500 transform -translate-y-1/2 rounded-full transition-all duration-700 ease-out hidden md:block"
        style={{ 
          width: `calc(${((activePhase - 1) / (lifecyclePhases.length - 1)) * 100}% - 64px)`,
          opacity: 0.8
        }}
      />
      
      {/* Phase Nodes */}
      <div className="flex flex-wrap md:flex-nowrap justify-between gap-4 relative z-10">
        {lifecyclePhases.map((phase, index) => {
          const Icon = phase.icon;
          const isActive = activePhase === phase.id;
          const isPast = activePhase > phase.id;
          
          return (
            <div 
              key={phase.id}
              className="flex flex-col items-center gap-3 cursor-pointer group flex-1 min-w-[140px]"
              onClick={() => onPhaseChange(phase.id)}
            >
              {/* Phase Circle */}
              <div className={cn(
                "relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-500",
                `bg-gradient-to-br ${phase.bgGradient}`,
                isActive && `ring-4 ring-white/40 scale-110 shadow-xl ${phase.glowClass}`,
                isPast && "opacity-60",
                !isActive && !isPast && "opacity-70 hover:opacity-100 hover:scale-105",
                "group-hover:shadow-lg"
              )}>
                <Icon className={cn(
                  "w-7 h-7 md:w-9 md:h-9 text-white transition-transform duration-300",
                  isActive && "animate-pulse"
                )} />
                
                {/* Phase Number Badge */}
                <div className={cn(
                  "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  isActive ? "bg-white text-foreground shadow-md" : "bg-background/80 text-muted-foreground"
                )}>
                  {phase.id}
                </div>
              </div>
              
              {/* Phase Label */}
              <div className="text-center space-y-1">
                <p className={cn(
                  "text-sm font-semibold transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {isArabic ? phase.name.ar : phase.name.en}
                </p>
                <p className={cn(
                  "text-xs max-w-[120px] transition-opacity",
                  isActive ? "text-muted-foreground opacity-100" : "opacity-0 group-hover:opacity-70"
                )}>
                  {isArabic ? phase.description.ar : phase.description.en}
                </p>
              </div>
              
              {/* Arrow to next phase */}
              {index < lifecyclePhases.length - 1 && (
                <ChevronRight className={cn(
                  "hidden md:block absolute w-5 h-5 transition-all duration-300",
                  isActive ? "text-foreground" : "text-muted-foreground/40",
                  isArabic ? "rotate-180" : ""
                )} 
                style={{ 
                  [isArabic ? 'left' : 'right']: '-12px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { lifecyclePhases };
export type { LifecyclePhase };

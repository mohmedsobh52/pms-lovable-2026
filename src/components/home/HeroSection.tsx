import { PMSLogo } from "@/components/PMSLogo";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  stats?: {
    totalProjects: number;
    totalItems: number;
    totalValue: number;
  };
}

export function HeroSection({ stats }: HeroSectionProps) {
  const { isArabic } = useLanguage();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-primary/5 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 md:w-72 h-48 md:h-72 bg-accent/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-40 md:w-64 h-40 md:h-64 bg-purple-500/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center space-y-6">
        {/* Animated Logo */}
        <div className="flex items-center justify-center gap-4 animate-fade-in">
          <PMSLogo size="xl" className="drop-shadow-2xl" />
        </div>
        
        {/* Title with Gradient */}
        <h1 className="text-4xl md:text-6xl font-bold animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            PMS
          </span>
        </h1>
        
        {/* Subtitle */}
        <p 
          className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4 animate-slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          {isArabic 
            ? "نظام متكامل لإدارة المشاريع الإنشائية - من التحليل إلى التسليم"
            : "Comprehensive Construction Project Management - From Analysis to Delivery"
          }
        </p>
        
        {/* Quick Stats Mini */}
        {stats && (
          <div 
            className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm animate-fade-in pt-4"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
              <span className="font-medium">{stats.totalProjects}</span>
              <span className="text-muted-foreground">{isArabic ? "مشروع" : "Projects"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50" style={{ animationDelay: '0.5s' }} />
              <span className="font-medium">{stats.totalItems}</span>
              <span className="text-muted-foreground">{isArabic ? "بند" : "Items"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shadow-lg shadow-purple-500/50" style={{ animationDelay: '1s' }} />
              <span className="font-medium">{formatCurrency(stats.totalValue)}</span>
              <span className="text-muted-foreground">SAR</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, TrendingUp, Database, Lightbulb, CheckCircle2, AlertTriangle, FileText, Link2, Zap } from "lucide-react";
import {
  PricingDistributionChart,
  CategoryDistributionChart,
  TopItemsChart,
} from "@/components/charts/ChartJsCharts";
import { PricingAccuracyDashboard } from "@/components/PricingAccuracyDashboard";
import { ProjectData, PricingStats } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface ProjectOverviewTabProps {
  project: ProjectData;
  pricingStats: PricingStats;
  pricingDistributionData: { name: string; value: number; color: string }[];
  categoryDistribution: { name: string; value: number }[];
  topValueItems: { name: string; value: number }[];
  isArabic: boolean;
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
  projectId: string;
}

export function ProjectOverviewTab({
  project,
  pricingStats,
  pricingDistributionData,
  categoryDistribution,
  topValueItems,
  isArabic,
  formatCurrency,
  formatDate,
  projectId,
}: ProjectOverviewTabProps) {
  const [historicalCount, setHistoricalCount] = useState(0);
  const [savedProjectsCount, setSavedProjectsCount] = useState(0);

  useEffect(() => {
    const fetchHistoricalStats = async () => {
      const [{ count: hCount }, { count: sCount }] = await Promise.all([
        supabase.from("historical_pricing_files").select("id", { count: "exact", head: true }),
        supabase.from("saved_projects").select("id", { count: "exact", head: true }),
      ]);
      setHistoricalCount(hCount || 0);
      setSavedProjectsCount(sCount || 0);
    };
    fetchHistoricalStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "توزيع التسعير" : "Pricing Distribution"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PricingDistributionChart data={pricingDistributionData} isArabic={isArabic} />
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "التصنيفات" : "Categories"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDistributionChart data={categoryDistribution} isArabic={isArabic} />
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "أعلى البنود قيمة" : "Top Value Items"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopItemsChart data={topValueItems} isArabic={isArabic} formatCurrency={formatCurrency} />
          </CardContent>
        </Card>
      </div>

      {/* Historical Pricing Stats */}
      <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            {isArabic ? "ربط التسعير التاريخي" : "Historical Pricing Link"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50">
              <Database className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{historicalCount}</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "ملف تاريخي" : "Historical Files"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{savedProjectsCount}</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "مشروع محفوظ" : "Saved Projects"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50">
              <div>
                <Badge variant="outline" className="text-primary border-primary/30">
                  {isArabic ? "متاح للمقارنة" : "Available for comparison"}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {isArabic 
                    ? "استخدم التحليل المتقدم للمقارنة التاريخية"
                    : "Use Advanced Analysis for historical comparison"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">
              {isArabic ? "تفاصيل المشروع" : "Project Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">{isArabic ? "تاريخ الإنشاء" : "Created"}</span>
              <span className="font-medium">{formatDate(project.created_at)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">{isArabic ? "آخر تحديث" : "Last Updated"}</span>
              <span className="font-medium">{formatDate(project.updated_at)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">{isArabic ? "العملة" : "Currency"}</span>
              <span className="font-medium">{project.currency || 'SAR'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">{isArabic ? "الملف المصدر" : "Source File"}</span>
              <span className="font-medium truncate max-w-[200px]">
                {project.file_name || (isArabic ? "غير متوفر" : "N/A")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">
              {isArabic ? "ملخص التسعير" : "Pricing Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{isArabic ? "التقدم" : "Progress"}</span>
                <span className="font-bold">{pricingStats.pricingPercentage}%</span>
              </div>
              <Progress value={pricingStats.pricingPercentage} className={`h-2 ${pricingStats.pricingPercentage >= 75 ? 'progress-gold' : ''}`} />
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">{isArabic ? "بنود مسعرة" : "Priced Items"}</span>
              <span className="font-medium text-success">{pricingStats.pricedItems}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">{isArabic ? "بنود غير مسعرة" : "Unpriced Items"}</span>
              <span className="font-medium text-gold">{pricingStats.unpricedItems}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">{isArabic ? "إجمالي القيمة" : "Total Value"}</span>
              <span className="font-bold text-lg text-gold">
                {project.currency || 'SAR'} {formatCurrency(pricingStats.totalValue)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Improvement Suggestions */}
      <ImprovementSuggestions pricingStats={pricingStats} items={project} isArabic={isArabic} />

      {/* Pricing Accuracy Dashboard */}
      <PricingAccuracyDashboard projectId={projectId} />
    </div>
  );
}

function ImprovementSuggestions({ pricingStats, items, isArabic }: { pricingStats: PricingStats; items: ProjectData; isArabic: boolean }) {
  const suggestions: { icon: React.ReactNode; text: string; type: 'warning' | 'info' | 'success' }[] = [];

  if (pricingStats.pricingPercentage < 100) {
    suggestions.push({
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      text: isArabic ? `أكمل تسعير البنود المتبقية (${pricingStats.unpricedItems} بند)` : `Complete pricing for remaining items (${pricingStats.unpricedItems} items)`,
      type: 'warning',
    });
  }

  if (pricingStats.pricingPercentage < 50) {
    suggestions.push({
      icon: <Zap className="w-4 h-4 text-primary" />,
      text: isArabic ? "استخدم التسعير التلقائي لتسريع العملية" : "Use Auto Pricing to speed up the process",
      type: 'info',
    });
  }

  if (pricingStats.totalItems > 0 && pricingStats.pricingPercentage >= 100) {
    suggestions.push({
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      text: isArabic ? "تم تسعير جميع البنود بنجاح!" : "All items have been priced successfully!",
      type: 'success',
    });
  }

  suggestions.push({
    icon: <FileText className="w-4 h-4 text-blue-500" />,
    text: isArabic ? "أرفق المستندات المرجعية للمشروع" : "Attach reference documents to the project",
    type: 'info',
  });

  suggestions.push({
    icon: <Link2 className="w-4 h-4 text-purple-500" />,
    text: isArabic ? "أضف عقد للمشروع لتتبع التنفيذ" : "Add a contract to track execution",
    type: 'info',
  });

  if (suggestions.length === 0) return null;

  return (
    <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          {isArabic ? "اقتراحات للتحسين" : "Improvement Suggestions"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/50">
              {s.icon}
              <span className="text-sm">{s.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
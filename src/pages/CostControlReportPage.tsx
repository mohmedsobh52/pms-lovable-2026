import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { Search, FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, Target, BarChart3, Activity } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// Sample discipline data
const disciplines = [
  { id: "mechanical", label: "MECHANICAL", labelAr: "ميكانيكي", progress: 65 },
  { id: "general", label: "GENERAL", labelAr: "عام", progress: 78 },
  { id: "electrical", label: "ELECTRICAL", labelAr: "كهربائي", progress: 52 },
  { id: "civil", label: "CIVIL", labelAr: "مدني", progress: 88 },
  { id: "architectural", label: "ARCHITECTURAL", labelAr: "معماري", progress: 45 },
];

// Sample activity data
const activities = [
  { id: "lighting", label: "Lighting Fixtures", labelAr: "تركيبات الإضاءة", progress: 72 },
  { id: "doors", label: "Wooden Doors", labelAr: "الأبواب الخشبية", progress: 58 },
  { id: "wiring", label: "Wiring Devices", labelAr: "أجهزة الأسلاك", progress: 43 },
  { id: "hvac", label: "HVAC Systems", labelAr: "أنظمة التكييف", progress: 67 },
  { id: "plumbing", label: "Plumbing Works", labelAr: "أعمال السباكة", progress: 81 },
];

// KPI data
const kpiData = {
  row1: [
    { label: "PV", labelAr: "القيمة المخططة", value: "168.5M", icon: Target, color: "text-blue-600" },
    { label: "EV", labelAr: "القيمة المكتسبة", value: "105.3M", icon: TrendingUp, color: "text-emerald-600" },
    { label: "AC", labelAr: "التكلفة الفعلية", value: "107.0M", icon: DollarSign, color: "text-amber-600" },
    { label: "EAC BY PERT", labelAr: "التقدير عند الإنتهاء", value: "164.0M", icon: BarChart3, color: "text-purple-600" },
    { label: "ETC", labelAr: "التقدير للإنتهاء", value: "57.1M", icon: Activity, color: "text-rose-600" },
  ],
  row2: [
    { label: "SPI", labelAr: "مؤشر الجدول", value: "0.60", status: "warning" },
    { label: "Progress %", labelAr: "نسبة الإنجاز", value: "60%", status: "neutral" },
    { label: "CPI", labelAr: "مؤشر التكلفة", value: "0.98", status: "warning" },
    { label: "TCPI", labelAr: "مؤشر الأداء", value: "0.90", status: "success" },
  ],
};

// Chart data
const chartLabels = [
  'Engineering & 3rd Party',
  'External Water Supply',
  'Site Overhead',
  'O&M',
  'Scaffolding',
];

const chartData = {
  labels: chartLabels,
  datasets: [
    {
      type: 'line' as const,
      label: 'EAC BY PERT',
      data: [45, 38, 28, 32, 21],
      borderColor: 'hsl(262, 83%, 58%)',
      backgroundColor: 'hsl(262, 83%, 58%)',
      borderWidth: 3,
      pointRadius: 6,
      pointBackgroundColor: 'hsl(262, 83%, 58%)',
      tension: 0.3,
      yAxisID: 'y',
    },
    {
      type: 'bar' as const,
      label: 'PV',
      data: [42, 35, 25, 30, 18],
      backgroundColor: 'hsl(221, 83%, 53%)',
      borderRadius: 4,
      yAxisID: 'y',
    },
    {
      type: 'bar' as const,
      label: 'EV',
      data: [28, 22, 18, 20, 12],
      backgroundColor: 'hsl(142, 76%, 36%)',
      borderRadius: 4,
      yAxisID: 'y',
    },
    {
      type: 'bar' as const,
      label: 'AC',
      data: [30, 24, 19, 22, 13],
      backgroundColor: 'hsl(38, 92%, 50%)',
      borderRadius: 4,
      yAxisID: 'y',
    },
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: 'hsl(var(--card))',
      titleColor: 'hsl(var(--foreground))',
      bodyColor: 'hsl(var(--muted-foreground))',
      borderColor: 'hsl(var(--border))',
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: function(context: any) {
          return `${context.dataset.label}: ${context.parsed.y}M`;
        }
      }
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 11,
        },
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'hsl(var(--border))',
      },
      ticks: {
        callback: function(value: any) {
          return value + 'M';
        },
      },
    },
  },
};

export default function CostControlReportPage() {
  const { isArabic } = useLanguage();
  const [disciplineSearch, setDisciplineSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const filteredDisciplines = disciplines.filter(d =>
    d.label.toLowerCase().includes(disciplineSearch.toLowerCase()) ||
    d.labelAr.includes(disciplineSearch)
  );

  const filteredActivities = activities.filter(a =>
    a.label.toLowerCase().includes(activitySearch.toLowerCase()) ||
    a.labelAr.includes(activitySearch)
  );

  const toggleDiscipline = (id: string) => {
    setSelectedDisciplines(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleActivity = (id: string) => {
    setSelectedActivities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "warning": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "danger": return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "text-emerald-600";
    if (progress >= 50) return "text-amber-600";
    return "text-rose-600";
  };

  return (
    <PageLayout>
      <div className="flex gap-6 min-h-[calc(100vh-200px)]">
        {/* Left Sidebar */}
        <aside className="w-72 shrink-0 space-y-6">
          {/* Discipline Filter */}
          <Card className="bg-card/95 backdrop-blur border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {isArabic ? "التخصصات" : "Discipline"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? "بحث..." : "Search..."}
                  value={disciplineSearch}
                  onChange={(e) => setDisciplineSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredDisciplines.map((discipline) => (
                  <label
                    key={discipline.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedDisciplines.includes(discipline.id)}
                        onCheckedChange={() => toggleDiscipline(discipline.id)}
                      />
                      <span className="text-sm font-medium">
                        {isArabic ? discipline.labelAr : discipline.label}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold ${getProgressColor(discipline.progress)}`}>
                      {discipline.progress}%
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity Filter */}
          <Card className="bg-card/95 backdrop-blur border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {isArabic ? "الأنشطة" : "Activity"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? "بحث..." : "Search..."}
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredActivities.map((activity) => (
                  <label
                    key={activity.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedActivities.includes(activity.id)}
                        onCheckedChange={() => toggleActivity(activity.id)}
                      />
                      <span className="text-sm font-medium">
                        {isArabic ? activity.labelAr : activity.label}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold ${getProgressColor(activity.progress)}`}>
                      {activity.progress}%
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-6">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/90 via-primary to-primary/80 p-8 text-primary-foreground">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
            <div className="relative">
              <h1 className="text-3xl font-bold tracking-tight">
                {isArabic ? "تقرير مراقبة التكاليف" : "Cost Control Report"}
              </h1>
              <p className="mt-2 text-primary-foreground/80">
                {isArabic 
                  ? "تحليل شامل للقيمة المكتسبة وأداء التكلفة"
                  : "Comprehensive earned value and cost performance analysis"
                }
              </p>
            </div>
          </div>

          {/* KPI Grid Row 1 */}
          <div className="grid grid-cols-5 gap-4">
            {kpiData.row1.map((kpi) => (
              <Card key={kpi.label} className="bg-card/95 backdrop-blur border-border/50 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {isArabic ? kpi.labelAr : kpi.label}
                    </span>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* KPI Grid Row 2 */}
          <div className="grid grid-cols-5 gap-4">
            {kpiData.row2.map((kpi) => (
              <Card key={kpi.label} className="bg-card/95 backdrop-blur border-border/50 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {isArabic ? kpi.labelAr : kpi.label}
                  </span>
                  <div className="mt-2">
                    <Badge className={`text-lg font-bold px-3 py-1 ${getStatusColor(kpi.status)}`}>
                      {kpi.value}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="bg-card/95 backdrop-blur border-border/50 flex items-center justify-center">
              <CardContent className="p-4">
                <Button className="w-full gap-2" variant="default">
                  <FileSpreadsheet className="h-4 w-4" />
                  {isArabic ? "تصدير إلى Excel" : "Export to Excel"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart */}
          <Card className="bg-card/95 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {isArabic ? "تحليل القيمة المكتسبة حسب الفئة" : "Earned Value Analysis by Category"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <Chart type="bar" data={chartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </PageLayout>
  );
}

import { useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FolderOpen, 
  Receipt, 
  TrendingUp, 
  FileText,
  Calendar,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  Download,
  Filter,
  FileSpreadsheet,
  Printer,
  AlertTriangle,
  Image as ImageIcon,
  X,
  ShieldAlert,
  FileSignature,
  Calculator,
  Link2,
  ArrowRight,
  Eye,
  HeartPulse,
  Target,
  Shield,
  FileCheck,
  ChevronDown,
  MoreHorizontal,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { XLSX } from '@/lib/exceljs-utils';
import { ProjectComparisonReport } from "./ProjectComparisonReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskManagement } from "./RiskManagement";
import { ContractManagement } from "./ContractManagement";
import { CostBenefitAnalysis } from "./CostBenefitAnalysis";
import { ContractLinkage } from "./ContractLinkage";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from "recharts";

interface DashboardStats {
  totalProjects: number;
  totalQuotations: number;
  totalValue: number;
  averageQuotationValue: number;
  recentProjects: any[];
  recentQuotations: any[];
  quotationsByStatus: { status: string; count: number }[];
  monthlyActivity: { month: string; projects: number; quotations: number }[];
}

interface MainDashboardProps {
  onLoadProject?: (analysisData: any, wbsData: any, projectId?: string) => void;
}

interface BudgetSettings {
  maxBudget: number;
  alertThreshold: number;
}

// KPI data interface
interface KPIData {
  projectHealth: number;
  pricingEfficiency: number;
  riskScore: number;
  contractHealth: number;
}

// Vivid chart colors - Navy + Gold palette
const CHART_COLORS = ["#2563EB", "#F5A623", "#10B981", "#7C3AED", "#EF4444"];
const STATUS_COLORS: Record<string, string> = {
  pending: "#F5A623",
  approved: "#10B981",
  rejected: "#EF4444",
  under_review: "#2563EB",
};

// Custom tooltip with better styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-popover border border-border rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

// Memoized KPI Card
const KPICard = memo(({ icon: Icon, label, value, color, status, isArabic }: {
  icon: any; label: string; value: number; color: string; status: string; isArabic: boolean;
}) => (
  <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-all">
    <CardContent className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}%</p>
        </div>
        <Badge 
          variant="secondary" 
          className="text-[10px] px-1.5 py-0.5 shrink-0"
          style={{ 
            backgroundColor: `${color}15`, 
            color,
            borderColor: `${color}30`
          }}
        >
          {status}
        </Badge>
      </div>
      <Progress value={value} className="h-2" />
    </CardContent>
  </Card>
));
KPICard.displayName = "KPICard";

// Memoized Stat Card
const StatCard = memo(({ label, value, icon: Icon, bgColor, iconColor }: {
  label: string; value: string | number; icon: any; bgColor: string; iconColor: string;
}) => (
  <Card className="bg-card shadow-sm hover:shadow-lg transition-all rounded-2xl border-0 hover:scale-[1.02]">
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl lg:text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-7 h-7 ${iconColor}`} />
        </div>
      </div>
    </CardContent>
  </Card>
));
StatCard.displayName = "StatCard";

// Cache helpers
const CACHE_KEY = "pms_dashboard_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function getCachedData(): DashboardStats | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

function setCachedData(data: DashboardStats) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function MainDashboard({ onLoadProject }: MainDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [chartMode, setChartMode] = useState<"area" | "bar">("area");
  
  // KPI data
  const [kpiData, setKpiData] = useState<KPIData>({ projectHealth: 0, pricingEfficiency: 0, riskScore: 0, contractHealth: 0 });
  
  // Budget settings
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>(() => {
    const saved = localStorage.getItem("dashboard_budget_settings");
    return saved ? JSON.parse(saved) : { maxBudget: 1000000, alertThreshold: 80 };
  });
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);
  
  // Image upload (moved to bottom)
  const [uploadedImage, setUploadedImage] = useState<string | null>(() => localStorage.getItem("dashboard_uploaded_image"));
  const [isDragOver, setIsDragOver] = useState(false);
  
  const { user } = useAuth();
  const { isArabic, t } = useLanguage();
  const navigate = useNavigate();

  const exportToPDF = useCallback(() => {
    if (!stats) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(20);
    doc.text(isArabic ? "تقرير لوحة التحكم" : "Dashboard Report", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString("en-US"), pageWidth / 2, 28, { align: "center" });
    doc.setFontSize(14);
    doc.text(isArabic ? "ملخص الإحصائيات" : "Statistics Summary", 14, 40);
    autoTable(doc, {
      startY: 45,
      head: [[isArabic ? "البند" : "Item", isArabic ? "القيمة" : "Value"]],
      body: [
        [isArabic ? "إجمالي المشاريع" : "Total Projects", stats.totalProjects.toString()],
        [isArabic ? "عروض الأسعار" : "Quotations", stats.totalQuotations.toString()],
        [isArabic ? "إجمالي القيمة" : "Total Value", `SAR ${stats.totalValue.toLocaleString("en-US")}`],
        [isArabic ? "متوسط العرض" : "Avg. Quotation", `SAR ${stats.averageQuotationValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`],
      ],
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
    });
    const finalY1 = (doc as any).lastAutoTable.finalY || 80;
    doc.setFontSize(14);
    doc.text(isArabic ? "المشاريع الأخيرة" : "Recent Projects", 14, finalY1 + 15);
    if (stats.recentProjects.length > 0) {
      autoTable(doc, {
        startY: finalY1 + 20,
        head: [[isArabic ? "اسم المشروع" : "Project Name", isArabic ? "التاريخ" : "Date"]],
        body: stats.recentProjects.map(p => [p.name, new Date(p.created_at).toLocaleDateString("en-US")]),
        theme: "striped",
        headStyles: { fillColor: [245, 158, 11] },
      });
    }
    const finalY2 = (doc as any).lastAutoTable.finalY || finalY1 + 40;
    doc.setFontSize(14);
    doc.text(isArabic ? "العروض الأخيرة" : "Recent Quotations", 14, finalY2 + 15);
    if (stats.recentQuotations.length > 0) {
      autoTable(doc, {
        startY: finalY2 + 20,
        head: [[isArabic ? "اسم العرض" : "Quotation", isArabic ? "المورد" : "Supplier", isArabic ? "المبلغ" : "Amount"]],
        body: stats.recentQuotations.map(q => [q.name, q.supplier_name || "-", q.total_amount ? `SAR ${q.total_amount.toLocaleString("en-US")}` : "-"]),
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129] },
      });
    }
    doc.save("dashboard-report.pdf");
    toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
  }, [stats, isArabic]);

  const exportToExcel = useCallback(() => {
    if (!stats) return;
    const wb = XLSX.utils.book_new();
    const summaryData = [
      [isArabic ? "البند" : "Item", isArabic ? "القيمة" : "Value"],
      [isArabic ? "إجمالي المشاريع" : "Total Projects", stats.totalProjects],
      [isArabic ? "عروض الأسعار" : "Quotations", stats.totalQuotations],
      [isArabic ? "إجمالي القيمة" : "Total Value", stats.totalValue],
      [isArabic ? "متوسط العرض" : "Avg. Quotation", Math.round(stats.averageQuotationValue)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), isArabic ? "الملخص" : "Summary");
    if (stats.recentProjects.length > 0) {
      const d = [[isArabic ? "اسم المشروع" : "Project Name", isArabic ? "التاريخ" : "Date"], ...stats.recentProjects.map(p => [p.name, new Date(p.created_at).toLocaleDateString("en-US")])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(d), isArabic ? "المشاريع" : "Projects");
    }
    if (stats.recentQuotations.length > 0) {
      const d = [[isArabic ? "اسم العرض" : "Quotation", isArabic ? "المورد" : "Supplier", isArabic ? "المبلغ" : "Amount"], ...stats.recentQuotations.map(q => [q.name, q.supplier_name || "-", q.total_amount || 0])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(d), isArabic ? "العروض" : "Quotations");
    }
    const ad = [[isArabic ? "الشهر" : "Month", isArabic ? "المشاريع" : "Projects", isArabic ? "العروض" : "Quotations"], ...stats.monthlyActivity.map(m => [m.month, m.projects, m.quotations])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ad), isArabic ? "النشاط الشهري" : "Monthly Activity");
    XLSX.writeFile(wb, "dashboard-report.xlsx");
    toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
  }, [stats, isArabic]);

  const printReport = useCallback(() => {
    if (!stats) return;
    const printContent = `<!DOCTYPE html><html><head><title>${isArabic ? "تقرير لوحة التحكم" : "Dashboard Report"}</title><style>body{font-family:Arial,sans-serif;padding:20px;direction:${isArabic?'rtl':'ltr'}}h1{text-align:center;color:#1e40af}h2{color:#374151;margin-top:30px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #e5e7eb;padding:10px;text-align:${isArabic?'right':'left'}}th{background-color:#3b82f6;color:white}.stat-card{display:inline-block;width:23%;margin:1%;padding:15px;background:#f3f4f6;border-radius:8px;text-align:center}.stat-value{font-size:24px;font-weight:bold;color:#1e40af}.stat-label{color:#6b7280;font-size:14px}.date{text-align:center;color:#6b7280;margin-bottom:20px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><h1>${isArabic?"تقرير لوحة التحكم":"Dashboard Report"}</h1><p class="date">${new Date().toLocaleDateString(isArabic?'ar-SA':'en-US')}</p><div style="text-align:center;margin-bottom:30px"><div class="stat-card"><div class="stat-value">${stats.totalProjects}</div><div class="stat-label">${isArabic?"المشاريع":"Projects"}</div></div><div class="stat-card"><div class="stat-value">${stats.totalQuotations}</div><div class="stat-label">${isArabic?"العروض":"Quotations"}</div></div><div class="stat-card"><div class="stat-value">SAR ${stats.totalValue.toLocaleString()}</div><div class="stat-label">${isArabic?"إجمالي القيمة":"Total Value"}</div></div><div class="stat-card"><div class="stat-value">SAR ${Math.round(stats.averageQuotationValue).toLocaleString()}</div><div class="stat-label">${isArabic?"متوسط العرض":"Avg. Quotation"}</div></div></div><h2>${isArabic?"المشاريع الأخيرة":"Recent Projects"}</h2><table><thead><tr><th>${isArabic?"اسم المشروع":"Project Name"}</th><th>${isArabic?"التاريخ":"Date"}</th></tr></thead><tbody>${stats.recentProjects.map(p=>`<tr><td>${p.name}</td><td>${new Date(p.created_at).toLocaleDateString(isArabic?'ar-SA':'en-US')}</td></tr>`).join('')}</tbody></table><h2>${isArabic?"عروض الأسعار الأخيرة":"Recent Quotations"}</h2><table><thead><tr><th>${isArabic?"اسم العرض":"Quotation"}</th><th>${isArabic?"المورد":"Supplier"}</th><th>${isArabic?"المبلغ":"Amount"}</th></tr></thead><tbody>${stats.recentQuotations.map(q=>`<tr><td>${q.name}</td><td>${q.supplier_name||'-'}</td><td>${q.total_amount?`SAR ${q.total_amount.toLocaleString()}`:'-'}</td></tr>`).join('')}</tbody></table></body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    }
    toast.success(isArabic ? "جاري الطباعة..." : "Printing...");
  }, [stats, isArabic]);

  const saveBudgetSettings = (newSettings: BudgetSettings) => {
    setBudgetSettings(newSettings);
    localStorage.setItem("dashboard_budget_settings", JSON.stringify(newSettings));
    setShowBudgetSettings(false);
    toast.success(isArabic ? "تم حفظ إعدادات الميزانية" : "Budget settings saved");
  };

  const checkBudgetAlert = useCallback((): { isOverBudget: boolean; isNearThreshold: boolean; percentage: number } => {
    if (!stats) return { isOverBudget: false, isNearThreshold: false, percentage: 0 };
    const percentage = (stats.totalValue / budgetSettings.maxBudget) * 100;
    return { isOverBudget: percentage >= 100, isNearThreshold: percentage >= budgetSettings.alertThreshold && percentage < 100, percentage };
  }, [stats, budgetSettings]);

  // Image handlers
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error(isArabic ? "يرجى تحميل صورة فقط" : "Please upload an image only"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(isArabic ? "حجم الصورة يجب أن يكون أقل من 5 ميجابايت" : "Image size must be less than 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      localStorage.setItem("dashboard_uploaded_image", result);
      toast.success(isArabic ? "تم رفع الصورة بنجاح" : "Image uploaded successfully");
    };
    reader.readAsDataURL(file);
  };
  const removeImage = () => { setUploadedImage(null); localStorage.removeItem("dashboard_uploaded_image"); toast.success(isArabic ? "تم حذف الصورة" : "Image removed"); };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: isArabic ? "قيد الانتظار" : "Pending",
      approved: isArabic ? "معتمد" : "Approved",
      rejected: isArabic ? "مرفوض" : "Rejected",
      under_review: isArabic ? "قيد المراجعة" : "Under Review"
    };
    return labels[status] || status;
  };

  const calculateMonthlyActivity = (projects: any[], quotations: any[]) => {
    const months: Record<string, { projects: number; quotations: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { projects: 0, quotations: 0 };
    }
    projects.forEach(p => { const d = new Date(p.created_at); const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; if (months[key]) months[key].projects++; });
    quotations.forEach(q => { const d = new Date(q.created_at); const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; if (months[key]) months[key].quotations++; });
    return Object.entries(months).map(([month, data]) => ({ month: formatMonth(month), ...data }));
  };

  const formatMonth = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short' });
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const fetchDashboardData = useCallback(async (useCache = true) => {
    if (!user) return;
    
    // Check cache first
    if (useCache && !dateFrom && !dateTo) {
      const cached = getCachedData();
      if (cached) {
        setStats(cached);
        setIsLoading(false);
        // Also compute KPIs from cached
        computeKPIs(cached);
        return;
      }
    }
    
    setIsLoading(true);
    try {
      let projectsQuery = supabase.from("saved_projects").select("*").order("created_at", { ascending: false }).limit(50);
      let quotationsQuery = supabase.from("price_quotations").select("*").order("created_at", { ascending: false }).limit(50);
      let contractsQuery = supabase.from("contracts").select("id, status").limit(100);
      
      if (dateFrom) { projectsQuery = projectsQuery.gte("created_at", dateFrom); quotationsQuery = quotationsQuery.gte("created_at", dateFrom); }
      if (dateTo) { projectsQuery = projectsQuery.lte("created_at", dateTo + "T23:59:59"); quotationsQuery = quotationsQuery.lte("created_at", dateTo + "T23:59:59"); }

      const [projectsResult, quotationsResult, contractsResult] = await Promise.all([
        projectsQuery, quotationsQuery, contractsQuery
      ]);

      if (projectsResult.error) throw projectsResult.error;
      if (quotationsResult.error) throw quotationsResult.error;

      const projects = projectsResult.data;
      const quotations = quotationsResult.data;
      const contracts = contractsResult.data || [];

      const totalValue = quotations?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;
      const averageValue = quotations?.length ? totalValue / quotations.length : 0;

      const statusCounts: Record<string, number> = {};
      quotations?.forEach(q => { const s = q.status || 'pending'; statusCounts[s] = (statusCounts[s] || 0) + 1; });
      const quotationsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status: getStatusLabel(status), count, rawStatus: status }));

      const monthlyActivity = calculateMonthlyActivity(projects || [], quotations || []);

      const dashData: DashboardStats = {
        totalProjects: projects?.length || 0,
        totalQuotations: quotations?.length || 0,
        totalValue,
        averageQuotationValue: averageValue,
        recentProjects: projects?.slice(0, 5) || [],
        recentQuotations: quotations?.slice(0, 5) || [],
        quotationsByStatus,
        monthlyActivity
      };
      
      setStats(dashData);
      if (!dateFrom && !dateTo) setCachedData(dashData);
      
      // Compute KPIs
      const activeProjects = projects?.filter(p => p.status === 'in_progress').length || 0;
      const totalProjects = projects?.length || 1;
      const pHealth = Math.round((activeProjects / Math.max(totalProjects, 1)) * 100);
      
      // Pricing efficiency: projects with analysis_data having items with prices
      const pricedProjects = projects?.filter(p => {
        const ad = p.analysis_data as any;
        const items = ad?.items || [];
        return items.some((i: any) => i.unit_price > 0);
      }).length || 0;
      const pEfficiency = Math.round((pricedProjects / Math.max(totalProjects, 1)) * 100);
      
      const activeContracts = contracts.filter(c => c.status === 'active' || c.status === 'in_progress').length;
      const cHealth = contracts.length > 0 ? Math.round((activeContracts / contracts.length) * 100) : 100;
      
      // Risk score inverted (lower risk = better)
      const rScore = Math.max(0, Math.min(100, 100 - Math.round((quotationsByStatus.filter(q => (q as any).rawStatus === 'rejected').reduce((s, q) => s + q.count, 0) / Math.max(quotations?.length || 1, 1)) * 100)));
      
      setKpiData({ projectHealth: pHealth, pricingEfficiency: pEfficiency, riskScore: rScore, contractHealth: cHealth });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, dateFrom, dateTo, isArabic]);

  const computeKPIs = (data: DashboardStats) => {
    const pHealth = data.totalProjects > 0 ? Math.round((data.recentProjects.filter(p => p.status === 'in_progress').length / Math.max(data.totalProjects, 1)) * 100) : 0;
    setKpiData(prev => ({ ...prev, projectHealth: pHealth }));
  };

  useEffect(() => {
    if (user) fetchDashboardData();
    else setIsLoading(false);
  }, [user, fetchDashboardData]);

  const applyDateFilter = () => { fetchDashboardData(false); setIsFilterOpen(false); };
  const clearDateFilter = () => { setDateFrom(""); setDateTo(""); setTimeout(() => fetchDashboardData(false), 0); setIsFilterOpen(false); };

  const getKPIStatus = (value: number): string => {
    if (value >= 75) return isArabic ? "ممتاز" : "Excellent";
    if (value >= 50) return isArabic ? "جيد" : "Good";
    return isArabic ? "يحتاج تحسين" : "Needs Work";
  };

  const getKPIColor = (value: number): string => {
    if (value >= 75) return "#F5A623";
    if (value >= 50) return "#2563EB";
    return "#EF4444";
  };

  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <LayoutDashboard className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">{isArabic ? "سجل الدخول لعرض لوحة التحكم" : "Sign in to view dashboard"}</h3>
          <p className="text-muted-foreground text-center">{isArabic ? "قم بتسجيل الدخول لعرض ملخص مشاريعك وعروض الأسعار" : "Sign in to see a summary of your projects and quotations"}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="rounded-2xl border-0"><CardContent className="p-5"><div className="flex items-center justify-between"><div className="space-y-2"><div className="h-4 w-24 bg-muted animate-pulse rounded" /><div className="h-8 w-16 bg-muted animate-pulse rounded" /></div><div className="w-14 h-14 rounded-2xl bg-muted animate-pulse" /></div></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="rounded-2xl border-0"><CardContent className="p-4"><div className="h-4 w-20 bg-muted animate-pulse rounded mb-3" /><div className="h-2 w-full bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2].map(i => (<Card key={i}><CardContent className="p-6"><div className="h-4 w-32 bg-muted animate-pulse rounded mb-4" /><div className="h-48 bg-muted animate-pulse rounded" /></CardContent></Card>))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const budgetAlert = checkBudgetAlert();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? "لوحة التحكم" : "Dashboard"}</span>
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? "المخاطر" : "Risks"}</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileSignature className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? "العقود" : "Contracts"}</span>
          </TabsTrigger>
          <TabsTrigger value="cost-benefit" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? "التكلفة/العائد" : "Cost/Benefit"}</span>
          </TabsTrigger>
          <TabsTrigger value="linkage" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? "الربط" : "Linkage"}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Header with reorganized buttons */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{isArabic ? "لوحة التحكم" : "Dashboard"}</h2>
                <p className="text-sm text-muted-foreground">{isArabic ? "نظام إدارة المشاريع المتكامل" : "Integrated Project Management System"}</p>
              </div>
            </div>

            {/* Reorganized toolbar: only 4-5 main buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter */}
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={dateFrom || dateTo ? "border-primary" : ""}>
                    <Filter className="w-4 h-4 me-2" />
                    {isArabic ? "فلترة" : "Filter"}
                    {(dateFrom || dateTo) && <Badge variant="secondary" className="ms-2 text-xs">{isArabic ? "مفعّل" : "Active"}</Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-popover" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium">{isArabic ? "فلترة حسب التاريخ" : "Filter by Date"}</h4>
                    <div className="space-y-2">
                      <Label>{isArabic ? "من تاريخ" : "From Date"}</Label>
                      <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? "إلى تاريخ" : "To Date"}</Label>
                      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={applyDateFilter} className="flex-1">{isArabic ? "تطبيق" : "Apply"}</Button>
                      <Button size="sm" variant="outline" onClick={clearDateFilter}>{isArabic ? "مسح" : "Clear"}</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Reports */}
              <Button size="sm" onClick={() => navigate("/projects?tab=reports")} className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? "التقارير" : "Reports"}</span>
              </Button>

              {/* Budget */}
              <Popover open={showBudgetSettings} onOpenChange={setShowBudgetSettings}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={budgetAlert.isOverBudget || budgetAlert.isNearThreshold ? "border-destructive" : ""}>
                    <AlertTriangle className={`w-4 h-4 me-1 ${budgetAlert.isOverBudget ? 'text-destructive' : budgetAlert.isNearThreshold ? 'text-amber-500' : ''}`} />
                    <span className="hidden sm:inline">{isArabic ? "الميزانية" : "Budget"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-popover" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium">{isArabic ? "إعدادات الميزانية" : "Budget Settings"}</h4>
                    <div className="space-y-2">
                      <Label>{isArabic ? "الحد الأقصى (ر.س)" : "Max Budget (SAR)"}</Label>
                      <Input type="number" value={budgetSettings.maxBudget} onChange={(e) => setBudgetSettings({...budgetSettings, maxBudget: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? "نسبة التنبيه (%)" : "Alert Threshold (%)"}</Label>
                      <Input type="number" min="1" max="100" value={budgetSettings.alertThreshold} onChange={(e) => setBudgetSettings({...budgetSettings, alertThreshold: Number(e.target.value)})} />
                    </div>
                    <Button size="sm" onClick={() => saveBudgetSettings(budgetSettings)} className="w-full">{isArabic ? "حفظ" : "Save"}</Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Export & Tools Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-4 h-4 me-1" />
                    <span className="hidden sm:inline">{isArabic ? "أدوات" : "Tools"}</span>
                    <ChevronDown className="w-3 h-3 ms-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                  <DropdownMenuItem onClick={printReport}>
                    <Printer className="w-4 h-4 me-2" />
                    {isArabic ? "طباعة التقرير" : "Print Report"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF}>
                    <Download className="w-4 h-4 me-2" />
                    {isArabic ? "تصدير PDF" : "Export PDF"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel}>
                    <FileSpreadsheet className="w-4 h-4 me-2" />
                    {isArabic ? "تصدير Excel" : "Export Excel"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <div className="w-full"><ProjectComparisonReport isArabic={isArabic} /></div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Refresh */}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { sessionStorage.removeItem(CACHE_KEY); fetchDashboardData(false); }}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Budget Alert Banner */}
          {(budgetAlert.isOverBudget || budgetAlert.isNearThreshold) && (
            <Card className={`${budgetAlert.isOverBudget ? 'bg-destructive/10 border-destructive' : 'bg-amber-500/10 border-amber-500'}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className={`w-6 h-6 ${budgetAlert.isOverBudget ? 'text-destructive' : 'text-amber-500'}`} />
                <div className="flex-1">
                  <p className="font-medium">
                    {budgetAlert.isOverBudget ? (isArabic ? "تجاوزت الميزانية المحددة!" : "Budget exceeded!") : (isArabic ? "اقتربت من الحد الأقصى للميزانية" : "Approaching budget limit")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? `إجمالي القيمة: ${formatCurrency(stats.totalValue)} (${budgetAlert.percentage.toFixed(1)}% من الميزانية)` : `Total value: ${formatCurrency(stats.totalValue)} (${budgetAlert.percentage.toFixed(1)}% of budget)`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={isArabic ? "إجمالي القيمة" : "Total Value"} value={formatCurrency(stats.totalValue)} icon={DollarSign} bgColor="bg-amber-100 dark:bg-amber-500/20" iconColor="text-amber-500 dark:text-[#F5A623]" />
            <StatCard label={isArabic ? "إجمالي المشاريع" : "Total Projects"} value={stats.totalProjects} icon={FolderOpen} bgColor="bg-blue-100 dark:bg-blue-500/20" iconColor="text-blue-600 dark:text-blue-400" />
            <StatCard label={isArabic ? "عروض الأسعار" : "Quotations"} value={stats.totalQuotations} icon={Receipt} bgColor="bg-emerald-100 dark:bg-emerald-500/20" iconColor="text-emerald-600 dark:text-emerald-400" />
            <StatCard label={isArabic ? "متوسط العرض" : "Avg. Quotation"} value={formatCurrency(stats.averageQuotationValue)} icon={TrendingUp} bgColor="bg-purple-100 dark:bg-purple-500/20" iconColor="text-purple-600 dark:text-purple-400" />
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={HeartPulse} label={isArabic ? "صحة المشاريع" : "Project Health"} value={kpiData.projectHealth} color={getKPIColor(kpiData.projectHealth)} status={getKPIStatus(kpiData.projectHealth)} isArabic={isArabic} />
            <KPICard icon={Target} label={isArabic ? "كفاءة التسعير" : "Pricing Efficiency"} value={kpiData.pricingEfficiency} color={getKPIColor(kpiData.pricingEfficiency)} status={getKPIStatus(kpiData.pricingEfficiency)} isArabic={isArabic} />
            <KPICard icon={Shield} label={isArabic ? "مؤشر الأمان" : "Safety Score"} value={kpiData.riskScore} color={getKPIColor(kpiData.riskScore)} status={getKPIStatus(kpiData.riskScore)} isArabic={isArabic} />
            <KPICard icon={FileCheck} label={isArabic ? "صحة العقود" : "Contract Health"} value={kpiData.contractHealth} color={getKPIColor(kpiData.contractHealth)} status={getKPIStatus(kpiData.contractHealth)} isArabic={isArabic} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Combined Monthly Chart with Toggle */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" style={{ color: "#3B82F6" }} />
                    {isArabic ? "النشاط الشهري" : "Monthly Activity"}
                  </CardTitle>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <Button variant={chartMode === "area" ? "default" : "ghost"} size="sm" className="h-7 px-3 text-xs" onClick={() => setChartMode("area")}>
                      {isArabic ? "مساحة" : "Area"}
                    </Button>
                    <Button variant={chartMode === "bar" ? "default" : "ghost"} size="sm" className="h-7 px-3 text-xs" onClick={() => setChartMode("bar")}>
                      {isArabic ? "أعمدة" : "Bar"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartMode === "area" ? (
                      <AreaChart data={stats.monthlyActivity}>
                        <defs>
                          <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="quotGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area type="monotone" dataKey="projects" name={isArabic ? "المشاريع" : "Projects"} stroke="#3B82F6" fill="url(#projGrad)" strokeWidth={2} animationDuration={800} />
                        <Area type="monotone" dataKey="quotations" name={isArabic ? "العروض" : "Quotations"} stroke="#10B981" fill="url(#quotGrad)" strokeWidth={2} animationDuration={800} />
                      </AreaChart>
                    ) : (
                      <BarChart data={stats.monthlyActivity} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="projects" name={isArabic ? "المشاريع" : "Projects"} fill="#3B82F6" radius={[4, 4, 0, 0]} animationDuration={800} />
                        <Bar dataKey="quotations" name={isArabic ? "العروض" : "Quotations"} fill="#10B981" radius={[4, 4, 0, 0]} animationDuration={800} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quotations by Status Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                  {isArabic ? "حالة العروض" : "Quotation Status"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {stats.quotationsByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={stats.quotationsByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="status"
                          label={({ status, count }) => `${status}: ${count}`}
                          animationDuration={800}
                        >
                          {stats.quotationsByStatus.map((entry: any, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.rawStatus] || CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      {isArabic ? "لا توجد عروض أسعار" : "No quotations yet"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Value Distribution */}
          {stats.recentProjects.some(p => {
            const items = p.analysis_data?.items || [];
            return items.reduce((s: number, i: any) => s + (i.total_price || 0), 0) > 0;
          }) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                  {isArabic ? "توزيع قيم المشاريع" : "Project Value Distribution"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.recentProjects
                        .map(p => ({
                          name: p.name?.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
                          value: (p.analysis_data?.items || []).reduce((s: number, i: any) => s + (i.total_price || 0), 0)
                        }))
                        .filter(d => d.value > 0)
                      }
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name={isArabic ? "القيمة" : "Value"} fill="#8B5CF6" radius={[0, 6, 6, 0]} animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Projects */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-amber-500" />
                    {isArabic ? "المشاريع الأخيرة" : "Recent Projects"}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/saved-projects")} className="text-muted-foreground hover:text-primary">
                    {isArabic ? "عرض الكل" : "View All"}<ArrowRight className="w-4 h-4 ms-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stats.recentProjects.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentProjects.map((project) => {
                      const getStatusBadge = (status: string | null) => {
                        switch (status) {
                          case 'in_progress': return { label: isArabic ? 'قيد التنفيذ' : 'In Progress', variant: 'default' as const };
                          case 'completed': return { label: isArabic ? 'مكتمل' : 'Completed', variant: 'secondary' as const };
                          case 'suspended': return { label: isArabic ? 'معلق' : 'Suspended', variant: 'destructive' as const };
                          default: return { label: isArabic ? 'مسودة' : 'Draft', variant: 'outline' as const };
                        }
                      };
                      const statusBadge = getStatusBadge(project.status);
                      const itemsCount = project.analysis_data?.items?.length || 0;
                      const pricedItems = project.analysis_data?.items?.filter((i: any) => i.unit_price > 0).length || 0;
                      const pricingProgress = itemsCount > 0 ? Math.round((pricedItems / itemsCount) * 100) : 0;
                      const totalValue = project.analysis_data?.items?.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0) || 0;

                      return (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer group"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium truncate">{project.name}</p>
                                <Badge variant={statusBadge.variant} className="text-xs shrink-0">{statusBadge.label}</Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(project.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                                </span>
                                <span>•</span>
                                <span>{itemsCount} {isArabic ? 'بند' : 'items'}</span>
                                {totalValue > 0 && (<><span>•</span><span className="text-primary font-medium">SAR {totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></>)}
                              </div>
                              {/* Mini pricing progress */}
                              {itemsCount > 0 && (
                                <div className="mt-1.5 flex items-center gap-2">
                                  <Progress value={pricingProgress} className="h-1.5 flex-1" />
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{pricingProgress}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ms-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }} title={isArabic ? "عرض التفاصيل" : "View Details"}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/analysis")}>{isArabic ? "إنشاء مشروع جديد" : "Create New Project"}</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Quotations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-500" />
                  {isArabic ? "العروض الأخيرة" : "Recent Quotations"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentQuotations.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentQuotations.map((quotation) => (
                      <div key={quotation.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/40 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium">{quotation.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">{quotation.supplier_name || (isArabic ? 'مورد غير محدد' : 'Unknown supplier')}</p>
                              <Badge variant="secondary" className="text-xs">{getStatusLabel(quotation.status || 'pending')}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-end">
                          <p className="font-semibold text-primary">{quotation.total_amount ? formatCurrency(quotation.total_amount) : '-'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(quotation.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{isArabic ? "لا توجد عروض أسعار" : "No quotations yet"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Image Upload - Compact, moved to bottom */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              {uploadedImage ? (
                <div className="relative flex items-center gap-4">
                  <img src={uploadedImage} alt="Uploaded" className="w-24 h-16 object-cover rounded-lg border border-border" loading="lazy" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{isArabic ? "صورة مرفوعة" : "Uploaded Image"}</p>
                    <p className="text-xs text-muted-foreground">{isArabic ? "انقر × لإزالتها" : "Click × to remove"}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={removeImage}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                  onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f); }}
                  className={`flex items-center gap-4 cursor-pointer transition-colors py-2 ${isDragOver ? 'bg-primary/5' : ''}`}
                  onClick={() => document.getElementById('image-upload-input')?.click()}
                >
                  <input id="image-upload-input" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{isArabic ? "رفع صورة" : "Upload Image"}</p>
                    <p className="text-xs text-muted-foreground">{isArabic ? "اسحب أو انقر • حد أقصى 5MB" : "Drag or click • Max 5MB"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks"><RiskManagement /></TabsContent>
        <TabsContent value="contracts"><ContractManagement /></TabsContent>
        <TabsContent value="cost-benefit"><CostBenefitAnalysis /></TabsContent>
        <TabsContent value="linkage"><ContractLinkage /></TabsContent>
      </Tabs>
    </div>
  );
}

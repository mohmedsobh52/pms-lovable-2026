import { useState, useEffect, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  Shield,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Brain,
  Loader2,
  Target,
  AlertCircle,
  Search,
  SlidersHorizontal,
  FileText,
  ArrowUpDown,
  Activity,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  User,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AutoRiskAnalysis } from "@/components/AutoRiskAnalysis";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import { FileDown } from "lucide-react";

interface Risk {
  id: string;
  risk_title: string;
  risk_description: string | null;
  category: string;
  probability: string;
  impact: string;
  risk_score: number | null;
  status: string;
  mitigation_strategy: string | null;
  contingency_plan: string | null;
  risk_owner: string | null;
  identified_date: string;
  review_date: string | null;
}

interface RiskManagementProps {
  projectId?: string;
}

const PROBABILITY_VALUES: Record<string, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  very_high: 5,
};

const IMPACT_VALUES: Record<string, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  very_high: 5,
};

const calculateRiskScore = (probability: string, impact: string): number => {
  return (PROBABILITY_VALUES[probability] || 3) * (IMPACT_VALUES[impact] || 3);
};

const getRiskLevel = (score: number): { level: string; levelAr: string; color: string; bgClass: string; icon: typeof AlertTriangle } => {
  if (score <= 4) return { level: "Low", levelAr: "منخفض", color: "bg-green-500", bgClass: "bg-green-500/5 border-green-500/20", icon: ShieldCheck };
  if (score <= 9) return { level: "Medium", levelAr: "متوسط", color: "bg-yellow-500", bgClass: "bg-yellow-500/5 border-yellow-500/20", icon: Shield };
  if (score <= 16) return { level: "High", levelAr: "عالي", color: "bg-orange-500", bgClass: "bg-orange-500/5 border-orange-500/20", icon: AlertTriangle };
  return { level: "Critical", levelAr: "حرج", color: "bg-red-600", bgClass: "bg-red-500/5 border-red-500/20", icon: ShieldAlert };
};

const getMatrixCellColor = (score: number): string => {
  if (score <= 2) return "bg-green-400";
  if (score <= 4) return "bg-green-500";
  if (score <= 6) return "bg-yellow-400";
  if (score <= 9) return "bg-yellow-500";
  if (score <= 12) return "bg-orange-400";
  if (score <= 16) return "bg-orange-600";
  if (score <= 20) return "bg-red-500";
  return "bg-red-700";
};

const riskTemplates = [
  { titleAr: "تجاوز الميزانية", titleEn: "Budget Overrun", category: "financial", probability: "medium", impact: "high", descAr: "خطر تجاوز التكاليف الفعلية للميزانية المقدرة بسبب تغييرات في الأسعار أو النطاق", descEn: "Risk of actual costs exceeding the estimated budget due to price or scope changes" },
  { titleAr: "تأخر المدفوعات", titleEn: "Payment Delays", category: "financial", probability: "high", impact: "medium", descAr: "تأخر في استلام المستحقات المالية مما يؤثر على التدفق النقدي للمشروع", descEn: "Delay in receiving payments affecting project cash flow" },
  { titleAr: "تأخر الموردين", titleEn: "Supplier Delay", category: "schedule", probability: "high", impact: "high", descAr: "تأخر الموردين في تسليم المواد والمعدات المطلوبة في الوقت المحدد", descEn: "Suppliers failing to deliver materials and equipment on time" },
  { titleAr: "تأخر بداية المشروع", titleEn: "Project Start Delay", category: "schedule", probability: "medium", impact: "high", descAr: "تأخر في بدء تنفيذ المشروع بسبب إجراءات إدارية أو تصاريح", descEn: "Delay in project start due to administrative procedures or permits" },
  { titleAr: "فشل في الاختبارات", titleEn: "Test Failures", category: "technical", probability: "medium", impact: "medium", descAr: "فشل في اختبارات الجودة أو الأداء للمنتجات أو الأعمال المنفذة", descEn: "Quality or performance test failures for products or executed works" },
  { titleAr: "نقص العمالة الماهرة", titleEn: "Skilled Labor Shortage", category: "resource", probability: "medium", impact: "high", descAr: "صعوبة في توفير العمالة الماهرة المطلوبة لتنفيذ الأعمال", descEn: "Difficulty in sourcing skilled labor required for the works" },
  { titleAr: "تغييرات تنظيمية", titleEn: "Regulatory Changes", category: "legal", probability: "low", impact: "high", descAr: "تغييرات في القوانين أو اللوائح تؤثر على تنفيذ المشروع", descEn: "Changes in laws or regulations affecting project execution" },
  { titleAr: "حوادث السلامة", titleEn: "Safety Incidents", category: "safety", probability: "low", impact: "very_high", descAr: "وقوع حوادث عمل تؤثر على سلامة العاملين والمشروع", descEn: "Work accidents affecting worker and project safety" },
  { titleAr: "مشاكل جودة المواد", titleEn: "Material Quality Issues", category: "quality", probability: "medium", impact: "medium", descAr: "وصول مواد لا تطابق المواصفات المطلوبة", descEn: "Materials arriving that don't meet required specifications" },
  { titleAr: "ظروف جوية قاسية", titleEn: "Severe Weather", category: "external", probability: "medium", impact: "medium", descAr: "ظروف مناخية قاسية تعيق سير العمل في الموقع", descEn: "Harsh weather conditions hindering site work progress" },
];

export function RiskManagement({ projectId }: RiskManagementProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAutoAnalysis, setShowAutoAnalysis] = useState(false);
  const [formData, setFormData] = useState({
    risk_title: "",
    risk_description: "",
    category: "technical",
    probability: "medium",
    impact: "medium",
    status: "identified",
    mitigation_strategy: "",
    contingency_plan: "",
    risk_owner: "",
  });

  const categories = [
    { value: "technical", labelEn: "Technical", labelAr: "تقني" },
    { value: "financial", labelEn: "Financial", labelAr: "مالي" },
    { value: "schedule", labelEn: "Schedule", labelAr: "جدول زمني" },
    { value: "resource", labelEn: "Resource", labelAr: "موارد" },
    { value: "external", labelEn: "External", labelAr: "خارجي" },
    { value: "legal", labelEn: "Legal", labelAr: "قانوني" },
    { value: "safety", labelEn: "Safety", labelAr: "سلامة" },
    { value: "quality", labelEn: "Quality", labelAr: "جودة" },
  ];

  const probabilities = [
    { value: "very_low", labelEn: "Very Low", labelAr: "منخفض جداً" },
    { value: "low", labelEn: "Low", labelAr: "منخفض" },
    { value: "medium", labelEn: "Medium", labelAr: "متوسط" },
    { value: "high", labelEn: "High", labelAr: "عالي" },
    { value: "very_high", labelEn: "Very High", labelAr: "عالي جداً" },
  ];

  const statuses = [
    { value: "identified", labelEn: "Identified", labelAr: "محدد" },
    { value: "assessed", labelEn: "Assessed", labelAr: "مقيّم" },
    { value: "mitigating", labelEn: "Mitigating", labelAr: "قيد المعالجة" },
    { value: "monitoring", labelEn: "Monitoring", labelAr: "قيد المراقبة" },
    { value: "closed", labelEn: "Closed", labelAr: "مغلق" },
    { value: "occurred", labelEn: "Occurred", labelAr: "حدث" },
  ];

  const fetchRisks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("risks")
        .select("*")
        .eq("user_id", user.id)
        .order("risk_score", { ascending: false, nullsFirst: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRisks(data || []);
    } catch (error) {
      console.error("Error fetching risks:", error);
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  const handleSave = useCallback(async () => {
    if (!user || !formData.risk_title) return;
    setSaving(true);
    try {
      const riskScore = calculateRiskScore(formData.probability, formData.impact);
      const riskData = {
        user_id: user.id,
        project_id: projectId || null,
        risk_title: formData.risk_title,
        risk_description: formData.risk_description || null,
        category: formData.category,
        probability: formData.probability,
        impact: formData.impact,
        risk_score: riskScore,
        status: formData.status,
        mitigation_strategy: formData.mitigation_strategy || null,
        contingency_plan: formData.contingency_plan || null,
        risk_owner: formData.risk_owner || null,
      };

      if (editingRisk) {
        const { error } = await supabase
          .from("risks")
          .update(riskData)
          .eq("id", editingRisk.id);
        if (error) throw error;
        toast({ title: isArabic ? "تم التحديث" : "Updated" });
      } else {
        const { error } = await supabase.from("risks").insert(riskData);
        if (error) throw error;
        toast({ title: isArabic ? "تمت الإضافة" : "Added" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchRisks();
    } catch (error) {
      console.error("Error saving risk:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [user, formData, editingRisk, projectId, isArabic, fetchRisks, toast]);

  const handleDelete = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("risks").delete().eq("id", id);
      if (error) throw error;
      toast({ title: isArabic ? "تم الحذف" : "Deleted" });
      fetchRisks();
    } catch (error) {
      console.error("Error deleting risk:", error);
    }
  }, [user, isArabic, fetchRisks, toast]);

  const resetForm = () => {
    setFormData({
      risk_title: "",
      risk_description: "",
      category: "technical",
      probability: "medium",
      impact: "medium",
      status: "identified",
      mitigation_strategy: "",
      contingency_plan: "",
      risk_owner: "",
    });
    setEditingRisk(null);
    setShowTemplates(false);
  };

  const openEditDialog = (risk: Risk) => {
    setEditingRisk(risk);
    setFormData({
      risk_title: risk.risk_title,
      risk_description: risk.risk_description || "",
      category: risk.category,
      probability: risk.probability,
      impact: risk.impact,
      status: risk.status,
      mitigation_strategy: risk.mitigation_strategy || "",
      contingency_plan: risk.contingency_plan || "",
      risk_owner: risk.risk_owner || "",
    });
    setShowTemplates(false);
    setIsDialogOpen(true);
  };

  const applyTemplate = (template: typeof riskTemplates[0]) => {
    setFormData({
      ...formData,
      risk_title: isArabic ? template.titleAr : template.titleEn,
      risk_description: isArabic ? template.descAr : template.descEn,
      category: template.category,
      probability: template.probability,
      impact: template.impact,
    });
    setShowTemplates(false);
  };

  // Memoized stats
  const stats = useMemo(() => {
    const total = risks.length;
    const critical = risks.filter((r) => (r.risk_score || 0) > 16).length;
    const high = risks.filter((r) => (r.risk_score || 0) > 9 && (r.risk_score || 0) <= 16).length;
    const mitigated = risks.filter((r) => r.status === "closed" || r.status === "monitoring").length;
    const active = risks.filter((r) => r.status !== "closed").length;
    const avgScore = total > 0 ? Math.round(risks.reduce((sum, r) => sum + (r.risk_score || 0), 0) / total) : 0;
    return { total, critical, high, mitigated, active, avgScore };
  }, [risks]);

  // Memoized filtered & sorted risks
  const filteredRisks = useMemo(() => {
    return risks.filter((r) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.risk_title.toLowerCase().includes(q) && 
            !(r.risk_description || "").toLowerCase().includes(q) &&
            !(r.risk_owner || "").toLowerCase().includes(q)) return false;
      }
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (levelFilter !== "all") {
        const score = r.risk_score || 0;
        if (levelFilter === "critical" && score <= 16) return false;
        if (levelFilter === "high" && (score <= 9 || score > 16)) return false;
        if (levelFilter === "medium" && (score <= 4 || score > 9)) return false;
        if (levelFilter === "low" && score > 4) return false;
      }
      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case "score": return (b.risk_score || 0) - (a.risk_score || 0);
        case "category": return a.category.localeCompare(b.category);
        case "status": return a.status.localeCompare(b.status);
        case "date": return new Date(b.identified_date).getTime() - new Date(a.identified_date).getTime();
        default: return 0;
      }
    });
  }, [risks, searchQuery, categoryFilter, statusFilter, levelFilter, sortBy]);

  const formScore = calculateRiskScore(formData.probability, formData.impact);
  const formLevel = getRiskLevel(formScore);

  return (
    <>
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-orange-500/10 to-red-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <CardTitle>{isArabic ? "إدارة المخاطر" : "Risk Management"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isArabic 
                  ? `${stats.active} ${stats.active === 1 ? "خطر نشط" : "مخاطر نشطة"} من ${stats.total} إجمالي`
                  : `${stats.active} active of ${stats.total} total risks`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowAutoAnalysis(true)} className="gap-2">
              <Brain className="w-4 h-4" />
              {isArabic ? "تحليل تلقائي" : "AI Analysis"}
            </Button>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              {isArabic ? "إضافة خطر" : "Add Risk"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">{isArabic ? "الإجمالي" : "Total"}</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span className="text-xs text-muted-foreground">{isArabic ? "حرجة" : "Critical"}</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">{isArabic ? "عالية" : "High"}</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">{isArabic ? "تمت المعالجة" : "Mitigated"}</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.mitigated}</div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">{isArabic ? "متوسط الدرجة" : "Avg Score"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{stats.avgScore}</span>
              <Badge className={cn("text-white text-[10px]", getRiskLevel(stats.avgScore).color)}>
                {isArabic ? getRiskLevel(stats.avgScore).levelAr : getRiskLevel(stats.avgScore).level}
              </Badge>
            </div>
          </div>
        </div>

        {/* Risk Matrix with Tooltips */}
        <TooltipProvider>
          <div className="p-4 rounded-lg bg-muted/30 border">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              {isArabic ? "مصفوفة المخاطر" : "Risk Matrix"}
            </h4>
            <div className="grid grid-cols-6 gap-1 text-xs">
              <div></div>
              {probabilities.map((p) => (
                <div key={p.value} className="text-center p-1 font-medium">
                  {isArabic ? p.labelAr : p.labelEn}
                </div>
              ))}
              {probabilities.slice().reverse().map((impact) => (
                <div key={`row-${impact.value}`} className="contents">
                  <div className="p-1 font-medium flex items-center">
                    {isArabic ? impact.labelAr : impact.labelEn}
                  </div>
                  {probabilities.map((prob) => {
                    const score = PROBABILITY_VALUES[prob.value] * IMPACT_VALUES[impact.value];
                    const cellColor = getMatrixCellColor(score);
                    const cellRisks = risks.filter(
                      (r) => r.probability === prob.value && r.impact === impact.value
                    );
                    const count = cellRisks.length;
                    return (
                      <Tooltip key={`${prob.value}-${impact.value}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "p-2 rounded text-center text-white font-medium cursor-default transition-transform hover:scale-105",
                              cellColor
                            )}
                          >
                            {count > 0 ? count : <span className="opacity-30">0</span>}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="font-medium mb-1">
                            {isArabic ? `الدرجة: ${score}` : `Score: ${score}`}
                          </p>
                          {cellRisks.length > 0 ? (
                            <ul className="text-xs space-y-0.5">
                              {cellRisks.map(r => (
                                <li key={r.id}>• {r.risk_title}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {isArabic ? "لا توجد مخاطر" : "No risks"}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={isArabic ? "بحث بالعنوان أو الوصف أو المسؤول..." : "Search by title, description, or owner..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">{isArabic ? "الدرجة" : "Score"}</SelectItem>
                <SelectItem value="category">{isArabic ? "الفئة" : "Category"}</SelectItem>
                <SelectItem value="status">{isArabic ? "الحالة" : "Status"}</SelectItem>
                <SelectItem value="date">{isArabic ? "التاريخ" : "Date"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder={isArabic ? "الفئة" : "Category"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الفئات" : "All Categories"}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {isArabic ? c.labelAr : c.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder={isArabic ? "الحالة" : "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الحالات" : "All Statuses"}</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {isArabic ? s.labelAr : s.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder={isArabic ? "المستوى" : "Level"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل المستويات" : "All Levels"}</SelectItem>
                <SelectItem value="critical">{isArabic ? "حرج" : "Critical"}</SelectItem>
                <SelectItem value="high">{isArabic ? "عالي" : "High"}</SelectItem>
                <SelectItem value="medium">{isArabic ? "متوسط" : "Medium"}</SelectItem>
                <SelectItem value="low">{isArabic ? "منخفض" : "Low"}</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || categoryFilter !== "all" || statusFilter !== "all" || levelFilter !== "all") && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearchQuery(""); setCategoryFilter("all"); setStatusFilter("all"); setLevelFilter("all"); }}>
                <X className="w-3 h-3 mr-1" />
                {isArabic ? "مسح الفلاتر" : "Clear"}
              </Button>
            )}
          </div>
        </div>

        {/* Risks Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4 items-center p-3">
                <Skeleton className="h-5 w-[200px]" />
                <Skeleton className="h-5 w-[80px]" />
                <Skeleton className="h-5 w-[60px]" />
                <Skeleton className="h-5 w-[60px]" />
                <Skeleton className="h-5 w-[40px]" />
                <Skeleton className="h-5 w-[70px]" />
              </div>
            ))}
          </div>
        ) : filteredRisks.length === 0 && risks.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{isArabic ? "لا توجد مخاطر مسجلة" : "No risks recorded"}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                {isArabic 
                  ? "ابدأ بتسجيل المخاطر المحتملة لمشروعك لضمان متابعتها ومعالجتها بشكل استباقي"
                  : "Start recording potential risks for your project to proactively track and mitigate them"}
              </p>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              {isArabic ? "إضافة أول خطر" : "Add First Risk"}
            </Button>
          </div>
        ) : filteredRisks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{isArabic ? "لا توجد نتائج مطابقة للفلاتر" : "No results match your filters"}</p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? "المخاطر" : "Risk"}</TableHead>
                    <TableHead>{isArabic ? "الفئة" : "Category"}</TableHead>
                    <TableHead>{isArabic ? "الاحتمالية" : "Prob."}</TableHead>
                    <TableHead>{isArabic ? "التأثير" : "Impact"}</TableHead>
                    <TableHead>{isArabic ? "الدرجة" : "Score"}</TableHead>
                    <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isArabic ? "المسؤول" : "Owner"}</TableHead>
                    <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.map((risk) => {
                    const riskInfo = getRiskLevel(risk.risk_score || 0);
                    const LevelIcon = riskInfo.icon;
                    return (
                      <TableRow key={risk.id} className={cn("border-l-4", riskInfo.bgClass, 
                        risk.risk_score && risk.risk_score > 16 ? "border-l-red-600" :
                        risk.risk_score && risk.risk_score > 9 ? "border-l-orange-500" :
                        risk.risk_score && risk.risk_score > 4 ? "border-l-yellow-500" : "border-l-green-500"
                      )}>
                        <TableCell>
                          <div className="font-medium">{risk.risk_title}</div>
                          {risk.risk_description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {risk.risk_description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categories.find((c) => c.value === risk.category)?.[isArabic ? "labelAr" : "labelEn"]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {probabilities.find((p) => p.value === risk.probability)?.[isArabic ? "labelAr" : "labelEn"]}
                        </TableCell>
                        <TableCell className="text-xs">
                          {probabilities.find((p) => p.value === risk.impact)?.[isArabic ? "labelAr" : "labelEn"]}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <LevelIcon className="w-3.5 h-3.5" />
                            <Badge className={cn("text-white", riskInfo.color)}>{risk.risk_score}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {statuses.find((s) => s.value === risk.status)?.[isArabic ? "labelAr" : "labelEn"]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {risk.risk_owner || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {risk.identified_date ? new Date(risk.identified_date).toLocaleDateString(isArabic ? "ar-EG" : "en-US", { month: "short", day: "numeric" }) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(risk)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isArabic ? "تعديل" : "Edit"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleDelete(risk.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isArabic ? "حذف" : "Delete"}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        )}
      </CardContent>

      {/* Add/Edit Dialog - Conditional Rendering */}
      {isDialogOpen && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRisk
                  ? isArabic ? "تعديل الخطر" : "Edit Risk"
                  : isArabic ? "إضافة خطر جديد" : "Add New Risk"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Risk Templates */}
              {!editingRisk && (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 mb-2"
                    onClick={() => setShowTemplates(!showTemplates)}
                  >
                    <FileText className="w-4 h-4" />
                    {isArabic ? "استخدام قالب جاهز" : "Use Template"}
                  </Button>
                  {showTemplates && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg bg-muted/50 border max-h-[200px] overflow-y-auto">
                      {riskTemplates.map((t, i) => (
                        <button
                          key={i}
                          className="text-start p-2 rounded-md border bg-background hover:bg-accent transition-colors text-sm"
                          onClick={() => applyTemplate(t)}
                        >
                          <div className="font-medium text-xs">{isArabic ? t.titleAr : t.titleEn}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {categories.find(c => c.value === t.category)?.[isArabic ? "labelAr" : "labelEn"]} • {isArabic ? getRiskLevel(calculateRiskScore(t.probability, t.impact)).levelAr : getRiskLevel(calculateRiskScore(t.probability, t.impact)).level}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>{isArabic ? "عنوان الخطر *" : "Risk Title *"}</Label>
                <Input
                  value={formData.risk_title}
                  onChange={(e) => setFormData({ ...formData, risk_title: e.target.value })}
                  placeholder={isArabic ? "وصف مختصر للخطر" : "Brief risk description"}
                />
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? "الوصف التفصيلي" : "Detailed Description"}</Label>
                <Textarea
                  value={formData.risk_description}
                  onChange={(e) => setFormData({ ...formData, risk_description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الفئة" : "Category"}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {isArabic ? c.labelAr : c.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{isArabic ? "الحالة" : "Status"}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {isArabic ? s.labelAr : s.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الاحتمالية" : "Probability"}</Label>
                  <Select
                    value={formData.probability}
                    onValueChange={(v) => setFormData({ ...formData, probability: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {probabilities.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {isArabic ? p.labelAr : p.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{isArabic ? "التأثير" : "Impact"}</Label>
                  <Select
                    value={formData.impact}
                    onValueChange={(v) => setFormData({ ...formData, impact: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {probabilities.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {isArabic ? p.labelAr : p.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Interactive Risk Score Display */}
              <div className="p-3 rounded-lg border space-y-2" style={{ backgroundColor: `hsl(${formScore <= 4 ? '142' : formScore <= 9 ? '48' : formScore <= 16 ? '25' : '0'} 70% 97%)` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? "درجة الخطر المحسوبة" : "Calculated Risk Score"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{formScore}</span>
                    <Badge className={cn("text-white", formLevel.color)}>
                      {isArabic ? formLevel.levelAr : formLevel.level}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={(formScore / 25) * 100} 
                  className="h-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{isArabic ? "منخفض" : "Low"}</span>
                  <span>{isArabic ? "متوسط" : "Medium"}</span>
                  <span>{isArabic ? "عالي" : "High"}</span>
                  <span>{isArabic ? "حرج" : "Critical"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? "استراتيجية التخفيف" : "Mitigation Strategy"}</Label>
                <Textarea
                  value={formData.mitigation_strategy}
                  onChange={(e) => setFormData({ ...formData, mitigation_strategy: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? "خطة الطوارئ" : "Contingency Plan"}</Label>
                <Textarea
                  value={formData.contingency_plan}
                  onChange={(e) => setFormData({ ...formData, contingency_plan: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? "مسؤول الخطر" : "Risk Owner"}</Label>
                <Input
                  value={formData.risk_owner}
                  onChange={(e) => setFormData({ ...formData, risk_owner: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.risk_title}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="ml-2">{isArabic ? "حفظ" : "Save"}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>

    <AutoRiskAnalysis
      open={showAutoAnalysis}
      onOpenChange={setShowAutoAnalysis}
      projectId={projectId}
      onRisksSaved={fetchRisks}
    />
    </>
  );
}

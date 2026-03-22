import { useState, useEffect, useMemo } from "react";
import {
  Calculator, Plus, Trash2, Edit, Save, Loader2, TrendingUp,
  DollarSign, Percent, Clock, BarChart3, GitCompare, Activity,
  ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2, FileText,
  Lightbulb, ArrowUpDown, Target, Sliders, Download, Link2, MousePointer,
} from "lucide-react";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, AreaChart, Area,
} from "recharts";

interface CostBenefitRecord {
  id: string;
  analysis_name: string;
  description: string | null;
  initial_investment: number;
  annual_benefits: number;
  annual_costs: number;
  discount_rate: number;
  analysis_period_years: number;
  npv: number | null;
  bcr: number | null;
  irr: number | null;
  payback_period: number | null;
  assumptions: string | null;
  risks: string | null;
  recommendations: string | null;
  created_at: string;
}

interface CostBenefitAnalysisProps {
  projectId?: string;
}

const calculateNPV = (investment: number, benefits: number, costs: number, rate: number, years: number): number => {
  let npv = -investment;
  for (let i = 1; i <= years; i++) {
    npv += (benefits - costs) / Math.pow(1 + rate, i);
  }
  return npv;
};

const calculateBCR = (investment: number, benefits: number, costs: number, rate: number, years: number): number => {
  let pvB = 0, pvC = investment;
  for (let i = 1; i <= years; i++) {
    pvB += benefits / Math.pow(1 + rate, i);
    pvC += costs / Math.pow(1 + rate, i);
  }
  return pvC > 0 ? pvB / pvC : 0;
};

const calculatePaybackPeriod = (investment: number, benefits: number, costs: number): number | null => {
  const net = benefits - costs;
  return net <= 0 ? null : investment / net;
};

const calculateIRR = (investment: number, benefits: number, costs: number, years: number): number | null => {
  const net = benefits - costs;
  let irr = 0.1;
  for (let iter = 0; iter < 100; iter++) {
    let npv = -investment, dnpv = 0;
    for (let i = 1; i <= years; i++) {
      npv += net / Math.pow(1 + irr, i);
      dnpv -= (i * net) / Math.pow(1 + irr, i + 1);
    }
    if (Math.abs(npv) < 0.0001) return irr;
    if (dnpv === 0) return null;
    irr -= npv / dnpv;
    if (irr < -1) return null;
  }
  return irr > -1 && irr < 10 ? irr : null;
};

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
};

export function CostBenefitAnalysis({ projectId }: CostBenefitAnalysisProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<CostBenefitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState<CostBenefitRecord | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CostBenefitRecord | null>(null);
  const [activeTab, setActiveTab] = useState("analyses");
  const [dialogStep, setDialogStep] = useState(0);
  const [savedProjects, setSavedProjects] = useState<{ id: string; name: string; total_value: number | null }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || "");

  // Sensitivity state
  const [sensitivityTarget, setSensitivityTarget] = useState<string>("");
  const [sensitivityDiscountAdj, setSensitivityDiscountAdj] = useState(0);
  const [sensitivityBenefitAdj, setSensitivityBenefitAdj] = useState(0);

  const [formData, setFormData] = useState({
    analysis_name: "", description: "", initial_investment: "", annual_benefits: "",
    annual_costs: "", discount_rate: "10", analysis_period_years: "5",
    assumptions: "", risks: "", recommendations: "",
  });

  const fetchAnalyses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from("cost_benefit_analysis").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (projectId) query = query.eq("project_id", projectId);
      const { data, error } = await query;
      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error("Error fetching analyses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalyses(); }, [user, projectId]);

  // Fetch saved projects for linking
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      const { data } = await supabase.from("saved_projects").select("id, name, analysis_data").eq("user_id", user.id).eq("is_deleted", false).order("created_at", { ascending: false }).limit(50);
      setSavedProjects((data || []).map((p: any) => ({ id: p.id, name: p.name, total_value: p.analysis_data?.summary?.total_value || null })));
    };
    fetchProjects();
  }, [user]);

  // KPI calculations
  const kpis = useMemo(() => {
    if (analyses.length === 0) return { count: 0, maxNpv: 0, avgBcr: 0, bestIrr: 0 };
    const maxNpv = Math.max(...analyses.map(a => a.npv || 0));
    const avgBcr = analyses.reduce((s, a) => s + (a.bcr || 0), 0) / analyses.length;
    const bestIrr = Math.max(...analyses.map(a => a.irr || 0));
    return { count: analyses.length, maxNpv, avgBcr, bestIrr };
  }, [analyses]);

  const calculatedMetrics = useMemo(() => {
    const inv = parseFloat(formData.initial_investment) || 0;
    const ben = parseFloat(formData.annual_benefits) || 0;
    const cos = parseFloat(formData.annual_costs) || 0;
    const rate = (parseFloat(formData.discount_rate) || 10) / 100;
    const years = parseInt(formData.analysis_period_years) || 5;
    return {
      npv: calculateNPV(inv, ben, cos, rate, years),
      bcr: calculateBCR(inv, ben, cos, rate, years),
      paybackPeriod: calculatePaybackPeriod(inv, ben, cos),
      irr: calculateIRR(inv, ben, cos, years),
    };
  }, [formData]);

  // Sensitivity data
  const sensitivityData = useMemo(() => {
    const target = analyses.find(a => a.id === sensitivityTarget);
    if (!target) return { discountCurve: [], benefitCurve: [], baseNpv: 0, adjustedNpv: 0 };
    const baseRate = target.discount_rate;
    const baseBen = target.annual_benefits;
    const inv = target.initial_investment;
    const cos = target.annual_costs;
    const years = target.analysis_period_years;

    const discountCurve = [];
    for (let adj = -5; adj <= 5; adj += 0.5) {
      const r = Math.max(0.001, baseRate + adj / 100);
      discountCurve.push({
        label: `${(r * 100).toFixed(1)}%`,
        npv: calculateNPV(inv, baseBen, cos, r, years),
        isCurrent: adj === 0,
      });
    }

    const benefitCurve = [];
    for (let adj = -20; adj <= 20; adj += 2) {
      const b = baseBen * (1 + adj / 100);
      benefitCurve.push({
        label: `${adj >= 0 ? "+" : ""}${adj}%`,
        npv: calculateNPV(inv, b, cos, baseRate, years),
        isCurrent: adj === 0,
      });
    }

    const adjustedRate = Math.max(0.001, baseRate + sensitivityDiscountAdj / 100);
    const adjustedBen = baseBen * (1 + sensitivityBenefitAdj / 100);
    const adjustedNpv = calculateNPV(inv, adjustedBen, cos, adjustedRate, years);
    const baseNpv = target.npv || 0;

    return { discountCurve, benefitCurve, baseNpv, adjustedNpv };
  }, [analyses, sensitivityTarget, sensitivityDiscountAdj, sensitivityBenefitAdj]);

  // Radar data for comparison
  const radarData = useMemo(() => {
    if (analyses.length < 2) return [];
    const maxNpv = Math.max(...analyses.map(a => Math.abs(a.npv || 1)));
    const maxInv = Math.max(...analyses.map(a => a.initial_investment || 1));
    return [
      { metric: "NPV", ...Object.fromEntries(analyses.slice(0, 5).map(a => [a.analysis_name, Math.max(0, ((a.npv || 0) / maxNpv) * 100)])) },
      { metric: "BCR", ...Object.fromEntries(analyses.slice(0, 5).map(a => [a.analysis_name, Math.min(100, (a.bcr || 0) * 50)])) },
      { metric: "IRR", ...Object.fromEntries(analyses.slice(0, 5).map(a => [a.analysis_name, Math.min(100, (a.irr || 0) * 500)])) },
      { metric: isArabic ? "استرداد" : "Payback", ...Object.fromEntries(analyses.slice(0, 5).map(a => [a.analysis_name, a.payback_period ? Math.max(0, 100 - a.payback_period * 10) : 0])) },
      { metric: isArabic ? "استثمار" : "Investment", ...Object.fromEntries(analyses.slice(0, 5).map(a => [a.analysis_name, (a.initial_investment / maxInv) * 100])) },
    ];
  }, [analyses, isArabic]);

  const handleSave = async () => {
    if (!user || !formData.analysis_name) return;
    setSaving(true);
    try {
      const inv = parseFloat(formData.initial_investment) || 0;
      const ben = parseFloat(formData.annual_benefits) || 0;
      const cos = parseFloat(formData.annual_costs) || 0;
      const rate = (parseFloat(formData.discount_rate) || 10) / 100;
      const years = parseInt(formData.analysis_period_years) || 5;
      const data = {
        user_id: user.id, project_id: projectId || null,
        analysis_name: formData.analysis_name, description: formData.description || null,
        initial_investment: inv, annual_benefits: ben, annual_costs: cos,
        discount_rate: rate, analysis_period_years: years,
        npv: calculatedMetrics.npv, bcr: calculatedMetrics.bcr,
        irr: calculatedMetrics.irr, payback_period: calculatedMetrics.paybackPeriod,
        assumptions: formData.assumptions || null, risks: formData.risks || null,
        recommendations: formData.recommendations || null,
      };
      if (editingAnalysis) {
        const { error } = await supabase.from("cost_benefit_analysis").update(data).eq("id", editingAnalysis.id);
        if (error) throw error;
        toast({ title: isArabic ? "تم التحديث" : "Updated" });
      } else {
        const { error } = await supabase.from("cost_benefit_analysis").insert(data);
        if (error) throw error;
        toast({ title: isArabic ? "تمت الإضافة" : "Added" });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchAnalyses();
    } catch (error) {
      console.error("Error saving:", error);
      toast({ title: isArabic ? "خطأ" : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("cost_benefit_analysis").delete().eq("id", id);
      if (error) throw error;
      toast({ title: isArabic ? "تم الحذف" : "Deleted" });
      if (selectedAnalysis?.id === id) setSelectedAnalysis(null);
      fetchAnalyses();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const resetForm = () => {
    setFormData({ analysis_name: "", description: "", initial_investment: "", annual_benefits: "", annual_costs: "", discount_rate: "10", analysis_period_years: "5", assumptions: "", risks: "", recommendations: "" });
    setEditingAnalysis(null);
    setDialogStep(0);
    if (!projectId) setSelectedProjectId("");
  };

  const handleImportFromProject = (pid: string) => {
    const proj = savedProjects.find(p => p.id === pid);
    if (proj && proj.total_value) {
      setFormData(prev => ({ ...prev, initial_investment: Math.round(proj.total_value!).toString() }));
      toast({ title: isArabic ? "تم استيراد قيمة المشروع" : "Project value imported" });
    }
  };

  const exportPDF = (a: CostBenefitRecord) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Cost-Benefit Analysis Report", 105, 25, { align: "center" });
    doc.setFontSize(14);
    doc.text(a.analysis_name, 105, 35, { align: "center" });
    doc.setDrawColor(243, 87, 12);
    doc.line(20, 40, 190, 40);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    let y = 52;
    const addRow = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 25, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 100, y);
      y += 8;
    };
    addRow("Initial Investment:", formatCurrency(a.initial_investment));
    addRow("Annual Benefits:", formatCurrency(a.annual_benefits));
    addRow("Annual Costs:", formatCurrency(a.annual_costs));
    addRow("Discount Rate:", `${(a.discount_rate * 100).toFixed(1)}%`);
    addRow("Analysis Period:", `${a.analysis_period_years} years`);
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, 190, y);
    y += 10;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Key Metrics", 25, y);
    y += 10;
    doc.setFontSize(11);
    addRow("NPV:", formatCurrency(a.npv || 0));
    addRow("BCR:", (a.bcr || 0).toFixed(2));
    addRow("IRR:", a.irr ? `${(a.irr * 100).toFixed(1)}%` : "N/A");
    addRow("Payback Period:", a.payback_period ? `${a.payback_period.toFixed(1)} years` : "N/A");
    addRow("Feasibility Score:", `${getFeasibilityScore(a)}%`);
    
    if (a.assumptions) { y += 8; doc.setFont("helvetica", "bold"); doc.text("Assumptions:", 25, y); y += 7; doc.setFont("helvetica", "normal"); const lines = doc.splitTextToSize(a.assumptions, 160); doc.text(lines, 25, y); y += lines.length * 6; }
    if (a.risks) { y += 5; doc.setFont("helvetica", "bold"); doc.text("Risks:", 25, y); y += 7; doc.setFont("helvetica", "normal"); const lines = doc.splitTextToSize(a.risks, 160); doc.text(lines, 25, y); y += lines.length * 6; }
    if (a.recommendations) { y += 5; doc.setFont("helvetica", "bold"); doc.text("Recommendations:", 25, y); y += 7; doc.setFont("helvetica", "normal"); const lines = doc.splitTextToSize(a.recommendations, 160); doc.text(lines, 25, y); }
    
    doc.save(`CBA-${a.analysis_name.replace(/\s+/g, "_")}.pdf`);
    toast({ title: isArabic ? "تم تصدير التقرير" : "Report exported" });
  };

  const openEditDialog = (a: CostBenefitRecord) => {
    setEditingAnalysis(a);
    setFormData({
      analysis_name: a.analysis_name, description: a.description || "",
      initial_investment: a.initial_investment.toString(), annual_benefits: a.annual_benefits.toString(),
      annual_costs: a.annual_costs.toString(), discount_rate: (a.discount_rate * 100).toString(),
      analysis_period_years: a.analysis_period_years.toString(),
      assumptions: a.assumptions || "", risks: a.risks || "", recommendations: a.recommendations || "",
    });
    setDialogStep(0);
    setIsDialogOpen(true);
  };

  const generateChartData = (a: CostBenefitRecord) => {
    const data = [];
    let cum = -a.initial_investment;
    for (let y = 0; y <= a.analysis_period_years; y++) {
      if (y === 0) {
        data.push({ year: `${isArabic ? "سنة" : "Y"}${y}`, cumulative: cum, benefits: 0, costs: a.initial_investment });
      } else {
        cum += a.annual_benefits - a.annual_costs;
        data.push({ year: `${isArabic ? "سنة" : "Y"}${y}`, cumulative: cum, benefits: a.annual_benefits, costs: a.annual_costs });
      }
    }
    return data;
  };

  const getFeasibilityScore = (a: CostBenefitRecord) => {
    let score = 0;
    if ((a.npv || 0) > 0) score += 30;
    if ((a.bcr || 0) >= 1) score += 25;
    if ((a.irr || 0) > a.discount_rate) score += 25;
    if (a.payback_period && a.payback_period < a.analysis_period_years * 0.5) score += 20;
    return score;
  };

  const suggestions: SmartSuggestion[] = useMemo(() => {
    const s: SmartSuggestion[] = [];
    
    // إضافة أول تحليل
    if (analyses.length === 0) {
      s.push({ 
        id: "add-first", 
        icon: <Plus className="h-4 w-4" />, 
        text: isArabic ? "ابدأ بإضافة أول تحليل جدوى" : "Start by adding your first analysis", 
        action: () => { resetForm(); setIsDialogOpen(true); }, 
        actionLabel: isArabic ? "إضافة" : "Add" 
      });
    }
    
    // إضافة تحليل ثاني للمقارنة
    if (analyses.length === 1) {
      s.push({ 
        id: "add-compare", 
        icon: <GitCompare className="h-4 w-4" />, 
        text: isArabic ? "أضف تحليل ثاني لتتمكن من المقارنة" : "Add a second analysis to enable comparison", 
        action: () => { resetForm(); setIsDialogOpen(true); }, 
        actionLabel: isArabic ? "إضافة" : "Add" 
      });
    }
    
    // تحليلات غير مجدية (NPV سالب)
    const nonViable = analyses.filter(a => (a.npv || 0) < 0);
    if (nonViable.length > 0) {
      s.push({ 
        id: "non-viable", 
        icon: <AlertTriangle className="h-4 w-4" />, 
        text: isArabic ? `${nonViable.length} تحليل غير مجدي - راجع الافتراضات` : `${nonViable.length} non-viable analyses - review assumptions`, 
        action: () => setActiveTab("analyses"), 
        actionLabel: isArabic ? "مراجعة" : "Review" 
      });
    }
    
    // BCR أقل من 1 (نسبة فائدة/تكلفة منخفضة)
    const lowBcrAnalyses = analyses.filter(a => (a.bcr || 0) < 1 && (a.npv || 0) >= 0);
    if (lowBcrAnalyses.length > 0) {
      s.push({
        id: "low-bcr",
        icon: <Target className="h-4 w-4" />,
        text: isArabic ? `${lowBcrAnalyses.length} تحليل بنسبة فائدة/تكلفة منخفضة - أعد تقييم الفوائد` : `${lowBcrAnalyses.length} analyses with low BCR - re-evaluate benefits`,
        action: () => { 
          if (lowBcrAnalyses[0]) openEditDialog(lowBcrAnalyses[0]); 
        },
        actionLabel: isArabic ? "تحسين" : "Improve"
      });
    }
    
    // IRR أقل من معدل الخصم
    const lowIrrAnalyses = analyses.filter(a => a.irr !== null && a.discount_rate && a.irr < a.discount_rate);
    if (lowIrrAnalyses.length > 0) {
      s.push({
        id: "low-irr",
        icon: <Percent className="h-4 w-4" />,
        text: isArabic ? `${lowIrrAnalyses.length} تحليل بمعدل عائد أقل من معدل الخصم` : `${lowIrrAnalyses.length} analyses with IRR below discount rate`,
        action: () => setActiveTab("sensitivity"),
        actionLabel: isArabic ? "تحليل الحساسية" : "Sensitivity"
      });
    }
    
    // فترة استرداد طويلة (> 70% من فترة التحليل)
    const longPaybackAnalyses = analyses.filter(a => 
      a.payback_period !== null && a.payback_period > a.analysis_period_years * 0.7
    );
    if (longPaybackAnalyses.length > 0) {
      s.push({
        id: "long-payback",
        icon: <Clock className="h-4 w-4" />,
        text: isArabic ? `${longPaybackAnalyses.length} تحليل بفترة استرداد طويلة - فكر في زيادة الفوائد` : `${longPaybackAnalyses.length} analyses with long payback - consider increasing benefits`,
        action: () => {
          if (longPaybackAnalyses[0]) openEditDialog(longPaybackAnalyses[0]);
        },
        actionLabel: isArabic ? "تحسين" : "Optimize"
      });
    }
    
    // تحليلات قديمة (أكثر من 30 يومًا)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const oldAnalyses = analyses.filter(a => new Date(a.created_at) < thirtyDaysAgo);
    if (oldAnalyses.length > 0 && oldAnalyses.length === analyses.length) {
      s.push({
        id: "old-analyses",
        icon: <Activity className="h-4 w-4" />,
        text: isArabic ? "جميع التحليلات قديمة (أكثر من 30 يومًا) - أضف تحليل جديد" : "All analyses are older than 30 days - add a new analysis",
        action: () => { resetForm(); setIsDialogOpen(true); },
        actionLabel: isArabic ? "إضافة جديد" : "Add New"
      });
    }
    
    // تحليلات بدون توصيات
    const noRecommendations = analyses.filter(a => !a.recommendations || a.recommendations.trim() === "");
    if (noRecommendations.length > 0 && analyses.length > 0) {
      s.push({
        id: "add-recommendations",
        icon: <Lightbulb className="h-4 w-4" />,
        text: isArabic ? `${noRecommendations.length} تحليل بدون توصيات - أضف توصياتك` : `${noRecommendations.length} analyses without recommendations - add your insights`,
        action: () => {
          if (noRecommendations[0]) openEditDialog(noRecommendations[0]);
        },
        actionLabel: isArabic ? "إضافة" : "Add"
      });
    }
    
    // اقتراح تحليل الحساسية
    if (analyses.length >= 1 && !sensitivityTarget) {
      s.push({
        id: "run-sensitivity",
        icon: <Sliders className="h-4 w-4" />,
        text: isArabic ? "جرب تحليل الحساسية لفهم تأثير المتغيرات" : "Try sensitivity analysis to understand variable impacts",
        action: () => {
          setActiveTab("sensitivity");
          if (analyses[0]) setSensitivityTarget(analyses[0].id);
        },
        actionLabel: isArabic ? "تحليل" : "Analyze"
      });
    }
    
    // ربط بمشروع (إذا لم يكن مرتبطًا)
    if (!projectId && analyses.length > 0) {
      s.push({
        id: "link-project",
        icon: <ArrowUpDown className="h-4 w-4" />,
        text: isArabic ? "اربط التحليلات بمشروع لتتبع أفضل" : "Link analyses to a project for better tracking",
        action: () => {
          window.location.href = "/projects";
        },
        actionLabel: isArabic ? "الذهاب للمشاريع" : "Go to Projects"
      });
    }
    
    // تحليلات ممتازة (NPV > 0 و BCR > 1.5 و IRR > معدل الخصم * 2)
    const excellentAnalyses = analyses.filter(a => 
      (a.npv || 0) > 0 && 
      (a.bcr || 0) > 1.5 && 
      a.irr !== null && 
      a.discount_rate && 
      a.irr > a.discount_rate * 2
    );
    if (excellentAnalyses.length > 0) {
      s.push({
        id: "excellent-analyses",
        icon: <CheckCircle2 className="h-4 w-4" />,
        text: isArabic ? `${excellentAnalyses.length} تحليل بمؤشرات ممتازة - جاهز للتنفيذ!` : `${excellentAnalyses.length} analyses with excellent metrics - ready for execution!`,
        action: () => {
          if (excellentAnalyses[0]) setSelectedAnalysis(excellentAnalyses[0]);
        },
        actionLabel: isArabic ? "عرض" : "View"
      });
    }

    // اختر تحليلاً لعرض التفاصيل
    if (analyses.length > 0 && !selectedAnalysis) {
      s.push({
        id: "select-analysis",
        icon: <MousePointer className="h-4 w-4" />,
        text: isArabic ? "اختر تحليلاً من القائمة لعرض التفاصيل الكاملة" : "Select an analysis from the list to view full details",
        action: () => setActiveTab("analyses"),
        actionLabel: isArabic ? "عرض" : "View"
      });
    }

    // افتراضات فارغة
    const noAssumptions = analyses.filter(a => !a.assumptions || a.assumptions.trim() === "");
    if (noAssumptions.length > 0 && analyses.length > 0) {
      s.push({
        id: "empty-assumptions",
        icon: <FileText className="h-4 w-4" />,
        text: isArabic ? `${noAssumptions.length} تحليل بدون افتراضات — أضف افتراضاتك للتوثيق` : `${noAssumptions.length} analyses without assumptions — add for better documentation`,
        action: () => { if (noAssumptions[0]) openEditDialog(noAssumptions[0]); },
        actionLabel: isArabic ? "إضافة" : "Add"
      });
    }

    // تحليل ممتاز - صدّره PDF
    const pdfReady = analyses.filter(a => getFeasibilityScore(a) >= 80);
    if (pdfReady.length > 0) {
      s.push({
        id: "export-pdf",
        icon: <Download className="h-4 w-4" />,
        text: isArabic ? `${pdfReady.length} تحليل بجدوى ممتازة — صدّره كتقرير PDF` : `${pdfReady.length} excellent analyses — export as PDF report`,
        action: () => { if (pdfReady[0]) { setSelectedAnalysis(pdfReady[0]); exportPDF(pdfReady[0]); } },
        actionLabel: isArabic ? "تصدير" : "Export"
      });
    }

    // BCR منخفض رغم IRR جيد
    const bcrIrrMismatch = analyses.filter(a => (a.bcr || 0) < 1 && a.irr !== null && a.discount_rate && a.irr > a.discount_rate);
    if (bcrIrrMismatch.length > 0) {
      s.push({
        id: "bcr-irr-mismatch",
        icon: <AlertTriangle className="h-4 w-4" />,
        text: isArabic ? `${bcrIrrMismatch.length} تحليل: BCR منخفض رغم IRR جيد — راجع التكاليف` : `${bcrIrrMismatch.length} analyses: low BCR despite good IRR — review costs`,
        action: () => { if (bcrIrrMismatch[0]) setSelectedAnalysis(bcrIrrMismatch[0]); },
        actionLabel: isArabic ? "مراجعة" : "Review"
      });
    }
    
    return s;
  }, [analyses, isArabic, projectId, sensitivityTarget, selectedAnalysis]);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  const kpiCards = [
    { label: isArabic ? "عدد التحليلات" : "Total Analyses", value: kpis.count, icon: <FileText className="h-5 w-5" />, color: "text-primary" },
    { label: isArabic ? "أعلى NPV" : "Highest NPV", value: formatCurrency(kpis.maxNpv), icon: <TrendingUp className="h-5 w-5" />, color: "text-emerald-600 dark:text-emerald-400" },
    { label: isArabic ? "متوسط BCR" : "Avg BCR", value: kpis.avgBcr.toFixed(2), icon: <Target className="h-5 w-5" />, color: "text-blue-600 dark:text-blue-400" },
    { label: isArabic ? "أفضل IRR" : "Best IRR", value: kpis.bestIrr ? `${(kpis.bestIrr * 100).toFixed(1)}%` : "N/A", icon: <Percent className="h-5 w-5" />, color: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{isArabic ? "تحليل التكلفة والفائدة" : "Cost-Benefit Analysis"}</h2>
            <p className="text-sm text-muted-foreground">{isArabic ? "تقييم الجدوى الاقتصادية بأحدث المعايير" : "Advanced economic feasibility evaluation"}</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          {isArabic ? "تحليل جديد" : "New Analysis"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={i} className="border border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={cn("p-2 rounded-lg bg-muted/50", kpi.color)}>{kpi.icon}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && <SmartSuggestionsBanner suggestions={suggestions} />}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 h-11">
          <TabsTrigger value="analyses" className="gap-2 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            {isArabic ? "التحليلات" : "Analyses"}
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-2 text-xs sm:text-sm" disabled={analyses.length < 2}>
            <GitCompare className="h-4 w-4" />
            {isArabic ? "المقارنة" : "Comparison"}
          </TabsTrigger>
          <TabsTrigger value="sensitivity" className="gap-2 text-xs sm:text-sm" disabled={analyses.length === 0}>
            <Sliders className="h-4 w-4" />
            {isArabic ? "الحساسية" : "Sensitivity"}
          </TabsTrigger>
        </TabsList>

        {/* ===== Tab 1: Analyses ===== */}
        <TabsContent value="analyses" className="space-y-4 mt-4">
          {loading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : analyses.length === 0 ? (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="py-12 text-center">
                <Calculator className="w-10 h-10 mx-auto mb-3 text-primary/40" />
                <p className="text-muted-foreground">{isArabic ? "لا توجد تحليلات - ابدأ بإضافة تحليل جديد" : "No analyses yet — add your first one"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-5 gap-4">
              {/* List */}
              <div className="lg:col-span-2 space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {analyses.map(a => {
                  const score = getFeasibilityScore(a);
                  return (
                    <Card
                      key={a.id}
                      className={cn("cursor-pointer transition-all hover:shadow-md",
                        selectedAnalysis?.id === a.id ? "border-primary ring-1 ring-primary/30 bg-primary/5" : "hover:border-primary/40"
                      )}
                      onClick={() => setSelectedAnalysis(a)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-foreground">{a.analysis_name}</h4>
                            {a.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.description}</p>}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEditDialog(a); }}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); handleDelete(a.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">NPV:</span>
                            <span className={cn("font-medium", (a.npv || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{formatCurrency(a.npv || 0)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">BCR:</span>
                            <span className="font-medium">{(a.bcr || 0).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={score} className="flex-1 h-2" />
                          <Badge variant={score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive"} className="text-[10px] px-1.5">
                            {score >= 70 ? (isArabic ? "مجدي" : "Viable") : score >= 40 ? (isArabic ? "متوسط" : "Moderate") : (isArabic ? "غير مجدي" : "Not Viable")}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Details */}
              <div className="lg:col-span-3">
                {selectedAnalysis ? (
                  <Card>
                    <CardHeader className="pb-3 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{selectedAnalysis.analysis_name}</CardTitle>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportPDF(selectedAnalysis)}>
                          <Download className="w-3.5 h-3.5" />
                          {isArabic ? "تصدير PDF" : "Export PDF"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-5">
                      {/* Metric Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: "NPV", value: formatCurrency(selectedAnalysis.npv || 0), positive: (selectedAnalysis.npv || 0) >= 0 },
                          { label: "BCR", value: (selectedAnalysis.bcr || 0).toFixed(2), positive: (selectedAnalysis.bcr || 0) >= 1 },
                          { label: "IRR", value: selectedAnalysis.irr ? `${(selectedAnalysis.irr * 100).toFixed(1)}%` : "N/A", positive: (selectedAnalysis.irr || 0) > selectedAnalysis.discount_rate },
                          { label: isArabic ? "الاسترداد" : "Payback", value: selectedAnalysis.payback_period ? `${selectedAnalysis.payback_period.toFixed(1)} ${isArabic ? "سنة" : "yr"}` : "N/A", positive: selectedAnalysis.payback_period != null && selectedAnalysis.payback_period < selectedAnalysis.analysis_period_years * 0.6 },
                        ].map((m, i) => (
                          <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/30">
                            <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
                            <div className={cn("text-xl font-bold", m.positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{m.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Feasibility Gauge */}
                      {(() => {
                        const score = getFeasibilityScore(selectedAnalysis);
                        return (
                          <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">{isArabic ? "مؤشر الجدوى" : "Feasibility Score"}</span>
                              <span className={cn("text-lg font-bold", score >= 70 ? "text-emerald-600 dark:text-emerald-400" : score >= 40 ? "text-amber-500" : "text-destructive")}>{score}%</span>
                            </div>
                            <Progress value={score} className="h-3" />
                          </div>
                        );
                      })()}

                      {/* Charts */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-sm font-medium mb-2">{isArabic ? "التدفق النقدي التراكمي" : "Cumulative Cash Flow"}</h5>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={generateChartData(selectedAnalysis)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="year" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={v => formatCurrency(v)} />
                                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name={isArabic ? "تراكمي" : "Cumulative"} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium mb-2">{isArabic ? "الفوائد مقابل التكاليف" : "Benefits vs Costs"}</h5>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={generateChartData(selectedAnalysis).slice(1)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="year" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={v => formatCurrency(v)} />
                                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                <Legend />
                                <Bar dataKey="benefits" fill="hsl(var(--primary))" name={isArabic ? "الفوائد" : "Benefits"} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="costs" fill="hsl(var(--destructive))" name={isArabic ? "التكاليف" : "Costs"} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Accordion for details */}
                      <Accordion type="multiple" className="w-full">
                        {selectedAnalysis.assumptions && (
                          <AccordionItem value="assumptions">
                            <AccordionTrigger className="text-sm">{isArabic ? "الافتراضات" : "Assumptions"}</AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line">{selectedAnalysis.assumptions}</AccordionContent>
                          </AccordionItem>
                        )}
                        {selectedAnalysis.risks && (
                          <AccordionItem value="risks">
                            <AccordionTrigger className="text-sm">{isArabic ? "المخاطر" : "Risks"}</AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line">{selectedAnalysis.risks}</AccordionContent>
                          </AccordionItem>
                        )}
                        {selectedAnalysis.recommendations && (
                          <AccordionItem value="recs">
                            <AccordionTrigger className="text-sm">{isArabic ? "التوصيات" : "Recommendations"}</AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line">{selectedAnalysis.recommendations}</AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed border-2">
                    <CardContent className="py-16 text-center text-muted-foreground">
                      <ArrowUpDown className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>{isArabic ? "اختر تحليلاً لعرض التفاصيل" : "Select an analysis to view details"}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===== Tab 2: Comparison ===== */}
        <TabsContent value="comparison" className="space-y-4 mt-4">
          {analyses.length < 2 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">{isArabic ? "أضف تحليلين على الأقل للمقارنة" : "Add at least 2 analyses to compare"}</CardContent></Card>
          ) : (
            <>
              {/* Comparison Table */}
              <Card>
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base">{isArabic ? "مقارنة التحليلات" : "Analyses Comparison"}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{isArabic ? "التحليل" : "Analysis"}</TableHead>
                          <TableHead className="text-center">{isArabic ? "الاستثمار" : "Investment"}</TableHead>
                          <TableHead className="text-center">NPV</TableHead>
                          <TableHead className="text-center">BCR</TableHead>
                          <TableHead className="text-center">IRR</TableHead>
                          <TableHead className="text-center">{isArabic ? "الاسترداد" : "Payback"}</TableHead>
                          <TableHead className="text-center">{isArabic ? "الجدوى" : "Feasibility"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analyses.map(a => {
                          const score = getFeasibilityScore(a);
                          return (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">{a.analysis_name}</TableCell>
                              <TableCell className="text-center">{formatCurrency(a.initial_investment)}</TableCell>
                              <TableCell className={cn("text-center font-medium", (a.npv || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{formatCurrency(a.npv || 0)}</TableCell>
                              <TableCell className="text-center">{(a.bcr || 0).toFixed(2)}</TableCell>
                              <TableCell className="text-center">{a.irr ? `${(a.irr * 100).toFixed(1)}%` : "N/A"}</TableCell>
                              <TableCell className="text-center">{a.payback_period ? `${a.payback_period.toFixed(1)} ${isArabic ? "سنة" : "yr"}` : "N/A"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive"} className="text-[10px]">
                                  {score}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Charts Row */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Bar Chart */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{isArabic ? "الاستثمار vs الفوائد vs التكاليف" : "Investment vs Benefits vs Costs"}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyses.map(a => ({ name: a.analysis_name.substring(0, 12), investment: a.initial_investment, benefits: a.annual_benefits * a.analysis_period_years, costs: a.annual_costs * a.analysis_period_years }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                          <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={v => formatCurrency(v)} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                          <Bar dataKey="investment" fill="hsl(var(--primary))" name={isArabic ? "استثمار" : "Investment"} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="benefits" fill="hsl(142 71% 45%)" name={isArabic ? "فوائد" : "Benefits"} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="costs" fill="hsl(var(--destructive))" name={isArabic ? "تكاليف" : "Costs"} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Radar Chart */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{isArabic ? "مقارنة الأداء المالي" : "Financial Performance Radar"}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="metric" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                          <PolarRadiusAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                          {analyses.slice(0, 5).map((a, i) => (
                            <Radar key={a.id} name={a.analysis_name} dataKey={a.analysis_name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
                          ))}
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== Tab 3: Sensitivity ===== */}
        <TabsContent value="sensitivity" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {isArabic ? "تحليل الحساسية — ماذا لو؟" : "Sensitivity Analysis — What If?"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              <Select value={sensitivityTarget} onValueChange={v => { setSensitivityTarget(v); setSensitivityDiscountAdj(0); setSensitivityBenefitAdj(0); }}>
                <SelectTrigger><SelectValue placeholder={isArabic ? "اختر تحليلاً" : "Select an analysis"} /></SelectTrigger>
                <SelectContent>
                  {analyses.map(a => <SelectItem key={a.id} value={a.id}>{a.analysis_name}</SelectItem>)}
                </SelectContent>
              </Select>

              {sensitivityTarget && (() => {
                const target = analyses.find(a => a.id === sensitivityTarget);
                if (!target) return null;
                return (
                  <div className="space-y-6">
                    {/* Sliders */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">{isArabic ? "تعديل معدل الخصم" : "Discount Rate Adjustment"}: <span className="text-primary font-bold">{sensitivityDiscountAdj >= 0 ? "+" : ""}{sensitivityDiscountAdj.toFixed(1)}%</span></Label>
                        <Slider min={-5} max={5} step={0.5} value={[sensitivityDiscountAdj]} onValueChange={v => setSensitivityDiscountAdj(v[0])} />
                        <div className="flex justify-between text-xs text-muted-foreground"><span>-5%</span><span>0</span><span>+5%</span></div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">{isArabic ? "تعديل الفوائد السنوية" : "Annual Benefits Adjustment"}: <span className="text-primary font-bold">{sensitivityBenefitAdj >= 0 ? "+" : ""}{sensitivityBenefitAdj}%</span></Label>
                        <Slider min={-20} max={20} step={2} value={[sensitivityBenefitAdj]} onValueChange={v => setSensitivityBenefitAdj(v[0])} />
                        <div className="flex justify-between text-xs text-muted-foreground"><span>-20%</span><span>0</span><span>+20%</span></div>
                      </div>
                    </div>

                    {/* Impact Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <div className="text-xs text-muted-foreground">{isArabic ? "NPV الأصلي" : "Original NPV"}</div>
                        <div className="text-xl font-bold text-foreground">{formatCurrency(sensitivityData.baseNpv)}</div>
                      </div>
                      <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                        <div className="text-xs text-muted-foreground">{isArabic ? "NPV المعدّل" : "Adjusted NPV"}</div>
                        <div className={cn("text-xl font-bold", sensitivityData.adjustedNpv >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{formatCurrency(sensitivityData.adjustedNpv)}</div>
                        {sensitivityData.baseNpv !== 0 && (
                          <div className={cn("text-xs mt-1", sensitivityData.adjustedNpv > sensitivityData.baseNpv ? "text-emerald-600" : "text-destructive")}>
                            {((sensitivityData.adjustedNpv - sensitivityData.baseNpv) / Math.abs(sensitivityData.baseNpv) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sensitivity Charts */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium mb-2">{isArabic ? "حساسية معدل الخصم" : "Discount Rate Sensitivity"}</h5>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sensitivityData.discountCurve}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="label" fontSize={10} stroke="hsl(var(--muted-foreground))" interval={3} />
                              <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={v => formatCurrency(v)} />
                              <Tooltip formatter={(v: number) => formatCurrency(v)} />
                              <Area type="monotone" dataKey="npv" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} name="NPV" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium mb-2">{isArabic ? "حساسية الفوائد السنوية" : "Benefits Sensitivity"}</h5>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sensitivityData.benefitCurve}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="label" fontSize={10} stroke="hsl(var(--muted-foreground))" interval={2} />
                              <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={v => formatCurrency(v)} />
                              <Tooltip formatter={(v: number) => formatCurrency(v)} />
                              <Bar dataKey="npv" fill="hsl(var(--primary))" name="NPV" radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Stepper Dialog ===== */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnalysis ? (isArabic ? "تعديل التحليل" : "Edit Analysis") : (isArabic ? "تحليل جديد" : "New Analysis")}
            </DialogTitle>
            {/* Stepper indicator */}
            <div className="flex items-center gap-2 pt-2">
              {[isArabic ? "أساسي" : "Basic", isArabic ? "مالي" : "Financial", isArabic ? "ملاحظات" : "Notes"].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors",
                    dialogStep === i ? "bg-primary text-primary-foreground border-primary" :
                    dialogStep > i ? "bg-primary/20 text-primary border-primary/40" : "bg-muted text-muted-foreground border-border"
                  )}>{i + 1}</div>
                  <span className={cn("text-xs hidden sm:inline", dialogStep === i ? "text-foreground font-medium" : "text-muted-foreground")}>{step}</span>
                  {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </DialogHeader>

          <div className="space-y-4 min-h-[280px]">
            {/* Step 0: Basic */}
            {dialogStep === 0 && (
              <>
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم التحليل *" : "Analysis Name *"}</Label>
                  <Input value={formData.analysis_name} onChange={e => setFormData({ ...formData, analysis_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "الوصف" : "Description"}</Label>
                  <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>
              </>
            )}

            {/* Step 1: Financial */}
            {dialogStep === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "الاستثمار الأولي" : "Initial Investment"}</Label>
                    <Input type="number" value={formData.initial_investment} onChange={e => setFormData({ ...formData, initial_investment: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "الفوائد السنوية" : "Annual Benefits"}</Label>
                    <Input type="number" value={formData.annual_benefits} onChange={e => setFormData({ ...formData, annual_benefits: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "التكاليف السنوية" : "Annual Costs"}</Label>
                    <Input type="number" value={formData.annual_costs} onChange={e => setFormData({ ...formData, annual_costs: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "معدل الخصم (%)" : "Discount Rate (%)"}</Label>
                    <Input type="number" value={formData.discount_rate} onChange={e => setFormData({ ...formData, discount_rate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "فترة التحليل (سنوات)" : "Analysis Period (years)"}</Label>
                    <Input type="number" value={formData.analysis_period_years} onChange={e => setFormData({ ...formData, analysis_period_years: e.target.value })} />
                  </div>
                </div>
                {/* Live Metrics */}
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <h5 className="text-xs font-medium mb-2 text-muted-foreground">{isArabic ? "المؤشرات المحسوبة" : "Calculated Metrics"}</h5>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="p-2 rounded bg-background border text-center">
                      <span className="text-[10px] text-muted-foreground block">NPV</span>
                      <span className={cn("font-bold text-sm", calculatedMetrics.npv >= 0 ? "text-emerald-600" : "text-destructive")}>{formatCurrency(calculatedMetrics.npv)}</span>
                    </div>
                    <div className="p-2 rounded bg-background border text-center">
                      <span className="text-[10px] text-muted-foreground block">BCR</span>
                      <span className={cn("font-bold text-sm", calculatedMetrics.bcr >= 1 ? "text-emerald-600" : "text-destructive")}>{calculatedMetrics.bcr.toFixed(2)}</span>
                    </div>
                    <div className="p-2 rounded bg-background border text-center">
                      <span className="text-[10px] text-muted-foreground block">IRR</span>
                      <span className="font-bold text-sm">{calculatedMetrics.irr ? `${(calculatedMetrics.irr * 100).toFixed(1)}%` : "N/A"}</span>
                    </div>
                    <div className="p-2 rounded bg-background border text-center">
                      <span className="text-[10px] text-muted-foreground block">{isArabic ? "استرداد" : "Payback"}</span>
                      <span className="font-bold text-sm">{calculatedMetrics.paybackPeriod ? `${calculatedMetrics.paybackPeriod.toFixed(1)}yr` : "N/A"}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Notes */}
            {dialogStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label>{isArabic ? "الافتراضات" : "Assumptions"}</Label>
                  <Textarea value={formData.assumptions} onChange={e => setFormData({ ...formData, assumptions: e.target.value })} rows={3} placeholder={isArabic ? "افتراضات التحليل..." : "Analysis assumptions..."} />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "المخاطر" : "Risks"}</Label>
                  <Textarea value={formData.risks} onChange={e => setFormData({ ...formData, risks: e.target.value })} rows={3} placeholder={isArabic ? "المخاطر المحتملة..." : "Potential risks..."} />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "التوصيات" : "Recommendations"}</Label>
                  <Textarea value={formData.recommendations} onChange={e => setFormData({ ...formData, recommendations: e.target.value })} rows={3} placeholder={isArabic ? "التوصيات..." : "Recommendations..."} />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {dialogStep > 0 && (
                <Button variant="outline" onClick={() => setDialogStep(s => s - 1)} className="gap-1">
                  <ChevronLeft className="w-4 h-4" /> {isArabic ? "السابق" : "Previous"}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
              {dialogStep < 2 ? (
                <Button onClick={() => setDialogStep(s => s + 1)} disabled={dialogStep === 0 && !formData.analysis_name} className="gap-1">
                  {isArabic ? "التالي" : "Next"} <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={saving || !formData.analysis_name} className="gap-2 bg-primary hover:bg-primary/90">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isArabic ? "حفظ" : "Save"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

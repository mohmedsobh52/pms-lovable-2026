import { useState, useEffect, useMemo } from "react";
import {
  Calculator,
  Plus,
  Trash2,
  Edit,
  Save,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
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

// Calculate NPV
const calculateNPV = (
  initialInvestment: number,
  annualBenefits: number,
  annualCosts: number,
  discountRate: number,
  years: number
): number => {
  let npv = -initialInvestment;
  for (let i = 1; i <= years; i++) {
    const netCashFlow = annualBenefits - annualCosts;
    npv += netCashFlow / Math.pow(1 + discountRate, i);
  }
  return npv;
};

// Calculate BCR (Benefit-Cost Ratio)
const calculateBCR = (
  initialInvestment: number,
  annualBenefits: number,
  annualCosts: number,
  discountRate: number,
  years: number
): number => {
  let pvBenefits = 0;
  let pvCosts = initialInvestment;
  for (let i = 1; i <= years; i++) {
    pvBenefits += annualBenefits / Math.pow(1 + discountRate, i);
    pvCosts += annualCosts / Math.pow(1 + discountRate, i);
  }
  return pvCosts > 0 ? pvBenefits / pvCosts : 0;
};

// Calculate Payback Period
const calculatePaybackPeriod = (
  initialInvestment: number,
  annualBenefits: number,
  annualCosts: number
): number | null => {
  const netAnnualCashFlow = annualBenefits - annualCosts;
  if (netAnnualCashFlow <= 0) return null;
  return initialInvestment / netAnnualCashFlow;
};

// Calculate IRR using Newton-Raphson method
const calculateIRR = (
  initialInvestment: number,
  annualBenefits: number,
  annualCosts: number,
  years: number
): number | null => {
  const netCashFlow = annualBenefits - annualCosts;
  let irr = 0.1;
  for (let iteration = 0; iteration < 100; iteration++) {
    let npv = -initialInvestment;
    let dnpv = 0;
    for (let i = 1; i <= years; i++) {
      npv += netCashFlow / Math.pow(1 + irr, i);
      dnpv -= (i * netCashFlow) / Math.pow(1 + irr, i + 1);
    }
    if (Math.abs(npv) < 0.0001) return irr;
    if (dnpv === 0) return null;
    irr = irr - npv / dnpv;
    if (irr < -1) return null;
  }
  return irr > -1 && irr < 10 ? irr : null;
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
  const [formData, setFormData] = useState({
    analysis_name: "",
    description: "",
    initial_investment: "",
    annual_benefits: "",
    annual_costs: "",
    discount_rate: "10",
    analysis_period_years: "5",
    assumptions: "",
    risks: "",
    recommendations: "",
  });

  const fetchAnalyses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("cost_benefit_analysis")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error("Error fetching analyses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [user, projectId]);

  const calculatedMetrics = useMemo(() => {
    const investment = parseFloat(formData.initial_investment) || 0;
    const benefits = parseFloat(formData.annual_benefits) || 0;
    const costs = parseFloat(formData.annual_costs) || 0;
    const rate = (parseFloat(formData.discount_rate) || 10) / 100;
    const years = parseInt(formData.analysis_period_years) || 5;

    return {
      npv: calculateNPV(investment, benefits, costs, rate, years),
      bcr: calculateBCR(investment, benefits, costs, rate, years),
      paybackPeriod: calculatePaybackPeriod(investment, benefits, costs),
      irr: calculateIRR(investment, benefits, costs, years),
    };
  }, [formData]);

  const handleSave = async () => {
    if (!user || !formData.analysis_name) return;
    setSaving(true);
    try {
      const investment = parseFloat(formData.initial_investment) || 0;
      const benefits = parseFloat(formData.annual_benefits) || 0;
      const costs = parseFloat(formData.annual_costs) || 0;
      const rate = (parseFloat(formData.discount_rate) || 10) / 100;
      const years = parseInt(formData.analysis_period_years) || 5;

      const analysisData = {
        user_id: user.id,
        project_id: projectId || null,
        analysis_name: formData.analysis_name,
        description: formData.description || null,
        initial_investment: investment,
        annual_benefits: benefits,
        annual_costs: costs,
        discount_rate: rate,
        analysis_period_years: years,
        npv: calculatedMetrics.npv,
        bcr: calculatedMetrics.bcr,
        irr: calculatedMetrics.irr,
        payback_period: calculatedMetrics.paybackPeriod,
        assumptions: formData.assumptions || null,
        risks: formData.risks || null,
        recommendations: formData.recommendations || null,
      };

      if (editingAnalysis) {
        const { error } = await supabase
          .from("cost_benefit_analysis")
          .update(analysisData)
          .eq("id", editingAnalysis.id);
        if (error) throw error;
        toast({ title: isArabic ? "تم التحديث" : "Updated" });
      } else {
        const { error } = await supabase.from("cost_benefit_analysis").insert(analysisData);
        if (error) throw error;
        toast({ title: isArabic ? "تمت الإضافة" : "Added" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchAnalyses();
    } catch (error) {
      console.error("Error saving analysis:", error);
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
      console.error("Error deleting analysis:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      analysis_name: "",
      description: "",
      initial_investment: "",
      annual_benefits: "",
      annual_costs: "",
      discount_rate: "10",
      analysis_period_years: "5",
      assumptions: "",
      risks: "",
      recommendations: "",
    });
    setEditingAnalysis(null);
  };

  const openEditDialog = (analysis: CostBenefitRecord) => {
    setEditingAnalysis(analysis);
    setFormData({
      analysis_name: analysis.analysis_name,
      description: analysis.description || "",
      initial_investment: analysis.initial_investment.toString(),
      annual_benefits: analysis.annual_benefits.toString(),
      annual_costs: analysis.annual_costs.toString(),
      discount_rate: (analysis.discount_rate * 100).toString(),
      analysis_period_years: analysis.analysis_period_years.toString(),
      assumptions: analysis.assumptions || "",
      risks: analysis.risks || "",
      recommendations: analysis.recommendations || "",
    });
    setIsDialogOpen(true);
  };

  const generateChartData = (analysis: CostBenefitRecord) => {
    const data = [];
    let cumulativeCashFlow = -analysis.initial_investment;
    for (let year = 0; year <= analysis.analysis_period_years; year++) {
      if (year === 0) {
        data.push({
          year: `${isArabic ? "السنة" : "Year"} ${year}`,
          cumulativeCashFlow,
          benefits: 0,
          costs: analysis.initial_investment,
        });
      } else {
        cumulativeCashFlow += analysis.annual_benefits - analysis.annual_costs;
        data.push({
          year: `${isArabic ? "السنة" : "Year"} ${year}`,
          cumulativeCashFlow,
          benefits: analysis.annual_benefits,
          costs: analysis.annual_costs,
        });
      }
    }
    return data;
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Calculator className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>{isArabic ? "تحليل التكلفة والفائدة" : "Cost-Benefit Analysis"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "تقييم الجدوى الاقتصادية للمشاريع" : "Evaluate economic feasibility of projects"}
              </p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            {isArabic ? "تحليل جديد" : "New Analysis"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{isArabic ? "لا توجد تحليلات مسجلة" : "No analyses recorded"}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Analyses List */}
            <div className="space-y-3">
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all",
                    selectedAnalysis?.id === analysis.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  )}
                  onClick={() => setSelectedAnalysis(analysis)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{analysis.analysis_name}</h4>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditDialog(analysis); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(analysis.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      <span>NPV: {formatCurrency(analysis.npv || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Percent className="w-3 h-3 text-muted-foreground" />
                      <span>BCR: {(analysis.bcr || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge variant={analysis.npv && analysis.npv > 0 ? "default" : "destructive"}>
                      {analysis.npv && analysis.npv > 0
                        ? isArabic ? "مجدي اقتصادياً" : "Economically Viable"
                        : isArabic ? "غير مجدي" : "Not Viable"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Analysis Details */}
            {selectedAnalysis && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="text-xs text-muted-foreground mb-1">NPV</div>
                    <div className={cn("text-xl font-bold", (selectedAnalysis.npv || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                      {formatCurrency(selectedAnalysis.npv || 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="text-xs text-muted-foreground mb-1">BCR</div>
                    <div className={cn("text-xl font-bold", (selectedAnalysis.bcr || 0) >= 1 ? "text-green-600" : "text-red-600")}>
                      {(selectedAnalysis.bcr || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="text-xs text-muted-foreground mb-1">IRR</div>
                    <div className="text-xl font-bold">
                      {selectedAnalysis.irr ? `${(selectedAnalysis.irr * 100).toFixed(1)}%` : "N/A"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="text-xs text-muted-foreground mb-1">
                      {isArabic ? "فترة الاسترداد" : "Payback Period"}
                    </div>
                    <div className="text-xl font-bold">
                      {selectedAnalysis.payback_period
                        ? `${selectedAnalysis.payback_period.toFixed(1)} ${isArabic ? "سنة" : "years"}`
                        : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={generateChartData(selectedAnalysis)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="cumulativeCashFlow"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name={isArabic ? "التدفق النقدي التراكمي" : "Cumulative Cash Flow"}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnalysis
                ? isArabic ? "تعديل التحليل" : "Edit Analysis"
                : isArabic ? "تحليل جديد" : "New Analysis"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isArabic ? "اسم التحليل *" : "Analysis Name *"}</Label>
              <Input
                value={formData.analysis_name}
                onChange={(e) => setFormData({ ...formData, analysis_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "الوصف" : "Description"}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? "الاستثمار الأولي" : "Initial Investment"}</Label>
                <Input
                  type="number"
                  value={formData.initial_investment}
                  onChange={(e) => setFormData({ ...formData, initial_investment: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "الفوائد السنوية" : "Annual Benefits"}</Label>
                <Input
                  type="number"
                  value={formData.annual_benefits}
                  onChange={(e) => setFormData({ ...formData, annual_benefits: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "التكاليف السنوية" : "Annual Costs"}</Label>
                <Input
                  type="number"
                  value={formData.annual_costs}
                  onChange={(e) => setFormData({ ...formData, annual_costs: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? "معدل الخصم (%)" : "Discount Rate (%)"}</Label>
                <Input
                  type="number"
                  value={formData.discount_rate}
                  onChange={(e) => setFormData({ ...formData, discount_rate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "فترة التحليل (سنوات)" : "Analysis Period (years)"}</Label>
                <Input
                  type="number"
                  value={formData.analysis_period_years}
                  onChange={(e) => setFormData({ ...formData, analysis_period_years: e.target.value })}
                />
              </div>
            </div>

            {/* Calculated Metrics Preview */}
            <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
              <h4 className="font-medium">{isArabic ? "المؤشرات المحسوبة" : "Calculated Metrics"}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="p-2 rounded bg-background border">
                  <span className="text-xs text-muted-foreground block">NPV</span>
                  <span className={cn("font-bold", calculatedMetrics.npv >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(calculatedMetrics.npv)}
                  </span>
                </div>
                <div className="p-2 rounded bg-background border">
                  <span className="text-xs text-muted-foreground block">BCR</span>
                  <span className={cn("font-bold", calculatedMetrics.bcr >= 1 ? "text-green-600" : "text-red-600")}>
                    {calculatedMetrics.bcr.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded bg-background border">
                  <span className="text-xs text-muted-foreground block">IRR</span>
                  <span className="font-bold">
                    {calculatedMetrics.irr ? `${(calculatedMetrics.irr * 100).toFixed(1)}%` : "N/A"}
                  </span>
                </div>
                <div className="p-2 rounded bg-background border">
                  <span className="text-xs text-muted-foreground block">
                    {isArabic ? "الاسترداد" : "Payback"}
                  </span>
                  <span className="font-bold">
                    {calculatedMetrics.paybackPeriod
                      ? `${calculatedMetrics.paybackPeriod.toFixed(1)} yr`
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "الافتراضات" : "Assumptions"}</Label>
              <Textarea
                value={formData.assumptions}
                onChange={(e) => setFormData({ ...formData, assumptions: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "المخاطر" : "Risks"}</Label>
              <Textarea
                value={formData.risks}
                onChange={(e) => setFormData({ ...formData, risks: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "التوصيات" : "Recommendations"}</Label>
              <Textarea
                value={formData.recommendations}
                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.analysis_name}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="ml-2">{isArabic ? "حفظ" : "Save"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

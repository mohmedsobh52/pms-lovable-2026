import { useState, useEffect } from "react";
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
  Loader2,
  Target,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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

const getRiskLevel = (score: number): { level: string; color: string } => {
  if (score <= 4) return { level: "Low", color: "bg-green-500" };
  if (score <= 9) return { level: "Medium", color: "bg-yellow-500" };
  if (score <= 16) return { level: "High", color: "bg-orange-500" };
  return { level: "Critical", color: "bg-red-500" };
};

export function RiskManagement({ projectId }: RiskManagementProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
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

  const fetchRisks = async () => {
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
  };

  useEffect(() => {
    fetchRisks();
  }, [user, projectId]);

  const handleSave = async () => {
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
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("risks").delete().eq("id", id);
      if (error) throw error;
      toast({ title: isArabic ? "تم الحذف" : "Deleted" });
      fetchRisks();
    } catch (error) {
      console.error("Error deleting risk:", error);
    }
  };

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
    setIsDialogOpen(true);
  };

  const stats = {
    total: risks.length,
    critical: risks.filter((r) => (r.risk_score || 0) > 16).length,
    high: risks.filter((r) => (r.risk_score || 0) > 9 && (r.risk_score || 0) <= 16).length,
    mitigated: risks.filter((r) => r.status === "closed" || r.status === "monitoring").length,
  };

  return (
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
                {isArabic ? "تحديد وتقييم ومعالجة المخاطر" : "Identify, assess, and mitigate risks"}
              </p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            {isArabic ? "إضافة خطر" : "Add Risk"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "إجمالي المخاطر" : "Total Risks"}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "حرجة" : "Critical"}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "عالية" : "High"}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="text-2xl font-bold text-green-600">{stats.mitigated}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "تمت المعالجة" : "Mitigated"}
            </div>
          </div>
        </div>

        {/* Risk Matrix */}
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
              <>
                <div key={`label-${impact.value}`} className="p-1 font-medium flex items-center">
                  {isArabic ? impact.labelAr : impact.labelEn}
                </div>
                {probabilities.map((prob) => {
                  const score = PROBABILITY_VALUES[prob.value] * IMPACT_VALUES[impact.value];
                  const { color } = getRiskLevel(score);
                  const count = risks.filter(
                    (r) => r.probability === prob.value && r.impact === impact.value
                  ).length;
                  return (
                    <div
                      key={`${prob.value}-${impact.value}`}
                      className={cn("p-2 rounded text-center text-white font-medium", color)}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Risks Table */}
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : risks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{isArabic ? "لا توجد مخاطر مسجلة" : "No risks recorded"}</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "المخاطر" : "Risk"}</TableHead>
                  <TableHead>{isArabic ? "الفئة" : "Category"}</TableHead>
                  <TableHead>{isArabic ? "الاحتمالية" : "Probability"}</TableHead>
                  <TableHead>{isArabic ? "التأثير" : "Impact"}</TableHead>
                  <TableHead>{isArabic ? "الدرجة" : "Score"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((risk) => {
                  const { level, color } = getRiskLevel(risk.risk_score || 0);
                  return (
                    <TableRow key={risk.id}>
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
                      <TableCell>
                        {probabilities.find((p) => p.value === risk.probability)?.[isArabic ? "labelAr" : "labelEn"]}
                      </TableCell>
                      <TableCell>
                        {probabilities.find((p) => p.value === risk.impact)?.[isArabic ? "labelAr" : "labelEn"]}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-white", color)}>{risk.risk_score}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {statuses.find((s) => s.value === risk.status)?.[isArabic ? "labelAr" : "labelEn"]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(risk)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(risk.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
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

            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="text-sm text-muted-foreground mb-1">
                {isArabic ? "درجة الخطر المحسوبة" : "Calculated Risk Score"}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {calculateRiskScore(formData.probability, formData.impact)}
                </span>
                <Badge className={cn("text-white", getRiskLevel(calculateRiskScore(formData.probability, formData.impact)).color)}>
                  {getRiskLevel(calculateRiskScore(formData.probability, formData.impact)).level}
                </Badge>
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
    </Card>
  );
}

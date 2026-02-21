import { useState, useEffect } from "react";
import { Brain, Loader2, Check, Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";

interface GeneratedRisk {
  title: string;
  description: string;
  category: string;
  probability: string;
  impact: string;
  mitigation: string;
  selected: boolean;
}

interface SavedProject {
  id: string;
  name: string;
  analysis_data: any;
}

interface AutoRiskAnalysisProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onRisksSaved: () => void;
}

const PROBABILITY_VALUES: Record<string, number> = {
  very_low: 1, low: 2, medium: 3, high: 4, very_high: 5,
};
const IMPACT_VALUES: Record<string, number> = {
  very_low: 1, low: 2, medium: 3, high: 4, very_high: 5,
};

const categoryLabels: Record<string, { en: string; ar: string }> = {
  technical: { en: "Technical", ar: "تقني" },
  financial: { en: "Financial", ar: "مالي" },
  schedule: { en: "Schedule", ar: "جدول زمني" },
  resource: { en: "Resource", ar: "موارد" },
  external: { en: "External", ar: "خارجي" },
  legal: { en: "Legal", ar: "قانوني" },
  safety: { en: "Safety", ar: "سلامة" },
  quality: { en: "Quality", ar: "جودة" },
};

const probabilityLabels: Record<string, { en: string; ar: string }> = {
  very_low: { en: "Very Low", ar: "منخفض جداً" },
  low: { en: "Low", ar: "منخفض" },
  medium: { en: "Medium", ar: "متوسط" },
  high: { en: "High", ar: "عالي" },
  very_high: { en: "Very High", ar: "عالي جداً" },
};

export function AutoRiskAnalysis({ open, onOpenChange, projectId, onRisksSaved }: AutoRiskAnalysisProps) {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { toast } = useToast();

  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedRisks, setGeneratedRisks] = useState<GeneratedRisk[]>([]);
  const [itemsCount, setItemsCount] = useState(0);

  useEffect(() => {
    if (open && user) {
      fetchProjects();
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      setGeneratedRisks([]);
      setSelectedProjectId("");
      setProgress(0);
      setItemsCount(0);
    }
  }, [open]);

  const fetchProjects = async () => {
    if (!user) return;
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from("saved_projects")
        .select("id, name, analysis_data")
        .eq("user_id", user.id)
        .not("analysis_data", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects((data || []) as unknown as SavedProject[]);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const getItemsFromProject = (project: SavedProject): any[] => {
    const data = project.analysis_data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.sections && Array.isArray(data.sections)) {
      return data.sections.flatMap((s: any) => s.items || []);
    }
    return [];
  };

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    setGeneratedRisks([]);
    const project = projects.find((p) => p.id === id);
    if (project) {
      const items = getItemsFromProject(project);
      setItemsCount(items.length);
    }
  };

  const handleAnalyze = async () => {
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const items = getItemsFromProject(project);
    if (items.length === 0) {
      toast({
        title: isArabic ? "لا توجد بنود" : "No items found",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    setProgress(20);

    try {
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 85));
      }, 800);

      const { data, error } = await supabase.functions.invoke("analyze-risks", {
        body: {
          items,
          projectName: project.name,
          language: isArabic ? "ar" : "en",
        },
      });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message || "Analysis failed");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const risks = (data?.risks || []).map((r: any) => ({
        ...r,
        selected: true,
      }));

      setGeneratedRisks(risks);
      setProgress(100);

      toast({
        title: isArabic
          ? `تم اكتشاف ${risks.length} مخاطر`
          : `${risks.length} risks identified`,
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: isArabic ? "خطأ في التحليل" : "Analysis Error",
        description: error.message,
        variant: "destructive",
      });
      setProgress(0);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveRisks = async () => {
    if (!user) return;
    const selected = generatedRisks.filter((r) => r.selected);
    if (selected.length === 0) {
      toast({
        title: isArabic ? "اختر مخاطر للحفظ" : "Select risks to save",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const risksToInsert = selected.map((r) => ({
        user_id: user.id,
        project_id: projectId || null,
        risk_title: r.title,
        risk_description: r.description,
        category: r.category,
        probability: r.probability,
        impact: r.impact,
        risk_score:
          (PROBABILITY_VALUES[r.probability] || 3) *
          (IMPACT_VALUES[r.impact] || 3),
        status: "identified",
        mitigation_strategy: r.mitigation,
      }));

      const { error } = await supabase.from("risks").insert(risksToInsert);
      if (error) throw error;

      toast({
        title: isArabic
          ? `تم حفظ ${selected.length} مخاطر بنجاح`
          : `${selected.length} risks saved successfully`,
      });

      onRisksSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: isArabic ? "خطأ في الحفظ" : "Save Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleRisk = (index: number) => {
    setGeneratedRisks((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const removeRisk = (index: number) => {
    setGeneratedRisks((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedCount = generatedRisks.filter((r) => r.selected).length;

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      technical: "bg-blue-100 text-blue-800",
      financial: "bg-green-100 text-green-800",
      schedule: "bg-purple-100 text-purple-800",
      resource: "bg-yellow-100 text-yellow-800",
      external: "bg-gray-100 text-gray-800",
      legal: "bg-indigo-100 text-indigo-800",
      safety: "bg-red-100 text-red-800",
      quality: "bg-teal-100 text-teal-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            {isArabic ? "تحليل مخاطر تلقائي بالذكاء الاصطناعي" : "AI Auto Risk Analysis"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "اختر مشروعاً لتحليل بنود BOQ واكتشاف المخاطر المحتملة تلقائياً"
              : "Select a project to analyze BOQ items and automatically discover potential risks"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isArabic ? "اختر المشروع" : "Select Project"}
            </label>
            <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingProjects
                      ? isArabic ? "جارٍ التحميل..." : "Loading..."
                      : isArabic ? "اختر مشروعاً محفوظاً" : "Select a saved project"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedProjectId && itemsCount > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                {isArabic
                  ? `${itemsCount} بند متاح للتحليل`
                  : `${itemsCount} items available for analysis`}
              </div>
            )}
          </div>

          {/* Analyze Button */}
          {selectedProjectId && generatedRisks.length === 0 && (
            <Button
              onClick={handleAnalyze}
              disabled={analyzing || itemsCount === 0}
              className="w-full gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isArabic ? "جارٍ التحليل..." : "Analyzing..."}
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  {isArabic ? "بدء التحليل" : "Start Analysis"}
                </>
              )}
            </Button>
          )}

          {/* Progress */}
          {analyzing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {isArabic ? "جارٍ تحليل البنود واكتشاف المخاطر..." : "Analyzing items and identifying risks..."}
              </p>
            </div>
          )}

          {/* Results Table */}
          {generatedRisks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  {isArabic
                    ? `المخاطر المكتشفة (${generatedRisks.length})`
                    : `Identified Risks (${generatedRisks.length})`}
                </h4>
                <Badge variant="outline">
                  {isArabic ? `${selectedCount} محدد` : `${selectedCount} selected`}
                </Badge>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Check className="w-4 h-4" />
                      </TableHead>
                      <TableHead>{isArabic ? "العنوان" : "Title"}</TableHead>
                      <TableHead>{isArabic ? "الفئة" : "Category"}</TableHead>
                      <TableHead>{isArabic ? "الاحتمالية" : "Probability"}</TableHead>
                      <TableHead>{isArabic ? "التأثير" : "Impact"}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedRisks.map((risk, index) => (
                      <TableRow key={index} className={risk.selected ? "" : "opacity-50"}>
                        <TableCell>
                          <Checkbox
                            checked={risk.selected}
                            onCheckedChange={() => toggleRisk(index)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{risk.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {risk.description}
                            </p>
                            {risk.mitigation && (
                              <p className="text-xs text-green-600 mt-1 line-clamp-1">
                                💡 {risk.mitigation}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryBadgeColor(risk.category)} variant="secondary">
                            {isArabic
                              ? categoryLabels[risk.category]?.ar || risk.category
                              : categoryLabels[risk.category]?.en || risk.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {isArabic
                              ? probabilityLabels[risk.probability]?.ar || risk.probability
                              : probabilityLabels[risk.probability]?.en || risk.probability}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {isArabic
                              ? probabilityLabels[risk.impact]?.ar || risk.impact
                              : probabilityLabels[risk.impact]?.en || risk.impact}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRisk(index)}
                            className="h-7 w-7"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {generatedRisks.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleSaveRisks}
              disabled={saving || selectedCount === 0}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isArabic
                ? `حفظ ${selectedCount} مخاطر`
                : `Save ${selectedCount} Risks`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

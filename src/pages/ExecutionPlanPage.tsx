import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useExecutionPlans, useExecutionPhases, useAllPlanTasks, useGenerateExecutionPlan } from "@/hooks/useExecutionPlan";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Calendar, BarChart3, Paperclip, ListChecks, ChevronDown, ChevronRight, Clock, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";
import { NavigationBar } from "@/components/NavigationBar";
import type { ExecutionPhase, ExecutionTask } from "@/hooks/useExecutionPlan";

const ExecutionPlanPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || "");

  const { data: plans = [], isLoading: plansLoading } = useExecutionPlans(selectedProject);
  const { data: phases = [] } = useExecutionPhases(selectedPlanId);
  const { data: allTasks = [] } = useAllPlanTasks(selectedPlanId);
  const generatePlan = useGenerateExecutionPlan();

  useEffect(() => {
    if (user) {
      supabase
        .from("saved_projects")
        .select("id, name, total_value, items_count")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setProjects(data || []));
    }
  }, [user]);

  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans]);

  useEffect(() => {
    if (projectId) setSelectedProject(projectId);
  }, [projectId]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!selectedProject) {
      toast.error("اختر مشروعاً أولاً");
      return;
    }
    await generatePlan.mutateAsync({ projectId: selectedProject });
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "معلق", variant: "outline" },
      in_progress: { label: "قيد التنفيذ", variant: "default" },
      completed: { label: "مكتمل", variant: "secondary" },
      delayed: { label: "متأخر", variant: "destructive" },
    };
    const s = map[status] || map.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(val);

  const overallProgress = phases.length
    ? Math.round(phases.reduce((s, p) => s + (p.progress || 0), 0) / phases.length)
    : 0;

  const totalBudget = phases.reduce((s, p) => s + (p.budget || 0), 0);
  const totalSpent = allTasks.reduce((s, t) => s + (t.total_cost || 0), 0);

  if (!user) {
    return (
      <PageLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">يرجى تسجيل الدخول للوصول لخطة التنفيذ</p>
          <Button className="mt-4" onClick={() => navigate("/auth")}>تسجيل الدخول</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl" dir="rtl">
        <NavigationBar />

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">خطة التنفيذ</h1>
            <p className="text-muted-foreground text-sm">إدارة وتخطيط مراحل تنفيذ المشروع</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="اختر المشروع" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleGenerate} disabled={generatePlan.isPending || !selectedProject}>
              {generatePlan.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Sparkles className="w-4 h-4 ml-2" />}
              توليد بالذكاء الاصطناعي
            </Button>
          </div>
        </div>

        {/* Plan selector */}
        {plans.length > 1 && (
          <div className="mb-4">
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="اختر الخطة" />
              </SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.plan_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {plansLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : plans.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <ListChecks className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">لا توجد خطة تنفيذ بعد</h3>
              <p className="text-muted-foreground mb-6">اختر مشروعاً واضغط "توليد بالذكاء الاصطناعي" لإنشاء خطة تنفيذ تلقائية من بنود BOQ</p>
              <Button onClick={handleGenerate} disabled={generatePlan.isPending || !selectedProject} size="lg">
                <Sparkles className="w-5 h-5 ml-2" />
                إنشاء خطة تنفيذ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 ml-1" />نظرة عامة</TabsTrigger>
              <TabsTrigger value="phases"><ListChecks className="w-4 h-4 ml-1" />المراحل</TabsTrigger>
              <TabsTrigger value="gantt"><Calendar className="w-4 h-4 ml-1" />الجدول الزمني</TabsTrigger>
              <TabsTrigger value="costs"><DollarSign className="w-4 h-4 ml-1" />التكاليف</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">إجمالي المراحل</p>
                    <p className="text-3xl font-bold text-primary">{phases.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">إجمالي المهام</p>
                    <p className="text-3xl font-bold text-primary">{allTasks.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">نسبة الإنجاز</p>
                    <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
                    <Progress value={overallProgress} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">الميزانية</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(totalBudget)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Phases summary */}
              <Card>
                <CardHeader>
                  <CardTitle>ملخص المراحل</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {phases.map(phase => (
                      <div key={phase.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {getStatusBadge(phase.status)}
                          <span className="font-medium">{phase.phase_name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{formatCurrency(phase.budget)}</span>
                          <div className="w-24">
                            <Progress value={phase.progress} />
                          </div>
                          <span className="text-sm font-medium w-10 text-left">{phase.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Phases & Tasks Tab */}
            <TabsContent value="phases">
              <div className="space-y-4">
                {phases.map(phase => {
                  const phaseTasks = allTasks.filter(t => t.phase_id === phase.id);
                  const isExpanded = expandedPhases.has(phase.id);
                  return (
                    <Card key={phase.id}>
                      <CardHeader className="cursor-pointer" onClick={() => togglePhase(phase.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            <div>
                              <CardTitle className="text-lg">{phase.phase_name}</CardTitle>
                              {phase.phase_name_en && <p className="text-sm text-muted-foreground">{phase.phase_name_en}</p>}
                            </div>
                            {getStatusBadge(phase.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{phase.start_date} → {phase.end_date}</span>
                            <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{formatCurrency(phase.budget)}</span>
                            <div className="w-20"><Progress value={phase.progress} /></div>
                          </div>
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent>
                          {phase.description && <p className="text-muted-foreground mb-4">{phase.description}</p>}
                          <div className="space-y-2">
                            {phaseTasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  {getStatusBadge(task.status)}
                                  <div>
                                    <p className="font-medium text-sm">{task.task_name}</p>
                                    {task.task_name_en && <p className="text-xs text-muted-foreground">{task.task_name_en}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <span>{task.duration_days} يوم</span>
                                  <span className="text-blue-600">عمالة: {formatCurrency(task.labor_cost)}</span>
                                  <span className="text-green-600">معدات: {formatCurrency(task.equipment_cost)}</span>
                                  <span className="text-orange-600">مواد: {formatCurrency(task.material_cost)}</span>
                                  <div className="w-16"><Progress value={task.progress} /></div>
                                </div>
                              </div>
                            ))}
                            {phaseTasks.length === 0 && (
                              <p className="text-center text-muted-foreground py-4">لا توجد مهام</p>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Gantt Tab */}
            <TabsContent value="gantt">
              <GanttChart phases={phases} tasks={allTasks} />
            </TabsContent>

            {/* Costs Tab */}
            <TabsContent value="costs">
              <CostsSummary phases={phases} tasks={allTasks} formatCurrency={formatCurrency} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageLayout>
  );
};

// Simple Gantt Chart
function GanttChart({ phases, tasks }: { phases: ExecutionPhase[]; tasks: ExecutionTask[] }) {
  if (!phases.length) return <p className="text-center py-8 text-muted-foreground">لا توجد بيانات</p>;

  const allDates = [...phases, ...tasks]
    .flatMap(item => [item.start_date, item.end_date])
    .filter(Boolean)
    .map(d => new Date(d!).getTime());

  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const totalDays = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24));

  const getPosition = (start: string | null, end: string | null) => {
    if (!start || !end) return { left: "0%", width: "5%" };
    const s = (new Date(start).getTime() - minDate) / (1000 * 60 * 60 * 24);
    const e = (new Date(end).getTime() - minDate) / (1000 * 60 * 60 * 24);
    return {
      left: `${(s / totalDays) * 100}%`,
      width: `${Math.max(2, ((e - s) / totalDays) * 100)}%`,
    };
  };

  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-teal-500", "bg-rose-500"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>الجدول الزمني (Gantt)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 overflow-x-auto">
          {phases.map((phase, pi) => {
            const phaseTasks = tasks.filter(t => t.phase_id === phase.id);
            const pos = getPosition(phase.start_date, phase.end_date);
            return (
              <div key={phase.id}>
                {/* Phase bar */}
                <div className="flex items-center gap-2 h-10">
                  <div className="w-48 text-sm font-medium truncate flex-shrink-0">{phase.phase_name}</div>
                  <div className="flex-1 relative h-8 bg-muted rounded">
                    <div
                      className={`absolute h-full ${colors[pi % colors.length]} rounded opacity-80`}
                      style={pos}
                    >
                      <span className="text-[10px] text-white px-1 whitespace-nowrap">{phase.progress}%</span>
                    </div>
                  </div>
                </div>
                {/* Task bars */}
                {phaseTasks.map(task => {
                  const tPos = getPosition(task.start_date, task.end_date);
                  return (
                    <div key={task.id} className="flex items-center gap-2 h-7 mr-4">
                      <div className="w-44 text-xs text-muted-foreground truncate flex-shrink-0">↳ {task.task_name}</div>
                      <div className="flex-1 relative h-5 bg-muted/50 rounded">
                        <div
                          className={`absolute h-full ${colors[pi % colors.length]} rounded opacity-50`}
                          style={tPos}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Costs Summary
function CostsSummary({ phases, tasks, formatCurrency }: { phases: ExecutionPhase[]; tasks: ExecutionTask[]; formatCurrency: (v: number) => string }) {
  const totalLabor = tasks.reduce((s, t) => s + (t.labor_cost || 0), 0);
  const totalEquipment = tasks.reduce((s, t) => s + (t.equipment_cost || 0), 0);
  const totalMaterial = tasks.reduce((s, t) => s + (t.material_cost || 0), 0);
  const grandTotal = totalLabor + totalEquipment + totalMaterial;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto text-blue-500 mb-2" />
            <p className="text-sm text-muted-foreground">تكلفة العمالة</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(totalLabor)}</p>
            <p className="text-xs text-muted-foreground">{grandTotal ? Math.round((totalLabor / grandTotal) * 100) : 0}%</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-6 h-6 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">تكلفة المعدات</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalEquipment)}</p>
            <p className="text-xs text-muted-foreground">{grandTotal ? Math.round((totalEquipment / grandTotal) * 100) : 0}%</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="p-4 text-center">
            <Paperclip className="w-6 h-6 mx-auto text-orange-500 mb-2" />
            <p className="text-sm text-muted-foreground">تكلفة المواد</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(totalMaterial)}</p>
            <p className="text-xs text-muted-foreground">{grandTotal ? Math.round((totalMaterial / grandTotal) * 100) : 0}%</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground">الإجمالي</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-phase breakdown */}
      <Card>
        <CardHeader><CardTitle>تفصيل التكاليف حسب المرحلة</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-2">المرحلة</th>
                  <th className="text-right p-2">العمالة</th>
                  <th className="text-right p-2">المعدات</th>
                  <th className="text-right p-2">المواد</th>
                  <th className="text-right p-2">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {phases.map(phase => {
                  const pTasks = tasks.filter(t => t.phase_id === phase.id);
                  const pLabor = pTasks.reduce((s, t) => s + (t.labor_cost || 0), 0);
                  const pEquip = pTasks.reduce((s, t) => s + (t.equipment_cost || 0), 0);
                  const pMat = pTasks.reduce((s, t) => s + (t.material_cost || 0), 0);
                  return (
                    <tr key={phase.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{phase.phase_name}</td>
                      <td className="p-2 text-blue-600">{formatCurrency(pLabor)}</td>
                      <td className="p-2 text-green-600">{formatCurrency(pEquip)}</td>
                      <td className="p-2 text-orange-600">{formatCurrency(pMat)}</td>
                      <td className="p-2 font-bold">{formatCurrency(pLabor + pEquip + pMat)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ExecutionPlanPage;

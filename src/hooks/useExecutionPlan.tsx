import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ExecutionPlan {
  id: string;
  project_id: string;
  plan_name: string;
  description: string | null;
  total_budget: number;
  status: string;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExecutionPhase {
  id: string;
  plan_id: string;
  phase_name: string;
  phase_name_en: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  progress: number;
  sort_order: number;
  resources_summary: any;
  status: string;
}

export interface ExecutionTask {
  id: string;
  phase_id: string;
  task_name: string;
  task_name_en: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  progress: number;
  assigned_to: string | null;
  labor_cost: number;
  equipment_cost: number;
  material_cost: number;
  total_cost: number;
  status: string;
  sort_order: number;
}

export function useExecutionPlans(projectId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["execution-plans", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("execution_plans")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ExecutionPlan[];
    },
    enabled: !!projectId && !!user,
  });
}

export function useExecutionPhases(planId: string) {
  return useQuery({
    queryKey: ["execution-phases", planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("execution_phases")
        .select("*")
        .eq("plan_id", planId)
        .order("sort_order");
      if (error) throw error;
      return data as ExecutionPhase[];
    },
    enabled: !!planId,
  });
}

export function useExecutionTasks(phaseId: string) {
  return useQuery({
    queryKey: ["execution-tasks", phaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("execution_tasks")
        .select("*")
        .eq("phase_id", phaseId)
        .order("sort_order");
      if (error) throw error;
      return data as ExecutionTask[];
    },
    enabled: !!phaseId,
  });
}

export function useAllPlanTasks(planId: string) {
  return useQuery({
    queryKey: ["all-plan-tasks", planId],
    queryFn: async () => {
      const { data: phases } = await supabase
        .from("execution_phases")
        .select("id")
        .eq("plan_id", planId);
      if (!phases?.length) return [];
      const phaseIds = phases.map((p) => p.id);
      const { data, error } = await supabase
        .from("execution_tasks")
        .select("*")
        .in("phase_id", phaseIds)
        .order("sort_order");
      if (error) throw error;
      return data as ExecutionTask[];
    },
    enabled: !!planId,
  });
}

export function useGenerateExecutionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, planName }: { projectId: string; planName?: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-execution-plan", {
        body: { project_id: projectId, plan_name: planName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["execution-plans", variables.projectId] });
      toast.success("تم توليد خطة التنفيذ بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.message || "فشل في توليد خطة التنفيذ");
    },
  });
}

export function useUpdateTaskProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, progress, status }: { taskId: string; progress: number; status?: string }) => {
      const updates: any = { progress };
      if (status) updates.status = status;
      else if (progress >= 100) updates.status = "completed";
      else if (progress > 0) updates.status = "in_progress";

      const { error } = await supabase
        .from("execution_tasks")
        .update(updates)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["execution-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-plan-tasks"] });
    },
  });
}

export function useUpdatePhaseProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phaseId, progress, status }: { phaseId: string; progress: number; status?: string }) => {
      const updates: any = { progress };
      if (status) updates.status = status;
      const { error } = await supabase
        .from("execution_phases")
        .update(updates)
        .eq("id", phaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["execution-phases"] });
    },
  });
}

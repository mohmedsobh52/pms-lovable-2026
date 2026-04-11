
-- Execution Plans table
CREATE TABLE public.execution_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  description TEXT,
  total_budget NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plans" ON public.execution_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_execution_plans_updated_at BEFORE UPDATE ON public.execution_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Execution Phases table
CREATE TABLE public.execution_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.execution_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  phase_name TEXT NOT NULL,
  phase_name_en TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget NUMERIC DEFAULT 0,
  progress NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  resources_summary JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own phases" ON public.execution_phases FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_execution_phases_updated_at BEFORE UPDATE ON public.execution_phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Execution Tasks table
CREATE TABLE public.execution_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.execution_phases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  task_name TEXT NOT NULL,
  task_name_en TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  duration_days INTEGER DEFAULT 1,
  progress NUMERIC DEFAULT 0,
  assigned_to TEXT,
  labor_cost NUMERIC DEFAULT 0,
  equipment_cost NUMERIC DEFAULT 0,
  material_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  boq_item_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tasks" ON public.execution_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_execution_tasks_updated_at BEFORE UPDATE ON public.execution_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Execution Attachments table
CREATE TABLE public.execution_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.execution_plans(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.execution_phases(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.execution_tasks(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own attachments" ON public.execution_attachments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

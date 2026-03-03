
CREATE TABLE public.drawing_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.saved_projects(id) ON DELETE SET NULL,
  drawing_type TEXT NOT NULL DEFAULT 'infrastructure',
  file_names TEXT[] DEFAULT '{}',
  drawing_info JSONB DEFAULT '{}',
  results JSONB NOT NULL DEFAULT '[]',
  summary JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drawing_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses" ON public.drawing_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own analyses" ON public.drawing_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON public.drawing_analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON public.drawing_analyses FOR DELETE USING (auth.uid() = user_id);

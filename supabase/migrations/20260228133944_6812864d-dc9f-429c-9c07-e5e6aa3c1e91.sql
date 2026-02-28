
-- Add soft delete columns to saved_projects
ALTER TABLE public.saved_projects 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT null;

-- Add soft delete columns to project_data
ALTER TABLE public.project_data 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT null;

-- Create index for efficient queries on active projects
CREATE INDEX IF NOT EXISTS idx_saved_projects_active ON public.saved_projects (user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_saved_projects_deleted ON public.saved_projects (user_id, deleted_at) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_project_data_active ON public.project_data (user_id) WHERE is_deleted = false;

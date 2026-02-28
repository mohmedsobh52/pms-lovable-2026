
-- Create admin_activity_log table
CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL DEFAULT 'user',
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read activity logs
CREATE POLICY "Admins can view activity logs"
  ON public.admin_activity_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No client-side INSERT (only service_role via edge functions)
-- No UPDATE or DELETE needed

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_activity_log;

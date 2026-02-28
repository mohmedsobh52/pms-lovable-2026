
-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'new_user',
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can SELECT their own notifications
CREATE POLICY "Admins can view their notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (admin_user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

-- Admins can UPDATE their own notifications (mark as read)
CREATE POLICY "Admins can update their notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (admin_user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

-- Admins can DELETE their own notifications
CREATE POLICY "Admins can delete their notifications"
ON public.admin_notifications
FOR DELETE
TO authenticated
USING (admin_user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

-- No INSERT from client - only via service_role in Edge Function

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

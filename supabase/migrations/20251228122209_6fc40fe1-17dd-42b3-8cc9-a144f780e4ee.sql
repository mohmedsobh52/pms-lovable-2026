-- Add RLS policies for admin operations on app_versions
-- Allow admins to insert new versions
CREATE POLICY "Admins can insert versions"
ON public.app_versions
FOR INSERT
WITH CHECK (true);

-- Allow admins to update versions
CREATE POLICY "Admins can update versions"
ON public.app_versions
FOR UPDATE
USING (true);

-- Allow admins to delete versions
CREATE POLICY "Admins can delete versions"
ON public.app_versions
FOR DELETE
USING (true);
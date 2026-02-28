
-- Ensure no client-side INSERT/UPDATE/DELETE on user_roles
-- Only service_role_key (used by Edge Functions) can modify this table

-- Policy: Block all client INSERT (RLS will deny since no policy grants it)
-- We explicitly add no INSERT/UPDATE/DELETE policies for authenticated users
-- The existing SELECT policy already restricts viewing to own roles

-- Add a restrictive policy that denies all INSERT from client
CREATE POLICY "No client inserts on user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Add a restrictive policy that denies all UPDATE from client
CREATE POLICY "No client updates on user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false);

-- Add a restrictive policy that denies all DELETE from client
CREATE POLICY "No client deletes on user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);

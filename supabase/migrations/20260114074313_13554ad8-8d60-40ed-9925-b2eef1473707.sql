-- Fix 1: Update analysis_comments policies to restrict to authors only
DROP POLICY IF EXISTS "Authors can update own comments" ON public.analysis_comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.analysis_comments;

-- Add session_id column for anonymous user tracking
ALTER TABLE public.analysis_comments ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create proper UPDATE policy that restricts to comment authors
CREATE POLICY "Authors can update own comments"
ON public.analysis_comments
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND author_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  OR (session_id IS NOT NULL AND session_id = current_setting('request.headers', true)::json->>'x-session-id')
);

-- Create proper DELETE policy that restricts to comment authors
CREATE POLICY "Authors can delete own comments"
ON public.analysis_comments
FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND author_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  OR (session_id IS NOT NULL AND session_id = current_setting('request.headers', true)::json->>'x-session-id')
);

-- Fix 2: Add RLS policy for evm_alert_settings to restrict email exposure
DROP POLICY IF EXISTS "Users can view their own alert settings" ON public.evm_alert_settings;
DROP POLICY IF EXISTS "Users can view own settings" ON public.evm_alert_settings;

CREATE POLICY "Users can view own settings"
ON public.evm_alert_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Fix 3: Add RLS policies for suppliers table
DROP POLICY IF EXISTS "Users can view their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view own suppliers" ON public.suppliers;

CREATE POLICY "Users can view own suppliers"
ON public.suppliers
FOR SELECT
USING (auth.uid() = user_id);

-- Fix 4: Add SELECT policy for analysis_comments_secure view
GRANT SELECT ON public.analysis_comments_secure TO anon, authenticated;
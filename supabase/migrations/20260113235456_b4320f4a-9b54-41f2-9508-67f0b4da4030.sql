-- Create a secure view for analysis_comments that masks email addresses
-- Only authenticated users can see their own email, others see masked version

CREATE OR REPLACE VIEW public.analysis_comments_secure AS
SELECT
  id,
  share_code,
  author_name,
  -- Mask email for public visibility - only show to the author themselves
  CASE 
    WHEN auth.jwt() IS NOT NULL AND (auth.jwt() ->> 'email') = author_email THEN author_email
    ELSE NULL -- Hide email from others
  END AS author_email,
  comment_text,
  comment_type,
  item_id,
  is_resolved,
  parent_id,
  created_at,
  updated_at
FROM public.analysis_comments;

-- Grant access to the view
GRANT SELECT ON public.analysis_comments_secure TO anon, authenticated;

-- Add comment explaining the view
COMMENT ON VIEW public.analysis_comments_secure IS 'Secure view of analysis_comments that hides author email addresses from other users. Only the comment author can see their own email.';
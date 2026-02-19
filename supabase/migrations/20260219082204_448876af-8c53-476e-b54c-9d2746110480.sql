
-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can create items for their projects" ON public.project_items;
DROP POLICY IF EXISTS "Users can view items of their projects" ON public.project_items;
DROP POLICY IF EXISTS "Users can update items of their projects" ON public.project_items;
DROP POLICY IF EXISTS "Users can delete items of their projects" ON public.project_items;

-- إنشاء دالة مساعدة للتحقق من ملكية المشروع في كلا الجدولين
CREATE OR REPLACE FUNCTION public.user_owns_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_data
    WHERE id = _project_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM saved_projects
    WHERE id = _project_id AND user_id = auth.uid()
  );
$$;

-- إعادة إنشاء السياسات الأربع باستخدام الدالة
CREATE POLICY "Users can create items for their projects"
ON public.project_items FOR INSERT
WITH CHECK (public.user_owns_project(project_id));

CREATE POLICY "Users can view items of their projects"
ON public.project_items FOR SELECT
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can update items of their projects"
ON public.project_items FOR UPDATE
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can delete items of their projects"
ON public.project_items FOR DELETE
USING (public.user_owns_project(project_id));

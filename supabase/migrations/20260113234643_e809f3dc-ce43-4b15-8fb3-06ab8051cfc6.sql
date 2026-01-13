
-- =====================================================
-- إصلاح الأخطاء الأمنية في سياسات RLS
-- =====================================================

-- 1. إصلاح سياسات analysis_comments
-- حذف السياسات الخاطئة
DROP POLICY IF EXISTS "Anyone can add comments" ON public.analysis_comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.analysis_comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON public.analysis_comments;

-- إنشاء سياسات آمنة للتعليقات
-- السماح بإضافة تعليقات فقط إذا كان share_code صالحاً
CREATE POLICY "Users can add comments to valid shares"
ON public.analysis_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shared_analyses
    WHERE share_code = analysis_comments.share_code
    AND is_active = true
    AND expires_at > now()
  )
);

-- المؤلفون يمكنهم حذف تعليقاتهم (بناءً على email أو auth.uid)
CREATE POLICY "Authors can delete own comments safely"
ON public.analysis_comments
FOR DELETE
USING (
  author_email IS NOT NULL 
  AND author_email = auth.jwt()->>'email'
);

-- المؤلفون يمكنهم تعديل تعليقاتهم
CREATE POLICY "Authors can update own comments safely"
ON public.analysis_comments
FOR UPDATE
USING (
  author_email IS NOT NULL 
  AND author_email = auth.jwt()->>'email'
);

-- 2. إصلاح سياسات app_versions (جدول الإصدارات)
-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Admins can delete versions" ON public.app_versions;
DROP POLICY IF EXISTS "Admins can insert versions" ON public.app_versions;
DROP POLICY IF EXISTS "Admins can update versions" ON public.app_versions;

-- إنشاء جدول أدوار المستخدمين إذا لم يكن موجوداً
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- إنشاء جدول الأدوار إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- تفعيل RLS على جدول الأدوار
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- سياسة قراءة الأدوار - المستخدمون يرون أدوارهم فقط
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- دالة للتحقق من الدور بأمان
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- إنشاء سياسات آمنة لـ app_versions باستخدام الدالة
CREATE POLICY "Admins can insert versions safely"
ON public.app_versions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update versions safely"
ON public.app_versions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete versions safely"
ON public.app_versions
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 3. إصلاح سياسة shared_analyses
DROP POLICY IF EXISTS "Anyone can create shared analyses" ON public.shared_analyses;

-- السماح فقط للمستخدمين المسجلين بإنشاء مشاركات
CREATE POLICY "Authenticated users can create shared analyses"
ON public.shared_analyses
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- إضافة سياسة للمستخدمين لحذف مشاركاتهم
CREATE POLICY "Users can delete their own shared analyses"
ON public.shared_analyses
FOR DELETE
USING (auth.uid() = created_by);

-- إضافة سياسة للمستخدمين لتعديل مشاركاتهم
CREATE POLICY "Users can update their own shared analyses"
ON public.shared_analyses
FOR UPDATE
USING (auth.uid() = created_by);

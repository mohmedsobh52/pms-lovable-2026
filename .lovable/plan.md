
# إصلاح خطأ RLS عند رفع BOQ في المشاريع المحفوظة

## السبب الجذري

سياسة RLS لجدول `project_items` عند الإضافة (INSERT) تتحقق من:
```sql
EXISTS (
  SELECT 1 FROM project_data
  WHERE project_data.id = project_items.project_id
    AND project_data.user_id = auth.uid()
)
```

المشروع الحالي (`e520085c-3a89-43fe-9bca-0d4f73a4e181`) موجود في جدول `saved_projects` وليس في `project_data`. لذلك عند محاولة إدراج بنود في `project_items` بـ `project_id` يشير لمشروع من `saved_projects`، تفشل سياسة RLS لأنه لا يوجد سجل مطابق في `project_data`.

## الحلول المتاحة

**الحل المختار: إصلاح سياسة RLS لتشمل كلا الجدولين**

تعديل سياسة INSERT لجدول `project_items` لتتحقق من كلا الجدولين (`project_data` و`saved_projects`):

```sql
-- سياسة INSERT الجديدة
CREATE POLICY "Users can create items for their projects"
ON public.project_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_data
    WHERE project_data.id = project_items.project_id
      AND project_data.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM saved_projects
    WHERE saved_projects.id = project_items.project_id
      AND saved_projects.user_id = auth.uid()
  )
);
```

يجب تطبيق نفس المنطق على سياسات SELECT و UPDATE و DELETE أيضاً لضمان الاتساق الكامل.

## التغييرات المطلوبة

### Migration SQL — تحديث سياسات RLS لـ `project_items`

```sql
-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can create items for their projects" ON public.project_items;
DROP POLICY IF EXISTS "Users can view items of their projects" ON public.project_items;
DROP POLICY IF EXISTS "Users can update items of their projects" ON public.project_items;
DROP POLICY IF EXISTS "Users can delete items of their projects" ON public.project_items;

-- إنشاء سياسة مساعدة (دالة) للتحقق من ملكية المشروع في كلا الجدولين
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
```

### لماذا استخدام `SECURITY DEFINER Function`؟

- تمنع تكرار نفس الـ subquery في 4 سياسات مختلفة
- تمنع أي مشاكل recursive محتملة
- تتبع أفضل الممارسات الموصى بها في Supabase

## لا تغييرات في الكود

هذا الإصلاح يتم فقط على مستوى قاعدة البيانات (RLS policies). ملف `BOQUploadDialog.tsx` الكود فيه صحيح بعد الإصلاح السابق (حذف `user_id`).

## الملفات المتأثرة

| | النوع | الوصف |
|---|---|---|
| قاعدة البيانات | Migration | تحديث سياسات RLS + إضافة دالة `user_owns_project` |

لا تغييرات على أي ملفات TypeScript/React.

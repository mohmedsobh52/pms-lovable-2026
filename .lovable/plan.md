

# معالجة مشكلة حفظ المشاريع

## المشاكل المكتشفة

### 1. زر الحفظ في صفحة تفاصيل المشروع لا يحفظ شيئاً فعلياً
الزر في `ProjectDetailsPage.tsx` (سطر 1108-1142) يقوم فقط بتحديث `updated_at` دون حفظ بيانات البنود أو التعديلات الفعلية.

### 2. تعارض المعرفات عند الحفظ المكرر
`SaveProjectButton.tsx` و `SaveProjectDialog.tsx` يُدخلان سجلاً في `saved_projects` بنفس `id` من `project_data`. إذا كان السجل موجوداً مسبقاً تفشل العملية بخطأ unique constraint، ويتم تجاهل الخطأ بصمت (سطر 112-114).

### 3. استخدام `as any` يُخفي أخطاء الأنواع
جدول `project_data` موجود في الأنواع المولّدة لكن الكود يستخدم `as any` مما يمنع TypeScript من كشف الأخطاء.

### 4. حذف صلب عند الاستبدال في `SaveProjectDialog`
عند استبدال مشروع مكرر، `SaveProjectDialog` يحذف حذفاً صلباً (hard delete) بدلاً من النقل لسلة المحذوفات.

## الحل

### ملف 1: `src/pages/ProjectDetailsPage.tsx`
- تعديل زر "حفظ المشروع" ليحفظ فعلياً: تحديث `analysis_data`, `wbs_data`, `total_value`, `items_count` في كلا الجدولين (`project_data` + `saved_projects`)
- إعادة حفظ `project_items` مع التكاليف المحدّثة

### ملف 2: `src/components/SaveProjectButton.tsx`
- إزالة `as any` من استعلامات `project_data` و `project_items`
- استخدام `upsert` بدلاً من `insert` عند الإدخال في `saved_projects` لتجنب تعارض المعرفات
- معالجة أخطاء `saved_projects` بشكل صحيح بدلاً من تجاهلها

### ملف 3: `src/components/SaveProjectDialog.tsx`
- استبدال الحذف الصلب بحذف ناعم (soft delete) عند الاستبدال
- استخدام `upsert` لـ `saved_projects` لتجنب تعارض المعرفات

### الملفات المتأثرة
- `src/pages/ProjectDetailsPage.tsx`
- `src/components/SaveProjectButton.tsx`
- `src/components/SaveProjectDialog.tsx`


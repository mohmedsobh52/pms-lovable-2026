
# معالجة مشكلة حفظ الإعدادات (المنطقة/المدينة) في تفاصيل المشروع

## المشكلة الرئيسية

عند حفظ إعدادات المشروع (بما في ذلك المنطقة والمدينة)، الكود يحاول التحديث دائماً في جدول `project_data`. لكن بعض المشاريع مخزنة في جدول `saved_projects`، مما يعني أن الحفظ يفشل بصمت (لا يظهر خطأ لكن لا يتم حفظ البيانات).

## الحل

### تعديل `src/pages/ProjectDetailsPage.tsx`

1. **تتبع مصدر المشروع**: إضافة state جديد `projectSource` لتحديد من أي جدول تم تحميل المشروع (`project_data` أو `saved_projects`).

2. **تعديل `handleSaveSettings`**: استخدام `projectSource` لتحديد الجدول الصحيح للتحديث:
   - إذا كان المشروع من `project_data` يتم التحديث فيه
   - إذا كان من `saved_projects` يتم التحديث فيه مع تعديل أسماء الأعمدة المناسبة

3. **تعديل `fetchProjectData`**: تسجيل مصدر المشروع عند التحميل.

## التفاصيل التقنية

### State جديد

```typescript
const [projectSource, setProjectSource] = useState<"project_data" | "saved_projects">("project_data");
```

### تعديل `fetchProjectData`

عند العثور على المشروع في `saved_projects`، يتم تعيين:
```typescript
setProjectSource("saved_projects");
```

### تعديل `handleSaveSettings`

```typescript
if (projectSource === "saved_projects") {
  await supabase
    .from("saved_projects")
    .update({
      name: editForm.name.trim(),
      analysis_data: updatedAnalysisData,
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId);
} else {
  await supabase
    .from("project_data")
    .update({
      name: editForm.name.trim(),
      currency: editForm.currency,
      analysis_data: updatedAnalysisData,
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId);
}
```

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/ProjectDetailsPage.tsx` | إضافة `projectSource` state، تعديل `fetchProjectData` و `handleSaveSettings` |

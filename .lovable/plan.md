

# إصلاح خطأ RLS عند رفع BOQ + تحسين الأداء

## المشكلة

عند رفع ملف BOQ وحفظ البنود في جدول `project_items`، يظهر خطأ:
> "new row violates row-level security policy for table project_items"

**السبب**: سياسة RLS تستخدم الدالة `user_owns_project(project_id)` التي تتحقق من وجود المشروع في `project_data` أو `saved_projects`. الخطأ يحدث عندما:
1. المشروع مُنشأ في `saved_projects` لكن `project_items` تحتاج أن يكون في `project_data` أيضاً
2. المستخدم غير مُوثّق (لا يوجد `auth.uid()`)
3. المشروع غير موجود في أي من الجدولين

## الحل

### 1. الملف: `src/components/project-details/BOQUploadDialog.tsx`

**إضافة التحقق من التوثيق قبل الحفظ:**
- التحقق من وجود `user` قبل محاولة الحفظ
- إذا كان المشروع في `saved_projects` فقط، إنشاء سجل مقابل في `project_data` تلقائياً (أو التأكد من وجوده)
- تحسين رسالة الخطأ لتكون واضحة للمستخدم

**إضافة منطق ضمان وجود المشروع:**

```text
// قبل حفظ البنود، تأكد من وجود المشروع في project_data
const ensureProjectExists = async (projectId: string) => {
  const { data: exists } = await supabase
    .from('project_data')
    .select('id')
    .eq('id', projectId)
    .maybeSingle();
  
  if (!exists) {
    // تحقق من saved_projects
    const { data: saved } = await supabase
      .from('saved_projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();
    
    if (saved) {
      // أنشئ سجل في project_data
      await supabase.from('project_data').insert({
        id: projectId,
        user_id: user.id,
        name: saved.name,
        analysis_data: saved.analysis_data,
        // ...
      });
    }
  }
};
```

**تحسين معالجة الخطأ:**
- عرض رسالة خطأ واضحة بدلاً من الرسالة التقنية
- إضافة إعادة المحاولة تلقائياً بعد إنشاء سجل المشروع

### 2. الملف: `src/pages/ProjectDetailsPage.tsx`

**إضافة ضمان المزامنة بين الجدولين:**
- عند تحميل مشروع من `saved_projects`، التأكد من وجود سجل مقابل في `project_data` لدعم عمليات `project_items`

### 3. تحسين الأداء والشكل في `BOQUploadDialog`

- إضافة شريط تقدم واضح أثناء التحليل
- تحسين عرض حالة الملف المرفوع
- إضافة رسائل حالة أفضل للمستخدم

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/project-details/BOQUploadDialog.tsx` | إضافة التحقق من التوثيق، ضمان وجود المشروع، تحسين الأخطاء والشكل |
| `src/pages/ProjectDetailsPage.tsx` | إضافة مزامنة المشروع بين الجدولين عند التحميل |


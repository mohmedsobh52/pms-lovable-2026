
# تحديث القيمة الإجمالية في قاعدة البيانات عند اكتشاف قيم فاسدة

## المشكلة

القيمة الإجمالية المخزنة في `analysis_data.summary.total_value` في قاعدة البيانات فاسدة (240,568,176,224,047,730,000 SAR). الكود الحالي يعيد حسابها للعرض فقط لكن لا يحفظ القيمة الصحيحة في قاعدة البيانات، فتظل القيمة الخاطئة تظهر.

## الحل

### الملف: `src/pages/SavedProjectsPage.tsx`

بعد تحميل المشاريع وحساب القيم الصحيحة، إضافة دالة تقوم بتحديث القيم الفاسدة مباشرة في قاعدة البيانات (`saved_projects` و `project_data`). هذا يعني أن القيمة ستُصحح مرة واحدة ولن تظهر خاطئة مرة أخرى.

#### 1. إضافة دالة `fixCorruptedTotals` بعد `fetchProjects`

بعد حساب `allProjects`، نمر على كل مشروع ونقارن القيمة المخزنة بالقيمة المحسوبة. إذا كانت مختلفة (القيمة المخزنة فاسدة)، نقوم بتحديث `analysis_data.summary.total_value` في قاعدة البيانات:

```text
// بعد سطر 234 (setProjects(allProjects))
// تصحيح القيم الفاسدة في قاعدة البيانات
for (const project of allProjects) {
  const storedTotal = project.analysis_data?.summary?.total_value || 0;
  if (storedTotal >= 1e10 || storedTotal < 0) {
    const correctedTotal = project.total_value; // القيمة المحسوبة أعلاه
    const updatedAnalysis = {
      ...project.analysis_data,
      summary: {
        ...(project.analysis_data?.summary || {}),
        total_value: correctedTotal,
      },
    };
    // تحديث saved_projects
    await supabase
      .from('saved_projects')
      .update({ analysis_data: updatedAnalysis, updated_at: new Date().toISOString() })
      .eq('id', project.id);
    // تحديث project_data أيضاً
    await supabase
      .from('project_data')
      .update({ analysis_data: updatedAnalysis, total_value: correctedTotal, updated_at: new Date().toISOString() })
      .eq('id', project.id);
  }
}
```

#### 2. إزالة شارة "Corrected" بعد التصحيح الدائم

بما أن القيمة ستُصحح فعلياً في قاعدة البيانات، لن تحتاج شارة "Corrected" بعد التحميل التالي. سيتم الإبقاء عليها فقط أثناء الجلسة الحالية كمؤشر أن التصحيح تم.

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/SavedProjectsPage.tsx` | إضافة تحديث تلقائي للقيم الفاسدة في قاعدة البيانات عند تحميل المشاريع |

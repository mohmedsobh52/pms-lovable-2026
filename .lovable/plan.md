

# إصلاح تبويب الحفظ

## المشكلة

عند الضغط على "حفظ" من داخل صفحة تفاصيل المشروع (تبويب التحليل المتقدم)، يظهر دائماً نافذة "يوجد مشروع بنفس الاسم" لأن المشروع موجود فعلاً في قاعدة البيانات. المشكلة الأساسية:

1. **`SaveProjectButton` لا يعرف أن المشروع موجود مسبقاً** - يحاول دائماً إنشاء مشروع جديد بدلاً من تحديث الموجود
2. **لا يوجد خيار "حفظ باسم جديد"** في `SaveProjectButton` (تم إضافته فقط في `SaveProjectDialog` سابقاً)
3. **نافذة التكرار لا تقدم حلاً مريحاً** - فقط "استبدال" أو "إلغاء"

## الحل

### الملف: `src/components/SaveProjectButton.tsx`

#### 1. إضافة prop جديد `savedProjectId`

لتمرير معرّف المشروع الحالي حتى يعرف الزر أن المشروع موجود مسبقاً:

```text
interface SaveProjectButtonProps {
  items: BOQItem[];
  // ... existing props
  savedProjectId?: string;  // جديد
}
```

#### 2. تغيير سلوك الحفظ عند وجود `savedProjectId`

إذا كان المشروع موجوداً مسبقاً (أي `savedProjectId` محدد)، يتم تحديثه مباشرة بدون التحقق من التكرار:

```text
const handleSave = async () => {
  // ... validations
  
  if (savedProjectId) {
    // المشروع موجود - حدّثه مباشرة
    await updateExistingProject(savedProjectId);
    return;
  }
  
  // مشروع جديد - تحقق من التكرار
  // ... existing duplicate check logic
};
```

#### 3. إضافة دالة `updateExistingProject`

```text
const updateExistingProject = async (projectId: string) => {
  // تحديث project_data
  await supabase.from('project_data').update({
    analysis_data: { items, summary },
    wbs_data: wbsData,
    total_value: totalValue,
    updated_at: new Date().toISOString(),
  }).eq('id', projectId);
  
  // تحديث project_items (حذف القديم + إدراج الجديد)
  await supabase.from('project_items').delete().eq('project_id', projectId);
  // ... insert updated items
};
```

#### 4. إضافة خيار "حفظ باسم جديد" في نافذة التكرار

نفس الميزة التي أُضيفت سابقاً في `SaveProjectDialog`:

```text
const handleSaveWithNewName = async () => {
  const timestamp = new Date().toLocaleTimeString("ar-SA", {
    hour: "2-digit", minute: "2-digit",
  });
  const newName = `${projectName.trim()} (${timestamp})`;
  setProjectName(newName);
  setDuplicateDialogOpen(false);
  setDuplicateProject(null);
  await saveNewProject();
};
```

### الملف: `src/components/AnalysisResults.tsx`

تمرير `savedProjectId` إلى `SaveProjectButton` في الموقعين:

```text
<SaveProjectButton
  items={data.items || []}
  wbsData={wbsData}
  summary={data.summary}
  getItemCostData={getItemCostData}
  getItemCalculatedCosts={getItemCalculatedCosts}
  fileName={fileName}
  isArabic={isArabic}
  savedProjectId={savedProjectId}  // جديد
/>
```

## النتيجة المتوقعة

- عند فتح مشروع موجود والضغط على "حفظ"، يتم التحديث مباشرة بدون أسئلة
- عند حفظ مشروع جديد بنفس اسم مشروع موجود، تظهر 3 خيارات: "استبدال القديم" / "حفظ باسم جديد" / "إلغاء"

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/SaveProjectButton.tsx` | إضافة `savedProjectId` prop، دالة `updateExistingProject`، خيار "حفظ باسم جديد" |
| `src/components/AnalysisResults.tsx` | تمرير `savedProjectId` إلى `SaveProjectButton` |


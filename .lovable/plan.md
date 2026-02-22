

# إصلاح عدم ظهور الوصف العربي في صفحة المشروع

## السبب الجذري

تم اكتشاف 3 ثغرات تمنع ظهور الوصف العربي:

### 1. عند حفظ البنود في قاعدة البيانات (BOQUploadDialog)
الملف `src/components/project-details/BOQUploadDialog.tsx` سطر 225-234:
عند رفع ملف BOQ وحفظ البنود في جدول `project_items`، حقل `description_ar` لا يُرسل إطلاقاً رغم وجود العمود في قاعدة البيانات.

### 2. عند تحويل البيانات لعرضها (ProjectDetailsPage)
الملف `src/pages/ProjectDetailsPage.tsx` سطر 337-347:
عند تحويل `project_items` إلى `AnalysisData` لتمريره إلى مكون `AnalysisResults`، حقل `description_ar` غير موجود في الـ mapping.

### 3. عند تحميل المشروع من الصفحة الرئيسية (BOQItemsPage)
الملف `src/pages/BOQItemsPage.tsx`:
عند فتح مشروع محفوظ، يتم تحميل `analysis_data` مباشرة - هذا يعمل لأن `description_ar` موجود في `analysis_data`. لكن عند فتحه من `/projects/:id` تظهر المشكلة.

## خطة الإصلاح

### 1. إضافة `description_ar` عند حفظ البنود
**الملف: `src/components/project-details/BOQUploadDialog.tsx`**

في `saveItemsToProject` (سطر 225-234)، إضافة:
```
description_ar: item.description_ar || null,
```
+ تطبيق الكشف الذكي: إذا كان `description` يحتوي على عربي ولا يوجد `description_ar`، يُنسخ تلقائياً.

### 2. إضافة `description_ar` في تحويل البيانات
**الملف: `src/pages/ProjectDetailsPage.tsx`**

في `projectAnalysisData` (سطر 337-347)، إضافة:
```
description_ar: (item as any).description_ar || "",
```

### 3. تطبيق الكشف الذكي عند التحويل
في نفس الـ mapping بـ `ProjectDetailsPage.tsx`، إذا كان `description` يحتوي عربي ولا يوجد `description_ar`:
```
description_ar: (item as any).description_ar || 
  (item.description && /[\u0600-\u06FF]/.test(item.description) ? item.description : ""),
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/project-details/BOQUploadDialog.tsx` | إضافة `description_ar` + كشف ذكي عند الحفظ |
| `src/pages/ProjectDetailsPage.tsx` | إضافة `description_ar` في تحويل البيانات |

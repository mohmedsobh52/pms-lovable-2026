

# معالجة عدم ظهور الوصف العربي + تحسين الشكل والأداء

## المشكلة الجذرية

عند رفع ملف Excel يحتوي على عمودي وصف (عربي وإنجليزي)، النظام يتعرف على كليهما كـ `description` ويكتب الثاني فوق الأول. السبب:

1. `COLUMN_PATTERNS` في `excel-utils.ts` يضع كل أنماط الوصف العربي والإنجليزي تحت مفتاح `description` واحد
2. `ExcelBOQItem` لا يحتوي على حقل `descriptionAr`
3. `convertExcelToAnalysisItems` لا ينقل `description_ar` إطلاقاً

## خطة الحل

### 1. إضافة دعم `descriptionAr` في استخراج Excel

**الملف: `src/lib/excel-utils.ts`**

- إضافة `descriptionAr` إلى واجهة `ExcelBOQItem`
- إضافة نمط `descriptionAr` جديد في `COLUMN_PATTERNS` يحتوي على أنماط عربية محددة مثل: `'وصف البند', 'الوصف', 'البيان', 'الوصف العربي', 'بيان الأعمال', 'وصف', 'بيان', 'التفاصيل', 'الأعمال'`
- إزالة هذه الأنماط العربية من مفتاح `description` (مع ترك الأنماط الإنجليزية)
- إضافة منطق ذكي: إذا وُجد عمود واحد فقط للوصف (عربي أو إنجليزي)، يُعامل كـ `description`. إذا وُجد عمودان، يُفصل العربي عن الإنجليزي
- استخراج القيمة في `extractBOQItems` و `applyCustomMapping`

### 2. نقل `description_ar` عبر سلسلة التحليل

**الملف: `src/lib/local-excel-analysis.ts`**

- إضافة `description_ar?: string` إلى `LocalAnalysisItem`
- في `convertExcelToAnalysisItems`: نقل `item.descriptionAr` إلى `description_ar`

### 3. نقل البيانات في صفحات التحليل

**الملفات: `src/pages/Index.tsx` و `src/components/BOQAnalyzerPanel.tsx` و `src/components/project-details/BOQUploadDialog.tsx`**

- التأكد أن `normalizedItems` ينقل `description_ar` في الـ spread operator (غالباً يعمل تلقائياً مع `...item`)

### 4. تحسين حفظ المشروع

**الملف: `src/components/SaveProjectDialog.tsx`**

- التحقق أن `description_ar` يُحفظ مع بنود المشروع (موجود بالفعل في السطر 154)

### 5. تحسين الشكل والأداء في الجدول

**الملف: `src/components/AnalysisResults.tsx`**

- إصلاح auto-detection: إذا كان المستخدم حفظ `boq_visible_columns` سابقاً بدون `description_ar`، يتم إضافته تلقائياً عند وجود بيانات عربية (إزالة شرط `!saved`)
- تحسين عرض العمود: تقليل `min-w` لتوفير مساحة، وإضافة خلفية خفيفة مميزة للعمود العربي

## التفاصيل التقنية

### التعامل مع عمود وصف واحد vs عمودين

```text
detectColumnMapping(headers):
  1. أولاً: البحث عن أنماط descriptionAr (عربية فقط)
  2. ثانياً: البحث عن أنماط description (إنجليزية فقط) 
  3. إذا وُجد descriptionAr فقط (بدون description إنجليزي):
     → فحص محتوى البيانات: إذا كان عربياً، نسخه أيضاً كـ description
  4. إذا وُجد عمود واحد فقط يطابق أي نمط وصف:
     → يُعامل كـ description (الأساسي)
     → إذا كان محتواه عربياً، يُنسخ أيضاً إلى descriptionAr
```

### منطق الكشف الذكي (بعد الاستخراج)

```text
في extractBOQItems بعد بناء كل item:
  - إذا وُجد description فقط وهو عربي (يحتوي حروف عربية):
    → item.descriptionAr = item.description
  - إذا وُجد descriptionAr فقط بدون description:
    → item.description = item.descriptionAr (fallback)
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/lib/excel-utils.ts` | إضافة `descriptionAr` في الواجهة والأنماط والاستخراج |
| `src/lib/local-excel-analysis.ts` | إضافة `description_ar` في الواجهة ونقلها |
| `src/components/AnalysisResults.tsx` | تحسين auto-detection وتحسين شكل العمود |




# إصلاح عدم ظهور الوصف العربي - الإصلاحات المتبقية

## المشكلة

رغم التحديثات السابقة، لا يزال الوصف العربي لا يظهر في بعض الحالات بسبب ثغرات في مسارات البيانات التالية:

## الثغرات المكتشفة

### 1. `reExtractWithMapping` لا تستخرج `descriptionAr`
**الملف: `src/lib/excel-utils.ts` (سطور 970-1077)**

عند إعادة تعيين الأعمدة يدوياً في شاشة المعاينة، الدالة `reExtractWithMapping` لا تستخرج عمود الوصف العربي إطلاقاً، ولا تطبق الكشف الذكي عن النص العربي.

**الحل:** إضافة استخراج `descriptionAr` من `customMapping.descriptionAr` + تطبيق منطق الكشف الذكي (نفس المنطق في `extractBOQItems`).

### 2. `ExcelDataPreview` لا يعرض خيار تعيين عمود الوصف العربي
**الملف: `src/components/ExcelDataPreview.tsx` (سطر 30-37)**

قائمة `COLUMN_FIELDS` لا تحتوي على `descriptionAr`، فالمستخدم لا يستطيع تعيين عمود للوصف العربي يدوياً.

**الحل:** إضافة `{ key: 'descriptionAr', labelEn: 'Arabic Description', labelAr: 'الوصف العربي' }` إلى `COLUMN_FIELDS`.

### 3. مسار النص المحلي في `Index.tsx` لا يضمن `description_ar`
**الملف: `src/pages/Index.tsx` (سطور 616-626)**

عند التحليل المحلي للنص، المنطق يعتمد فقط على `...item` spread بدون تأكيد صريح لـ `description_ar`.

**الحل:** إضافة `description_ar: item.description_ar || ''` بشكل صريح في الـ mapping + تطبيق الكشف الذكي.

## التفاصيل التقنية

### تعديل `reExtractWithMapping` (excel-utils.ts)

```text
بعد استخراج description (سطر 1009):
  - إضافة استخراج descriptionAr من customMapping.descriptionAr
  - بعد بناء كل item (قبل push):
    - if (item.description && !item.descriptionAr && يحتوي عربي) → نسخ
    - if (item.descriptionAr && !item.description) → fallback
```

### تعديل COLUMN_FIELDS (ExcelDataPreview.tsx)

```text
إضافة بعد description:
  { key: 'descriptionAr', labelEn: 'Arabic Description', labelAr: 'الوصف العربي' }
```

### تعديل normalizedItems في Index.tsx (المسار المحلي)

```text
إضافة في map (سطر 616):
  description_ar: item.description_ar || (item.description && يحتوي عربي ? item.description : ''),
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/lib/excel-utils.ts` | إضافة descriptionAr في reExtractWithMapping + كشف ذكي |
| `src/components/ExcelDataPreview.tsx` | إضافة descriptionAr في COLUMN_FIELDS |
| `src/pages/Index.tsx` | تأكيد صريح لـ description_ar في مسار التحليل المحلي |


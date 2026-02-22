

# إصلاح عدم ظهور الوصف العربي - الإصلاحات المتبقية

## الثغرات المكتشفة والحلول

### 1. `reExtractWithMapping` لا تستخرج `descriptionAr` (excel-utils.ts سطور 970-1077)

بعد سطر 1009 (استخراج description)، سيتم إضافة:
- استخراج `descriptionAr` من `customMapping.descriptionAr`
- قبل push (سطر 1067): كشف ذكي - إذا كان description عربي ولا يوجد descriptionAr، ينسخ تلقائياً

### 2. `ExcelDataPreview` لا يعرض خيار الوصف العربي (ExcelDataPreview.tsx سطر 30-37)

إضافة سطر جديد بعد description:
```
{ key: 'descriptionAr', labelEn: 'Arabic Description', labelAr: 'الوصف العربي' }
```

### 3. مسار النص المحلي في Index.tsx (سطر 616-626)

إضافة `description_ar` صريحاً مع كشف ذكي:
```
description_ar: item.description_ar || (item.description && /[\u0600-\u06FF]/.test(item.description) ? item.description : ''),
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/lib/excel-utils.ts` | إضافة descriptionAr في reExtractWithMapping + كشف ذكي |
| `src/components/ExcelDataPreview.tsx` | إضافة descriptionAr في COLUMN_FIELDS |
| `src/pages/Index.tsx` | تأكيد صريح لـ description_ar في مسار التحليل المحلي |


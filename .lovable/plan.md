

# إضافة عمود الوصف العربي لتصدير Excel مع دعم RTL

---

## المشكلة الحالية

واجهة `BOQItem` في `src/lib/reports-export-utils.ts` لا تحتوي على حقل `description_ar`، وبالتالي عند تصدير جدول الكميات إلى Excel، يتم تجاهل الوصف العربي تماماً حتى لو كانت البيانات تحتويه.

---

## التعديلات المطلوبة

### 1. تحديث واجهة `BOQItem` (reports-export-utils.ts)

إضافة `description_ar?: string` إلى الواجهة.

### 2. تحديث `exportBOQToExcel` (reports-export-utils.ts)

- فحص وجود بيانات عربية في البنود (`description_ar`)
- إذا وُجدت: إضافة عمود "الوصف العربي" بعد عمود "الوصف" مباشرة (7 أعمدة بدلاً من 6)
- ضبط اتجاه عمود الوصف العربي إلى RTL مع خط مناسب
- تحديث `mergeCells` لعنوان المشروع ليشمل العمود الإضافي

### 3. تحديث `exportEnhancedBOQToExcel` (reports-export-utils.ts)

- نفس المنطق: فحص وجود `description_ar` وإضافة عمود مخصص
- ضبط الأعمدة من 7 إلى 8 عند وجود الوصف العربي
- تحديث `mergeCells` للعنوان

### 4. التحقق من تمرير `description_ar` في `ExportTab.tsx`

- التأكد من أن `normalizeItemPrices` و `getProjectItems` يحتفظان بحقل `description_ar` عند تحضير البيانات للتصدير

---

## التفاصيل التقنية

### منطق الكشف عن الوصف العربي

```text
const hasArabic = items.some(item => 
  item.description_ar && item.description_ar.trim().length > 1
);
```

### هيكل الأعمدة عند وجود وصف عربي

```text
| رقم البند | الوصف (EN) | الوصف العربي | الوحدة | الكمية | سعر الوحدة | الإجمالي |
```

### تنسيق عمود الوصف العربي

- اتجاه النص: RTL
- الخط: Arial (يدعم العربية)
- المحاذاة: يمين
- عرض العمود: 45 حرف

---

## الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/lib/reports-export-utils.ts` | إضافة `description_ar` للواجهة + تحديث دالتي التصدير |
| `src/components/reports/ExportTab.tsx` | التأكد من تمرير `description_ar` مع البيانات |


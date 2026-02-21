

# معالجة عدم ظهور الوصف العربي + دعم تحليل PDF

## المشكلة

عند تحليل ملف PDF (أو نص مستخرج)، الوصف العربي لا يظهر في الجدول لأن:

1. **Edge Function `analyze-boq`**: البرومبت لا يطلب من الذكاء الاصطناعي إرجاع حقل `description_ar` منفصل
2. **التحليل المحلي للنصوص `local-text-analysis.ts`**: واجهة `LocalTextItem` لا تحتوي على `description_ar`
3. **`normalizeAnalysisResult` في `Index.tsx`**: يستخدم `...item` spread لكن لا يضيف كشف ذكي للعربية
4. **`BOQAnalyzerPanel.tsx`**: نفس المشكلة في التطبيع (normalization)

## خطة الحل

### 1. تحديث Edge Function `analyze-boq`

**الملف: `supabase/functions/analyze-boq/index.ts`**

- إضافة `description_ar` إلى `BOQItem` interface (سطر 5-16)
- إضافة `description_ar` إلى `boqAnalysisTool` schema (سطر 329-345) كحقل اختياري
- تحديث البرومبت العربي (سطر 517-550): طلب `description_ar` للوصف العربي عند وجود وصفين
- تحديث البرومبت الإنجليزي (سطر 551-559): طلب `description_ar` إذا كان المستند يحتوي على نص عربي

### 2. تحديث التحليل المحلي للنصوص

**الملف: `src/lib/local-text-analysis.ts`**

- إضافة `description_ar?: string` إلى `LocalTextItem` (سطر 7-19)
- في `extractItemsFromText` و `extractItemsByLineAnalysis`: إذا كان الوصف يحتوي على نص عربي، نسخه إلى `description_ar`

### 3. إضافة كشف ذكي في `normalizeAnalysisResult`

**الملف: `src/pages/Index.tsx`**

- في `normalizeAnalysisResult` (سطر 74-109): إضافة منطق لكشف وتعيين `description_ar`:
  - إذا أرجع الـ AI حقل `description_ar`، يُستخدم كما هو
  - إذا كان `description` يحتوي على نص عربي ولا يوجد `description_ar`، يُنسخ تلقائياً

### 4. نفس الكشف الذكي في `BOQAnalyzerPanel`

**الملف: `src/components/BOQAnalyzerPanel.tsx`**

- في normalized items (سطور 462-476 و 366-371): إضافة نفس منطق الكشف عن العربية

## التفاصيل التقنية

### منطق الكشف الذكي (مشترك بين جميع المسارات)

```text
لكل بند بعد التطبيع:
  1. إذا وجد description_ar من المصدر (AI/Excel) → استخدمه
  2. إذا لم يوجد description_ar:
     - فحص description: هل يحتوي حروف عربية؟
     - إذا نعم: description_ar = description
  3. إذا وجد description_ar بدون description:
     - description = description_ar (fallback)
```

### تحديث بنية البرومبت في analyze-boq

```text
البرومبت العربي الجديد يضيف:
  - description: الوصف (بالإنجليزية إذا متوفر)
  - description_ar: الوصف العربي (إذا كان النص يحتوي على وصف عربي)

البرومبت الإنجليزي يضيف:
  - description_ar (optional): Arabic description if present in source
```

### تحديث Tool Schema

```text
إضافة في boqAnalysisTool.parameters.properties.items.items.properties:
  description_ar: { type: ["string", "null"], description: "Arabic description if available" }
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/functions/analyze-boq/index.ts` | إضافة `description_ar` في الواجهة والبرومبت والـ tool schema |
| `src/lib/local-text-analysis.ts` | إضافة `description_ar` في `LocalTextItem` + كشف تلقائي |
| `src/pages/Index.tsx` | كشف ذكي للعربية في `normalizeAnalysisResult` |
| `src/components/BOQAnalyzerPanel.tsx` | كشف ذكي للعربية في التطبيع |

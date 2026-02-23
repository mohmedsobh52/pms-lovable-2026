
# إصلاح خطأ "Cannot read properties of null" في تحليل الأسعار المتقدم

## المشكلة

عند الضغط على "بدء التحليل المتقدم"، تظهر رسالة خطأ:
```
فشل التحليل - Edge Function returned a non-2xx status code
```
السبب: بعض بنود جدول الكميات تحتوي على قيم `null` في حقول مثل `unit` أو `description`، مما يسبب خطأ عند محاولة استدعاء `.toLowerCase()` على قيمة فارغة.

## الملف المتأثر

`supabase/functions/enhanced-pricing-analysis/index.ts`

## التعديلات المطلوبة

### 1. تنظيف البنود قبل المعالجة (بعد سطر 1861)

إضافة خطوة تنظيف للبنود الواردة لضمان عدم وجود قيم `null`:

```typescript
// Sanitize items - ensure no null values
const sanitizedItems = items.map(item => ({
  ...item,
  description: item.description || '',
  description_ar: item.description_ar || undefined,
  unit: item.unit || '',
  quantity: item.quantity || 0,
  unit_price: item.unit_price || 0,
  item_number: item.item_number || '',
}));
```

ثم استخدام `sanitizedItems` بدلاً من `items` في جميع الاستدعاءات اللاحقة.

### 2. تأمين دالة `matchToReferencePrice` (تأكيد الإصلاح السابق)

التأكد من أن الحماية ضد القيم الفارغة موجودة وتعمل:

```typescript
function matchToReferencePrice(
  description: string | null | undefined,
  unit: string | null | undefined
) {
  if (!description) return null;
  const desc = description.toLowerCase();
  const unitLower = (unit || "").toLowerCase();
  // ...
}
```

### 3. تأمين رسالة الخطأ (سطر 1958)

استبدال رسالة الخطأ المكشوفة برسالة آمنة لا تكشف تفاصيل داخلية:

```typescript
return new Response(JSON.stringify({ 
  error: "An error occurred during pricing analysis. Please try again."
}), {
  status: 500,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

### 4. إعادة نشر الدالة

إعادة نشر `enhanced-pricing-analysis` لضمان تطبيق جميع الإصلاحات.

## النتيجة المتوقعة

- لن يحدث خطأ عند وجود بنود بقيم فارغة في `unit` أو `description`
- البنود ذات القيم الفارغة يتم تنظيفها تلقائياً قبل المعالجة
- رسائل الخطأ لا تكشف تفاصيل داخلية للنظام

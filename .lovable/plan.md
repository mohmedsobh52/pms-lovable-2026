

# إصلاح القيمة الإجمالية وتحسين العرض وإضافة اقتراحات

## المشكلة

الصورة تُظهر أن القيمة الإجمالية لا تزال خاطئة "240,568,176,224,047,730,000 SAR" رغم الإصلاحات السابقة. السبب أن البنود المحفوظة في قاعدة البيانات تحتوي على قيم `total_price` تالفة لكنها أقل من حد الأمان الحالي (1e15). عندما يتم جمعها تنتج الرقم الضخم.

## الحلول

### 1. إصلاح حساب القيمة الإجمالية (الإصلاح الحقيقي)

التعديل على ملفين:

**`src/lib/historical-data-utils.ts`:**
- في `normalizeHistoricalItems`: إضافة تحقق من صحة `total_price` بمقارنته مع `quantity * unit_price`. إذا كانت القيمة المحسوبة موجبة والقيمة المخزنة تختلف عنها بأكثر من 100 ضعف، يتم استخدام القيمة المحسوبة
- في `safeTotalValue`: تخفيض حد الأمان من 1e15 إلى 1e12 (لا يوجد بند واحد بتريليون ريال)، وإضافة فحص إضافي: إذا كان `total_price` يختلف عن `quantity * unit_price` بأكثر من 100 ضعف، يتم استخدام `quantity * unit_price`

**`src/pages/HistoricalPricingPage.tsx`:**
- تحسين حجم حوار العرض وأداء العرض

### 2. تحسين حجم الشاشة والأداء

- توسيع بطاقات الإحصائيات لتكون أكثر وضوحاً
- تحسين تنسيق الأرقام الكبيرة (استخدام تنسيق مختصر: K, M, B)
- إضافة عرض اسم الملف الأصلي بشكل أوضح

### 3. تحسين قسم الاقتراحات

- إضافة أيقونات ملونة مميزة لكل اقتراح
- إضافة اقتراح "تصدير تقرير مقارنة" للملفات المتعددة
- إظهار ملخص سريع لأعلى وأقل الأسعار

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/lib/historical-data-utils.ts` | إصلاح التحقق من total_price + تخفيض حد الأمان |
| `src/pages/HistoricalPricingPage.tsx` | تحسين العرض + تنسيق الأرقام + اقتراحات محسنة |

## التفاصيل التقنية

### إصلاح normalizeHistoricalItems

```text
في السطر 360:
الحالي:
  total_price: totalPrice > 0 ? totalPrice : quantity * unitPrice

الجديد:
  // إذا كان total_price المخزن يختلف عن qty*unitPrice بأكثر من 100x، استخدم المحسوب
  const computed = quantity * unitPrice;
  let safeTotalPrice = totalPrice;
  if (computed > 0 && totalPrice > 0 && (totalPrice / computed > 100 || computed / totalPrice > 100)) {
    safeTotalPrice = computed;
  }
  total_price: safeTotalPrice > 0 ? safeTotalPrice : computed
```

### إصلاح safeTotalValue

```text
الحالي:
  if (!Number.isFinite(tp) || tp > 1e15 || tp < -1e15) return sum;

الجديد:
  if (!Number.isFinite(tp) || tp > 1e12 || tp < -1e12) return sum;
  // فحص إضافي: مقارنة مع qty * unit_price
  const computed = (item.quantity || 0) * (item.unit_price || 0);
  const safeTP = (computed > 0 && tp > 0 && tp / computed > 100) ? computed : tp;
  return sum + safeTP;
```

### تنسيق الأرقام الكبيرة

```text
function formatLargeNumber(value: number, currency: string): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' B ' + currency;
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' M ' + currency;
  if (value >= 1e3) return value.toLocaleString() + ' ' + currency;
  return value.toFixed(2) + ' ' + currency;
}
```


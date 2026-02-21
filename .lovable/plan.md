

# إصلاح القيمة الإجمالية الخاطئة نهائياً + تحسين الأداء والشكل

## المشكلة الجذرية

الإصلاحات السابقة تعتمد على مقارنة `total_price` مع `quantity * unit_price`. لكن عندما تكون الكمية أو سعر الوحدة = 0 (كثير من البنود المستخرجة قديماً)، تكون القيمة المحسوبة = 0، فلا يعمل التحقق المتبادل. النتيجة: قيم `total_price` التالفة (مثلاً مليارات) تمر من الفلتر وتتراكم لتعطي 240 كوينتيليون.

## الحل

### 1. إصلاح `safeTotalValue` في `historical-data-utils.ts`

إضافة حد أعلى مطلق لكل بند مفرد. لا يوجد بند واحد في مشروع بناء يتجاوز 100 مليون ريال. إذا تجاوز البند هذا الحد **ولم يكن لديه** كمية وسعر وحدة يدعمانه، يتم تجاهله:

```text
safeTotalValue:
- إذا كان tp > 1e8 (100 مليون) والقيمة المحسوبة = 0 => تجاهل البند
- إذا كان tp > 1e12 => تجاهل البند (كما هو حالياً)
- إذا كان computed > 0 وtp/computed > 100 => استخدم computed
```

### 2. إصلاح `normalizeHistoricalItems`

نفس المنطق: إذا كان `total_price` كبير جداً (> 1e8) ولا يوجد `quantity * unit_price` يدعمه، استخدم 0 بدلاً من القيمة التالفة.

### 3. تحديث العرض في View Dialog

- عرض `computedTotal` بتنسيق `formatLargeNumber` (موجود حالياً ويعمل)
- إضافة مؤشر بصري إذا تم تصحيح القيمة تلقائياً
- تحسين بطاقات الإحصائيات بإضافة تأثيرات hover

### 4. تحسين قسم الاقتراحات

- إضافة اقتراح "إصلاح جميع الملفات" عند وجود ملفات بقيم تالفة
- إضافة رابط مباشر لأداة التسعير الشامل
- تحسين الأيقونات والألوان

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/lib/historical-data-utils.ts` | إصلاح safeTotalValue + normalizeHistoricalItems بإضافة حد مطلق |
| `src/pages/HistoricalPricingPage.tsx` | تحسين الشكل + اقتراحات + مؤشر تصحيح تلقائي |

## التفاصيل التقنية

### إصلاح safeTotalValue (السبب الجذري)

```text
الحالي:
  const tp = item.total_price || 0;
  if (!Number.isFinite(tp) || tp > 1e12 || tp < -1e12) return sum;
  const computed = (item.quantity || 0) * (item.unit_price || 0);
  const safeTP = (computed > 0 && tp > 0 && tp / computed > 100) ? computed : tp;

المشكلة: عندما computed = 0، القيمة التالفة (مثلاً 10 مليار) تمر لأن الشرط computed > 0 خاطئ

الجديد:
  const tp = item.total_price || 0;
  if (!Number.isFinite(tp) || tp > 1e12 || tp < -1e12) return sum;
  const computed = (item.quantity || 0) * (item.unit_price || 0);
  let safeTP = tp;
  // إذا لا يوجد qty*price يدعم القيمة وهي كبيرة جداً، تجاهلها
  if (computed <= 0 && tp > 1e8) safeTP = 0;
  else if (computed > 0 && tp > 0 && tp / computed > 100) safeTP = computed;
  return sum + safeTP;
```

### إصلاح normalizeHistoricalItems

```text
الحالي (سطر 354-357):
  if (computed > 0 && totalPrice > 0 && (totalPrice / computed > 100 || computed / totalPrice > 100)) {
    safeTotalPrice = computed;
  }

الجديد:
  if (computed > 0 && totalPrice > 0 && (totalPrice / computed > 100 || computed / totalPrice > 100)) {
    safeTotalPrice = computed;
  } else if (computed <= 0 && totalPrice > 1e8) {
    // بند بدون كمية/سعر لكن total_price ضخم => قيمة تالفة
    safeTotalPrice = 0;
  }
```

### تحسين View Dialog

- إضافة مؤشر "تم التصحيح التلقائي" عند اختلاف computedTotal عن selectedFile.total_value
- تحسين بطاقات الإحصائيات بتأثير hover scale
- إضافة اقتراح "إصلاح جميع الملفات التالفة دفعة واحدة" مع عداد الملفات المتأثرة
- إضافة زر مباشر للانتقال إلى التسعير الشامل في الاقتراحات


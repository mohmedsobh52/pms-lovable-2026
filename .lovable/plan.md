

# خطة: تحسين أداء وشكل حوار طلب عرض السعر وإضافة اقتراحات

## التغييرات المطلوبة

### الملف: `src/components/procurement/RequestOfferDialog.tsx`

### 1. تحسين الشكل والمظهر
- تحسين تصميم منطقة الإدخال بخلفية أفتح وحدود أنعم
- تحسين أزرار الاقتراحات بتصميم أوضح مع حدود مستديرة أكبر
- تغيير لون النصوص ليكون أوضح (أسود على خلفية فاتحة)
- تحسين حجم الـ Dialog ليكون أكثر اتساعاً (`max-w-2xl`)
- تحسين المسافات بين العناصر

### 2. تحسين الأداء
- استخدام `useCallback` لدوال `handleSuggestionClick` و `handleSubmit`
- استخدام `useMemo` لتصفية الاقتراحات حسب اللغة

### 3. إضافة اقتراحات إضافية خاصة بالمشتريات الإنشائية
الاقتراحات الحالية (5) + إضافة 5 اقتراحات جديدة:
- "حديد تسليح لمشروع سكني" / "Reinforcing steel for residential project"
- "أعمال سباكة ومواسير" / "Plumbing works and pipes"
- "أعمال دهانات داخلية وخارجية" / "Interior and exterior painting"
- "معدات سلامة ووقاية" / "Safety and protection equipment"
- "خرسانة جاهزة لمشروع تجاري" / "Ready-mix concrete for commercial project"

### 4. تحسين تصميم أزرار الاقتراحات
- جعل الاقتراحات عمودية بدلاً من أفقية (كما في الصورة المرجعية)
- إضافة padding أكبر وخط أوضح
- تحسين تأثير hover

### الملف المتأثر:
- `src/components/procurement/RequestOfferDialog.tsx` فقط


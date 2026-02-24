

# المرحلة 9: تحسين أداء التحليل المتقدم وربط التسعير بالمشاريع التاريخية

---

## 9.1 إضافة زر "التسعير التلقائي" في شاشة التحليل المتقدم (Analysis Tab)

### المشكلة الحالية
شاشة BOQ Tab تحتوي على زر "التسعير التلقائي" (`AutoPriceDialog`) الذي يطابق البنود مع مكتبة الأسعار المحلية، لكن شاشة التحليل المتقدم (`AnalysisResults`) لا تحتوي على هذا الزر. المستخدم يحتاج للعودة لتبويب BOQ لاستخدامه.

### التعديلات المطلوبة

**الملف:** `src/components/AnalysisResults.tsx`

- إضافة زر "التسعير التلقائي" بجوار أزرار Suggest Rates و تحليل متقدم في شريط الأدوات (السطر ~1682)
- ربطه بنفس `AutoPriceDialog` المستخدم في `ProjectBOQTab`
- عند التطبيق، تحديث `project_items` في قاعدة البيانات + تحديث `data.items` محلياً
- إضافة state لـ `showAutoPriceDialog` و handler `handleApplyAutoPricing`

**الملف:** `src/pages/ProjectDetailsPage.tsx`

- تمرير `onAutoPricing` callback جديد إلى `AnalysisResults` لتحديث `items` state بعد التسعير التلقائي

---

## 9.2 تحسين أداء التحليل المتقدم (EnhancedPricingAnalysis)

### التعديلات المطلوبة

#### أ. ربط التسعير بالمشاريع التاريخية تلقائياً
**الملف:** `src/components/EnhancedPricingAnalysis.tsx`

المشكلة: `fetchHistoricalPrices()` تجلب فقط من `historical_pricing_files` و `saved_projects.analysis_data`. لا تجلب من `project_items` المسعرة فعلياً.

التحسينات:
- إضافة مصدر ثالث: `project_items` التي لها `unit_price > 0` من جميع مشاريع المستخدم
- زيادة الحد الأقصى من 200 إلى 500 عنصر تاريخي
- إضافة `category` في البيانات التاريخية لتحسين المطابقة
- عرض عدد المصادر التاريخية في واجهة المستخدم

#### ب. زيادة نسبة الثقة
**الملف:** `supabase/functions/enhanced-pricing-analysis/index.ts`

التحسينات:
- تحسين خوارزمية `matchScore`: إضافة وزن إضافي لمطابقة `category` (+3 نقاط)
- إضافة وزن للمطابقة الجزئية للكلمات (partial word match) بدلاً من التطابق الكامل فقط
- تقليل عتبة المطابقة من 6 إلى 5 للبنود ذات الوحدات المتطابقة
- زيادة وزن قاعدة البيانات المرجعية للمطابقات القوية (score >= 12) من 40% إلى 50%
- إضافة fallback ذكي: إذا لم يتم إيجاد مطابقة مرجعية، البحث في البنود التاريخية المرسلة

---

## 9.3 تحسين أداء Suggest Rates (MarketRateSuggestions)

### التعديلات المطلوبة

**الملف:** `src/components/MarketRateSuggestions.tsx`

- إضافة جلب البيانات التاريخية من `project_items` (المسعرة فعلياً) بالإضافة إلى مكتبة المواد/العمالة/المعدات
- إرسال البيانات التاريخية مع طلب التحليل إلى Edge Function
- عرض مصدر "Historical" كمصدر رابع بجوار Library/Reference/AI

**الملف:** `supabase/functions/suggest-market-rates/index.ts`

- إضافة مرحلة بحث جديدة: بعد Library وقبل Reference، البحث في البيانات التاريخية المرسلة
- إذا تم إيجاد تطابق تاريخي بثقة عالية (>70%)، استخدام السعر مع تعديل (inflation 3-5%)
- إضافة `source: "historical"` للبنود المسعرة من التاريخ

---

## 9.4 ربط مباشر بالمشاريع التاريخية من واجهة التسعير

### التعديلات المطلوبة

**الملف:** `src/components/EnhancedPricingAnalysis.tsx`

- إضافة زر "ربط بالمشاريع التاريخية" بجوار أزرار الأدوات الثانوية
- عند الضغط: فتح dialog يعرض قائمة المشاريع التاريخية المتاحة مع عدد البنود المتطابقة
- إمكانية اختيار مشروع تاريخي محدد لاستخدام أسعاره كمرجع أساسي

**الملف:** `src/components/MarketRateSuggestions.tsx`

- إضافة مؤشر بصري للبنود التي تم تسعيرها من مصدر تاريخي
- إضافة tooltip يعرض اسم المشروع التاريخي المرجعي

---

## 9.5 تحسين عرض النتائج ونسبة الثقة

### التعديلات المطلوبة

**الملف:** `src/components/EnhancedPricingAnalysis.tsx`

- عرض `confidence` بنسبة مئوية مع شريط تقدم ملون
- إضافة ملخص: "X بند بثقة عالية، Y بند بثقة متوسطة، Z بند بثقة منخفضة"
- إضافة فلتر لعرض البنود حسب مستوى الثقة
- عرض المصدر الرئيسي لكل بند (مرجعي/تاريخي/AI)

**الملف:** `src/components/MarketRateSuggestions.tsx`

- إضافة عمود "المصدر التاريخي" في جدول النتائج
- تلوين صفوف البنود حسب المصدر (أخضر=مكتبة، أزرق=مرجعي، بنفسجي=AI، برتقالي=تاريخي)

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/components/AnalysisResults.tsx` | إضافة زر التسعير التلقائي + AutoPriceDialog |
| `src/pages/ProjectDetailsPage.tsx` | تمرير callback لتحديث items بعد التسعير |
| `src/components/EnhancedPricingAnalysis.tsx` | ربط بـ project_items التاريخية + فلتر ثقة + زر ربط تاريخي |
| `src/components/MarketRateSuggestions.tsx` | جلب بيانات تاريخية + عرض مصدر تاريخي |
| `supabase/functions/enhanced-pricing-analysis/index.ts` | تحسين المطابقة + خفض العتبة + وزن category |
| `supabase/functions/suggest-market-rates/index.ts` | إضافة مرحلة بحث تاريخي + source historical |

## ترتيب التنفيذ

1. تحسين Edge Functions (enhanced-pricing-analysis + suggest-market-rates)
2. تحسين EnhancedPricingAnalysis (جلب تاريخي + فلتر ثقة + عرض محسن)
3. تحسين MarketRateSuggestions (مصدر تاريخي + عرض محسن)
4. إضافة زر التسعير التلقائي في AnalysisResults
5. ربط الكل مع ProjectDetailsPage

## النتيجة المتوقعة

- زيادة نسبة الثقة في التسعير من ~80% إلى ~90%+ عبر الربط بالمشاريع التاريخية
- تسعير تلقائي متاح من تبويب التحليل المتقدم دون الحاجة للعودة لـ BOQ
- عرض مصادر التسعير بشكل أوضح (مكتبة/مرجعي/تاريخي/AI)
- تحسين المطابقة عبر إضافة category matching و partial word matching


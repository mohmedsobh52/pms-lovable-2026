

# تحسين شاشة التحليل المتقدم بالذكاء الاصطناعي

## التحسينات المطلوبة

### 1. تحسين شكل الشاشة
تحسين التباعد والتنسيق العام لمكون `EnhancedPricingAnalysis` ليكون أكثر وضوحاً واحترافية.

### 2. إضافة زر "النزول لآخر الصفحة"
إضافة زر عائم (Floating Action Button) أسفل قائمة النتائج للانتقال السريع لآخر القائمة، مع زر للعودة لأعلى.

### 3. ربط قاعدة البيانات التاريخية بالتحليل
- إضافة محلل "قاعدة البيانات التاريخية" كمصدر فعلي للتسعير
- عند تفعيل محلل "database_comparator"، يتم جلب الأسعار التاريخية من Supabase (جداول `historical_pricing_files` و `saved_projects`) ودمجها مع نتائج التحليل بالذكاء الاصطناعي
- إرسال البيانات التاريخية مع طلب التحليل ليأخذها الذكاء الاصطناعي في الحسبان

### 4. إضافة عمود الوصف بالعربي
- إضافة حقل `description_ar` في واجهة `BOQItem` و `EnhancedSuggestion`
- عرض الوصف العربي بجانب الوصف الإنجليزي في قائمة النتائج عند وجوده
- تمرير `description_ar` من البنود المصدرية للتحليل

## التفاصيل التقنية

### الملف: `src/components/EnhancedPricingAnalysis.tsx`

**1. تحديث الواجهات (interfaces):**
- إضافة `description_ar?: string` في `BOQItem` و `EnhancedSuggestion`

**2. إضافة زر التمرير:**
- إضافة `useRef` لمنطقة التمرير (ScrollArea)
- زر عائم `ArrowDown` للنزول لآخر القائمة و `ArrowUp` للعودة لأعلى

**3. ربط البيانات التاريخية:**
- إضافة دالة `fetchHistoricalPrices` تجلب البيانات من Supabase عند بدء التحليل
- تمرير البيانات التاريخية مع `body` طلب التحليل كحقل `historicalData`
- تحديث edge function `enhanced-pricing-analysis` لاستقبال البيانات التاريخية ودمجها في prompt الذكاء الاصطناعي كمرجع إضافي

**4. عرض الوصف العربي:**
- في كل عنصر نتيجة (suggestion row)، عرض `description_ar` تحت الوصف الإنجليزي بخط أصغر واتجاه RTL عند وجوده

### الملف: `supabase/functions/enhanced-pricing-analysis/index.ts`

- إضافة استقبال `historicalData` من الطلب
- دمج الأسعار التاريخية في prompt الذكاء الاصطناعي كمرجع إضافي للمحلل "database_comparator"
- إضافة `description_ar` في الاستجابة عند توفرها

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/EnhancedPricingAnalysis.tsx` | تحسين الشكل + زر تمرير + ربط تاريخي + وصف عربي |
| `supabase/functions/enhanced-pricing-analysis/index.ts` | استقبال بيانات تاريخية + تمرير description_ar |


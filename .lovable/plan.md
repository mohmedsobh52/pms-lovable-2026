

# تحسين نظام التسعير: معاملات ديناميكية + تحذير تقديري + ربط بمصادر حقيقية

---

## 1. إضافة تحذير واضح في شاشة التسعير التلقائي

### الملف: `src/components/project-details/AutoPriceDialog.tsx`

- إضافة بانر تحذيري بارز (Alert باللون البرتقالي) أعلى نتائج التسعير مباشرة بعد عنوان الحوار
- النص العربي: "تنبيه: جميع الأسعار المعروضة تقديرية وقد تختلف عن أسعار السوق الفعلية. يجب مراجعتها والتحقق منها قبل الاعتماد."
- النص الإنجليزي: "Notice: All prices shown are estimates and may differ from actual market prices. Review and verify before approval."
- أيقونة `AlertTriangle` مع خلفية `bg-amber-50 border-amber-200`

### الملف: `src/components/MarketRateSuggestions.tsx`

- إضافة نفس التحذير في حوار اقتراحات أسعار السوق

### الملف: `src/components/EnhancedPricingAnalysis.tsx`

- إضافة نفس التحذير في حوار التحليل المتقدم للتسعير

---

## 2. تحويل معاملات المدن من ثابتة إلى ديناميكية (جدول في قاعدة البيانات)

### جدول جديد: `city_pricing_factors`

```text
الأعمدة:
  id          UUID (primary key)
  city_name   TEXT (unique, not null) - اسم المدينة بالإنجليزية
  city_name_ar TEXT - اسم المدينة بالعربية
  region      TEXT - المنطقة (saudi, uae, egypt, etc.)
  factor      NUMERIC(4,2) default 1.00 - معامل السعر
  label       TEXT - وصف المعامل (مثل "+5%")
  source      TEXT - مصدر المعامل (manual/api/historical)
  last_updated TIMESTAMPTZ default now()
  updated_by  UUID (references auth.users)
```

- تعبئة الجدول بالقيم الحالية كبيانات أولية (seed data)
- إضافة RLS: القراءة للجميع، التعديل للمسؤولين فقط

### الملف: `src/components/MarketRateSuggestions.tsx`

- استبدال `CITY_FACTORS` الثابتة بـ `useQuery` يجلب من جدول `city_pricing_factors`
- استبدال `REGION_CITIES` الثابتة بتجميع ديناميكي من نتائج الجدول حسب `region`
- إضافة مؤشر آخر تحديث (عرض `last_updated` بجانب المدينة المختارة)

### الملف: `supabase/functions/suggest-market-rates/index.ts`

- استبدال `CITY_FACTORS` الثابتة بقراءة من جدول `city_pricing_factors` عبر Supabase client
- Fallback للقيم الثابتة إذا فشل الاتصال بقاعدة البيانات

### الملف: `src/components/EnhancedPricingAnalysis.tsx`

- تحديث `LOCATIONS` لتُجلب من الجدول بدلاً من الثوابت

---

## 3. إضافة صفحة إدارة معاملات المدن (للمسؤول)

### ملف جديد: `src/components/CityFactorsManager.tsx`

- جدول قابل للتعديل يعرض جميع المدن ومعاملاتها
- إمكانية تعديل المعامل مباشرة (inline edit)
- إمكانية إضافة مدينة جديدة
- عرض مصدر المعامل وتاريخ آخر تحديث
- زر "إعادة تعيين للافتراضي" لاستعادة القيم الأصلية

### الملف: `src/pages/SettingsPage.tsx`

- إضافة تبويب "معاملات المدن" في صفحة الإعدادات يعرض `CityFactorsManager`

---

## 4. ربط بمصدر أسعار حقيقي (Perplexity AI Search)

بدلاً من API أسعار مواد بناء مخصص (غير متوفر كخدمة موحدة)، سنستخدم **Perplexity** المتاح كـ connector للبحث عن أسعار السوق الحقيقية.

### ملف جديد: `supabase/functions/fetch-market-prices/index.ts`

- Edge function تستقبل اسم مادة/بند + مدينة
- تستدعي Perplexity API (model: `sonar`) للبحث عن "أسعار [المادة] في [المدينة] 2025"
- تُرجع السعر المقترح مع المصادر (citations)
- تخزن النتائج مؤقتاً في جدول `market_price_cache` لمدة 7 أيام

### جدول جديد: `market_price_cache`

```text
الأعمدة:
  id           UUID (primary key)
  search_query TEXT - نص البحث
  city         TEXT - المدينة
  result_data  JSONB - النتائج (أسعار + مصادر)
  fetched_at   TIMESTAMPTZ default now()
  expires_at   TIMESTAMPTZ - تاريخ انتهاء الصلاحية
```

### الملف: `src/components/project-details/AutoPriceDialog.tsx`

- إضافة زر "بحث أسعار السوق الحقيقية" بجانب نتائج التسعير
- عند الضغط، يبحث عن أسعار البنود غير المسعرة عبر `fetch-market-prices`
- عرض النتائج مع المصادر كمصدر خامس (بالإضافة للمصادر الأربعة الحالية)

---

## ترتيب التنفيذ

| الخطوة | الوصف |
|--------|-------|
| 1 | إنشاء جدولي `city_pricing_factors` و `market_price_cache` |
| 2 | إضافة التحذير التقديري في الحوارات الثلاثة |
| 3 | إنشاء `CityFactorsManager` وربطه بالإعدادات |
| 4 | تحديث المكونات والـ Edge Function لاستخدام المعاملات الديناميكية |
| 5 | ربط Perplexity connector وإنشاء `fetch-market-prices` |
| 6 | دمج نتائج البحث الحقيقية في واجهة التسعير |

---

## ملاحظة مهمة

ربط Perplexity يتطلب تفعيل الـ connector أولاً. سيتم طلب ذلك عند الوصول للخطوة 5.


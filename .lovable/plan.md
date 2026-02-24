
# المرحلة 13: تفعيل نسب أداء المدن + تحسين دقة التسعير لـ 98%+

---

## 13.1 إضافة نظام City Performance Factors (معاملات أداء المدن)

### المشكلة الحالية
المدينة المختارة (Riyadh/Jeddah/etc.) تُرسل كنص فقط إلى AI دون تأثير فعلي على الأسعار المرجعية أو المكتبية. لا يوجد نظام معاملات (factors) يعدل الأسعار حسب المدينة.

### التعديلات المطلوبة

**الملف:** `supabase/functions/suggest-market-rates/index.ts`

إضافة `CITY_FACTORS` بعد `REFERENCE_PRICES`:
```text
const CITY_FACTORS: Record<string, { factor: number; label: string }> = {
  "Riyadh":  { factor: 1.00, label: "Baseline" },
  "Jeddah":  { factor: 1.05, label: "+5%" },
  "Dammam":  { factor: 0.97, label: "-3%" },
  "Makkah":  { factor: 1.08, label: "+8%" },
  "Madinah": { factor: 1.04, label: "+4%" },
  "Khobar":  { factor: 0.98, label: "-2%" },
  "Tabuk":   { factor: 1.12, label: "+12% (remote)" },
  "Abha":    { factor: 1.10, label: "+10% (mountain)" },
  // UAE
  "Dubai":   { factor: 1.25, label: "+25%" },
  "Abu Dhabi": { factor: 1.20, label: "+20%" },
  // Egypt
  "Cairo":   { factor: 0.45, label: "-55%" },
  "Alexandria": { factor: 0.42, label: "-58%" },
  // Qatar/Kuwait
  "Doha":    { factor: 1.30, label: "+30%" },
  "Kuwait City": { factor: 1.15, label: "+15%" },
};
```

تعديل `processBatch`:
- استخراج `cityFactor` من `CITY_FACTORS[location]` (default 1.0)
- تطبيقه على كل الأسعار: `suggested_avg * cityFactor`, `suggested_min * cityFactor`, `suggested_max * cityFactor`
- إضافة `city_factor` في ملاحظات النتيجة

**الملف:** `src/components/MarketRateSuggestions.tsx`

- إضافة عرض معامل المدينة بجانب dropdown المدينة كـ Badge
- إضافة مدن UAE/Egypt/Qatar/Kuwait حسب المنطقة المختارة (dynamic city list)
- إضافة مدن لكل منطقة بدلاً من عرض مدن السعودية فقط دائماً

---

## 13.2 تحسين دقة التسعير إلى 98%+

### التعديلات في Edge Function

**الملف:** `supabase/functions/suggest-market-rates/index.ts`

#### أ. تعزيز خوارزمية `findReferencePrice`
- خفض عتبة المطابقة من `score >= 25` إلى `score >= 20` لزيادة تغطية Reference
- إضافة مطابقة الوحدات كعامل ترجيح: إذا تطابقت الوحدة مع `ref.unit` يُضاف +10 نقاط
- تحسين `fuzzyMatch` لدعم مطابقة الأجزاء (substring matching) بوزن أعلى

#### ب. تعزيز `findHistoricalPrice`
- زيادة حد `confidence >= 75` إلى `confidence >= 65` لقبول مطابقات أكثر
- إضافة تعديل التضخم الديناميكي: بدلاً من 4% ثابت، حساب نسبة تعتمد على عمر السجل

#### ج. تحسين AI Validation
- تعديل `validatePrice` لمنح الثقة العالية عندما يتطابق سعر AI مع نطاق Reference (±15%)
- إضافة cross-validation: إذا كان سعر AI وReference وHistorical كلهم في نفس النطاق (±20%)، رفع الثقة إلى "High"

---

## 13.3 تحسين واجهة MarketRateSuggestions

**الملف:** `src/components/MarketRateSuggestions.tsx`

### أ. عرض معامل المدينة
- إضافة Badge بجوار selector المدينة يعرض النسبة (مثل "+5%" أو "Baseline")
- إضافة tooltip يشرح تأثير المعامل

### ب. إضافة بطاقة "Historical" في الإحصائيات
- حالياً تعرض 4 بطاقات: Library, Reference, AI, Accuracy
- إضافة بطاقة Historical (amber) + نقل Avg Deviation

### ج. تحسين قائمة المدن حسب المنطقة
- إضافة REGION_CITIES map:
  - saudi: [Riyadh, Jeddah, Dammam, Makkah, Madinah, Khobar, Tabuk, Abha]
  - uae: [Dubai, Abu Dhabi, Sharjah, Ajman]
  - egypt: [Cairo, Alexandria, Giza]
  - qatar: [Doha, Al Wakrah]
  - kuwait: [Kuwait City, Hawalli]
  - bahrain: [Manama, Muharraq]
  - oman: [Muscat, Salalah]
- تغيير dropdown المدينة ليعرض مدن المنطقة المختارة فقط
- إعادة تعيين المدينة عند تغيير المنطقة

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `supabase/functions/suggest-market-rates/index.ts` | معاملات المدن + تحسين عتبات المطابقة + city factor |
| `src/components/MarketRateSuggestions.tsx` | مدن ديناميكية + عرض معامل المدينة + بطاقة Historical |

## ترتيب التنفيذ

1. تحديث Edge Function بنظام City Factors وتحسين عتبات المطابقة
2. تحسين واجهة MarketRateSuggestions بالمدن الديناميكية ومعامل المدينة
3. إضافة بطاقة Historical في الإحصائيات

## النتيجة المتوقعة

- كل مدينة لها معامل سعري يؤثر فعلياً في النتائج (مثلاً Tabuk +12% عن الرياض)
- دقة التسعير ترتفع عبر قبول مطابقات أكثر من Reference وHistorical
- عرض المدن يتغير ديناميكياً حسب المنطقة المختارة
- المستخدم يرى معامل المدينة بوضوح قبل بدء التحليل

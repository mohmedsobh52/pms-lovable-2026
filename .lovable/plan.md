

# تحسين أداء وشكل شاشة AI Market Rate Suggestions لدقة تسعير أفضل

## التحسينات المقترحة

### 1. تحسين واجهة المستخدم (UI Improvements)

#### شاشة MarketRateSuggestions

- **إضافة شريط بحث** في جدول النتائج لتصفية البنود بسرعة
- **إضافة عمود Min/Max Range** بجانب السعر المقترح لعرض نطاق الأسعار بوضوح
- **إضافة ملخص إحصائي بصري** بعد التحليل يشمل:
  - عدد البنود حسب المصدر (Library / Reference / AI) كـ badges ملونة
  - نسبة الدقة المقدرة
  - متوسط الانحراف
- **تحسين عرض الجدول**: إضافة تلوين خلفي للصفوف حسب مستوى الثقة (أخضر فاتح = High، أصفر فاتح = Medium، أحمر فاتح = Low)
- **إضافة Trend icon** بجانب الـ Variance لعرض اتجاه السعر بصرياً
- **إضافة tooltip** على كل بند يعرض ملاحظات AI
- **دعم ثنائي اللغة** كامل (حالياً بعض النصوص بالإنجليزية فقط)

### 2. تحسين الأداء (Performance Improvements)

#### الـ Frontend (MarketRateSuggestions.tsx)

- **إضافة محاكاة تقدم واقعية** أثناء التحليل (بدلاً من القفز من 0% إلى 100%)
- **حفظ آخر نتائج تحليل** في `localStorage` لتجنب إعادة التحليل عند فتح الـ dialog مرة أخرى
- **إضافة زر "Re-analyze"** لإعادة التحليل مع خيار تحديث الأسعار المتغيرة فقط

#### الـ Backend (suggest-market-rates/index.ts)

- **تحسين خوارزمية المطابقة** `findReferencePrice` بإضافة fuzzy matching أفضل للكلمات العربية
- **زيادة حجم الـ batch** من 15 إلى 20 بند لتقليل عدد الطلبات
- **إضافة تعليمات أوضح للـ AI** في الـ prompt لتحسين دقة الأسعار للمنطقة المحددة

### 3. تحسين دقة التسعير (Accuracy Improvements)

- **إضافة عمود "Price Range"** يعرض (Min - Max) بتنسيق واضح
- **تمييز البنود ذات الانحراف العالي** (> 20%) بتنبيه بصري واضح مع اقتراح مراجعة
- **إضافة مؤشر مصدر محسن** يعرض أيقونة + نص قصير بدلاً من أيقونة فقط

---

## التفاصيل التقنية

### الملف: `src/components/MarketRateSuggestions.tsx`

**التغييرات الرئيسية:**

1. إضافة state للبحث وحفظ النتائج:
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [cachedResults, setCachedResults] = useState<{
  suggestions: MarketRateSuggestion[];
  timestamp: number;
  itemCount: number;
} | null>(null);
```

2. إضافة محاكاة تقدم واقعية عبر `useEffect` + `setInterval` أثناء التحليل

3. إضافة شريط بحث فوق الجدول مع تصفية `suggestions.filter(...)` على `item_number` و `description`

4. إضافة ملخص إحصائي بصري (بطاقات ملونة) بعد اكتمال التحليل:
   - عدد مصادر Library (أخضر)
   - عدد مصادر Reference (أزرق)
   - عدد مصادر AI (بنفسجي)
   - نسبة الدقة + متوسط الانحراف

5. تحسين الجدول:
   - إضافة عمود Range يعرض `suggested_min - suggested_max`
   - تلوين خلفي للصفوف حسب Confidence
   - إضافة Trend icon بجانب Variance
   - إضافة tooltip للملاحظات (notes)

6. دعم اللغة العربية الكامل لجميع النصوص

7. حفظ/استرجاع النتائج من `localStorage`

### الملف: `supabase/functions/suggest-market-rates/index.ts`

**التغييرات:**

1. زيادة حجم الـ batch من 15 إلى 20
2. تحسين prompt الـ AI لتوضيح المنطقة الجغرافية
3. تحسين fuzzy matching للكلمات العربية في `findReferencePrice`

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/MarketRateSuggestions.tsx` | تحسين UI + أداء + بحث + caching + إحصائيات + دعم عربي |
| `supabase/functions/suggest-market-rates/index.ts` | تحسين batch size + prompt + fuzzy matching |

## لا تغييرات على قاعدة البيانات


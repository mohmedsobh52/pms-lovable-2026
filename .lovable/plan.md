
# خطة: تفعيل زر "Enhance with AI" وإضافة التحسينات

## المشكلة الحالية
زر "Enhance with AI" في مكون `BOQAnalyzerPanel.tsx` (سطر 745) موجود بصرياً لكنه **لا يحتوي على حدث onClick** - أي أنه زر ميت لا يفعل شيئاً عند الضغط عليه. كذلك في صفحة `Index.tsx`، حالة `showAIEnrichmentOption` تُفعّل لكن **لا يوجد زر مرئي** يستخدمها.

---

## 1. تفعيل زر "Enhance with AI" في BOQAnalyzerPanel.tsx

### إضافة دالة `handleAIEnrichment`
- تأخذ البنود الحالية من `analysisData.items`
- تعيد إرسالها إلى Edge Function `analyze-boq` مع `analysis_type: "extract_items"` لتحسين التصنيفات والأوصاف
- تُظهر مؤشر تحميل أثناء المعالجة
- تُحدّث `analysisData` بالنتائج المحسنة
- تُخفي خيار الإثراء بعد النجاح (`setShowAIEnrichmentOption(false)`)

### ربط الزر بالدالة
- إضافة `onClick={handleAIEnrichment}` و `disabled={isEnriching}` للزر
- إظهار spinner أثناء التحسين

---

## 2. إضافة نفس الزر في Index.tsx

### إضافة شريط التحسين بالذكاء الاصطناعي
- عرض Alert مشابه لـ BOQAnalyzerPanel عندما `showAIEnrichmentOption === true` و `analysisData` موجود
- إضافة نفس دالة `handleAIEnrichment` التي ترسل البنود لتحليل AI محسن
- الزر يظهر فوق نتائج التحليل مباشرة

---

## 3. تحسين الأداء والاقتراحات

### تحسينات إضافية على الزر
- إضافة toast إعلامي عند بدء التحسين
- إظهار عدد البنود المحسنة بعد الانتهاء مع نسبة التحسين
- تعطيل الزر تلقائياً إذا كانت جودة التحليل أعلى من 90%

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/components/BOQAnalyzerPanel.tsx` | إضافة `handleAIEnrichment` + ربط onClick للزر + حالة isEnriching |
| `src/pages/Index.tsx` | إضافة Alert + زر Enhance with AI + دالة handleAIEnrichment |

### منطق التحسين بالـ AI

```text
1. جمع البنود الحالية من analysisData.items
2. تحويلها لنص مُنسّق
3. إرسالها لـ analyze-boq مع analysis_type: "extract_items"
4. دمج النتائج: تحديث التصنيفات والأوصاف العربية
5. حساب نسبة التحسين وعرضها
6. إخفاء شريط الاقتراح
```

### حالة الزر

```text
عادي: "Enhance with AI" مع أيقونة Sparkles
أثناء التحميل: Loader2 spinner + "جاري التحسين..."
بعد النجاح: إخفاء الشريط + toast بالنتيجة
عند الخطأ: toast تحذيري مع إبقاء الزر متاحاً
```

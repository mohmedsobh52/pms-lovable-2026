

# تحليل المخاطر الأوتوماتيكي المرتبط بقائمة البنود BOQ

## الهدف

إضافة زر "تحليل مخاطر تلقائي" في شاشة إدارة المخاطر يقوم بـ:
1. قراءة بنود BOQ من المشاريع المحفوظة (`saved_projects.analysis_data`)
2. إرسال البنود إلى Lovable AI لتحليل المخاطر المحتملة
3. إنشاء مخاطر تلقائياً في جدول `risks` مرتبطة بالمشروع المحدد
4. عرض النتائج للمستخدم للمراجعة قبل الحفظ

---

## التغييرات المطلوبة

### 1. Edge Function جديدة: `supabase/functions/analyze-risks/index.ts`

تستقبل قائمة بنود BOQ وترسلها إلى Lovable AI Gateway (`google/gemini-3-flash-preview`) لتحليل المخاطر.

**المنطق:**
- تستقبل: `{ items: BOQItem[], projectName: string, language: "ar" | "en" }`
- ترسل prompt متخصص للذكاء الاصطناعي يطلب تحديد المخاطر بناءً على طبيعة البنود
- تستخدم tool calling لاستخراج structured output (عنوان، وصف، فئة، احتمالية، تأثير)
- ترجع: `{ risks: GeneratedRisk[] }`

### 2. مكون جديد: `src/components/AutoRiskAnalysis.tsx`

Dialog يتيح للمستخدم:
- اختيار مشروع محفوظ من `saved_projects`
- عرض عدد البنود المتاحة للتحليل
- زر "تحليل" يستدعي الـ Edge Function
- عرض المخاطر المكتشفة في جدول مع خيار تعديل/حذف قبل الحفظ
- زر "حفظ الكل" لإدراج المخاطر في جدول `risks`
- Progress bar أثناء التحليل

### 3. تعديل: `src/components/RiskManagement.tsx`

- إضافة زر "تحليل تلقائي" (AI Auto-Analysis) بجانب زر "إضافة خطر"
- استيراد وعرض مكون `AutoRiskAnalysis`
- تمرير `projectId` و callback لتحديث القائمة بعد الحفظ

---

## التفاصيل التقنية

### Edge Function: `analyze-risks`

```text
POST /analyze-risks
Body: { items: [{description, unit, quantity, unit_price}], projectName, language }
Response: { risks: [{title, description, category, probability, impact, mitigation}] }
```

- يستخدم `LOVABLE_API_KEY` (موجود تلقائياً)
- Model: `google/gemini-3-flash-preview`
- يستخدم tool calling لضمان structured output
- يتعامل مع أخطاء 429/402

### مكون `AutoRiskAnalysis`

| العنصر | الوظيفة |
|--------|---------|
| Select مشروع | يحمل المشاريع من `saved_projects` |
| ملخص البنود | عدد البنود، إجمالي القيمة |
| زر تحليل | يرسل البنود للـ AI |
| جدول نتائج | يعرض المخاطر المكتشفة مع checkbox للتحديد |
| زر حفظ | يحفظ المخاطر المحددة في `risks` |

### تعديل `RiskManagement`

- إضافة state: `showAutoAnalysis`
- إضافة زر بأيقونة `Brain` بجانب زر `+ Add Risk`
- عرض `AutoRiskAnalysis` dialog عند الضغط

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/functions/analyze-risks/index.ts` | جديد - Edge Function للتحليل بالذكاء الاصطناعي |
| `src/components/AutoRiskAnalysis.tsx` | جديد - واجهة التحليل التلقائي |
| `src/components/RiskManagement.tsx` | تعديل - إضافة زر التحليل التلقائي |

## لا تغييرات على قاعدة البيانات

يتم استخدام جدول `risks` الموجود حالياً وجدول `saved_projects` للقراءة فقط.


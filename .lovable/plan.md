
# توليد صورة تعبر عن ادارة المشاريع

## الفكرة

انشاء Edge Function جديدة تستخدم نموذج `google/gemini-2.5-flash-image` عبر Lovable AI Gateway لتوليد صورة احترافية تعبر عن ادارة المشاريع الانشائية، ثم حفظها في التخزين السحابي واستخدامها في التطبيق.

## التعديلات المطلوبة

### 1. انشاء Edge Function: `supabase/functions/generate-image/index.ts`

- تستقبل prompt نصي وتستخدم `google/gemini-2.5-flash-image` مع `modalities: ["image", "text"]`
- تحول الصورة من base64 وترفعها الى Storage bucket
- ترجع رابط الصورة العام

### 2. انشاء Storage Bucket

- انشاء bucket اسمه `generated-images` مع سياسة وصول عامة للقراءة

### 3. انشاء صفحة/مكون بسيط لتوليد الصورة

- زر في الواجهة يستدعي الـ Edge Function مع prompt مناسب لادارة المشاريع
- عرض الصورة المولدة مع امكانية تحميلها
- Prompt مقترح: "Professional illustration of construction project management: blueprints, hard hats, cranes, Gantt charts, and a team collaborating on a modern building site, digital art style, clean and corporate"

### 4. استخدام الصورة

- بعد التوليد يمكن استخدامها كخلفية او صورة في الصفحة الرئيسية

## التفاصيل التقنية

### Edge Function - الكود الاساسي

```typescript
// POST { prompt: "..." }
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash-image",
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"],
  }),
});
// استخراج base64 -> رفع الى Storage -> ارجاع URL
```

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/functions/generate-image/index.ts` | ملف جديد - Edge Function للتوليد |
| `src/pages/HomePage.tsx` او مكون جديد | زر توليد + عرض الصورة |
| Migration SQL | انشاء Storage bucket |


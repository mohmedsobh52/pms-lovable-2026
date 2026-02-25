

# اضافة عمود الوصف العربي مع دعم OCR لاستخراج النصوص من الملفات

## الهدف
اضافة عمود "الوصف العربي" بشكل دائم في جدول الكميات، مع تعزيز استخراج النصوص العربية من جميع انواع الملفات (PDF, Excel, PNG) باستخدام OCR والذكاء الاصطناعي.

## التغييرات المطلوبة

### 1. دعم ملفات الصور (PNG/JPG) في الرفع
**الملفات:** `BOQUploadDialog.tsx`, `ProjectBOQTab.tsx`

- توسيع انواع الملفات المقبولة لتشمل `.png`, `.jpg`, `.jpeg`
- عند رفع صورة: ارسالها مباشرة الى وظيفة `ocr-extract` لاستخراج النص ثم تحليله عبر `analyze-boq`

### 2. تعزيز استخراج الوصف العربي في وظيفة analyze-boq
**الملف:** `supabase/functions/analyze-boq/index.ts`

- تعديل prompt الذكاء الاصطناعي ليطلب صراحة استخراج `description_ar` حتى لو كان النص الاصلي بالانجليزية فقط - بترجمته للعربية
- التأكيد في التعليمات ان كل بند يجب ان يحتوي على وصف عربي (مستخرج او مترجم)

### 3. اظهار عمود الوصف العربي دائماً
**الملفات:** `AnalysisResults.tsx`, `ProjectBOQTab.tsx`

- ازالة شرط `hasArabicDescriptions` من عرض العمود وجعله يظهر دائماً
- عرض "-" عندما لا يتوفر نص عربي
- الاحتفاظ باتجاه النص RTL للعمود

### 4. اضافة زر "استخراج الوصف العربي" (OCR)
**الملف:** `ProjectBOQTab.tsx` و `AnalysisResults.tsx`

- اضافة زر بجانب عنوان العمود العربي يقوم بارسال الاوصاف الانجليزية الى وظيفة AI لترجمتها للعربية وملء الحقول الفارغة

---

## التفاصيل التقنية

### توسيع الملفات المقبولة في BOQUploadDialog

```typescript
// اضافة صيغ الصور
const acceptedExtensions = ['.pdf', '.xlsx', '.xls', '.png', '.jpg', '.jpeg'];
const acceptedMimes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg',
];

// معالجة الصور عبر OCR
if (file.type.startsWith('image/')) {
  const base64 = await fileToBase64(file);
  const { data } = await supabase.functions.invoke('ocr-extract', {
    body: { images: [base64], fileName: file.name }
  });
  text = data?.text || '';
}
```

### تعديل prompt في analyze-boq

```text
// اضافة تعليمات صريحة:
- description_ar: الوصف العربي (اذا كان متوفراً في النص استخرجه، واذا لم يكن متوفراً قم بترجمة الوصف الانجليزي للعربية)
- يجب ان يحتوي كل بند على description_ar بشكل اجباري
```

### اظهار العمود دائماً

```typescript
// في AnalysisResults.tsx - ازالة الشرط
// قبل:
{visibleColumns.includes("description_ar") && (
  <th>الوصف العربي</th>
)}

// بعد:
<th>الوصف العربي</th>  // يظهر دائماً

// في ProjectBOQTab.tsx
// قبل:
{hasArabicDescriptions && (
  <TableHead>الوصف العربي</TableHead>
)}

// بعد:
<TableHead className="min-w-[250px]">الوصف العربي</TableHead>  // يظهر دائماً
```

### وظيفة ترجمة الاوصاف الفارغة

```typescript
// زر لملء الاوصاف العربية الفارغة
const handleTranslateToArabic = async () => {
  const itemsWithoutArabic = items.filter(i => !i.description_ar && i.description);
  // ارسال للـ AI للترجمة دفعة واحدة
  const { data } = await supabase.functions.invoke('analyze-boq', {
    body: { 
      translateOnly: true,
      items: itemsWithoutArabic.map(i => ({ 
        item_number: i.item_number, 
        description: i.description 
      }))
    }
  });
  // تحديث البنود بالترجمات
};
```

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/project-details/BOQUploadDialog.tsx` | دعم ملفات الصور + OCR |
| `src/components/project-details/ProjectBOQTab.tsx` | اظهار العمود دائماً + قبول صور |
| `src/components/AnalysisResults.tsx` | اظهار العمود دائماً + زر ترجمة |
| `supabase/functions/analyze-boq/index.ts` | تعزيز استخراج/ترجمة الوصف العربي |
| `src/components/BOQAnalyzerPanel.tsx` | دعم ملفات الصور |




# خطة: إنشاء شاشة تحليل المخططات المستقلة

## الهدف
إنشاء صفحة مستقلة `/drawing-analysis` لتحليل المخططات الإنشائية (PDF، صور OCR) باستخدام الذكاء الاصطناعي، مع التركيز على حساب كميات الحفر والردم لخطوط الشبكات.

> ملاحظة: ملفات DWG لا يمكن معالجتها مباشرة في المتصفح، لكن يمكن رفع صور مأخوذة منها أو ملفات PDF المحولة.

## الملفات المطلوبة

### 1. إنشاء صفحة جديدة: `src/pages/DrawingAnalysisPage.tsx`

**المكونات الرئيسية:**
- **منطقة رفع الملفات**: Drop Zone كبيرة تدعم سحب وإفلات PDF وصور (PNG/JPG) مع معاينة فورية
- **اختيار نوع المخطط**: قائمة منسدلة (بنية تحتية / إنشائي / معماري / كهرباء / ميكانيكا / صحي)
- **زر تحليل**: يرسل الملفات إلى Edge Function `analyze-drawings` مع `drawingType: "infrastructure"` لتفعيل prompts الحفر والردم
- **شريط تقدم**: يعرض حالة التحليل لكل ملف
- **جدول النتائج**: يعرض الكميات المستخرجة مصنفة حسب الفئات:
  - ⛏️ أعمال الحفر (Excavation) - حفر خنادق، حفر صخري
  - 🏗️ أعمال الردم (Backfilling) - فرشة رملية، ردم جوانب، ردم نهائي
  - 🔧 المواسير (Pipes) - القطر والمادة والطول
  - ⚙️ القطع والتركيبات (Fittings)
  - 🕳️ غرف التفتيش (Manholes)
  - 🚰 المحابس (Valves)
- **بطاقات ملخص**: إجمالي الحفر (م³)، إجمالي الردم (م³)، أطوال المواسير (م.ط)، عدد غرف التفتيش
- **تصدير**: Excel و PDF

**المنطق الأساسي:**
- تحويل صفحات PDF إلى صور base64 باستخدام `pdfjs-dist` (كما في `FastExtractionDrawingAnalyzer`)
- إرسال الصور إلى `supabase.functions.invoke("analyze-drawings")` مع `drawingType` و `language`
- تطبيق `normalizeQuantities()` على النتائج
- تجميع الكميات حسب الفئة وعرضها في بطاقات ملخصية

### 2. تعديل: `src/App.tsx`
- إضافة lazy import للصفحة الجديدة
- إضافة Route: `<Route path="/drawing-analysis" element={<DrawingAnalysisPage />} />`

## التفاصيل التقنية

**البنية الوظيفية:**
```text
DrawingAnalysisPage
├── Header (عنوان + أزرار)
├── DropZone (سحب/إفلات + اختيار ملفات)
├── DrawingTypeSelector (نوع المخطط)
├── AnalyzeButton → calls analyze-drawings
├── ProgressBar (أثناء التحليل)
├── SummaryCards (حفر/ردم/مواسير/غرف)
├── ResultsTable (جدول مفصل بالكميات)
└── ExportButtons (Excel + PDF)
```

**يعتمد على:**
- Edge Function `analyze-drawings` الموجودة (تدعم infrastructure prompts بالفعل)
- `pdfjs-dist` لتحويل PDF → صور
- `ExcelJS` + `jsPDF` للتصدير
- `normalizeQuantities()` من الكود الموجود


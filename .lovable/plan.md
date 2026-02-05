
## الهدف
إصلاح مشكلة “التبويبات لا تعمل” بشكل جذري (سواء كانت تبويبات الصفحات داخل المحتوى، أو “تبويبات” شريط التنقل العلوي)، عبر منع أي طبقات/Overlays مخفية من حجب النقرات، وتطبيق حماية تفاعلية (z-index + pointer-events) للتبويبات بشكل موحد في كل التطبيق.

---

## ما توصلتُ له من الفحص الحالي
- تبويبات صفحة **/quotations** لديها `tabs-navigation-safe` بالفعل، وفي بيئة الاختبار ظهرت قابلة للنقر.
- غالباً سبب “التبويبات لا تعمل” في هذا المشروع يكون من:
  1) **Overlay غير مرئي** (Dialog/Sheet/AlertDialog/CommandDialog) يبقى موجوداً أثناء الإغلاق (data-state=closed) لكنه ما زال يلتقط النقرات.
  2) صفحة في حالة **تحميل** مع طبقة تغطي الواجهة (loader) فتبدو التبويبات “لا تستجيب”.

الحل الأكثر ثباتاً: معالجة الـOverlays من المصدر داخل مكونات UI نفسها بدل الاعتماد فقط على CSS عام قد لا يطابق عناصر Radix دائماً.

---

## خطوة توضيح سريعة (بدون تعقيد)
قبل التنفيذ، سأحتاج منك تحديد واحد فقط:
- أين لا تعمل التبويبات بالضبط؟
  - A) تبويبات داخل الصفحة (مثل Upload/Compare في Quotations أو Projects/Reports في Projects)
  - B) عناصر الشريط العلوي (Dashboard / Projects / Analysis / Library / Reports)
  - C) الاثنين

(سأبني التحقق النهائي والاختبارات بناءً على إجابتك، لكن الخطة أدناه ستعالج أغلب السيناريوهات حتى لو لم نحدد بدقة.)

---

## التغييرات المقترحة (تنفيذ)
### 1) إصلاح جذري لمشكلة حجب النقرات بسبب Overlays
سنعدل مكونات الـUI التي تنشئ Overlays لتصبح “غير قابلة لالتقاط النقرات” تلقائياً عند الإغلاق:

**الملفات المستهدفة:**
- `src/components/ui/dialog.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/sheet.tsx`

**التعديل:**
- إضافة Tailwind state-variants مباشرة داخل `className` للـOverlay:
  - `data-[state=closed]:pointer-events-none`
  - `data-[state=closed]:opacity-0`
  - (اختياري) `data-[state=open]:pointer-events-auto`

النتيجة: حتى لو بَقِي عنصر Overlay جزء من الثانية في الـDOM أثناء الإغلاق، لن يمنع أي نقرات على التبويبات أو الأزرار.

---

### 2) توحيد حماية التبويبات داخل مكوّن Tabs نفسه (بدلاً من تكرار class في كل صفحة)
**الملف المستهدف:**
- `src/components/ui/tabs.tsx`

**التعديل:**
- جعل `TabsList` يضيف `tabs-navigation-safe` افتراضياً ضمن `className` (مع الحفاظ على أي className يمرره المطور).
- (اختياري) تعزيز `TabsTrigger` ليكون `relative` + `pointer-events-auto` دائماً.

النتيجة: أي تبويبات جديدة أو قديمة في أي صفحة ستصبح محمية تلقائياً من مشاكل الـz-index وpointer-events.

---

### 3) تحسين CSS كشبكة أمان (Fallback) للتبويبات
**الملف المستهدف:**
- `src/components/ui/dialog-custom.css`

**إضافات بسيطة وآمنة:**
- قواعد عامة على مستوى الأدوار لتقليل احتمالية “توقف النقر” حتى لو كانت هناك طبقة قريبة:
  - `[role="tablist"] { position: relative; z-index: 55; }`
  - `[role="tab"] { position: relative; z-index: 56; pointer-events: auto !important; }`

(هذه لن تكسر التخطيط لأنها تعمل داخل سياق العنصر نفسه ولا تتجاوز فوق Dialog محتواه.)

---

## خطة اختبار سريعة بعد التنفيذ (مهم)
1) الانتقال إلى `/quotations` وتجربة الضغط على:
   - Upload Quotations
   - Compare Quotations
2) الانتقال إلى `/projects` وتجربة الضغط على:
   - Projects / Analyze / Reports / Attachments
3) فتح وإغلاق أي نافذة حوار (مثل OCR أو البحث العام ⌘K) ثم إعادة تجربة التبويبات للتأكد أن الإغلاق لا يترك Overlay “خفي”.
4) اختبار نفس السيناريو على شاشة صغيرة (Mobile width) لأن التراكب يحصل كثيراً هناك.

---

## المخاطر المتوقعة وكيف سنمنعها
- **خطر:** تعطيل pointer-events على عناصر مغلقة بشكل عام قد يكسر أزرار أخرى.
  - **الحل:** لن نطبق قاعدة عامة على كل `[data-state=closed]`؛ سنطبقها فقط على Overlays المحددة (Dialog/AlertDialog/Sheet) من داخل مكوناتها.

---

## مخرجات التنفيذ
- التبويبات تعمل دائماً حتى بعد فتح/إغلاق أي Dialog/Sheet.
- اختفاء حالات “واجهة لا تستجيب” الناتجة عن overlay غير مرئي.
- تقليل الحاجة لإضافة `tabs-navigation-safe` يدوياً في كل صفحة.

---

## قائمة الملفات التي سيتم تعديلها
- `src/components/ui/dialog.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/dialog-custom.css`

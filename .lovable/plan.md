
# خطة شاملة لتحسين صفحة عروض الأسعار

## 1. إصلاح مشكلة عدم القدرة على تحليل الملف

### المشكلة
في دالة `performOCR` (سطر 423)، يتم استخدام `pdfjsLib.getDocument` مباشرة دون استدعاء `loadPdfJs()` أولاً. إذا لم يكن pdfjs محملاً بعد، سينتج خطأ `Cannot read properties of null`.

### الحل
- إضافة `await loadPdfJs()` في بداية `performOCR` قبل استخدام `pdfjsLib`
- إضافة تحقق من نجاح التحميل مع رسالة خطأ واضحة

### الملف: `src/components/QuotationUpload.tsx`
- سطر ~413: إضافة `await loadPdfJs();` قبل `const pdf = await pdfjsLib.getDocument(...)`
- إضافة فحص `if (!pdfjsLib)` مع رسالة خطأ

---

## 2. إضافة استيراد تلقائي لجميع عروض الأسعار دفعة واحدة إلى المكتبة مع تقرير ملخص

### الخطة
- إضافة زر "استيراد الكل إلى المكتبة" في header قائمة العروض المحللة
- إضافة state لتتبع حالة الاستيراد الجماعي (`isBatchImporting`, `batchImportProgress`)
- إضافة دالة `handleBatchImportToLibrary` التي:
  1. تجمع كل البنود من جميع العروض المحللة
  2. تستوردها إلى المكتبة بشكل تسلسلي مع تأخير
  3. تعرض شريط تقدم
- إضافة حوار تقرير ملخص (`batchImportReportOpen`) يعرض:
  - عدد العروض المعالجة
  - عدد البنود المستوردة بنجاح / الفاشلة
  - إجمالي القيمة المستوردة
  - تفاصيل كل عرض (اسم المورد، عدد البنود، القيمة)

### الملف: `src/components/QuotationUpload.tsx`
- إضافة states جديدة للاستيراد الجماعي والتقرير
- إضافة دالة `handleBatchImportToLibrary`
- إضافة زر في header القائمة
- إضافة Dialog للتقرير

---

## 3. إضافة تصدير البنود المحددة من حوار الاستيراد إلى Excel

### الخطة
- إضافة زر "تصدير Excel" في footer حوار الاستيراد بجانب زر "استيراد إلى المكتبة"
- إضافة دالة `exportSelectedItemsToExcel` التي:
  1. تجمع البنود المحددة
  2. تنشئ workbook باستخدام ExcelJS
  3. تضيف sheet بأعمدة: رقم البند، الوصف، الوحدة، الكمية، سعر الوحدة، الإجمالي
  4. تحفظ الملف كـ `quotation_items_export_{timestamp}.xlsx`

### الملف: `src/components/QuotationUpload.tsx`
- إضافة دالة `exportSelectedItemsToExcel`
- إضافة زر تصدير في DialogFooter مع أيقونة FileSpreadsheet

---

## 4. التحقق من عمل البحث والفلترة والسعر الإجمالي

### الخطة
البحث والفلترة والسعر الإجمالي مطبقة بالفعل (سطور 1792-1876). سأتحقق بالمتصفح بعد التنفيذ.

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/components/QuotationUpload.tsx` | إصلاح loadPdfJs + استيراد جماعي + تقرير ملخص + تصدير Excel |



# إصلاح مشكلة تحليل ملف واحد فقط عند رفع عدة ملفات

## المشكلة الجذرية

عند رفع عدة ملفات عبر "رفع مجلد" أو تحديد متعدد، الكود الحالي يقوم فقط بـ:
1. فتح كل PDF وتعيينه إلى `setPdfSess` — **الذي يستبدل الملف السابق** في كل مرة
2. يضع الحالة "done" فوراً بدون تشغيل محرك التحليل (`runExtraction`)
3. النتيجة: آخر ملف فقط يظهر في `pdfSess`، ولا يتم تحليل أي ملف

**أيضاً**: زر "رفع ملف PDF" لا يدعم `multiple`، فلا يمكن اختيار أكثر من ملف.

## الإصلاح

### الملف: `src/pages/DrawingAnalysisPage.tsx`

**1. إصلاح `runBatchAnalysis` (سطر 1023-1044):**
- بعد فتح كل ملف وتعيين `pdfSess`، يجب تشغيل `runExtraction()` فعلياً والانتظار حتى اكتماله
- جمع نتائج كل ملف (الرسائل) في تقرير موحد
- عدم الانتقال للملف التالي حتى اكتمال تحليل الحالي

**2. إضافة `multiple` لـ input الملفات (سطر 1669):**
- تعديل `<input ref={fileRef}>` لإضافة `multiple`
- تعديل `handleFiles` للتعامل مع عدة PDFs: أول ملف يُفتح مباشرة، الباقي يُضاف إلى `batchFiles`

**3. إصلاح تدفق التحليل المتتابع:**
- إضافة آلية انتظار (`Promise`) لاكتمال `runExtraction` قبل الانتقال للملف التالي
- استخدام `ref` لتتبع اكتمال التحليل الحالي
- تجميع نتائج جميع الملفات في `msgs` مع فاصل لكل ملف

### التفاصيل التقنية

```text
الحالي:
  runBatchAnalysis → loop(files) → open PDF → setPdfSess → mark "done" ❌
                                                          (لا تحليل فعلي!)

المطلوب:
  runBatchAnalysis → loop(files) → open PDF → setPdfSess → runExtraction() 
                                            → await completion → mark "done" ✅
                                            → next file
```

- إضافة `analysisCompleteResolve` ref لتمكين `runBatchAnalysis` من الانتظار حتى ينتهي `runExtraction`
- في نهاية `runExtraction` (سطر 1258)، استدعاء `resolve()` إذا كان هناك batch جاري
- `runBatchAnalysis` تضيف رسالة فاصلة بين كل ملف: `## 📁 ملف: {filename}`


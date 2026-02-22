

# إصلاح خطأ "Partial extraction" - عدم تطابق إصدار PDF.js

## المشكلة

عند محاولة استخراج النص من ملف PDF، يظهر الخطأ:
```
The API version "4.10.38" does not match the Worker version "4.4.168"
```

السبب: حزمة `pdfjs-dist` المثبتة تم تحديثها تلقائياً إلى `4.10.38` (لأن `package.json` يحدد `^4.4.168`)، لكن رابط Worker في الكود لا يزال يشير يدوياً إلى الإصدار القديم `4.4.168`.

## الحل

### تعديل ملف واحد: `src/lib/pdf-utils.ts`

**السطر 5** - تحديث رابط Worker ليتطابق مع الإصدار المثبت:

من:
```
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
```

إلى حل ديناميكي لا يتأثر بتحديثات الحزمة مستقبلاً:
```
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
```

هذا يستخدم `pdfjsLib.version` مباشرة مما يضمن التطابق دائماً بين API و Worker بغض النظر عن أي تحديث مستقبلي.

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/lib/pdf-utils.ts` | سطر 5: استخدام `pdfjsLib.version` بدل الإصدار الثابت |


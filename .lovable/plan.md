

# إصلاح خطأ "Partial extraction" وضمان ظهور النص العربي

## السبب الجذري

رغم إصلاح `workerSrc` ليستخدم `pdfjsLib.version` ديناميكياً، لا يزال هناك **رابطان آخران** في نفس الملف يشيران إلى الإصدار القديم `4.4.168`:

```
سطر 395: cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/'
سطر 397: standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/standard_fonts/'
```

هذان الرابطان مسؤولان عن تحميل خرائط الأحرف (CMaps) والخطوط القياسية. عند عدم تطابقهما مع الإصدار المثبت (`4.10.38`)، لا يتم تحميل خرائط الأحرف العربية بشكل صحيح، مما يؤدي إلى:
- استخراج نص فارغ أو مشوه من صفحات PDF العربية
- فشل `isValidText` في التحقق من النص
- ظهور رسالة "Partial extraction"

## الحل

### تعديل ملف واحد: `src/lib/pdf-utils.ts`

**الأسطر 395-397** - تحديث `cMapUrl` و `standardFontDataUrl` لاستخدام `pdfjsLib.version` ديناميكياً:

من:
```typescript
cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/',
cMapPacked: true,
standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/standard_fonts/',
```

إلى:
```typescript
cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
cMapPacked: true,
standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/lib/pdf-utils.ts` | سطر 395 و 397: استخدام `pdfjsLib.version` بدل الإصدار الثابت |

## النتيجة المتوقعة

- تحميل خرائط الأحرف العربية بنجاح
- استخراج النص العربي بشكل صحيح من ملفات PDF
- اختفاء رسالة "Partial extraction" عند وجود نص عربي قابل للقراءة
- حل دائم لا يتأثر بتحديثات الحزمة مستقبلاً


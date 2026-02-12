
# إصلاح خطأ شاشة Quotations + التأكد من عمل زر المستخلص الجديد

## المشكلة الأولى: شاشة Quotations تتعطل

**السبب:** في `src/components/QuotationUpload.tsx`، هناك عدة أماكن تستدعي `.toLocaleString()` على قيم قد تكون `null`:

- سطر 1439: `subtotal.toLocaleString()` — الشرط `!== undefined` لا يمنع `null`
- سطر 1447: `tax.toLocaleString()` — نفس المشكلة
- سطر 1453: `discount.toLocaleString()` — نفس المشكلة
- سطر 1401: `displayTotal?.toLocaleString()` — قد يكون null
- سطر 1399-1400: `quantity?.toLocaleString()` و `unit_price?.toLocaleString()`

**الحل:** إضافة فحص null لكل استدعاء `.toLocaleString()` باستخدام النمط:
```text
(value ?? 0).toLocaleString()
```

### التغييرات في `src/components/QuotationUpload.tsx`:

| السطر | قبل | بعد |
|-------|-----|-----|
| 1399 | `item.quantity?.toLocaleString() \|\| '-'` | `(item.quantity ?? 0).toLocaleString()` |
| 1400 | `item.unit_price?.toLocaleString() \|\| '-'` | `(item.unit_price ?? 0).toLocaleString()` |
| 1401 | `displayTotal?.toLocaleString()` | `(displayTotal ?? 0).toLocaleString()` |
| 1439 | `subtotal.toLocaleString()` | `(subtotal ?? 0).toLocaleString()` |
| 1447 | `tax.toLocaleString()` | `(tax ?? 0).toLocaleString()` |
| 1453 | `discount.toLocaleString()` | `(discount ?? 0).toLocaleString()` |
| 1458 | `grand_total?.toLocaleString()` | `(grand_total ?? 0).toLocaleString()` |

---

## المشكلة الثانية: زر "مستخلص جديد"

الـ route `/progress-certificates/new` موجود بالفعل في `App.tsx` والصفحة `NewCertificatePage.tsx` تم إنشاؤها. سأتحقق من أن زر التنقل يعمل بشكل صحيح في `ProgressCertificatesPage.tsx`.

---

## الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/components/QuotationUpload.tsx` | إضافة null safety لـ 7 استدعاءات `.toLocaleString()` |

## لماذا هذا الحل سيعمل

1. استخدام `??` (nullish coalescing) بدلا من `?.` (optional chaining) يضمن تحويل `null` و `undefined` إلى `0` قبل استدعاء `.toLocaleString()`
2. هذا يتوافق مع معيار المشروع الموثق في الذاكرة: "null-safety-formatting-standard"

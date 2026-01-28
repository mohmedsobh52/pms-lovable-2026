

# خطة إصلاح مشكلة زر Quick Price

## تحليل المشكلة

### الخطأ في Console
```
Warning: Function components cannot be given refs.
Check the render method of `QuickPriceDialogComponent`.
    at Dialog
```

### السبب الجذري
مكون `QuickPriceDialog` يستخدم `memo` فقط، لكنه **لا يتعامل مع refs بشكل صحيح** مع Radix UI Dialog. عند فتح الـ dialog، يحاول Radix تمرير ref للمكون، مما يسبب خطأ ويمنع ظهور الـ dialog.

**مقارنة مع `EditItemDialog` الذي يعمل:**
- `EditItemDialog` يستخدم `onOpenAutoFocus={(e) => e.preventDefault()}` و `onCloseAutoFocus={(e) => e.preventDefault()}` في `DialogContent`
- `QuickPriceDialog` **لا يستخدم** هذه الخصائص!

---

## الحل المطلوب

### التغيير في `QuickPriceDialog.tsx`

إضافة `onOpenAutoFocus` و `onCloseAutoFocus` preventions في `DialogContent` لمنع مشاكل focus/ref:

```typescript
// قبل (السطر 120):
<DialogContent className="max-w-lg max-h-[80vh] overflow-hidden">

// بعد:
<DialogContent 
  className="max-w-lg max-h-[80vh] overflow-hidden"
  onOpenAutoFocus={(e) => e.preventDefault()}
  onCloseAutoFocus={(e) => e.preventDefault()}
>
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `src/components/project-details/QuickPriceDialog.tsx` | إضافة `onOpenAutoFocus` و `onCloseAutoFocus` في `DialogContent` |

---

## النتيجة المتوقعة

| قبل الإصلاح | بعد الإصلاح |
|------------|------------|
| ❌ النقر على Quick Price لا يفتح dialog | ✓ النقر على Quick Price يفتح dialog بنجاح |
| ⚠️ ظهور ref warning في Console | ✓ لا توجد warnings |
| ❌ تعطل rendering بسبب ref conflict | ✓ Dialog يعمل بسلاسة |

---

## خطوات الاختبار بعد التطبيق

1. فتح صفحة تفاصيل المشروع
2. الذهاب لتبويب BOQ
3. النقر على زر ⋮ لأي بند
4. اختيار Quick Price
5. **التحقق من ظهور dialog التسعير السريع ✓**
6. اختبار إدخال السعر والتطبيق


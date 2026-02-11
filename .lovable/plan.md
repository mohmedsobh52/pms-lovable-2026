

# إصلاح زر "New Certificate" - لا يفتح النافذة

## المشكلة
زر "مستخلص جديد" يضغط بنجاح لكن نافذة Dialog لا تظهر. السبب أن مكون `Dialog` في `dialog.tsx` هو مجرد إعادة تصدير مباشرة لـ `DialogPrimitive.Root` بدون `forwardRef`، مما يسبب فشل في عملية الـ mounting في بيئة المعاينة.

## الحل (تعديلان فقط)

### تعديل 1: `src/components/ui/dialog.tsx`
تغيير السطر 7 من:
```typescript
const Dialog = DialogPrimitive.Root;
```
إلى:
```typescript
const Dialog = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>>(
  (props, _ref) => <DialogPrimitive.Root {...props} />
);
Dialog.displayName = "Dialog";
```

### تعديل 2: `src/pages/ProgressCertificatesPage.tsx`
اضافة `DialogDescription` في import واضافتها داخل `DialogHeader` لنافذتي الانشاء والعرض:

**نافذة الانشاء (سطر 776):**
```tsx
<DialogDescription className="sr-only">Create a new progress certificate</DialogDescription>
```

**نافذة العرض (نفس النمط):**
```tsx
<DialogDescription className="sr-only">View certificate details</DialogDescription>
```

## التفاصيل التقنية

| الملف | التعديل |
|-------|---------|
| `src/components/ui/dialog.tsx` | لف Dialog بـ forwardRef (سطر 7) |
| `src/pages/ProgressCertificatesPage.tsx` | اضافة DialogDescription في الاستيراد + داخل كل DialogHeader |

هذان التعديلان سيحلان مشكلة عدم فتح النافذة نهائيا.


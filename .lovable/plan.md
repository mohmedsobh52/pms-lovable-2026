

# Fix: زر "New Certificate" لا يفتح النافذة

## المشكلة الجذرية

مكون `Dialog` من Radix UI يتلقى ref من React أثناء المطابقة الداخلية (reconciliation)، مما ينتج تحذير "Function components cannot be given refs". هذا التحذير يمنع Dialog من العمل بشكل صحيح في بعض الحالات.

تم التأكد من المشكلة عبر اختبار المتصفح: الضغط على الزر لا يفتح أي نافذة رغم تنفيذ الضغط بنجاح.

## الحل

### تغيير 1: إصلاح مكون Dialog (`src/components/ui/dialog.tsx`)

لف مكون `Dialog` بـ `React.forwardRef` لمنع التحذير:

```typescript
// قبل
const Dialog = DialogPrimitive.Root;

// بعد
const Dialog = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>>(
  (props, _ref) => <DialogPrimitive.Root {...props} />
);
Dialog.displayName = "Dialog";
```

### تغيير 2: إضافة DialogDescription في نافذة الإنشاء (`src/pages/ProgressCertificatesPage.tsx`)

Radix Dialog يحتاج `DialogDescription` داخل كل `DialogContent`. عدم وجوده قد يسبب مشاكل في التصيير (rendering).

- إضافة `DialogDescription` في import
- إضافة وصف مخفي أو ظاهر داخل DialogHeader لكلا النافذتين (الإنشاء والعرض)

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/components/ui/dialog.tsx` | لف Dialog بـ forwardRef |
| `src/pages/ProgressCertificatesPage.tsx` | إضافة DialogDescription + استيرادها |

### سبب المشكلة

إصدار `@radix-ui/react-dialog` الحالي (^1.1.14) يُصدّر `Dialog.Root` كـ function component بدون `forwardRef`. عندما يحاول React الداخلي تمرير ref إليه أثناء عملية mounting، ينتج التحذير الذي قد يمنع المكون من العمل في بيئة المعاينة (preview iframe).

### خطوات التنفيذ

1. تعديل `dialog.tsx` - لف Dialog بـ forwardRef
2. تعديل `ProgressCertificatesPage.tsx` - إضافة DialogDescription
3. اختبار فتح نافذة "مستخلص جديد"




# معالجة مشاكل شاشة المكتبة

## المشاكل المكتشفة

### 1. خطأ "Function components cannot be given refs"
تحذير React في الكونسول بسبب أن `AlertDialog` يتلقى ref بشكل غير مباشر من خلال بنية المكون.

### 2. HTML غير صالح داخل AlertDialogDescription
المكون `AlertDialogDescription` يُعرض كعنصر `<p>` من Radix UI، لكن الكود يضع بداخله عناصر `<p>` و `<ul>` وهذا يخالف قواعد HTML (لا يمكن وضع عناصر block داخل `<p>`). هذا يسبب مشاكل في العرض وقد يمنع ظهور أزرار الحوار بشكل صحيح.

**المواقع المتأثرة:**
- السطور 96-103: حوار البيانات التجريبية
- السطور 122-129: حوار مواد الشبكات (الحالة الفارغة)
- السطور 148-154: حوار عمالة ومعدات الشبكات

### 3. z-index منخفض
حوارات AlertDialog تستخدم `z-50` بينما Dialog يستخدم `z-99/z-100`، مما قد يسبب ظهور الحوار خلف عناصر أخرى.

---

## الحل

### ملف: `src/components/ui/alert-dialog.tsx`
- رفع z-index من `z-50` إلى `z-[99]` للـ Overlay و `z-[100]` للـ Content (نفس Dialog)

### ملف: `src/components/LibraryDatabase.tsx`
- استبدال `AlertDialogDescription className="space-y-2"` الذي يحتوي على `<p>` و `<ul>` بمكون `<div>` مخصص مع إبقاء `AlertDialogDescription` كنص بسيط فقط
- النمط: وضع `AlertDialogDescription` كنص وصفي مختصر، ثم عرض القوائم التفصيلية (`<ul>`) خارجه في `<div>` منفصل داخل `AlertDialogHeader`

### مثال التصحيح:
```typescript
// قبل (خطأ - ul داخل p)
<AlertDialogDescription className="space-y-2">
  <p>سيتم إضافة:</p>
  <ul>...</ul>
</AlertDialogDescription>

// بعد (صحيح - فصل النص عن القائمة)
<AlertDialogDescription>
  سيتم إضافة البيانات التجريبية التالية:
</AlertDialogDescription>
<ul className="list-disc list-inside text-sm text-muted-foreground">
  <li>...</li>
</ul>
```

هذا يحل مشكلة العرض ويجعل أزرار الحوار (إلغاء/إضافة) تظهر بشكل صحيح.



# إصلاح زر "مستخلص جديد" - الحل النهائي

## المشكلة الجذرية

ملف `dialog-custom.css` يحتوي على 536 سطر من قواعد CSS تتحكم في `pointer-events` و `z-index` لعناصر Radix UI. عند استخدام `Button asChild` مع `Link`، يقوم Radix Slot بدمج خصائص HTML button (مثل `type="button"`) على عنصر `<a>`. هذا مع قواعد CSS المعقدة يمنع التنقل.

بالإضافة لذلك، يوجد Select components في نفس الصفحة تُصدر تحذيرات React ref، مما يشير لمشاكل في Radix على هذه الصفحة.

## الحل

استبدال `Button asChild` + `Link` بـ `Link` مباشرة مع تطبيق تنسيقات الزر يدوياً باستخدام `buttonVariants` + إضافة class حماية لضمان عدم حجب الزر.

### التغيير في `src/pages/ProgressCertificatesPage.tsx`

**قبل:**
```
<Button asChild>
  <Link to="/progress-certificates/new">
    <Plus className="h-4 w-4 mr-1" />
    {isArabic ? "مستخلص جديد" : "New Certificate"}
  </Link>
</Button>
```

**بعد:**
```
<Link 
  to="/progress-certificates/new"
  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 relative z-[70] pointer-events-auto"
>
  <Plus className="h-4 w-4 mr-1" />
  {isArabic ? "مستخلص جديد" : "New Certificate"}
</Link>
```

التغييرات:
1. `Link` مباشرة بدون `Button asChild` - يتجنب Radix Slot تماما
2. تنسيقات الزر مطبقة كـ className مباشرة
3. `z-[70]` و `pointer-events-auto` لضمان عدم حجب الزر
4. إزالة استيراد `Link` من الأعلى غير ضروري لأنه مستورد بالفعل
5. يمكن حذف `Button` من الاستيرادات إذا لم يعد مستخدما في هذا السياق (لكنه مستخدم في أماكن أخرى في الصفحة)

### ملف واحد يتأثر

| الملف | التعديل |
|-------|---------|
| `src/pages/ProgressCertificatesPage.tsx` | استبدال Button+Link بـ Link مباشر مع تنسيقات الزر |

### لماذا سيعمل

1. عنصر `<a>` نقي بدون أي تدخل من Radix Slot
2. React Router's Link يتحكم في التنقل عبر `onClick` الخاص به
3. `z-[70]` أعلى من كل القواعد في dialog-custom.css (أعلى z-index هناك هو 65)
4. `pointer-events-auto` صريح يتجاوز أي قاعدة CSS أخرى
5. لا يوجد أي مكون Radix متورط - فقط عنصر HTML عادي

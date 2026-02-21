

# إصلاح القائمة المنسدلة داخل الحوارات

## المشكلة

القائمة المنسدلة (Select) في حوار "تحليل المخاطر التلقائي" لا تعمل لأن:

- في `dialog-custom.css` السطر 9: `[data-radix-popper-content-wrapper]` يفرض `z-index: 60`
- محتوى الحوار (Dialog) يكون في `z-index: 100`
- القائمة المنسدلة تظهر خلف الحوار (60 < 100) فلا يمكن رؤيتها أو النقر عليها

## الحل

تعديل ملف `src/components/ui/dialog-custom.css` لرفع `z-index` الخاص بـ `[data-radix-popper-content-wrapper]` إلى 200 بحيث يظهر فوق أي حوار مفتوح.

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/ui/dialog-custom.css` | تغيير z-index من 60 إلى 200 لـ `[data-radix-popper-content-wrapper]` |

## التفاصيل التقنية

### ترتيب الطبقات الحالي (المشكلة)

```text
z-index 60  -> popper content wrapper (Select dropdown) -- مخفي خلف الحوار
z-index 99  -> dialog overlay
z-index 100 -> dialog content
z-index 150 -> select content (CSS class) -- لكن العنصر الأب يحده عند 60
```

### ترتيب الطبقات بعد الإصلاح

```text
z-index 99  -> dialog overlay
z-index 100 -> dialog content
z-index 200 -> popper content wrapper (Select dropdown) -- يظهر فوق الحوار
```

هذا الإصلاح بسيط ولا يؤثر على باقي المكونات لأن popper content wrapper يُستخدم فقط للقوائم المنسدلة والـ tooltips التي يجب أن تظهر فوق كل شيء.

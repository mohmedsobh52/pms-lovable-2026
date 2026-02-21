

# اصلاح مشكلة عدم عمل تبويب "تثبيت الأعمدة" (Pin Columns)

## المشكلة

عند فتح قائمة "Pin Columns"، لا تعمل أزرار Switch بداخلها. السبب هو تعارض في قيم z-index:

- الـ PopoverContent يستخدم `z-index: 50`
- لكن CSS المخصص يفرض `z-index: 56 !important` على عناصر التبويب `[role="tab"]`
- هذا يجعل عناصر التبويب تغطي محتوى الـ Popover وتمنع التفاعل مع Switch

## الحل

### الملف: `src/components/ui/dialog-custom.css`

اضافة قاعدة CSS لرفع z-index الخاص بـ Popover portal wrapper فوق مستوى التبويبات:

```css
[data-radix-popper-content-wrapper] {
  z-index: 60 !important;
  pointer-events: auto !important;
}
```

### الملف: `src/components/ui/popover.tsx`

رفع z-index الافتراضي للـ PopoverContent من `z-50` الى `z-[60]` ليكون فوق مستوى التبويبات.

## التفاصيل التقنية

| الملف | التغيير |
|-------|---------|
| `src/components/ui/dialog-custom.css` | اضافة قاعدة z-index للـ popper wrapper |
| `src/components/ui/popover.tsx` | رفع z-index الافتراضي من 50 الى 60 |

اصلاح بسيط في ملفين فقط، بدون تأثير على باقي المكونات.


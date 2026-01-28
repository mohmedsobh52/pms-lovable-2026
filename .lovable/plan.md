

# خطة إصلاح زر "Add Staff" وأزرار الإضافة في جميع تبويبات التسعير

## المشكلة

زر "+ Add Staff" في تبويب Site Staff لا يستجيب للنقر بسبب تعارض `z-index` و `pointer-events` مع عناصر Radix UI Dialog.

## تحليل السبب

1. Dialog overlay لديه `z-index: 99` ويمكن أن يحجب التفاعل مع الأزرار
2. الأزرار داخل `CardHeader` ليس لديها حماية `z-index` و `pointer-events`
3. نفس المشكلة موجودة في تبويبات أخرى (Facilities, Insurance, Guarantees, Indirect Costs)

## الحل المقترح

### 1. إضافة CSS class جديد للحماية

**ملف:** `src/components/ui/dialog-custom.css`

```css
/* Tender Tabs Card Header Protection */
.tender-card-header {
  position: relative;
  z-index: 60;
  pointer-events: auto !important;
}

.tender-card-header button {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* Tender Card overall protection */
.tender-card-safe {
  position: relative;
  z-index: 10;
}

.tender-card-safe [data-radix-dialog-trigger],
.tender-card-safe button:not([data-radix-dialog-content] button) {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

### 2. تحديث `SiteStaffTab.tsx`

```tsx
// من:
<Card>
  <CardHeader className="flex flex-row items-center justify-between">

// إلى:
<Card className="tender-card-safe">
  <CardHeader className="flex flex-row items-center justify-between tender-card-header">
```

```tsx
// إضافة class للزر
<Button onClick={handleAdd} className="gap-2 relative z-[65] pointer-events-auto">
```

### 3. تحديث باقي التبويبات بنفس الأسلوب

| الملف | التغيير |
|-------|---------|
| `src/components/tender/FacilitiesTab.tsx` | إضافة `tender-card-safe` و `tender-card-header` |
| `src/components/tender/InsuranceTab.tsx` | إضافة `tender-card-safe` و `tender-card-header` |
| `src/components/tender/GuaranteesTab.tsx` | إضافة `tender-card-safe` و `tender-card-header` |
| `src/components/tender/IndirectCostsTab.tsx` | إضافة `tender-card-safe` و `tender-card-header` |
| `src/components/tender/PricingSettingsTab.tsx` | إضافة `tender-card-safe` و `tender-card-header` |

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/ui/dialog-custom.css` | إضافة CSS classes للحماية |
| `src/components/tender/SiteStaffTab.tsx` | إضافة classes للـ Card و CardHeader و Button |
| `src/components/tender/FacilitiesTab.tsx` | إضافة classes للحماية |
| `src/components/tender/InsuranceTab.tsx` | إضافة classes للحماية |
| `src/components/tender/GuaranteesTab.tsx` | إضافة classes للحماية |
| `src/components/tender/IndirectCostsTab.tsx` | إضافة classes للحماية |
| `src/components/tender/PricingSettingsTab.tsx` | إضافة classes للحماية |

## النتيجة المتوقعة

- زر "+ Add Staff" يستجيب للنقر فوراً
- جميع أزرار الإضافة في تبويبات التسعير تعمل بشكل صحيح
- حوارات الإضافة والتعديل تفتح بدون مشاكل
- التوافق مع معايير الـ z-index المُعتمدة في المشروع


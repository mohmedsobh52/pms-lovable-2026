
# خطة إصلاح شاملة لجميع التبويبات غير العاملة

## ملخص التحليل

بعد فحص شامل للكود، وجدت أن المشروع يحتوي على **مشاكل متكررة** في التفاعل مع الأزرار بسبب تعارضات `z-index` و `pointer-events` مع عناصر Radix UI. تم إصلاح بعض التبويبات سابقاً لكن هناك تبويبات أخرى تحتاج نفس الإصلاح.

---

## التبويبات المُصلحة سابقاً (6 تبويبات)

| التبويب | الحالة |
|---------|--------|
| SiteStaffTab | ✅ مُصلح |
| FacilitiesTab | ✅ مُصلح |
| InsuranceTab | ✅ مُصلح |
| GuaranteesTab | ✅ مُصلح |
| IndirectCostsTab | ✅ مُصلح |
| PricingSettingsTab | ✅ مُصلح |

---

## التبويبات التي تحتاج إصلاح (3 تبويبات)

### 1. TenderSubcontractorsTab

**المشكلة:** يستخدم `DialogTrigger` داخل `CardHeader` بدون حماية `tender-card-safe`

**الموقع:** سطر 255-274

**الحل:**
```tsx
// من:
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">

// إلى:
<Card className="tender-card-safe">
  <CardHeader className="tender-card-header">
    <div className="flex items-center justify-between">
```

```tsx
// إضافة حماية للزر
<Button className="relative z-[65] pointer-events-auto">
```

### 2. PricingScenarios

**المشكلة:** يستخدم `DialogTrigger` بدون حماية

**الموقع:** سطر 310-325

**الحل:**
```tsx
// إضافة حماية للزر
<DialogTrigger asChild>
  <Button variant="outline" size="sm" className="gap-2 relative z-[65] pointer-events-auto">
```

### 3. PricingAccuracyTab

**المشكلة:** التبويبات الفرعية قد تتأثر بمشاكل z-index

**الحل:** إضافة `tabs-navigation-safe` للـ TabsList

---

## تحسينات إضافية مطلوبة

### إضافة حماية شاملة لـ DialogTrigger

إضافة قاعدة CSS جديدة في `dialog-custom.css`:

```css
/* Global DialogTrigger Protection */
[data-radix-dialog-trigger] {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* Ensure Dialog triggers inside CardHeader are always clickable */
.tender-card-header [data-radix-dialog-trigger],
.tender-card-header > div [data-radix-dialog-trigger] {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
}
```

---

## خطة التنفيذ التفصيلية

### المرحلة 1: تحديث CSS العام

**ملف:** `src/components/ui/dialog-custom.css`

إضافة قواعد جديدة لحماية DialogTrigger بشكل عام:

```css
/* ============================================
   DIALOG TRIGGER GLOBAL PROTECTION
   ============================================ */

/* All DialogTrigger buttons should be interactive */
[data-radix-dialog-trigger] {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* Nested DialogTrigger in CardHeader */
.tender-card-header [data-radix-dialog-trigger],
.tender-card-header > * [data-radix-dialog-trigger] {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
}

/* Card with Dialog inside */
.card-with-dialog {
  position: relative;
  z-index: 10;
}

.card-with-dialog .card-header-actions {
  position: relative;
  z-index: 60;
  pointer-events: auto !important;
}

.card-with-dialog .card-header-actions button,
.card-with-dialog .card-header-actions [data-radix-dialog-trigger] {
  position: relative;
  z-index: 65;
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

### المرحلة 2: تحديث TenderSubcontractorsTab

**ملف:** `src/components/tender/TenderSubcontractorsTab.tsx`

**التغييرات:**

1. إضافة classes للـ Card:
```tsx
<Card className="tender-card-safe">
  <CardHeader className="tender-card-header">
```

2. إضافة classes للزر:
```tsx
<DialogTrigger asChild>
  <Button className="relative z-[65] pointer-events-auto">
    <Plus className="h-4 w-4 mr-1" />
    {isRTL ? "إضافة مقاول" : "Add Subcontractor"}
  </Button>
</DialogTrigger>
```

### المرحلة 3: تحديث PricingScenarios

**ملف:** `src/components/tender/PricingScenarios.tsx`

**التغييرات:**

1. إضافة classes للـ Card:
```tsx
<Card className="tender-card-safe">
  <CardHeader className="tender-card-header">
```

2. إضافة classes للزر:
```tsx
<DialogTrigger asChild>
  <Button variant="outline" size="sm" className="gap-2 relative z-[65] pointer-events-auto">
    <Plus className="w-4 h-4" />
    {isArabic ? "سيناريو مخصص" : "Custom Scenario"}
  </Button>
</DialogTrigger>
```

### المرحلة 4: تحديث PricingAccuracyTab

**ملف:** `src/components/tender/PricingAccuracyTab.tsx`

**التغييرات:**

إضافة `tabs-navigation-safe` للـ TabsList:
```tsx
<TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid tabs-navigation-safe">
```

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `src/components/ui/dialog-custom.css` | إضافة قواعد CSS جديدة |
| `src/components/tender/TenderSubcontractorsTab.tsx` | إضافة classes للحماية |
| `src/components/tender/PricingScenarios.tsx` | إضافة classes للحماية |
| `src/components/tender/PricingAccuracyTab.tsx` | إضافة tabs-navigation-safe |

---

## النتيجة المتوقعة

### قبل الإصلاح:
- زر "Add Subcontractor" لا يستجيب
- زر "Custom Scenario" لا يستجيب
- التبويبات الفرعية قد تتأثر

### بعد الإصلاح:
- جميع أزرار الإضافة تعمل فوراً
- الحوارات تفتح بدون مشاكل
- التنقل بين التبويبات سلس
- حماية شاملة لجميع DialogTrigger

---

## ملاحظات تقنية

1. **استخدام z-index متسق:**
   - Dialog Overlay: z-99
   - Dialog Content: z-100
   - Action Buttons: z-65
   - Card Headers: z-60
   - Navigation Tabs: z-55

2. **pointer-events:**
   - جميع الأزرار التفاعلية تستخدم `pointer-events: auto !important`
   - Dialog overlay المغلق يستخدم `pointer-events: none`

3. **التوافق:**
   - جميع التغييرات متوافقة مع معايير المشروع الحالية
   - لا تؤثر على الأداء أو سرعة الاستجابة

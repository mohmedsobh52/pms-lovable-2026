
# خطة إصلاح أزرار التنقل والقوائم المنسدلة في صفحة "مشروع جديد"

## المشكلة

في صفحة إنشاء مشروع جديد (`/projects/new`):
1. أزرار "Back" و "Home" في شريط التنقل لا تستجيب للنقر
2. روابط المسار (Breadcrumbs) لا تعمل
3. القوائم المنسدلة (Currency و Project Type) لا تفتح عند النقر

## تحليل السبب الجذري

المشروع يستخدم معيار حماية `z-index` لحل تعارضات Radix UI، لكن:

| المكون | الحالة | السبب |
|--------|--------|-------|
| `NavigationBar.tsx` | ❌ غير محمي | لا يستخدم classes الحماية مثل `navigation-safe` |
| `Breadcrumbs.tsx` | ❌ غير محمي | الروابط بدون `z-index` مناسب |
| `NewProjectPage.tsx` | ❌ Form Select غير محمي | القوائم المنسدلة داخل `Card` بدون حماية |

## الحل المقترح

### 1. تحديث CSS (`dialog-custom.css`)

إضافة قواعد حماية جديدة للتنقل والنماذج:

```css
/* Navigation Bar Protection */
.navigation-bar-safe {
  position: relative;
  z-index: 50;
  pointer-events: auto !important;
}

.navigation-bar-safe button,
.navigation-bar-safe a {
  position: relative;
  z-index: 51;
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* Breadcrumb Protection */
.breadcrumb-safe {
  position: relative;
  z-index: 45;
  pointer-events: auto !important;
}

.breadcrumb-safe a,
.breadcrumb-safe [role="link"] {
  position: relative;
  z-index: 46;
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* Form Card Protection */
.form-card-safe {
  position: relative;
  z-index: 10;
}

.form-card-safe [data-radix-select-trigger] {
  position: relative;
  z-index: 55;
  pointer-events: auto !important;
  cursor: pointer !important;
}

.form-card-safe input,
.form-card-safe textarea,
.form-card-safe button {
  position: relative;
  z-index: 20;
  pointer-events: auto !important;
}
```

### 2. تحديث `NavigationBar.tsx`

إضافة class `navigation-bar-safe` وحماية الأزرار:

```tsx
// من:
<div className={`flex items-center gap-2 mb-4 flex-wrap ${className}`}>

// إلى:
<div className={`flex items-center gap-2 mb-4 flex-wrap navigation-bar-safe ${className}`}>
```

إضافة classes للأزرار:
```tsx
<Button 
  variant="ghost" 
  size="sm" 
  onClick={handleBack}
  className="gap-1.5 hover:bg-primary/10 relative z-[51] pointer-events-auto"
>

<Button 
  variant="outline" 
  size="sm" 
  asChild
  className="gap-1.5 relative z-[51] pointer-events-auto"
>
```

### 3. تحديث `Breadcrumbs.tsx`

إضافة class `breadcrumb-safe` للـ Breadcrumb:

```tsx
// من:
<Breadcrumb>

// إلى:
<Breadcrumb className="breadcrumb-safe">
```

إضافة classes للروابط:
```tsx
<Link 
  to={route.path} 
  className="flex items-center gap-1.5 hover:text-primary transition-colors text-muted-foreground relative z-[46] pointer-events-auto"
>
```

### 4. تحديث `NewProjectPage.tsx`

إضافة class `form-card-safe` للـ Card و `breadcrumb-safe` للـ Breadcrumb:

```tsx
// للـ Breadcrumb المحلي
<Breadcrumb className="breadcrumb-safe">

// للـ Card
<Card className="form-card-safe">
```

إضافة حماية للـ Select:
```tsx
<SelectTrigger className="relative z-[55] pointer-events-auto">
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/ui/dialog-custom.css` | إضافة CSS classes للتنقل والنماذج |
| `src/components/NavigationBar.tsx` | إضافة `navigation-bar-safe` وحماية الأزرار |
| `src/components/Breadcrumbs.tsx` | إضافة `breadcrumb-safe` وحماية الروابط |
| `src/pages/NewProjectPage.tsx` | إضافة `form-card-safe` وحماية القوائم المنسدلة |

---

## التغييرات التفصيلية

### ملف `dialog-custom.css`

إضافة في نهاية الملف:

```css
/* ============================================
   NAVIGATION BAR PROTECTION
   Ensure navigation buttons are always clickable
   ============================================ */

.navigation-bar-safe {
  position: relative;
  z-index: 50;
  pointer-events: auto !important;
}

.navigation-bar-safe button,
.navigation-bar-safe a {
  position: relative;
  z-index: 51;
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* ============================================
   BREADCRUMB PROTECTION
   Ensure breadcrumb links are always clickable
   ============================================ */

.breadcrumb-safe {
  position: relative;
  z-index: 45;
  pointer-events: auto !important;
}

.breadcrumb-safe a,
.breadcrumb-safe [role="link"] {
  position: relative;
  z-index: 46;
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* ============================================
   FORM CARD PROTECTION
   Ensure form elements in cards are always interactive
   ============================================ */

.form-card-safe {
  position: relative;
  z-index: 10;
}

.form-card-safe [data-radix-select-trigger] {
  position: relative;
  z-index: 55;
  pointer-events: auto !important;
  cursor: pointer !important;
}

.form-card-safe input,
.form-card-safe textarea,
.form-card-safe button:not([data-radix-select-trigger]) {
  position: relative;
  z-index: 20;
  pointer-events: auto !important;
}

.form-card-safe label {
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

### ملف `NavigationBar.tsx`

**التغيير 1:** إضافة class للـ container (سطر 31):
```tsx
<div className={`flex items-center gap-2 mb-4 flex-wrap navigation-bar-safe ${className}`} dir={isArabic ? "rtl" : "ltr"}>
```

**التغيير 2:** إضافة classes لزر الرجوع (سطر 33-37):
```tsx
<Button 
  variant="ghost" 
  size="sm" 
  onClick={handleBack}
  className="gap-1.5 hover:bg-primary/10 relative z-[51] pointer-events-auto"
>
```

**التغيير 3:** إضافة classes لزر الرئيسية (سطر 50-54):
```tsx
<Button 
  variant="outline" 
  size="sm" 
  asChild
  className="gap-1.5 relative z-[51] pointer-events-auto"
>
```

### ملف `Breadcrumbs.tsx`

**التغيير 1:** إضافة class للـ Breadcrumb (سطر 198):
```tsx
<Breadcrumb className="breadcrumb-safe">
```

**التغيير 2:** إضافة classes للروابط (سطر 219-222):
```tsx
<Link 
  to={route.path} 
  className="flex items-center gap-1.5 hover:text-primary transition-colors text-muted-foreground relative z-[46] pointer-events-auto"
>
```

### ملف `NewProjectPage.tsx`

**التغيير 1:** إضافة class للـ Breadcrumb (سطر 152):
```tsx
<Breadcrumb className="breadcrumb-safe">
```

**التغيير 2:** إضافة classes للروابط داخل Breadcrumb (سطر 155-159):
```tsx
<Link to="/" className="flex items-center gap-1 relative z-[46] pointer-events-auto">
```

**التغيير 3:** إضافة class للـ Card (سطر 193):
```tsx
<Card className="form-card-safe">
```

**التغيير 4:** إضافة classes للـ SelectTrigger (سطر 246 و 269):
```tsx
<SelectTrigger className="relative z-[55] pointer-events-auto">
```

**التغيير 5:** إضافة classes لزر الرجوع (سطر 176):
```tsx
<Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="relative z-[51] pointer-events-auto">
```

---

## النتيجة المتوقعة

### قبل الإصلاح:
- أزرار Back و Home لا تستجيب
- روابط المسار لا تعمل
- قوائم Currency و Project Type لا تفتح

### بعد الإصلاح:
- جميع أزرار التنقل تعمل فوراً
- روابط المسار تنقل للصفحات المطلوبة
- القوائم المنسدلة تفتح وتسمح بالاختيار
- النموذج بالكامل تفاعلي وسلس

---

## ملاحظات تقنية

1. **تسلسل z-index:**
   - Dialog Overlay: z-99
   - Dialog Content: z-100
   - Select Content: z-70
   - Select Trigger: z-55
   - Navigation Buttons: z-51
   - Navigation Bar: z-50
   - Breadcrumb Links: z-46
   - Breadcrumb Container: z-45
   - Form Inputs: z-20
   - Form Card: z-10

2. **التوافق مع المعايير الحالية:**
   - جميع التغييرات تتبع نفس الأنماط المُستخدمة في:
     - `tender-card-safe`
     - `tabs-navigation-safe`
     - `reports-card-safe`

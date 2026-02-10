
# معالجة الخطأ وإضافة رابط المستخلصات

## 1. معالجة خطأ "Cannot read properties of null (reading 'toLocaleString')"

### السبب
دالة `formatCurrency` في عدة ملفات تستدعي `value.toLocaleString()` بدون التحقق من أن `value` ليست `null`. كذلك Recharts Tooltip يمكن أن يمرر قيم `null`.

### الملفات المتأثرة والتعديلات

| الملف | التعديل |
|-------|---------|
| `src/pages/HomePage.tsx` | إضافة حماية null في `formatCurrency` و `formatDate` و Tooltip formatter |
| `src/components/home/HeroSection.tsx` | إضافة حماية null في `formatCurrency` |
| `src/components/MainDashboardOverview.tsx` | إضافة حماية null في `formatCurrency` |

### التعديل المطلوب

تغيير `formatCurrency` من:
```typescript
const formatCurrency = (value: number) => {
  ...
  return value.toLocaleString();
};
```

إلى:
```typescript
const formatCurrency = (value: number) => {
  if (value == null) return '0';
  ...
  return value.toLocaleString();
};
```

تغيير `formatDate` لتقبل null:
```typescript
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  ...
};
```

تغيير Recharts Tooltip formatter لتقبل null:
```typescript
<Tooltip formatter={(value: number) => formatCurrency(value ?? 0)} />
```

---

## 2. إضافة رابط المستخلصات

### الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/components/home/PhaseActionsGrid.tsx` | إضافة رابط المستخلصات في المرحلة 4 (العقود والتنفيذ) |
| `src/pages/HomePage.tsx` | إضافة رابط المستخلصات في قسم Quick Access (mainModules) |

### التفاصيل

**PhaseActionsGrid (المرحلة 4)** - إضافة عنصر جديد:
- Icon: `FileText`
- Label: المستخلصات / Progress Certificates
- Description: مستخلصات المقاولين / Contractor invoices
- href: `/progress-certificates`
- isNew: true

**mainModules في HomePage** - إضافة عنصر جديد:
- Icon: `FileText`
- Label: المستخلصات / Certificates
- href: `/progress-certificates`

---

## خطوات التنفيذ

1. إصلاح null safety في `formatCurrency` و `formatDate` في `HomePage.tsx`
2. إصلاح null safety في `HeroSection.tsx` و `MainDashboardOverview.tsx`
3. إضافة رابط المستخلصات في `PhaseActionsGrid.tsx` (المرحلة 4)
4. إضافة رابط المستخلصات في `mainModules` بالصفحة الرئيسية

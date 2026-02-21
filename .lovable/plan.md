

# تحسين صفحة تفاصيل المشروع - التبويبات والربط التاريخي ودقة التسعير

## المشاكل المكتشفة

### 1. التبويبات لا تعمل
التبويبات الخمسة (نظرة عامة، جدول الكميات، تحليل متقدم، المستندات، الاعدادات) تستخدم `grid-cols-5` مع نصوص طويلة مما يسبب تكدس على الشاشات الصغيرة. بالاضافة لمشكلة z-index محتملة مع `ProjectHeader`.

### 2. عدم وجود ربط مع المشاريع التاريخية
صفحة تفاصيل المشروع لا تربط بنود BOQ مع قاعدة البيانات التاريخية (`historical_pricing_files` و `saved_projects`) للمقارنة والتسعير.

### 3. عدم وجود حقول المنطقة/المدينة
الاعدادات تحتوي على حقل "موقع المشروع" كنص حر فقط، بدون محددات المنطقة والمدينة (كما في الصورة المرفقة).

---

## الحلول

### 1. اصلاح التبويبات

**الملف:** `src/pages/ProjectDetailsPage.tsx`

- تحويل `TabsList` من `grid-cols-5` الى `inline-flex` مع `overflow-x-auto` للسماح بالتمرير الافقي على الشاشات الصغيرة
- اضافة `className="tabs-navigation-safe"` اضافي للتأكد من عمل التبويبات
- تقصير نصوص التبويبات على الشاشات الصغيرة

### 2. اضافة تبويب "التسعير التاريخي" في نظرة عامة المشروع

**الملف:** `src/components/project-details/ProjectOverviewTab.tsx`

- اضافة قسم جديد "مقارنة الاسعار التاريخية" يعرض ملخص المطابقة مع المشاريع السابقة
- زر "مقارنة شاملة" يفتح `BulkHistoricalPricing` dialog
- زر "بحث تاريخي" لبند محدد يفتح `HistoricalPriceLookup`
- عرض عدد البنود المتطابقة مع مشاريع سابقة واحصائيات الاسعار

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

- اضافة زر "تسعير تاريخي" في شريط ادوات جدول الكميات
- اضافة خيار "بحث تاريخي" في قائمة خيارات كل بند

### 3. اضافة حقول المنطقة والمدينة في الاعدادات

**الملف:** `src/components/project-details/types.ts`

- اضافة `region` و `city` الى `EditFormData`
- اضافة قائمة المناطق والمدن (السعودية، الامارات، مصر، إلخ)

**الملف:** `src/components/project-details/ProjectSettingsTab.tsx`

- استبدال حقل "الموقع" النصي بـ Select للمنطقة و Select للمدينة (كما في الصورة)
- المدن تتغير تلقائياً بناءً على المنطقة المختارة
- دعم المناطق: السعودية (الرياض، جدة، الدمام...)، مصر، الامارات، الكويت، قطر، البحرين، عمان

**الملف:** `src/pages/ProjectDetailsPage.tsx`

- تمرير `region` و `city` من `editForm` الى `ProjectSettingsTab`
- حفظ المنطقة والمدينة في `analysis_data.project_info`

### 4. تحسين دقة التسعير عبر الموقع

**الملف:** `src/components/project-details/AutoPriceDialog.tsx`

- استخدام موقع المشروع (المنطقة/المدينة) لتحسين دقة مطابقة الاسعار
- اعطاء اولوية للبنود من مشاريع في نفس المنطقة

---

## التفاصيل التقنية

### تعديل types.ts

```typescript
// اضافة region و city
export interface EditFormData {
  name: string;
  currency: string;
  description: string;
  project_type: string;
  location: string;
  region: string;
  city: string;
  client_name: string;
  status: string;
}

// قائمة المناطق والمدن
export const regions = [
  { value: "SA", label: { ar: "المملكة العربية السعودية", en: "Saudi Arabia" } },
  { value: "AE", label: { ar: "الإمارات", en: "UAE" } },
  { value: "EG", label: { ar: "مصر", en: "Egypt" } },
  // ...
];

export const citiesByRegion: Record<string, Array<{ value: string; label: { ar: string; en: string } }>> = {
  SA: [
    { value: "riyadh", label: { ar: "الرياض", en: "Riyadh" } },
    { value: "jeddah", label: { ar: "جدة", en: "Jeddah" } },
    // ...
  ],
  // ...
};
```

### تعديل TabsList

```typescript
// من
<TabsList className="grid w-full grid-cols-5 mb-6">

// الى
<TabsList className="flex w-full overflow-x-auto mb-6 tabs-navigation-safe">
```

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/ProjectDetailsPage.tsx` | اصلاح TabsList + تمرير region/city |
| `src/components/project-details/types.ts` | اضافة region/city + قوائم المناطق |
| `src/components/project-details/ProjectSettingsTab.tsx` | Select للمنطقة والمدينة |
| `src/components/project-details/ProjectOverviewTab.tsx` | قسم المقارنة التاريخية |
| `src/components/project-details/ProjectBOQTab.tsx` | زر التسعير التاريخي |

### لا تغييرات على قاعدة البيانات

البيانات الجديدة (region/city) تُخزن في `analysis_data.project_info` الموجود حالياً.


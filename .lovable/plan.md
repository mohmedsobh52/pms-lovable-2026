

# إضافة أنواع مرافق جديدة (Facility Types)

## المطلوب
إضافة أنواع المرافق التالية إلى قائمة الاختيار في شاشة إضافة المرافق:

| النوع الحالي | النوع المطلوب إضافته |
|---|---|
| مكاتب (Offices) | موجود |
| سكن (Accommodation) | موجود - تحديث إلى "سكن العمال" |
| مخازن (Storage) | موجود |
| معدات (Equipment) | موجود |
| مرافق عامة (Utilities) | موجود |
| أخرى (Other) | موجود |
| -- | **دورات مياه (Toilets)** |
| -- | **مولد كهربائي (Generator)** |
| -- | **مركبة (Vehicle)** |
| -- | **معدات تقليية (Heavy Equipment)** |
| -- | **اتصالات (Communications)** |

---

## التغييرات التقنية

### ملفان للتحديث

| الملف | التغيير |
|-------|---------|
| `src/components/tender/FacilitiesTab.tsx` | تحديث مصفوفة `FACILITY_TYPES` بإضافة الأنواع الجديدة |
| `src/components/tender/FacilitiesChartsReport.tsx` | تحديث `FACILITY_TYPE_LABELS` لدعم الأنواع الجديدة في التقارير |

### 1. تحديث FACILITY_TYPES في FacilitiesTab.tsx

تحديث المصفوفة من 6 عناصر إلى 11 عنصر:

```typescript
const FACILITY_TYPES = [
  { value: "office", labelAr: "مكاتب", labelEn: "Offices" },
  { value: "accommodation", labelAr: "سكن العمال", labelEn: "Workers Accommodation" },
  { value: "toilets", labelAr: "دورات مياه", labelEn: "Toilets" },
  { value: "generator", labelAr: "مولد كهربائي", labelEn: "Generator" },
  { value: "vehicle", labelAr: "مركبة", labelEn: "Vehicle" },
  { value: "storage", labelAr: "مخازن", labelEn: "Storage" },
  { value: "equipment", labelAr: "معدات", labelEn: "Equipment" },
  { value: "heavy_equipment", labelAr: "معدات ثقيلة", labelEn: "Heavy Equipment" },
  { value: "communications", labelAr: "اتصالات", labelEn: "Communications" },
  { value: "utilities", labelAr: "مرافق", labelEn: "Utilities" },
  { value: "other", labelAr: "أخرى", labelEn: "Other" },
];
```

### 2. تحديث FACILITY_TYPE_LABELS في FacilitiesChartsReport.tsx

إضافة نفس الأنواع الجديدة لضمان ظهور التسميات الصحيحة في التقارير والرسوم البيانية.

---

## خطوات التنفيذ

1. تحديث مصفوفة `FACILITY_TYPES` في `FacilitiesTab.tsx`
2. تحديث `FACILITY_TYPE_LABELS` في `FacilitiesChartsReport.tsx`
3. لا حاجة لتغييرات في قاعدة البيانات لأن النوع يُحفظ كنص حر (string)


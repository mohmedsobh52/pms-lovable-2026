

# تحسين شاشة المكتبة وإضافة أسعار مواد شبكات المياه والصرف الصحي

## 1. إضافة تصنيفات جديدة لشبكات المياه والصرف الصحي

توسيع `MATERIAL_CATEGORIES` في `useMaterialPrices.tsx` لتشمل تصنيفات فرعية متخصصة:

| التصنيف | الوصف بالعربي | الوصف بالانجليزي |
|---------|--------------|-----------------|
| pipes_pvc | مواسير PVC/uPVC | PVC/uPVC Pipes |
| pipes_hdpe | مواسير HDPE | HDPE Pipes |
| pipes_di | مواسير حديد دكتايل | Ductile Iron Pipes |
| pipes_grp | مواسير GRP | GRP/FRP Pipes |
| pipes_concrete | مواسير خرسانية | Concrete Pipes |
| pipes_steel | مواسير حديد | Steel Pipes |
| fittings_valves | وصلات ومحابس | Fittings & Valves |
| manholes | غرف تفتيش | Manholes |
| water_tanks | خزانات مياه | Water Tanks |
| pumps_stations | مضخات ومحطات | Pumps & Stations |
| water_treatment | معالجة مياه | Water Treatment |

## 2. إضافة بيانات أسعار شاملة (~80 مادة)

إضافة مصفوفة `WATER_SEWAGE_MATERIALS` في `useSampleLibraryData.tsx` تتضمن:

**مواسير uPVC (صرف صحي):**
- uPVC 110mm, 160mm, 200mm, 250mm, 315mm, 400mm - بالمتر الطولي

**مواسير HDPE (مياه):**
- HDPE PE100 PN10/PN16 بأقطار 63mm حتى 630mm

**مواسير حديد دكتايل (DI):**
- DN100 حتى DN600 - Class K9

**وصلات ومحابس:**
- Gate Valve, Butterfly Valve, Check Valve, Air Release Valve
- Tee, Elbow, Reducer, Coupling - بمختلف الأقطار

**غرف التفتيش:**
- غرف خرسانية جاهزة بأعماق مختلفة (1م، 1.5م، 2م، 3م)
- أغطية حديد زهر (Heavy/Light Duty)

**معدات:**
- مضخات غاطسة، مضخات طرد مركزي
- خزانات مياه (GRP, خرسانية)

## 3. تحسين أداء شاشة المكتبة

### أ. إضافة فلتر التصنيف في MaterialsTab
- إضافة `Select` للتصفية حسب التصنيف بجانب حقل البحث
- تجميع التصنيفات في مجموعات (عام، مواسير، شبكات) باستخدام `SelectGroup`

### ب. إضافة ترقيم الصفحات (Pagination)
- عرض 25 مادة في كل صفحة بدلاً من عرض الكل
- استخدام `usePagination` الموجود في المشروع

### ج. تحسين الأداء بالـ Memoization
- `React.memo` على `MaterialsTab`
- `useMemo` للقوائم المفلترة

## 4. زر مخصص لإضافة بيانات شبكات المياه والصرف

إضافة زر "إضافة مواد الشبكات" في حالة المكتبة الفارغة وفي الحالة العادية، يضيف ~80 مادة متخصصة بأسعار السوق السعودي (2025).

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/hooks/useMaterialPrices.tsx` | إضافة تصنيفات جديدة لشبكات المياه |
| `src/hooks/useSampleLibraryData.tsx` | إضافة ~80 مادة شبكات مياه وصرف صحي |
| `src/components/library/MaterialsTab.tsx` | فلتر تصنيف + ترقيم صفحات + memoization |
| `src/components/LibraryDatabase.tsx` | زر إضافة مواد الشبكات |

### نموذج البيانات الجديدة

```typescript
// مثال على مادة من البيانات الجديدة
{
  name: "uPVC Pipe 200mm SN4",
  name_ar: "ماسورة يو بي في سي 200مم SN4",
  category: "pipes_pvc",
  unit: "m",
  unit_price: 45,
  brand: "Amiantit",
  specifications: "SN4, SDR41, Wall thickness 4.9mm"
}
```

### فلتر التصنيف في MaterialsTab

```typescript
// تجميع التصنيفات في مجموعات
const CATEGORY_GROUPS = [
  { label: "عام", categories: ["concrete", "steel", "cement", ...] },
  { label: "مواسير", categories: ["pipes_pvc", "pipes_hdpe", "pipes_di", ...] },
  { label: "شبكات", categories: ["fittings_valves", "manholes", "pumps_stations", ...] },
];
```

### ترقيم الصفحات

```typescript
const ITEMS_PER_PAGE = 25;
const [currentPage, setCurrentPage] = useState(1);
const paginatedMaterials = filteredMaterials.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE
);
```


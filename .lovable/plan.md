
# تحسين شامل لشاشة المكتبة - المواد والعمالة والمعدات

## الملخص
تحسين أداء وتجربة استخدام شاشة المكتبة الكاملة عبر إضافة تصنيفات متقدمة لتبويبي العمالة والمعدات (مطابقة لما تم في المواد)، وإضافة ترقيم صفحات ومذكرة أداء (memoization)، وتوسيع بيانات العمالة والمعدات المتخصصة لأعمال شبكات المياه والصرف الصحي، مع تعزيز الربط مع نظام التسعير.

---

## 1. تحسين تبويب العمالة (LaborTab)

### أ. إضافة تصنيفات جديدة للعمالة المتخصصة
توسيع `LABOR_CATEGORIES` في `useLaborRates.tsx` لتشمل:

| التصنيف | العربي | الانجليزي |
|---------|--------|----------|
| pipe_fitter | فني مواسير | Pipe Fitter |
| surveyor | مساح | Surveyor |
| driver | سائق | Driver |
| safety_officer | مسؤول سلامة | Safety Officer |
| foreman | ملاحظ/فورمان | Foreman |
| diver | غواص | Diver |
| insulator | عازل | Insulator |

### ب. إضافة فلتر تصنيف + ترقيم صفحات + memoization
- إضافة `Select` لتصفية العمالة حسب التصنيف (مثل المواد)
- إضافة ترقيم صفحات (25 عنصر/صفحة)
- تغليف المكون بـ `React.memo` واستخدام `useMemo` للقوائم المفلترة

### ج. إضافة بيانات عمالة متخصصة (~15 عنصر جديد)
في `useSampleLibraryData.tsx` توسيع `SAMPLE_LABOR` بعمالة شبكات المياه:
- فني مواسير HDPE، فني لحام مواسير، فني محابس
- مساح، غواص صيانة شبكات
- مشغل مضخات، فني معالجة مياه
- ملاحظ أعمال شبكات

---

## 2. تحسين تبويب المعدات (EquipmentTab)

### أ. إضافة تصنيفات جديدة للمعدات المتخصصة
توسيع `EQUIPMENT_CATEGORIES` في `useEquipmentRates.tsx`:

| التصنيف | العربي | الانجليزي |
|---------|--------|----------|
| trencher | حفارة خنادق | Trencher |
| dewatering | نزح مياه | Dewatering |
| pipe_laying | تمديد مواسير | Pipe Laying |
| testing | فحص واختبار | Testing |
| survey | مساحة | Survey |
| compressor | ضاغط هواء | Air Compressor |

### ب. إضافة فلتر تصنيف + ترقيم صفحات + memoization
- نفس نمط المواد: `Select` للتصنيف + pagination + `React.memo`

### ج. إضافة بيانات معدات متخصصة (~15 عنصر جديد)
في `useSampleLibraryData.tsx` توسيع `SAMPLE_EQUIPMENT`:
- حفارة خنادق، ماكينة لحام HDPE
- مضخة نزح مياه، ماكينة اختبار ضغط
- رافعة أنابيب (Pipe Layer)
- جهاز كشف تسربات، جهاز CCTV لفحص المواسير

---

## 3. توسيع بيانات العينة لتشمل كافة التخصصات

### إضافة دالة `addNetworkLaborEquipment` في `useSampleLibraryData.tsx`
- تضيف ~15 عمالة متخصصة + ~15 معدة متخصصة لأعمال الشبكات
- زر مخصص في `LibraryDatabase.tsx` لإضافة "عمالة ومعدات الشبكات"

---

## 4. تعزيز الربط مع التسعير

### تحسين دوال المطابقة في hooks العمالة والمعدات
- تحسين `findMatchingRate` في `useLaborRates.tsx` و `useEquipmentRates.tsx`
- إضافة `findAllMatchingRates` (مشابهة لـ `findAllMatchingPrices` في المواد) لدعم اقتراحات متعددة
- هذا يحسن تلقائياً أداء حوار التسعير السريع (`QuickPriceDialog`) الذي يستخدم هذه الـ hooks

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/hooks/useLaborRates.tsx` | تصنيفات جديدة + `findAllMatchingRates` |
| `src/hooks/useEquipmentRates.tsx` | تصنيفات جديدة + `findAllMatchingRates` |
| `src/components/library/LaborTab.tsx` | فلتر تصنيف + pagination + memo |
| `src/components/library/EquipmentTab.tsx` | فلتر تصنيف + pagination + memo |
| `src/hooks/useSampleLibraryData.tsx` | بيانات عمالة ومعدات شبكات جديدة |
| `src/components/LibraryDatabase.tsx` | زر إضافة عمالة ومعدات الشبكات |

### نمط فلتر التصنيف (LaborTab / EquipmentTab)

```typescript
// فلتر التصنيف بجانب البحث
const [categoryFilter, setCategoryFilter] = useState<string>("all");
const ITEMS_PER_PAGE = 25;

const filteredItems = useMemo(() => {
  return items.filter(item => {
    if (!matchesSearch) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (validityFilter) { /* ... */ }
    return true;
  });
}, [items, search, categoryFilter, validityFilter]);

const paginatedItems = useMemo(() => {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  return filteredItems.slice(start, start + ITEMS_PER_PAGE);
}, [filteredItems, currentPage]);
```

### دالة المطابقة المتعددة (findAllMatchingRates)

```typescript
const findAllMatchingRates = (description: string, category?: string, limit = 5) => {
  const descLower = description.toLowerCase();
  const searchTerms = descLower.split(/[\s,،.-]+/).filter(t => t.length > 2);
  
  const scored = rates.map(rate => {
    const rateText = (rate.name + ' ' + (rate.name_ar || '')).toLowerCase();
    let score = 0;
    if (rateText.includes(descLower)) score += 50;
    for (const term of searchTerms) {
      if (rateText.includes(term)) score += 10;
    }
    if (category && rate.category === category) score += 15;
    return { rate, score };
  });
  
  return scored.filter(s => s.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit).map(s => s.rate);
};
```

### عمالة الشبكات الجديدة (نموذج)

```typescript
{ code: "L011", name: "HDPE Pipe Fitter", name_ar: "فني مواسير HDPE", 
  category: "pipe_fitter", skill_level: "skilled", unit_rate: 350 },
{ code: "L012", name: "Pipe Welder (Butt Fusion)", name_ar: "لحام مواسير (لحام حراري)", 
  category: "welder", skill_level: "skilled", unit_rate: 400 },
```

### معدات الشبكات الجديدة (نموذج)

```typescript
{ code: "E011", name: "HDPE Butt Fusion Machine 315mm", name_ar: "ماكينة لحام HDPE 315مم", 
  category: "pipe_laying", rental_rate: 1200 },
{ code: "E012", name: "Dewatering Pump 6 inch", name_ar: "مضخة نزح مياه 6 بوصة", 
  category: "dewatering", rental_rate: 500 },
```

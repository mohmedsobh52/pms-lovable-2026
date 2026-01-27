
# خطة تحسين شاشة تقرير مراقبة التكاليف (Cost Control Report)

## نظرة عامة

تحسين شامل لصفحة Cost Control Report لتطابق التصميم المرجعي من Google Sheets مع:
- ربط البيانات الحقيقية من قاعدة البيانات (project_items)
- تحسين الشكل والأداء
- إضافة جدول بيانات تفصيلي
- دعم التصفية الديناميكية
- تصدير Excel

---

## التغييرات المطلوبة

### 1. إعادة هيكلة الصفحة

**الملف:** `src/pages/CostControlReportPage.tsx`

#### أ. بيانات الـ EVM الكاملة من الـ Spreadsheet:
```typescript
interface EVMActivity {
  sn: number;
  controlPoint: string;
  activity: string;
  discipline: string;
  activityCode: string;
  pv: number;
  progress: number;
  ev: number;
  ac: number;
  cv: number;
  sv: number;
  cpi: number;
  spi: number;
  eac1: number;
  eac2: number;
  eac3: number;
  eacByPert: number;
  etc: number;
  tcpi: number;
}
```

#### ب. الـ Disciplines الكاملة:
- GENERAL
- CIVIL
- MECHANICAL
- ELECTRICAL
- ARCHITECTURAL

#### ج. الـ Activities (82+ نشاط) من البيانات:
- Staff Salaries, Site overhead, Safety and Environmental
- Excavation, Backfilling, Plain/Lean Concrete
- Water Supply System, HVAC, Fire Fighting
- Lighting Fixtures, Wiring Devices, Distribution Panels
- Wooden Doors, Metal Doors, Aluminum Windows
- ... وغيرها

---

### 2. تحسين واجهة المستخدم

#### أ. Header Banner محسن:
```tsx
<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-2xl">
  <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
  <div className="relative">
    <h1 className="text-4xl font-bold tracking-tight">
      Cost Control Report
    </h1>
    <p className="mt-2 text-blue-100">
      Comprehensive earned value and cost performance analysis
    </p>
  </div>
</div>
```

#### ب. KPI Cards محسنة مع ألوان متدرجة:

| المؤشر | اللون | القيمة |
|--------|-------|--------|
| PV | أزرق | 168.5M |
| EV | أخضر | 105.3M |
| AC | برتقالي/أصفر | 107.0M |
| EAC BY PERT | بنفسجي | 164.0M |
| ETC | أحمر | 57.1M |
| SPI | أصفر (تحذير) | 0.60 |
| CPI | أخضر | 0.98 |
| TCPI | أزرق | 0.90 |
| Progress | رمادي | 60% |

#### ج. Sidebar محسن:
- Progress bars ملونة بجانب كل discipline/activity
- ألوان ديناميكية حسب النسبة:
  - أخضر: >= 75%
  - أصفر: >= 50%
  - أحمر: < 50%

---

### 3. جدول البيانات التفصيلي (Data Table)

إضافة جدول محترف أسفل الـ Chart يعرض:

| العمود | الوصف |
|--------|-------|
| # | رقم تسلسلي |
| Activity | اسم النشاط |
| Progress % | نسبة الإنجاز (مع progress bar) |
| PV | Planned Value |
| EV | Earned Value |
| AC | Actual Cost |
| EAC BY PERT | التقدير عند الإنتهاء |
| ETC | التقدير للإنتهاء |

**مميزات الجدول:**
- Pagination (عرض 10-15 صف في الصفحة)
- Sorting (ترتيب حسب أي عمود)
- Sticky header
- تلوين الخلايا حسب القيم (أحمر للسلبي، أخضر للإيجابي)
- تنسيق الأرقام (M للملايين، K للآلاف)

---

### 4. تحسين الـ Chart

#### أ. ألوان محدثة تطابق التصميم:
```typescript
const chartColors = {
  eacByPert: 'hsl(45, 93%, 47%)',    // ذهبي/بيج
  pv: 'hsl(32, 36%, 44%)',           // بني
  ev: 'hsl(35, 30%, 58%)',           // بيج فاتح
  ac: 'hsl(38, 25%, 65%)'            // رمادي بيج
};
```

#### ب. تحسين Tooltip:
- عرض جميع القيم
- تنسيق الأرقام بالملايين
- ألوان واضحة

#### ج. تحسين Legend:
- موضع أعلى الـ Chart
- نقاط ملونة

---

### 5. ربط البيانات مع قاعدة البيانات

#### أ. جلب البيانات من project_items:
```typescript
const fetchProjectData = async () => {
  const { data } = await supabase
    .from('project_items')
    .select('*')
    .eq('project_id', selectedProjectId);
  
  // حساب مؤشرات EVM
  const evmData = calculateEVMMetrics(data);
  setActivityData(evmData);
};
```

#### ب. حسابات EVM:
```typescript
const calculateEVMMetrics = (items) => {
  const totalPV = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const avgProgress = items.reduce((sum, item) => sum + (item.progress || 0), 0) / items.length;
  const totalEV = totalPV * (avgProgress / 100);
  const totalAC = totalEV * 1.015; // 1.5% cost variance assumed
  
  return {
    pv: totalPV,
    ev: totalEV,
    ac: totalAC,
    cv: totalEV - totalAC,
    sv: totalEV - totalPV,
    cpi: totalEV / totalAC,
    spi: totalEV / totalPV,
    eacByPert: calculateEACByPERT(totalAC, totalPV, avgProgress),
    etc: calculateETC(totalPV, totalAC, avgProgress)
  };
};
```

---

### 6. التصفية الديناميكية

#### أ. تصفية حسب Discipline:
```typescript
const filteredActivities = useMemo(() => {
  let filtered = allActivities;
  
  if (selectedDisciplines.length > 0) {
    filtered = filtered.filter(a => 
      selectedDisciplines.includes(a.discipline)
    );
  }
  
  if (selectedActivities.length > 0) {
    filtered = filtered.filter(a => 
      selectedActivities.includes(a.id)
    );
  }
  
  return filtered;
}, [allActivities, selectedDisciplines, selectedActivities]);
```

#### ب. تحديث الـ KPIs والـ Chart تلقائياً:
- عند تغيير الفلتر، يتم إعادة حساب جميع المؤشرات
- الـ Chart يعكس البيانات المفلترة فقط

---

### 7. تصدير Excel

```typescript
const exportToExcel = async () => {
  const workbook = createWorkbook();
  
  // Sheet 1: Summary KPIs
  addJsonSheet(workbook, [
    { Metric: 'PV', Value: totals.pv },
    { Metric: 'EV', Value: totals.ev },
    { Metric: 'AC', Value: totals.ac },
    // ...
  ], 'Summary');
  
  // Sheet 2: Detailed Activities
  addJsonSheet(workbook, filteredActivities.map(a => ({
    'SN': a.sn,
    'Activity': a.activity,
    'Discipline': a.discipline,
    'Progress %': a.progress,
    'PV': a.pv,
    'EV': a.ev,
    'AC': a.ac,
    'EAC BY PERT': a.eacByPert,
    'ETC': a.etc
  })), 'Activities');
  
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), 'Cost_Control_Report.xlsx');
};
```

---

### 8. التحسينات الإضافية

#### أ. Project Selector:
- إضافة dropdown لاختيار المشروع
- جلب المشاريع من project_data

#### ب. Grand Total Row:
- صف إجمالي أسفل الجدول
- خلفية مميزة

#### ج. Pagination للجدول:
```tsx
<div className="flex items-center justify-between">
  <span>1 - 82 / 82</span>
  <div className="flex gap-1">
    <Button size="sm" variant="outline">◀</Button>
    <Button size="sm" variant="outline">▶</Button>
  </div>
</div>
```

---

## ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/CostControlReportPage.tsx` | إعادة كتابة كاملة مع بيانات حقيقية وجدول |
| `src/hooks/useLanguage.tsx` | لا تغيير (موجود) |
| `src/lib/exceljs-utils.ts` | لا تغيير (استخدام) |

---

## البنية الجديدة للصفحة

```text
┌─────────────────────────────────────────────────────────────┐
│                     Header Banner                           │
│              Cost Control Report (Gradient)                 │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  Discipline  │    ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  ☑ GENERAL   │    │  PV  │ │  EV  │ │  AC  │ │ EAC  │ │ ETC  │
│  ☑ CIVIL     │    │168.5M│ │105.3M│ │107.0M│ │164.0M│ │57.1M │
│  ☐ MECH      │    └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
│  ☐ ELEC      │                                              │
│  ☐ ARCH      │    ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│              │    │ SPI  │ │Prog %│ │ CPI  │ │ TCPI │ │Export│
│  Activity    │    │ 0.60 │ │ 60%  │ │ 0.98 │ │ 0.90 │ │ [xl] │
│  ☑ Staff     │    └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
│  ☑ Site      │                                              │
│  ☐ Lighting  │         ┌───────────────────────┐            │
│  ☐ Doors     │         │      COMBO CHART      │            │
│              │         │   (Bar + Line)        │            │
│              │         └───────────────────────┘            │
│              │                                              │
│              │    ┌───────────────────────────────────────┐ │
│              │    │        DATA TABLE                     │ │
│              │    │ # │ Activity │ Prog% │ PV │ EV │ AC  │ │
│              │    │ 1 │ Staff    │ 80%   │ 1.7│1.4 │1.4  │ │
│              │    │ 2 │ Site     │ 100%  │ 8.4│8.4 │8.5  │ │
│              │    │...│ ...      │ ...   │ ...│... │...  │ │
│              │    │   │ TOTAL    │ 60%   │168M│105M│107M │ │
│              │    └───────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────┘
```

---

## النتيجة المتوقعة

```text
✅ واجهة احترافية تطابق التصميم المرجعي
✅ بيانات حقيقية من قاعدة البيانات
✅ تصفية ديناميكية للـ Disciplines والـ Activities
✅ جدول بيانات تفصيلي مع pagination
✅ تصدير Excel كامل
✅ مؤشرات EVM محسوبة بدقة
✅ دعم ثنائي اللغة (AR/EN)
✅ أداء سريع ومستجيب
```

---

## الـ Sample Data المضمنة (82 نشاط)

سيتم تضمين البيانات الكاملة من Google Sheets:
- 12 نشاط GENERAL
- 25 نشاط CIVIL  
- 16 نشاط MECHANICAL
- 15 نشاط ELECTRICAL
- 14 نشاط ARCHITECTURAL

مع جميع مؤشرات EVM لكل نشاط:
- PV, EV, AC, CV, SV
- CPI, SPI, TCPI
- EAC1, EAC2, EAC3, EAC BY PERT
- ETC, Progress %

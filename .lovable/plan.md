
# المرحلة 3 و 4: تحسينات الأداء وواجهة المستخدم

---

## المرحلة 3: تحسينات الأداء

### 3.1 تحسين تحميل بيانات Dashboard بالتوازي

**الملف:** `src/components/MainDashboard.tsx`

حالياً `fetchDashboardData` يُنفذ استعلامات متسلسلة. التحسين:
- تنفيذ جميع الاستعلامات بالتوازي عبر `Promise.all`
- إضافة `limit(10)` للمشاريع والعروض الأخيرة
- إضافة حالة تحميل جزئية (skeleton) بدلاً من spinner كامل

### 3.2 تحسين HomePage بإزالة الاستعلامات الزائدة

**الملف:** `src/pages/HomePage.tsx`

حالياً يُنفذ 9 استعلامات منفصلة لعد السجلات. التحسين:
- تنفيذها بالتوازي (موجود بالفعل `Promise.all`)
- إضافة `staleTime` عبر تخزين مؤقت في `sessionStorage` لمدة 5 دقائق لتجنب إعادة الاستعلام عند كل تنقل

### 3.3 Lazy Loading للتبويبات الثقيلة

**الملف:** `src/pages/ProjectDetailsPage.tsx`

استخدام `React.lazy` لتحميل المكونات الثقيلة عند الحاجة فقط:
- `AnalysisResults` (تبويب التحليل)
- `ContractManagement` (تبويب العقود)
- `ComprehensiveReport` (التقارير)

```typescript
const AnalysisResults = React.lazy(() => import("@/components/AnalysisResults"));
const ContractManagement = React.lazy(() => import("@/components/ContractManagement"));
```

### 3.4 تحسين جدول BOQ للمشاريع الكبيرة

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

- تقليل عدد re-renders عبر `React.memo` للصفوف
- إضافة `useMemo` لحسابات الإحصائيات

---

## المرحلة 4: تحسينات واجهة المستخدم

### 4.1 تلوين صفوف BOQ حسب حالة التسعير

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

إضافة تلوين ديناميكي لصفوف الجدول:

```text
- أخضر فاتح (bg-green-50): البند مسعر (unit_price > 0)
- أصفر فاتح (bg-amber-50): البند مسعر جزئياً (unit_price > 0 لكن لا يوجد total)
- أحمر فاتح (bg-red-50/30): البند غير مسعر (unit_price = 0 أو null)
- بدون لون: الحالة الافتراضية
```

التطبيق في `TableRow`:
```typescript
<TableRow 
  className={cn(
    item.unit_price > 0 ? "bg-green-50/50 dark:bg-green-950/20" : 
    "bg-red-50/30 dark:bg-red-950/10"
  )}
>
```

### 4.2 إضافة Sticky Header للجدول

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

إضافة `sticky top-0 z-10 bg-background` لـ `TableHeader` ليبقى مرئياً أثناء التمرير:

```typescript
<TableHeader className="sticky top-0 z-10 bg-background border-b">
```

### 4.3 تحسين الصفحة الرئيسية بإضافة Quick Stats

**الملف:** `src/pages/HomePage.tsx`

إضافة شريط إحصائيات سريع أعلى شبكة الأقسام يعرض:
- إجمالي المشاريع مع أيقونة
- إجمالي القيمة (SAR)
- عدد البنود الإجمالي
- عدد العقود النشطة

```text
+--------------------------------------------------+
| 📊 15 مشروع | 💰 SAR 5.2M | 📋 1,240 بند | 📄 8 عقود |
+--------------------------------------------------+
|  [بطاقات الأقسام كما هي]                          |
+--------------------------------------------------+
```

### 4.4 تحسين Progress Bar في BOQ

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

إضافة ألوان متدرجة لشريط التقدم:
- أحمر (0-30%)
- أصفر (30-70%)
- أخضر (70-100%)

وإضافة نسبة البنود المؤكدة كشريط ثانوي.

### 4.5 إضافة أيقونات وتلميحات في إحصائيات BOQ

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

تحسين بطاقات الإحصائيات بإضافة:
- أيقونات ملونة لكل بطاقة
- تلميحات (tooltips) توضيحية
- تأثير hover خفيف

---

## ملخص الملفات المتأثرة

| الملف | التعديلات |
|-------|-----------|
| `src/components/project-details/ProjectBOQTab.tsx` | تلوين الصفوف، sticky header، تحسين progress bar، أيقونات الإحصائيات |
| `src/pages/ProjectDetailsPage.tsx` | Lazy loading للمكونات الثقيلة |
| `src/pages/HomePage.tsx` | Quick Stats strip، تخزين مؤقت للأعداد |
| `src/components/MainDashboard.tsx` | تحسين التحميل بالتوازي، skeleton loading |

## النتيجة المتوقعة

- تقليل وقت تحميل الصفحة الرئيسية بنسبة ~40%
- تحسين تجربة التصفح في جداول BOQ الكبيرة
- واجهة أكثر احترافية مع ألوان وأيقونات دالة على حالة البنود
- تقليل حجم الحزمة المبدئية عبر code splitting

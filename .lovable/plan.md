

# ربط Bulk Historical Pricing بالمشاريع التاريخية المسجلة

## المشكلة الحالية

المكوّن `BulkHistoricalPricing` يبحث في مصدرين فقط:
1. `historical_pricing_files` (جدول الملفات التاريخية)
2. `saved_projects` (جدول المشاريع المحفوظة القديم)

لكنه **لا يبحث في**:
- `project_data` + `project_items` (المشاريع المسجلة الحالية التي تحتوي على بنود مفصّلة ومسعّرة)

كما أن خوارزمية المطابقة بسيطة ولا تستفيد من الوصف العربي (`description_ar`) أو الفئة (`category`).

## الحل

### الملف: `src/components/BulkHistoricalPricing.tsx`

#### 1. إضافة مصدر بيانات ثالث: `project_data` + `project_items`

استعلام البنود من `project_items` مع أسماء المشاريع من `project_data` (باستثناء المشروع الحالي):

```text
// Fetch project_items with project names (exclude current project)
const { data: projectItems } = await supabase
  .from("project_items")
  .select("description, description_ar, unit, unit_price, quantity, category, project_id, project_data!inner(name)")
  .gt("unit_price", 0)
  .neq("is_section", true);
```

#### 2. تحسين خوارزمية المطابقة

- مطابقة `description_ar` بالإضافة إلى `description`
- مكافأة إضافية عند تطابق `category`
- وزن أعلى للمشاريع الموثقة (`is_verified`)

```text
// Enhanced similarity with Arabic support
const textScore = Math.max(
  calculateTextSimilarity(boqItem.description, hi.desc),
  calculateTextSimilarity(boqItem.description, hi.descAr || "")
);
const unitBonus = sameUnit ? 0.15 : 0;
const categoryBonus = sameCategory ? 0.1 : 0;
const verifiedBonus = hi.verified ? 0.05 : 0;
const score = textScore * 0.7 + unitBonus + categoryBonus + verifiedBonus;
```

#### 3. إضافة prop `currentProjectId` لاستثناء المشروع الحالي

```text
interface BulkHistoricalPricingProps {
  items: BOQItem[];
  onApplyPrices: (prices: Array<{ itemNumber: string; price: number }>) => void;
  currency: string;
  currentProjectId?: string; // new - exclude from results
}
```

#### 4. عرض مصدر البيانات في الجدول

إضافة عمود "المصدر" يوضح من أين جاء السعر (تاريخي / مشروع محفوظ / مشروع حالي) مع badge ملون.

#### 5. تحسين الشكل

- إضافة أيقونة المصدر بجانب اسم المشروع
- تلميحات (tooltips) على الأوصاف المقتطعة
- عرض الفئة والوصف العربي عند توفرهما

### الملف: `src/components/AnalysisResults.tsx`

تمرير `currentProjectId` (من `savedProjectId`) إلى `BulkHistoricalPricing`:

```text
<BulkHistoricalPricing
  items={data.items || []}
  onApplyPrices={...}
  currency={...}
  currentProjectId={savedProjectId}
/>
```

## التفاصيل التقنية

### تعديل `BulkMatch` interface

```text
interface BulkMatch {
  // ... existing fields
  source: "historical" | "saved" | "project"; // new
  descriptionAr?: string; // new
  category?: string; // new
}
```

### مصادر البيانات الثلاثة

```text
المصدر 1: historical_pricing_files (ملفات تاريخية مرفوعة)
المصدر 2: saved_projects (مشاريع محفوظة قديمة - analysis_data.items)
المصدر 3: project_items + project_data (بنود المشاريع الحالية المسعّرة)
```

### ترتيب الأولوية

عند وجود عدة تطابقات لنفس البند:
1. بنود من مشاريع موثقة (`is_verified`) تحصل على أولوية أعلى
2. بنود من `project_items` (مسعّرة تفصيلياً) تحصل على وزن إضافي
3. أحدث المشاريع تحصل على أفضلية طفيفة

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/BulkHistoricalPricing.tsx` | إضافة مصدر `project_items`، تحسين المطابقة، عرض المصدر |
| `src/components/AnalysisResults.tsx` | تمرير `currentProjectId` |


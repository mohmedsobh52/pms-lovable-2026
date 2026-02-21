

# تحديث القيمة الإجمالية (Value) لتظهر بشكل صحيح

## المشكلة

عند تحميل المشاريع، القيمة الإجمالية `total_value` تُستخرج من `analysis_data.summary.total_value`. إذا كانت القيمة المخزنة فاسدة (أكبر من 10 مليار)، الدالة `getSafeProjectTotal` تحاول إعادة الحساب من `analysis_data.items` لكنها تفشل أحياناً وتعرض "0 SAR".

المشكلة الأساسية: الدالة تعتمد فقط على `total_price` المخزن في كل بند، لكن بعض البنود لا تحتوي على `total_price` وإنما على `unit_price` و `quantity` فقط.

## الحل

### الملف: `src/pages/SavedProjectsPage.tsx`

#### 1. تحسين `getSafeProjectTotal` (سطر 50-74)

تحسين إعادة حساب القيمة عند التصحيح: استخدام `quantity * unit_price` كبديل عندما `total_price` غير متاح أو فاسد.

```text
function getSafeProjectTotal(project: ProjectData | null | undefined): number {
  if (!project) return 0;
  const storedTotal = project.total_value || 0;
  if (storedTotal > 0 && storedTotal < 1e10) return storedTotal;
  
  const items = project.analysis_data?.items || [];
  if (items.length === 0) return 0;
  
  let total = 0;
  for (const item of items) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const tp = parseFloat(item.total_price) || 0;
    const computed = qty * price;
    
    // استخدام القيمة المحسوبة إذا كانت متاحة، وإلا total_price
    if (computed > 0) {
      total += computed;
    } else if (tp > 0 && tp < 1e10) {
      total += tp;
    }
  }
  
  return total;
}
```

#### 2. تحسين حساب `total_value` عند تحميل المشاريع (سطر 200)

عند تحميل المشروع، حساب القيمة الإجمالية من البنود مباشرة إذا كان `summary.total_value` صفراً أو فاسداً:

```text
// سطر 199-201
const summaryTotal = analysisData?.summary?.total_value || 0;
const itemsTotal = (analysisData?.items || []).reduce((sum: number, item: any) => {
  const computed = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  const tp = parseFloat(item.total_price) || 0;
  return sum + (computed > 0 ? computed : (tp > 0 && tp < 1e10 ? tp : 0));
}, 0);
total_value: (summaryTotal > 0 && summaryTotal < 1e10) ? summaryTotal : itemsTotal,
```

#### 3. تحسين `computeSafeTotalFromItems` (سطر 82-92)

نفس المنطق: إضافة حساب `quantity * unit_price` كبديل:

```text
function computeSafeTotalFromItems(items: ProjectItem[]): number {
  return items.reduce((sum, item) => {
    const computed = (item.quantity || 0) * (item.unit_price || 0);
    const tp = item.total_price || 0;
    if (computed > 0) return sum + computed;
    if (tp > 0 && Number.isFinite(tp) && tp < 1e10) return sum + tp;
    return sum;
  }, 0);
}
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/SavedProjectsPage.tsx` | تحسين 3 دوال لحساب القيمة الصحيحة من البنود |


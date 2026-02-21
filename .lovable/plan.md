

# إصلاح القيمة الإجمالية في صفحة المشاريع + تحسين الأداء والشكل

## المشكلة الجذرية

الصفحة المعروضة هي `/projects` (ملف `SavedProjectsPage.tsx`) وليست صفحة الأسعار التاريخية. هذه الصفحة تعرض `total_value` المخزنة في قاعدة البيانات مباشرة بدون أي تنقية أو تحقق.

### أماكن العرض الخاطئ:
- **سطر 612**: بطاقة المشروع تعرض `(project.total_value || 0).toLocaleString()` مباشرة
- **سطر 764**: حوار التفاصيل يعرض `(selectedProject?.total_value || 0).toLocaleString()` مباشرة

### مصدر القيمة التالفة:
- سطر 154: `total_value: analysisData?.summary?.total_value || 0` - تُقرأ من `analysis_data.summary.total_value` المخزنة في JSON بدون تنقية

## الحل

### الملف: `src/pages/SavedProjectsPage.tsx`

#### أ. إضافة دالة تنقية القيمة الإجمالية

إضافة دالة `getSafeTotal` تحسب القيمة الصحيحة من البنود الفعلية عند وجود قيمة مشبوهة:

```text
function getSafeProjectTotal(project: ProjectData): number {
  const storedTotal = project.total_value || 0;
  
  // إذا كانت القيمة معقولة (أقل من 10 مليار)، استخدمها كما هي
  if (storedTotal >= 0 && storedTotal < 1e10) return storedTotal;
  
  // القيمة مشبوهة - حاول الحساب من البنود
  const items = project.analysis_data?.items || [];
  if (items.length === 0) return 0;
  
  let total = 0;
  for (const item of items) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const tp = parseFloat(item.total_price) || 0;
    const computed = qty * price;
    
    let safeTP = tp;
    if (computed > 0 && tp > 0 && tp / computed > 100) safeTP = computed;
    else if (computed <= 0 && tp > 1e8) safeTP = 0;
    else if (!Number.isFinite(tp) || tp > 1e12) safeTP = computed > 0 ? computed : 0;
    
    total += safeTP;
  }
  
  return total > 1e12 ? 0 : total;
}
```

#### ب. إضافة `formatLargeNumber` (نفس الدالة من صفحة الأسعار التاريخية)

```text
function formatLargeNumber(value: number, currency?: string): string {
  const suffix = currency ? ` ${currency}` : '';
  if (!Number.isFinite(value) || value < 0) return `—${suffix}`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} B${suffix}`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} M${suffix}`;
  if (value >= 1e3) return `${value.toLocaleString()}${suffix}`;
  return `${value.toFixed(2)}${suffix}`;
}
```

#### ج. تحديث بطاقات المشاريع (سطر 611-613)

```text
الحالي:
  {(project.total_value || 0).toLocaleString()} {project.currency || 'SAR'}

الجديد:
  {formatLargeNumber(getSafeProjectTotal(project), project.currency || 'SAR')}
```

#### د. تحديث حوار التفاصيل (سطر 763-764)

حساب القيمة الإجمالية من `projectItems` الفعلية بدلاً من القيمة المخزنة:

```text
الحالي:
  {(selectedProject?.total_value || 0).toLocaleString()} {selectedProject?.currency || 'SAR'}

الجديد:
  // حساب من البنود الفعلية المحملة
  const computedTotal = projectItems.reduce((sum, item) => {
    const tp = item.total_price || 0;
    const computed = (item.quantity || 0) * (item.unit_price || 0);
    let safe = tp;
    if (computed > 0 && tp > 0 && tp / computed > 100) safe = computed;
    else if (computed <= 0 && tp > 1e8) safe = 0;
    return sum + (Number.isFinite(safe) ? safe : 0);
  }, 0);
  // عرض القيمة المحسوبة
  {formatLargeNumber(computedTotal || getSafeProjectTotal(selectedProject), selectedProject?.currency || 'SAR')}
```

#### هـ. تحديث `fetchProjects` (سطر 154)

تنقية القيمة عند القراءة من قاعدة البيانات:

```text
الحالي (سطر 154):
  total_value: analysisData?.summary?.total_value || 0,

الجديد:
  total_value: analysisData?.summary?.total_value || 0,
  // (التنقية تتم عند العرض عبر getSafeProjectTotal)
```

#### و. إضافة مؤشر إصلاح تلقائي

إضافة badge تحذيري على بطاقة المشروع إذا كانت القيمة المخزنة تالفة:

```text
{(project.total_value || 0) > 1e10 && (
  <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
    تم التصحيح
  </Badge>
)}
```

### تحسينات الشكل والأداء

#### 1. تحسين بطاقات المشاريع
- إضافة تأثيرات hover أكثر سلاسة مع shadow
- إضافة أيقونات ملونة لبطاقات الإحصائيات
- تحسين شريط التسعير بألوان متدرجة

#### 2. تحسين حوار التفاصيل
- إضافة أيقونات ملونة لبطاقات الإحصائيات الثلاث
- إضافة تأثير hover للصفوف
- تحسين عرض القيمة الإجمالية بتنسيق `formatLargeNumber`

#### 3. إضافة اقتراحات ذكية في حوار التفاصيل
- اقتراح "فتح المشروع للتعديل" إذا كان هناك بنود بدون تسعير
- اقتراح "تصدير إلى Excel" مباشرة من الحوار
- اقتراح "مقارنة الأسعار التاريخية" إذا كانت هناك بنود كافية

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/SavedProjectsPage.tsx` | إضافة getSafeProjectTotal + formatLargeNumber + تحسين الشكل + اقتراحات |

## ملاحظة مهمة

هذا الإصلاح يعالج **العرض** فقط (يحسب القيمة الصحيحة من البنود عند العرض). القيمة التالفة تبقى مخزنة في قاعدة البيانات لكن لا تُعرض للمستخدم. يمكن لاحقاً إضافة إصلاح دُفعي يحدّث القيم المخزنة.


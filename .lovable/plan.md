

# إصلاح المشاكل المتبقية + تحسين الأداء والشكل - الأسعار التاريخية

## المشاكل المكتشفة

### 1. استعلام `loadFiles` لا يفلتر بـ `user_id`
استعلام العد (count) في سطر 137-139 وجلب الملفات في سطر 145-149 لا يستخدمان فلتر `user_id`، مما يعني أن المستخدم قد يرى ملفات مستخدمين آخرين (يعتمد على سياسات RLS فقط).

### 2. القيمة الإجمالية في حوار العرض قد لا تتحدث فوريا
الإصلاح التلقائي (auto-fix) في سطر 1112-1124 يعمل بشكل غير متزامن (fire-and-forget) داخل الـ render function مباشرة وليس في `useEffect`، مما قد يسبب:
- تشغيل الإصلاح عدة مرات عند كل render
- عدم تحديث `selectedFile` في الذاكرة (يحدث فقط `setFiles`)

### 3. `fixFileTotal` لا يحدث `items_count`
عند إصلاح القيمة، يتم تحديث `total_value` فقط بدون `items_count`، وقد يكون العدد خاطئاً أيضاً.

### 4. غياب `useAuth().loading` في شرط عرض الصفحة
لا يتم التحقق من `authLoading` مما قد يسبب وميض سريع لشاشة تسجيل الدخول قبل تحميل حالة المصادقة.

## الحل

### الملف: `src/pages/HistoricalPricingPage.tsx`

#### أ. إضافة فلتر `user_id` للاستعلامات (سطر 137-149)
```text
// Count query - add user_id filter
.select("id", { count: "exact", head: true })
.eq("user_id", user.id)

// Data query - add user_id filter
.select("id, file_name, ...")
.eq("user_id", user.id)
.order(...)
```

#### ب. نقل auto-fix من render إلى useEffect (سطر 1112-1124)
بدلاً من وضع منطق الإصلاح داخل الـ render function مباشرة، يتم نقله إلى `useEffect` يراقب `selectedFile`:
```text
useEffect(() => {
  if (!selectedFile || isLoadingFileItems) return;
  const normalized = normalizeHistoricalItems(selectedFile.items);
  const computedTotal = safeTotalValue(normalized);
  if (selectedFile.total_value && 
      Math.abs(computedTotal - selectedFile.total_value) > 1 &&
      (!Number.isFinite(selectedFile.total_value) || selectedFile.total_value > 1e12 || 
       (computedTotal > 0 && selectedFile.total_value / computedTotal > 100))) {
    // Update DB
    supabase.from("historical_pricing_files")
      .update({ total_value: computedTotal, items_count: normalized.length })
      .eq("id", selectedFile.id)
      .then(() => {
        setFiles(prev => prev.map(f => 
          f.id === selectedFile.id ? { ...f, total_value: computedTotal, items_count: normalized.length } : f
        ));
        // Update selectedFile too
        setSelectedFile(prev => prev ? { ...prev, total_value: computedTotal } : null);
      });
  }
}, [selectedFile?.id, isLoadingFileItems]);
```

#### ج. تحسين `fixFileTotal` (سطر 532-552)
- إضافة تحديث `items_count` بجانب `total_value`
- إضافة مؤشر تحميل أثناء الإصلاح

#### د. استخدام `authLoading` في login gate (سطر 554-577)
```text
الحالي: if (!user && !isLoading)
الجديد: if (!user && !isLoading && !authLoading)
```
مع إضافة `const { user, loading: authLoading } = useAuth();`

#### هـ. تحسين الشكل العام
- إضافة gradient خفيف لبطاقات الإحصائيات
- تحسين ظل وتأثير hover لبطاقات الملفات
- إضافة border-radius أكبر وتباعد أفضل
- تحسين أيقونات الاقتراحات في حوار العرض

### الملف: `src/lib/historical-data-utils.ts`

#### و. تعزيز `safeTotalValue` بحد إضافي
إضافة حماية إضافية: إذا كان مجموع كل البنود يتجاوز 1e12 (تريليون)، إرجاع فقط مجموع البنود التي لها `computed > 0`:
```text
export function safeTotalValue(items: NormalizedHistoricalItem[]): number {
  let total = 0;
  let safeTotal = 0; // fallback: only items with computed support
  for (const item of items) {
    const tp = item.total_price || 0;
    if (!Number.isFinite(tp) || tp > 1e12 || tp < -1e12) continue;
    const computed = (item.quantity || 0) * (item.unit_price || 0);
    let safeTP = tp;
    if (computed <= 0 && tp > 1e8) safeTP = 0;
    else if (computed > 0 && tp > 0 && tp / computed > 100) safeTP = computed;
    total += safeTP;
    if (computed > 0) safeTotal += computed;
  }
  // If total is still unreasonably large, fall back to computed-only
  if (total > 1e12) return safeTotal;
  return total;
}
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/HistoricalPricingPage.tsx` | إصلاح user_id filter + نقل auto-fix لـ useEffect + تحسين الشكل + authLoading |
| `src/lib/historical-data-utils.ts` | تعزيز safeTotalValue بـ fallback للقيم المحسوبة فقط |


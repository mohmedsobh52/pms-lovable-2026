

# إصلاح القيمة الإجمالية الخاطئة في بطاقات الملفات التاريخية

## المشكلة الحقيقية

الإصلاحات السابقة عالجت القيمة داخل حوار العرض فقط (View Dialog)، لكن **بطاقة الملف في القائمة** لا تزال تعرض `total_value` المخزن في قاعدة البيانات مباشرة (240 كوينتيليون). السبب:

1. قائمة الملفات تجلب البيانات بدون عمود `items` (لأسباب أداء)، فلا يمكن حساب `safeTotalValue` من البنود
2. شرط الإصلاح التلقائي (auto-fix) يعمل فقط عند فتح حوار العرض، لكن المستخدم يرى القيمة الخاطئة قبل أن يفتح الحوار
3. شرط الإصلاح يشترط `total_value > 1e15` لكن يجب أن يكون `> 1e12`

## الحل (3 خطوات)

### 1. تنظيف `total_value` عند عرض القائمة

في عرض بطاقة الملف، إذا كانت `total_value > 1e12` يتم عرض "قيمة غير صحيحة" مع علامة تحذير بدلاً من الرقم الضخم.

### 2. إصلاح تلقائي عند فتح حوار العرض

تخفيف شرط auto-fix من `> 1e15` إلى `> 1e12`، وإضافة تحديث فوري لقائمة `files` في الذاكرة بعد الإصلاح حتى تظهر القيمة الصحيحة فوراً بدون إعادة تحميل.

### 3. إضافة زر "إصلاح القيم" في القائمة

إضافة زر صغير بجانب القيمة الخاطئة يقوم بتحميل بنود الملف وإعادة حساب القيمة الصحيحة وتحديث قاعدة البيانات.

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/HistoricalPricingPage.tsx` | تنظيف العرض + إصلاح auto-fix + زر إصلاح |

## التفاصيل التقنية

### تنظيف عرض القيمة في البطاقة (سطر 978-982)

```text
الحالي:
  <p className="text-lg font-bold" title={file.total_value?.toLocaleString()}>
    {formatLargeNumber(file.total_value || 0)}
  </p>

الجديد:
  {file.total_value > 1e12 ? (
    <div className="flex items-center gap-1">
      <AlertTriangle className="w-4 h-4 text-amber-500" />
      <span className="text-xs text-amber-600">قيمة تحتاج إصلاح</span>
      <Button size="sm" variant="ghost" className="h-6 px-2"
        onClick={(e) => { e.stopPropagation(); fixFileTotal(file); }}>
        <RefreshCw className="w-3 h-3" />
      </Button>
    </div>
  ) : (
    <p className="text-lg font-bold">{formatLargeNumber(file.total_value || 0)}</p>
  )}
```

### دالة fixFileTotal الجديدة

```text
const fixFileTotal = async (file: HistoricalFileMeta) => {
  // 1. تحميل بنود الملف من DB
  const { data } = await supabase
    .from("historical_pricing_files")
    .select("items")
    .eq("id", file.id)
    .single();
  
  // 2. حساب القيمة الصحيحة
  const normalized = normalizeHistoricalItems(data.items);
  const correctTotal = safeTotalValue(normalized);
  
  // 3. تحديث DB
  await supabase.from("historical_pricing_files")
    .update({ total_value: correctTotal })
    .eq("id", file.id);
  
  // 4. تحديث القائمة في الذاكرة فوراً
  setFiles(prev => prev.map(f => 
    f.id === file.id ? { ...f, total_value: correctTotal } : f
  ));
  
  toast.success("تم إصلاح القيمة الإجمالية");
};
```

### تعديل شرط auto-fix (سطر 1075-1076)

```text
الحالي:
  if (selectedFile.total_value && Math.abs(computedTotal - selectedFile.total_value) > 1 && 
      (!Number.isFinite(selectedFile.total_value) || selectedFile.total_value > 1e15))

الجديد:
  if (selectedFile.total_value && Math.abs(computedTotal - selectedFile.total_value) > 1 && 
      (!Number.isFinite(selectedFile.total_value) || selectedFile.total_value > 1e12 || 
       (computedTotal > 0 && selectedFile.total_value / computedTotal > 100)))
```

وإضافة تحديث فوري لقائمة files بعد الإصلاح:

```text
supabase.from("historical_pricing_files")
  .update({ total_value: computedTotal })
  .eq("id", selectedFile.id)
  .then(() => {
    // تحديث القائمة فوراً
    setFiles(prev => prev.map(f => 
      f.id === selectedFile.id ? { ...f, total_value: computedTotal } : f
    ));
  });
```

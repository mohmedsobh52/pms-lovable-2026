

# إصلاح القيم الفاسدة - المشكلة الحقيقية والحل

## السبب الجذري

الكود السابق لا يعمل لثلاثة أسباب:

1. مشروع "رابغ" مخزن في جدول `project_data` وليس `saved_projects` - والقيمة الفاسدة في عمود `total_value` مباشرة (240,568,176,224,047,730,000)
2. لا يوجد `analysis_data.summary` أصلاً لهذا المشروع - فالكود يتحقق من `analysis_data.summary.total_value` ويجدها `0` فيتخطى المشروع
3. أسعار البنود نفسها فاسدة (مثلاً unit_price = 5,015,304,002,501,030) - فحساب `quantity * unit_price` ينتج أرقاماً خاطئة أيضاً

## الحل

### الملف: `src/pages/SavedProjectsPage.tsx`

#### 1. إضافة تنظيف أسعار البنود الفاسدة

إضافة دالة تتحقق من كل بند: إذا كان `unit_price` أكبر من حد معقول (مثلاً 10 مليون للوحدة)، يُعتبر فاسداً ويُستبدل بصفر:

```text
function sanitizeItemPrice(item: any): { quantity: number; unitPrice: number; totalPrice: number } {
  const qty = parseFloat(item.quantity) || 0;
  const up = parseFloat(item.unit_price) || 0;
  const tp = parseFloat(item.total_price) || 0;
  
  // إذا كان سعر الوحدة غير معقول (أكبر من 10 مليون)، اعتبره فاسداً
  const safeUp = (up > 0 && up < 1e7) ? up : 0;
  const computed = qty * safeUp;
  const safeTp = (tp > 0 && tp < 1e12) ? tp : 0;
  
  return {
    quantity: qty,
    unitPrice: safeUp,
    totalPrice: computed > 0 ? computed : safeTp,
  };
}
```

#### 2. تحديث `getSafeProjectTotal` لاستخدام التنظيف

```text
function getSafeProjectTotal(project: ProjectData | null | undefined): number {
  if (!project) return 0;
  const storedTotal = project.total_value || 0;
  if (storedTotal > 0 && storedTotal < 1e12) return storedTotal;
  
  const items = project.analysis_data?.items || [];
  if (items.length === 0) return 0;
  
  let total = 0;
  for (const item of items) {
    const safe = sanitizeItemPrice(item);
    total += safe.totalPrice;
  }
  return total;
}
```

#### 3. تحديث حساب `total_value` عند تحميل `project_data`

عند تحميل مشاريع `project_data` (سطر 213-228)، التحقق من القيمة المخزنة في عمود `total_value`:

```text
projectDataList.forEach((p: any) => {
  if (!projectMap.has(p.id)) {
    const rawTotal = p.total_value || 0;
    const items = p.analysis_data?.items || [];
    // إذا كانت القيمة فاسدة، أعد الحساب مع تنظيف الأسعار
    let safeTotal = rawTotal;
    if (rawTotal >= 1e12 || rawTotal < 0) {
      safeTotal = items.reduce((sum, item) => sum + sanitizeItemPrice(item).totalPrice, 0);
    }
    projectMap.set(p.id, { ...p, total_value: safeTotal });
  }
});
```

#### 4. إصلاح كود تحديث قاعدة البيانات

تغيير شرط الكشف عن الفساد ليتحقق من القيمة الفعلية المستخدمة (سواء من `summary` أو من عمود `total_value`) وتحديث كلا الجدولين:

```text
(async () => {
  for (const project of allProjects) {
    const summaryTotal = project.analysis_data?.summary?.total_value;
    const rawDbTotal = /* القيمة الأصلية من قاعدة البيانات */;
    
    // تحقق من أي مصدر فاسد
    const isCorrupted = 
      (summaryTotal !== undefined && (summaryTotal >= 1e12 || summaryTotal < 0)) ||
      (rawDbTotal >= 1e12 || rawDbTotal < 0);
    
    if (isCorrupted) {
      const correctedTotal = project.total_value; // المحسوبة بأمان
      // تنظيف أسعار البنود الفاسدة أيضاً
      const cleanedItems = (project.analysis_data?.items || []).map(item => {
        const safe = sanitizeItemPrice(item);
        return { ...item, unit_price: safe.unitPrice, total_price: safe.totalPrice };
      });
      
      const updatedAnalysis = {
        ...project.analysis_data,
        items: cleanedItems,
        summary: {
          ...(project.analysis_data?.summary || {}),
          total_value: correctedTotal,
        },
      };
      
      await supabase.from('saved_projects')
        .update({ analysis_data: updatedAnalysis, updated_at: new Date().toISOString() })
        .eq('id', project.id);
      
      await supabase.from('project_data')
        .update({ analysis_data: updatedAnalysis, total_value: correctedTotal, updated_at: new Date().toISOString() })
        .eq('id', project.id);
    }
  }
})();
```

#### 5. حفظ القيمة الأصلية من DB للمقارنة

عند بناء `projectMap`، حفظ القيمة الأصلية في حقل مؤقت `_rawDbTotal` لاستخدامها في كشف الفساد لاحقاً.

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/SavedProjectsPage.tsx` | إضافة `sanitizeItemPrice`، تحديث `getSafeProjectTotal`، إصلاح منطق تحميل project_data، وإصلاح كود تحديث قاعدة البيانات |


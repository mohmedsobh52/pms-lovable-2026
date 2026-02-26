
# ربط المكتبة بعروض الأسعار وتحسين أداء التسعير

## الملخص
إضافة ربط ثنائي الاتجاه بين المكتبة وعروض الأسعار: (1) استيراد أسعار الموردين من عروض الأسعار المحللة إلى المكتبة، (2) استخدام عروض الأسعار كمصدر إضافي في نظام التسعير التلقائي، (3) إضافة مقارنة أسعار المكتبة مع أسعار الموردين.

---

## 1. استيراد أسعار عروض الأسعار إلى المكتبة

### الوصف
إضافة زر "استيراد إلى المكتبة" في شاشة عروض الأسعار (QuotationUpload) يظهر عند تحليل عرض السعر بنجاح. يقوم بتحويل بنود عرض السعر المحلل إلى مواد في مكتبة الأسعار مع حفظ اسم المورد كمصدر.

### التغييرات
- إضافة زر وحوار `ImportToLibraryDialog` في `QuotationUpload.tsx`
- يعرض قائمة البنود المحللة مع خيار تحديد البنود المراد استيرادها
- عند الاستيراد يتم إضافة كل بند كمادة جديدة في `material_prices` مع:
  - `source = "quotation"`
  - `supplier_name` من بيانات المورد
  - `is_verified = false`

---

## 2. عروض الأسعار كمصدر تسعير إضافي (المصدر السابع)

### الوصف
إضافة عروض الأسعار المحللة كمصدر سابع في نظام التسعير التلقائي (AutoPriceDialog) بجانب المصادر الستة الحالية (المواد، العمالة، المعدات، التاريخي، المرجعي، ذكاء السوق).

### التغييرات في `AutoPriceDialog.tsx`
- تحميل بنود عروض الأسعار المحللة (`price_quotations` حيث `status = 'analyzed'`) عند فتح الحوار
- إضافة دالة مطابقة `matchQuotationItems` تستخدم N-gram similarity الموجودة لمقارنة أوصاف البنود
- إضافة فلتر "عروض الأسعار" (`quotation`) في شريط الفلاتر
- عرض اسم المورد ورقم العرض كمعلومات إضافية عند المطابقة

---

## 3. مقارنة أسعار المكتبة مع عروض الأسعار

### الوصف
إضافة تبويب جديد "مقارنة مع المكتبة" في شاشة مقارنة العروض (QuotationComparison). يعرض مقارنة بين أسعار الموردين وأسعار المكتبة لنفس البنود.

### التغييرات في `QuotationComparison.tsx`
- بعد تشغيل المقارنة، إضافة قسم يعرض أسعار المكتبة بجانب أسعار الموردين
- استخدام hooks المكتبة (`useMaterialPrices`, `useLaborRates`, `useEquipmentRates`) للبحث عن أسعار مطابقة
- عرض badge يوضح الفرق بين سعر المكتبة وأقل سعر مورد

---

## 4. رابط سريع للمكتبة من عروض الأسعار

### الوصف
إضافة زر "عرض في المكتبة" بجانب كل بند محلل في عرض السعر، ينقل المستخدم لشاشة المكتبة مع تعبئة البحث تلقائياً.

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/QuotationUpload.tsx` | زر وحوار استيراد البنود للمكتبة |
| `src/components/project-details/AutoPriceDialog.tsx` | مصدر تسعير سابع من عروض الأسعار |
| `src/components/QuotationComparison.tsx` | مقارنة أسعار الموردين مع المكتبة |

### استيراد البنود للمكتبة

```typescript
const importToLibrary = async (items: QuotationItem[], supplierName: string) => {
  for (const item of selectedItems) {
    await addMaterial({
      name: item.description.slice(0, 100),
      name_ar: item.description,
      category: 'other',
      unit: item.unit || 'no',
      unit_price: item.unit_price,
      currency: 'SAR',
      supplier_name: supplierName,
      source: 'quotation',
      is_verified: false,
    });
  }
};
```

### مطابقة عروض الأسعار في AutoPriceDialog

```typescript
// تحميل بنود العروض المحللة
const fetchQuotationItems = async () => {
  const { data } = await supabase
    .from('price_quotations')
    .select('supplier_name, ai_analysis, name')
    .eq('user_id', user.id)
    .eq('status', 'analyzed')
    .limit(30);
  
  const items = [];
  for (const q of data || []) {
    const analysis = typeof q.ai_analysis === 'string' ? JSON.parse(q.ai_analysis) : q.ai_analysis;
    for (const item of analysis?.items || []) {
      if (item.unit_price > 0) {
        items.push({
          description: item.description,
          unit: item.unit,
          unit_price: item.unit_price,
          supplier: q.supplier_name || analysis?.supplier?.name || q.name,
        });
      }
    }
  }
  return items;
};

// المطابقة باستخدام ngramSimilarity الموجودة
const matchQuotationItem = (itemDesc: string, itemUnit: string, quotationItems) => {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const qi of quotationItems) {
    const descScore = ngramSimilarity(itemDesc, qi.description);
    const unitMatch = normalizeUnit(itemUnit) === normalizeUnit(qi.unit) ? 0.15 : 0;
    const totalScore = descScore * 0.85 + unitMatch;
    
    if (totalScore > bestScore && totalScore >= 0.35) {
      bestScore = totalScore;
      bestMatch = { ...qi, confidence: Math.round(totalScore * 100) };
    }
  }
  return bestMatch;
};
```

### مقارنة المكتبة في QuotationComparison

```typescript
// بعد المقارنة، إضافة أسعار المكتبة
const enrichWithLibraryPrices = (itemComparison) => {
  return itemComparison.map(item => {
    const materialMatch = findMatchingPrice(item.description);
    const libraryPrice = materialMatch?.unit_price || null;
    const libraryDiff = libraryPrice && item.lowestPrice > 0 
      ? ((item.lowestPrice - libraryPrice) / libraryPrice * 100) 
      : null;
    return { ...item, libraryPrice, libraryDiff };
  });
};
```

### نمط حوار الاستيراد

```text
+-----------------------------------------------+
|  استيراد بنود عرض السعر إلى المكتبة           |
|  المورد: شركة الفاروق                         |
+-----------------------------------------------+
| [ ] تحديد الكل                                |
|                                                |
| [x] 1. مواسير HDPE 315مم     150 ر.س/م.ط     |
| [x] 2. محبس بوابي 200مم      2,500 ر.س/عدد   |
| [ ] 3. حفر خنادق             45 ر.س/م3        |
|                                                |
| عدد البنود المحددة: 2                          |
|                                                |
|        [إلغاء]    [استيراد إلى المكتبة]        |
+-----------------------------------------------+
```

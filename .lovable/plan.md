

# تحسين أداء قاعدة البيانات التاريخية ومعالجة مشاكل الرفع والعرض

## المشاكل المكتشفة

### 1. مشكلة الملفات الكبيرة
- `extractRawDataFromExcel` تحمل الملف بالكامل في الذاكرة دفعة واحدة
- لا يوجد progress indicator أثناء القراءة
- حد 1000 صف فقط بدون إعلام المستخدم بوجود صفوف إضافية
- تخزين كل البنود في عمود JSONB واحد قد يفشل مع ملفات كبيرة جداً (حد Supabase payload ~6MB)

### 2. مشكلة عدم ظهور البيانات
- `loadFiles()` لا تتعامل مع حالة عدم تسجيل الدخول بشكل واضح (تظهر "لا توجد ملفات" بدلاً من رسالة تسجيل الدخول)
- لا يوجد retry عند فشل التحميل
- لا يوجد تحقق من الاتصال بالشبكة

### 3. مشكلة الأداء العام
- تحميل جميع الملفات مع بياناتها الكاملة (`items` JSONB) دفعة واحدة
- لا يوجد pagination

---

## الحلول المقترحة

### 1. تحسين `loadFiles()` - عدم تحميل البنود مع القائمة

**الملف:** `src/pages/HistoricalPricingPage.tsx`

تغيير استعلام تحميل الملفات لاستبعاد عمود `items` الثقيل من القائمة الرئيسية، وتحميله فقط عند فتح ملف محدد:

```typescript
// بدلاً من select("*")
const { data, error } = await supabase
  .from("historical_pricing_files")
  .select("id, file_name, project_name, project_location, project_date, currency, items_count, total_value, notes, is_verified, created_at")
  .order("created_at", { ascending: false });
```

وعند عرض ملف محدد، تحميل البنود بشكل منفصل:

```typescript
const handleViewFile = async (file) => {
  const { data } = await supabase
    .from("historical_pricing_files")
    .select("items")
    .eq("id", file.id)
    .single();
  setSelectedFile({ ...file, items: data?.items || [] });
  setViewDialogOpen(true);
};
```

### 2. معالجة الملفات الكبيرة مع Progress

**الملف:** `src/pages/HistoricalPricingPage.tsx`

- اضافة شريط تقدم أثناء قراءة الملف
- رفع حد الصفوف من 1000 الى 5000 مع تحذير للمستخدم
- تقسيم البنود الكبيرة (اكثر من 2000 بند) إلى دفعات عند الحفظ
- اضافة Web Worker timeout للملفات الكبيرة جداً

### 3. اضافة رسالة تسجيل الدخول

**الملف:** `src/pages/HistoricalPricingPage.tsx`

عرض رسالة واضحة عندما يكون المستخدم غير مسجل الدخول بدلاً من "لا توجد ملفات":

```typescript
if (!user) {
  return <LoginPrompt />;
}
```

### 4. اضافة Pagination للقائمة

**الملف:** `src/pages/HistoricalPricingPage.tsx`

- عرض 20 ملف في كل صفحة
- أزرار التنقل بين الصفحات
- عداد إجمالي الملفات

### 5. اضافة Retry و Error Recovery

**الملف:** `src/pages/HistoricalPricingPage.tsx`

- زر "إعادة المحاولة" عند فشل التحميل
- إعادة محاولة تلقائية مرة واحدة عند فشل الشبكة
- عرض حالة الاتصال

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/HistoricalPricingPage.tsx` | تحسين الاستعلامات، Progress bar، Pagination، Login gate، Retry |
| `src/lib/excel-utils.ts` | رفع حد الصفوف مع تمرير progress callback |

### منطق الحفظ المحسّن للملفات الكبيرة

عند حفظ ملف يحتوي على اكثر من 2000 بند:
1. تقسيم البنود الى مجموعات (2000 بند لكل مجموعة)
2. حفظ المجموعة الأولى مع بيانات المشروع
3. عرض تحذير للمستخدم اذا تم تقليص البنود

### تحسين تحميل القائمة

- استبعاد عمود `items` من الاستعلام الرئيسي (يوفر 90%+ من حجم البيانات)
- تحميل `items` فقط عند الحاجة (فتح ملف للعرض أو التصدير)
- اضافة `.range(from, to)` للـ pagination


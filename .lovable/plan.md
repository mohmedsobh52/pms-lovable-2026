

# تحسين عرض البيانات التاريخية بجدول BOQ منظم مع التعديل والربط بالتحليل

## الهدف

تحويل عرض البيانات التاريخية من جدول ديناميكي (اعمدة عشوائية من الملف) الى جدول BOQ منظم باعمدة ثابتة:
**Item No | Description | وصف البند | Unit | Quantity | Unit Price | Total | Item Code**

مع امكانية التعديل والحذف والاضافة لكل بند، وربط البيانات بتحليل البنود والتسعير.

---

## التعديلات المطلوبة

### 1. انشاء ملف `src/lib/historical-data-utils.ts`

ملف مساعد يحتوي على:
- **normalizeHistoricalItems**: تحويل بيانات خام (اعمدة مختلفة بالعربي والانجليزي) الى النسق الموحد
- **matchColumnName**: مطابقة اسماء الاعمدة المتنوعة (مثل qty, الكمية, Quantity) الى اسم موحد
- **calculateTotal**: حساب الاجمالي تلقائيا (الكمية x سعر الوحدة)

جدول المطابقة:

| العمود الموحد | الاسماء المتوقعة من الملف |
|---|---|
| item_number | Item, No, رقم البند, item_number, البند, #, م |
| description | Description, DESCRIPTION, الوصف الانجليزي |
| description_ar | وصف البند, الوصف, البيان |
| unit | Unit, الوحدة, unit |
| quantity | Quantity, الكمية, qty, quantity |
| unit_price | Price, سعر الوحدة, unit_price, price |
| total_price | Total, الاجمالي, total, total_price, المبلغ |
| item_code | Item code, كود البند, item_code |

### 2. انشاء مكون `src/components/HistoricalItemsTable.tsx`

جدول BOQ تفاعلي باعمدة ثابتة يدعم:
- **تعديل مباشر (Inline Editing)**: الضغط على خلية يحولها لحقل ادخال
- **حذف بند**: زر حذف لكل صف
- **اضافة بند جديد**: زر يضيف صفا فارغا
- **حفظ التعديلات**: تحديث عمود items في قاعدة البيانات
- **تصدير الى Excel**: تصدير البيانات المنظمة
- **بحث**: البحث داخل بنود الملف الواحد
- **حساب تلقائي**: الاجمالي = الكمية x سعر الوحدة

### 3. تعديل `src/pages/HistoricalPricingPage.tsx`

- **حوار الرفع (Upload Dialog)**: استبدال معاينة البيانات الديناميكية (سطور 599-653) بالمكون الجديد لمعاينة وتعديل البيانات قبل الحفظ، مع تطبيق normalizeHistoricalItems عند رفع الملف
- **حوار العرض (View Dialog)**: استبدال الجدول الديناميكي (سطور 879-914) بالمكون الجديد مع تمرير fileId لتحديث قاعدة البيانات مباشرة
- **تعديل handleFileUpload و handlePDFUpload**: تطبيق normalizeHistoricalItems على البيانات المستخرجة قبل عرضها

### 4. تحسين `src/components/HistoricalPriceComparison.tsx`

تعديل دالة findSimilarItems لتقرأ البنود بالنسق الموحد الجديد (item_number, description, unit_price) بدلا من البحث العشوائي في حقول متنوعة - مما يحسن دقة المطابقة التاريخية تلقائيا.

---

## الملفات المتاثرة

| الملف | الاجراء |
|---|---|
| `src/lib/historical-data-utils.ts` | انشاء - دوال التحويل والتطبيع |
| `src/components/HistoricalItemsTable.tsx` | انشاء - جدول BOQ تفاعلي |
| `src/pages/HistoricalPricingPage.tsx` | تعديل - استخدام الجدول الجديد + التحويل |
| `src/components/HistoricalPriceComparison.tsx` | تعديل - قراءة البنود بالنسق الموحد |

---

## التفاصيل التقنية

### هيكل البند الموحد

```text
interface NormalizedHistoricalItem {
  id: string;            // معرف فريد UUID
  item_number: string;   // رقم البند
  description: string;   // الوصف بالانجليزية
  description_ar: string; // وصف البند بالعربية
  unit: string;          // الوحدة
  quantity: number;      // الكمية
  unit_price: number;    // سعر الوحدة
  total_price: number;   // الاجمالي
  item_code: string;     // كود البند
}
```

### طريقة الحفظ

البنود تبقى محفوظة في عمود `items` (jsonb) في جدول `historical_pricing_files` لكن بالنسق الموحد بدلا من البيانات الخام. عند التعديل/الحذف/الاضافة يتم تحديث هذا العمود مباشرة عبر Supabase update.


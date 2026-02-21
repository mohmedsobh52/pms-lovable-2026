

# إصلاح شامل لاستخراج البيانات التاريخية

## تشخيص المشكلة الجذرية

بعد فحص الكود بالتفصيل، تم اكتشاف عدة مشاكل متداخلة:

### المشكلة 1: فقدان أسماء الأعمدة الرقمية
في `extractRawDataFromExcel` (سطر 866-869)، عند قراءة صف العناوين، إذا كان اسم العمود يشبه رقماً (مثل "1" أو "2")، يتم تحويله إلى رقم فيضيع اسمه ويصبح `Column_X`. هذا يؤثر على ربط الأعمدة لاحقاً.

### المشكلة 2: البيانات المحفوظة سابقاً تالفة
الملفات التي تم رفعها قبل إصلاح نظام الاستخراج محفوظة في قاعدة البيانات بقيم صفرية. عند عرضها، يتم تمرير البيانات لـ `normalizeHistoricalItems` التي تجد المفاتيح الصحيحة (`description`, `unit_price`) لكن قيمها فارغة/صفرية لأنها حُفظت هكذا.

### المشكلة 3: عدم تطابق قوائم الأسماء البديلة
`COLUMN_PATTERNS` في `excel-utils.ts` (تُستخدم لتقييم صفوف العناوين) و `COLUMN_MAPPINGS` في `historical-data-utils.ts` (تُستخدم لربط الأعمدة) بينهما اختلافات. يجب توحيدهما.

### المشكلة 4: معاملة الأعمدة مثل "amount" كـ totalPrice فقط
كلمة "amount" موجودة في كلا النمطين `quantity` و `totalPrice`، مما يسبب تضارباً في الربط.

## الحلول

### 1. حماية أسماء الأعمدة من التحويل الرقمي

في `extractRawDataFromExcel`، صفوف العناوين (headers) يجب أن تبقى نصوصاً دائماً ولا تُحوّل لأرقام.

### 2. إزالة "amount" من أنماط الكمية

"amount" يجب أن تبقى فقط في `totalPrice` لأنها عادة تعني "المبلغ" وليس "الكمية".

### 3. تحسين تطابق الأعمدة - أولوية المطابقة الدقيقة

حالياً `matchColumnName` تستخدم `includes` مما يجعل عمود "item" يطابق "item_number" و"item description" معاً. الحل: المطابقة الدقيقة أولاً ثم `includes` كخيار ثانوي.

### 4. إضافة زر "إعادة معالجة" للملفات المحفوظة

بدلاً من محاولة إصلاح البيانات التالفة تلقائياً، يتم:
- إضافة رسالة تنبيه عند فتح ملف محفوظ بقيم صفرية: "هذا الملف محفوظ بقيم ناقصة. يُنصح بحذفه وإعادة رفعه."
- عرض زر "حذف وإعادة الرفع" مباشرة في حوار العرض

### 5. إضافة سجل تشخيصي مرئي للمستخدم

عند رفع ملف جديد، إضافة شريط يظهر:
- عدد الأعمدة المربوطة بنجاح
- أسماء الأعمدة التي لم يتم ربطها
- نسبة البنود ذات البيانات الكاملة

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/lib/excel-utils.ts` | حماية headers من التحويل الرقمي + إزالة "amount" من quantity |
| `src/lib/historical-data-utils.ts` | تحسين matchColumnName (مطابقة دقيقة أولاً) + إزالة "amount" من quantity |
| `src/pages/HistoricalPricingPage.tsx` | إضافة تنبيه البيانات التالفة + شريط تشخيص الربط + زر إعادة الرفع |

## التفاصيل التقنية

### حماية أسماء الأعمدة (excel-utils.ts)

```text
في extractRawDataFromExcel، سطر 842-845:

الحالي:
  const headers = headerRow.map((h, idx) =>
    (h != null && String(h).trim()) || `Column_${idx + 1}`
  );

الجديد:
  const headers = headerRow.map((h, idx) => {
    if (h == null || String(h).trim() === '') return `Column_${idx + 1}`;
    return String(h).trim(); // دائماً نص، حتى لو كان رقماً
  });
```

### تحسين matchColumnName (historical-data-utils.ts)

```text
الحالي:
  normalized === alias || normalized.includes(alias)

الجديد:
  // المرحلة 1: مطابقة دقيقة فقط
  for (const [field, aliases] of COLUMN_MAPPINGS) {
    if (aliases.some(a => normalized === a.toLowerCase())) return field;
  }
  // المرحلة 2: includes كخيار ثانوي
  for (const [field, aliases] of COLUMN_MAPPINGS) {
    if (aliases.some(a => normalized.includes(a.toLowerCase()))) return field;
  }
```

### إزالة "amount" من أنماط الكمية

```text
في كلا الملفين:
  quantity patterns: إزالة 'amount' (تبقى فقط في totalPrice)
  
في COLUMN_PATTERNS (excel-utils.ts):
  quantity: إزالة 'amount'
  
في COLUMN_MAPPINGS (historical-data-utils.ts):
  quantity: إزالة 'amount'
```

### تنبيه البيانات التالفة في حوار العرض

```text
في HistoricalPricingPage.tsx - View Dialog:

بعد حساب zeroItems:
  إذا كان zeroItems.length / normalizedItems.length > 0.8:
    عرض بطاقة تحذير:
    "هذا الملف يحتوي على بيانات ناقصة (تم حفظه قبل تحسين نظام الاستخراج).
     يُنصح بحذفه وإعادة رفع الملف الأصلي للحصول على نتائج أفضل."
    [زر: حذف هذا الملف]
```

### شريط تشخيص الربط عند الرفع

```text
في HistoricalPricingPage.tsx - Upload Dialog:

بعد استخراج البنود:
  const mappedCount = عدد الحقول المربوطة (description, unit, quantity, etc.)
  const totalFields = 7 // العدد الكلي للحقول
  const completenessRatio = بنود_كاملة / إجمالي_البنود
  
  عرض:
  "تم ربط X من Y حقل | Z% من البنود تحتوي بيانات كاملة"
  
  إذا completenessRatio < 0.5:
    تحذير أحمر: "جودة الاستخراج منخفضة - تحقق من تنسيق الملف"
```


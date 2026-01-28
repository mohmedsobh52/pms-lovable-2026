

# خطة تعديل أعمدة الجدول

## طلب المستخدم
- **إزالة** عمودين: `Unit Price` و `Total`
- **استبدال** عمود `Calc. Price` بـ `Total` (إعادة تسمية العمود المحسوب ليكون هو الإجمالي الرئيسي)

## الوضع الحالي للأعمدة

| العمود | الحالة الحالية |
|--------|---------------|
| Unit Price | موجود ✓ |
| Total | موجود ✓ |
| AI Rate | موجود ✓ |
| Calc. Price | موجود ✓ |

## التغييرات المطلوبة

### 1. ملف `src/components/TableControls.tsx`
تحديث `BOQ_TABLE_COLUMNS` لإزالة العمودين وإعادة تسمية `calc_price`:

```typescript
// قبل
{ id: "unit_price", label: "Unit Price", labelAr: "سعر الوحدة" },
{ id: "total", label: "Total", labelAr: "الإجمالي" },
{ id: "ai_rate", label: "AI Rate", labelAr: "سعر AI" },
{ id: "calc_price", label: "Calc. Price", labelAr: "السعر المحسوب" },

// بعد - إزالة unit_price و total، وتغيير calc_price إلى Total
{ id: "ai_rate", label: "AI Rate", labelAr: "سعر AI" },
{ id: "calc_price", label: "Total", labelAr: "الإجمالي" },
```

### 2. ملف `src/components/AnalysisResults.tsx`

#### تحديث Header الجدول (السطور 2111-2129):
- **إزالة** header لـ `unit_price` (السطور 2111-2115)
- **إزالة** header لـ `total` (السطور 2116-2120)
- **تغيير نص** `calc_price` من "Calc. Price" إلى "Total"

#### تحديث Body الجدول (السطور 2236-2279):
- **إزالة** خلايا `unit_price` (السطور 2236-2247)
- **إزالة** خلايا `total` (السطور 2248-2259)
- **تحويل** `calc_price` لعرض الإجمالي = `calculatedUnitPrice × quantity`

#### تحديث Footer الجدول (السطور 2325-2360):
- تحديث colspan وإزالة الأعمدة المحذوفة
- الإبقاء على العمود الأخير كإجمالي كلي

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/TableControls.tsx` | إزالة عمودين من `BOQ_TABLE_COLUMNS` + إعادة تسمية |
| `src/components/AnalysisResults.tsx` | تحديث header/body/footer للجدول |

---

## النتيجة المتوقعة

### قبل التعديل
```
| # | Item No. | Description | Unit | Qty | Unit Price | Total | AI Rate | Calc. Price | Balance | Actions |
```

### بعد التعديل
```
| # | Item No. | Description | Unit | Qty | AI Rate | Total | Balance | Actions |
```

---

## ملاحظات تقنية

### منطق العمود الجديد `Total`
سيعرض العمود الجديد القيمة المحسوبة:
```typescript
// Total = calculatedUnitPrice × quantity
const total = calculatedPrice * item.quantity;
// أو إذا لم يوجد سعر محسوب:
const total = (item.unit_price || 0) * item.quantity;
```

### التوافق مع الصادرات
لن يؤثر هذا التغيير على صادرات Excel/PDF لأنها تستخدم البيانات الأصلية وليس أعمدة الجدول المرئية.

### التوافق مع localStorage
سيتم تحديث الأعمدة المرئية تلقائياً - المستخدمون الذين لديهم إعدادات محفوظة قد يحتاجون لإعادة تعيين إعدادات الأعمدة.


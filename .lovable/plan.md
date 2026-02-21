

# ربط "Detailed Price" بشاشة التسعير التفصيلي (DetailedPriceDialog)

## المشكلة الحالية

عند الضغط على "Detailed Price" في القائمة المنسدلة، يُفتح حالياً `ItemCostEditor` (شاشة تحليل تكاليف الحفر). المطلوب فتح شاشة `DetailedPriceDialog` الكاملة التي تحتوي على:
- تبويبات **المواد / العمالة / المعدات** مع إمكانية الإضافة من المكتبة
- حقول **نسبة المصاريف العمومية** و**نسبة الربح**
- حقل **ملاحظات**
- زر **حفظ التسعير**

## تحدي تقني

`DetailedPriceDialog` مصمم للعمل مع جدول `project_items` في قاعدة البيانات (يحفظ مباشرة عبر Supabase باستخدام `item.id`). لكن في شاشة `AnalysisResults`، البنود تأتي من بيانات التحليل المحلية وليس من قاعدة البيانات.

**الحل:** سنضيف prop اختياري `onApplyPrice` إلى `DetailedPriceDialog` بحيث:
- إذا كان البند من قاعدة البيانات (له `id` حقيقي) — يحفظ في Supabase كالمعتاد
- إذا تم تمرير `onApplyPrice` — يستدعيها بالسعر المحسوب بدلاً من الحفظ في قاعدة البيانات

## التغييرات

### 1. `src/components/pricing/DetailedPriceDialog.tsx`

- إضافة prop اختياري:
```typescript
interface DetailedPriceDialogProps {
  // ... الحالي
  onApplyPrice?: (unitPrice: number) => void; // جديد
}
```

- تعديل `handleSave`: إذا كان `onApplyPrice` موجوداً، يستدعيها بـ `calculations.unitPrice` بدلاً من الحفظ في Supabase:
```typescript
const handleSave = async () => {
  if (!item) return;
  
  if (onApplyPrice) {
    // وضع التحليل: تطبيق السعر محلياً
    onApplyPrice(calculations.unitPrice);
    toast({ title: "تم تطبيق السعر", description: "..." });
    onClose();
    return;
  }
  
  // الحفظ في قاعدة البيانات (الوضع الحالي)
  // ...
};
```

### 2. `src/components/AnalysisResults.tsx`

- **استيراد** `DetailedPriceDialog` بدلاً من استخدام `ItemCostEditor` في القائمة
- **إضافة state:**
```typescript
const [detailedPriceItem, setDetailedPriceItem] = useState<any>(null);
```

- **تعديل خيار "Detailed Price" في الـ Dropdown:** بدلاً من `<div>` يحتوي على `<ItemCostEditor>`، يصبح `<DropdownMenuItem>` عادي يفتح الـ dialog:
```tsx
<DropdownMenuItem onClick={() => {
  setDetailedPriceItem({
    id: item.item_number,
    item_number: item.item_number,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unit_price || null,
    total_price: item.total_price || null,
  });
}}>
  <Edit className="w-4 h-4" />
  <span>{isArabic ? "سعر مفصل" : "Detailed Price"}</span>
</DropdownMenuItem>
```

- **إضافة الـ Dialog في نهاية الـ JSX:**
```tsx
<DetailedPriceDialog
  isOpen={!!detailedPriceItem}
  onClose={() => setDetailedPriceItem(null)}
  item={detailedPriceItem}
  currency={data.summary?.currency || "SAR"}
  onSave={() => setDetailedPriceItem(null)}
  onApplyPrice={(unitPrice) => {
    if (detailedPriceItem) {
      updateAIRate(detailedPriceItem.item_number, unitPrice);
      toast({
        title: isArabic ? "تم تطبيق السعر" : "Price applied",
        description: unitPrice.toLocaleString(),
      });
      setDetailedPriceItem(null);
    }
  }}
/>
```

- **إزالة** `ItemCostEditor` من الـ Dropdown (يبقى import فقط إذا مستخدم في مكان آخر)

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/pricing/DetailedPriceDialog.tsx` | إضافة prop `onApplyPrice` اختياري + تعديل `handleSave` |
| `src/components/AnalysisResults.tsx` | استبدال `ItemCostEditor` بـ `DetailedPriceDialog` في الـ Dropdown + state جديد |

## لا تغييرات على قاعدة البيانات


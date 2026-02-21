

# ربط Quick Price بشاشة QuickPriceDialog الكاملة

## المشكلة الحالية

عند الضغط على "Quick Price" في القائمة المنسدلة، يتم فقط تطبيق `unit_price` الحالي مباشرة بدون فتح أي شاشة. المطلوب هو فتح شاشة `QuickPriceDialog` الكاملة التي تحتوي على:
- تبويب **Manual Entry** لإدخال السعر يدوياً
- تبويب **From Library** للبحث في مكتبة الأسعار (مواد، عمالة، معدات)
- زر **Apply Price** لتطبيق السعر

## الحل

### الملف: `src/components/AnalysisResults.tsx`

#### 1. إضافة state لتتبع البند المختار للسعر السريع

```typescript
const [quickPriceItem, setQuickPriceItem] = useState<any>(null);
```

#### 2. استيراد QuickPriceDialog

```typescript
import { QuickPriceDialog } from "@/components/project-details/QuickPriceDialog";
```

#### 3. تعديل onClick لزر Quick Price في الـ DropdownMenuItem

بدلاً من تطبيق السعر مباشرة، سيفتح الـ dialog:

```tsx
<DropdownMenuItem
  onClick={() => {
    setQuickPriceItem({
      id: item.item_number,
      item_number: item.item_number,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price || null,
      total_price: item.total_price || null,
      category: null,
    });
  }}
>
```

#### 4. إضافة QuickPriceDialog في نهاية الـ JSX

```tsx
<QuickPriceDialog
  isOpen={!!quickPriceItem}
  onClose={() => setQuickPriceItem(null)}
  item={quickPriceItem}
  onApplyPrice={async (price: number) => {
    if (quickPriceItem) {
      updateAIRate(quickPriceItem.item_number, price);
      toast({
        title: isArabic ? "تم تطبيق السعر" : "Price applied",
        description: price.toLocaleString(),
      });
    }
  }}
  isArabic={isArabic}
  currency={data.summary?.currency || "SAR"}
/>
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/AnalysisResults.tsx` | استيراد `QuickPriceDialog` + state `quickPriceItem` + تعديل onClick + إضافة الـ Dialog |

## لا تغييرات على قاعدة البيانات

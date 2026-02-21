

# إضافة تبويب "Edit" في القائمة المنسدلة لبنود التحليل

## الهدف

إضافة خيار "Edit" في القائمة المنسدلة (Dropdown) بين "Detailed Price" و "Clear Price" يفتح شاشة `EditItemDialog` الكاملة التي تحتوي على:
- تبديل Section Header
- رقم البند والوحدة
- الوصف بالإنجليزية والعربية
- الكمية
- الفئة والفئة الفرعية
- المواصفات
- زر حفظ التغييرات

## التغييرات

### الملف: `src/components/AnalysisResults.tsx`

#### 1. استيراد EditItemDialog و أيقونة Edit

```typescript
import EditItemDialog from "@/components/items/EditItemDialog";
import { ..., Pencil, ... } from "lucide-react";
```

#### 2. إضافة state لتتبع البند المختار للتعديل

```typescript
const [editItem, setEditItem] = useState<any>(null);
```

#### 3. إضافة خيار "Edit" في الـ Dropdown

بين "Detailed Price" و فاصل "Clear Price":

```tsx
<DropdownMenuSeparator />
{/* Edit */}
<DropdownMenuItem
  onClick={() => {
    setEditItem({
      id: item.item_number,
      item_number: item.item_number,
      description: item.description,
      description_ar: item.description_ar || null,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price || null,
      total_price: item.total_price || null,
      category: item.category || null,
      subcategory: item.subcategory || null,
      specifications: item.specifications || null,
      is_section: item.is_section || false,
    });
  }}
  className="gap-2 cursor-pointer"
>
  <Pencil className="w-4 h-4 text-blue-600" />
  <span>{isArabic ? "تعديل" : "Edit"}</span>
</DropdownMenuItem>
```

#### 4. إضافة EditItemDialog في نهاية الـ JSX

```tsx
<EditItemDialog
  isOpen={!!editItem}
  onClose={() => setEditItem(null)}
  item={editItem}
  onSave={async (updatedItem) => {
    // تحديث البند محلياً في بيانات التحليل
    if (editItem && data.items) {
      const itemIndex = data.items.findIndex(
        (i: any) => i.item_number === editItem.item_number
      );
      if (itemIndex !== -1) {
        data.items[itemIndex] = {
          ...data.items[itemIndex],
          ...updatedItem,
        };
      }
    }
    toast({
      title: isArabic ? "تم حفظ التغييرات" : "Changes saved",
    });
    setEditItem(null);
  }}
/>
```

عند الحفظ، يتم تحديث البند مباشرة في مصفوفة `data.items` المحلية وإظهار رسالة نجاح.

## ترتيب القائمة النهائي

```text
$ Quick Price
= Detailed Price
──────────
/ Edit
──────────
x Clear Price
──────────
D Delete (أحمر)
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/AnalysisResults.tsx` | استيراد `EditItemDialog` + `Pencil` + state `editItem` + خيار Edit في الـ Dropdown + الـ Dialog |

## لا تغييرات على قاعدة البيانات

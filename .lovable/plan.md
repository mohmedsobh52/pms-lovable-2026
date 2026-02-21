

# إصلاح مشكلة التبويبات غير المستجيبة

## السبب الجذري

المشكلة تكمن في أن مكونات الـ Dialog (QuickPriceDialog, DetailedPriceDialog, EditItemDialog) داخل `AnalysisResults.tsx` تُعرض دائماً في الصفحة حتى عندما تكون مغلقة. هذا يعني أن Radix UI ينشئ عناصر Portal غير مرئية تظل موجودة في الصفحة وتحجب النقر على التبويبات.

بالإضافة لذلك، ملف `dialog-custom.css` أصبح معقداً جداً (538 سطر) مليء بقواعد z-index متضاربة تتعارض مع بعضها.

## الحل

### 1. `src/components/AnalysisResults.tsx`

تغليف الـ Dialogs الثلاثة بشرط عرض (conditional rendering) بحيث لا تُضاف للصفحة إلا عند الحاجة:

**قبل:**
```tsx
<QuickPriceDialog isOpen={!!quickPriceItem} ... />
<DetailedPriceDialog isOpen={!!detailedPriceItem} ... />
<EditItemDialog isOpen={!!editItem} ... />
```

**بعد:**
```tsx
{quickPriceItem && <QuickPriceDialog isOpen={true} ... />}
{detailedPriceItem && <DetailedPriceDialog isOpen={true} ... />}
{editItem && <EditItemDialog isOpen={true} ... />}
```

هذا يضمن إزالة عناصر Portal من الصفحة تماماً عند إغلاق الـ Dialog.

### 2. `src/components/ui/dialog-custom.css`

تبسيط وتنظيف ملف CSS:
- إزالة القواعد المكررة والمتضاربة
- توحيد استراتيجية z-index بشكل واضح
- التأكد من أن عناصر الـ Dialog المغلقة لا تتداخل مع باقي العناصر

### 3. `src/components/ui/dialog.tsx`

إضافة خاصية `data-state` handling محسنة للتأكد من إزالة pointer-events عند الإغلاق.

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/AnalysisResults.tsx` | تغليف الـ Dialogs بـ conditional rendering |
| `src/components/ui/dialog-custom.css` | تبسيط وإزالة التضاربات |
| `src/components/ui/dialog.tsx` | تحسين إدارة حالة الإغلاق |

## لا تغييرات على قاعدة البيانات


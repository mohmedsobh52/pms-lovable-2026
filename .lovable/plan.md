

# ربط التحليل المتقدم بالبيانات التاريخية - تسعير مبني على المشاريع السابقة

## الهدف

إضافة ميزة تسعير تلقائي مرتبط بالمشاريع المسعرة سابقاً (historical_pricing_files + saved_projects) مباشرة داخل شاشة التحليل المتقدم (AnalysisResults)، بحيث يمكن للمستخدم:
1. البحث عن أسعار بنود مشابهة من مشاريع سابقة لكل بند
2. تطبيق السعر التاريخي بنقرة واحدة
3. مقارنة الأسعار الحالية بالأسعار التاريخية على مستوى المشروع

---

## التغييرات المطلوبة

### 1. إضافة خيار "تسعير تاريخي" في قائمة إجراءات كل بند (`AnalysisResults.tsx`)

في القائمة المنسدلة لكل بند (بجانب "سعر سريع" و"سعر مفصل")، يُضاف خيار جديد "سعر تاريخي" يفتح Dialog يعرض:
- البنود المشابهة من المشاريع السابقة مرتبة حسب نسبة التطابق
- اسم المشروع وتاريخه وموقعه
- السعر التاريخي مع مقارنة بالسعر الحالي (نسبة الفرق)
- زر "تطبيق" لكل نتيجة

### 2. إنشاء مكون جديد `HistoricalPriceLookup.tsx`

مكون Dialog متخصص يبحث في البيانات التاريخية لبند محدد:

- **المدخلات:** وصف البند، الوحدة، السعر الحالي
- **المصادر:** `historical_pricing_files` + `saved_projects` (analysis_data.items)
- **خوارزمية المطابقة:** مطابقة نصية (عربي/إنجليزي) + مطابقة الوحدة + ترجيح المشاريع الموثقة (is_verified)
- **العرض:**
  - جدول نتائج مرتبة حسب نسبة التطابق
  - لكل نتيجة: اسم المشروع، الموقع، التاريخ، السعر، نسبة الفرق، badge التوثيق
  - إحصائيات: المتوسط، الأدنى، الأعلى، عدد المطابقات
  - زر "تطبيق السعر" لتطبيق سعر محدد أو المتوسط

### 3. إضافة زر "تسعير تاريخي شامل" في شريط الأدوات (`AnalysisResults.tsx`)

زر في منطقة Price Analysis Buttons يفتح Dialog يقوم بـ:
- مقارنة **كل بنود المشروع** بالبيانات التاريخية دفعة واحدة
- عرض ملخص: عدد البنود التي وُجد لها تطابق، متوسط نسبة التطابق
- خيار "تطبيق الكل" لتطبيق المتوسطات التاريخية على كل البنود غير المسعرة
- خيار تحديد حد أدنى للتطابق (مثلاً 50%)

---

## التفاصيل التقنية

### الملف الجديد: `src/components/HistoricalPriceLookup.tsx`

```typescript
// Props
interface HistoricalPriceLookupProps {
  isOpen: boolean;
  onClose: () => void;
  item: { item_number: string; description: string; unit: string; quantity: number; unit_price?: number };
  onApplyPrice: (price: number) => void;
  currency: string;
}
```

**منطق المطابقة:**
- تحميل البيانات من `historical_pricing_files` و `saved_projects`
- مطابقة بالكلمات المشتركة (عربي + إنجليزي) مع ترجيح الوحدة المتطابقة
- ترتيب حسب: نسبة التطابق (60%) + توثيق المشروع (20%) + حداثة التاريخ (20%)
- عرض أفضل 10 نتائج

### الملف الجديد: `src/components/BulkHistoricalPricing.tsx`

```typescript
// Props
interface BulkHistoricalPricingProps {
  items: BOQItem[];
  onApplyPrices: (prices: Array<{ itemNumber: string; price: number }>) => void;
  currency: string;
}
```

**العرض:**
- شريط Progress للبحث
- جدول: البند | أفضل تطابق | نسبة التطابق | السعر التاريخي | السعر الحالي | الفرق
- خيارات: تطبيق الكل / تطبيق المحدد / تصدير المقارنة

### التعديلات على: `src/components/AnalysisResults.tsx`

1. **استيراد المكونات الجديدة:**
```typescript
import { HistoricalPriceLookup } from "./HistoricalPriceLookup";
import { BulkHistoricalPricing } from "./BulkHistoricalPricing";
```

2. **إضافة state:**
```typescript
const [historicalPriceItem, setHistoricalPriceItem] = useState<any>(null);
```

3. **إضافة خيار في قائمة الإجراءات** (بعد "سعر مفصل"):
```typescript
<DropdownMenuItem onClick={() => setHistoricalPriceItem({...item})} className="gap-2 cursor-pointer">
  <History className="w-4 h-4 text-amber-600" />
  <span>{isArabic ? "سعر تاريخي" : "Historical Price"}</span>
</DropdownMenuItem>
```

4. **إضافة زر شامل** في منطقة Price Analysis Buttons:
```typescript
<BulkHistoricalPricing 
  items={data.items || []} 
  onApplyPrices={(prices) => prices.forEach(p => updateAIRate(p.itemNumber, p.price))}
  currency={data.summary?.currency || "SAR"}
/>
```

5. **إضافة Dialog في نهاية المكون** (conditional render):
```typescript
{historicalPriceItem && (
  <HistoricalPriceLookup
    isOpen={true}
    onClose={() => setHistoricalPriceItem(null)}
    item={historicalPriceItem}
    onApplyPrice={(price) => {
      updateAIRate(historicalPriceItem.item_number, price);
      setHistoricalPriceItem(null);
    }}
    currency={data.summary?.currency || "SAR"}
  />
)}
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/HistoricalPriceLookup.tsx` | ملف جديد - Dialog بحث تاريخي لبند واحد |
| `src/components/BulkHistoricalPricing.tsx` | ملف جديد - تسعير تاريخي شامل لكل البنود |
| `src/components/AnalysisResults.tsx` | إضافة خيار "سعر تاريخي" + زر التسعير الشامل |

## لا تغييرات على قاعدة البيانات

البيانات التاريخية موجودة بالفعل في جدولي `historical_pricing_files` و `saved_projects`.


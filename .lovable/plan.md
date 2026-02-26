

# تحسين حوار استيراد البنود إلى المكتبة

## 1. التحقق من عدم تجاوز العناصر

الإصلاحات السابقة (overflow-hidden + break-words + line-clamp-2) مطبقة بالفعل. سأتحقق عملياً بعد التنفيذ.

## 2. إضافة خاصية البحث والفلترة

### الملف: `src/components/QuotationUpload.tsx`

**إضافة state جديد:**
```typescript
const [importSearchQuery, setImportSearchQuery] = useState('');
```

**إضافة حقل بحث** بين "تحديد الكل" و ScrollArea (سطر ~1793):
- حقل Input مع أيقونة Search
- placeholder: "البحث في البنود..."
- يبحث في `item.description` بتطابق جزئي (case-insensitive)

**تصفية البنود المعروضة:**
- إنشاء `filteredItems` من `importQuotation?.ai_analysis?.items` بناءً على `importSearchQuery`
- عرض `filteredItems` فقط في ScrollArea
- تحديث عداد "تحديد الكل" ليعمل على البنود المفلترة فقط
- مسح البحث عند إغلاق الحوار

## 3. عرض السعر الإجمالي للبنود المحددة

**إضافة حساب المجموع:**
```typescript
const selectedTotalPrice = useMemo(() => {
  const items = importQuotation?.ai_analysis?.items || [];
  return Array.from(selectedImportItems).reduce((sum, idx) => {
    const item = items[idx];
    return sum + ((item?.unit_price ?? 0) * (item?.quantity ?? 1));
  }, 0);
}, [selectedImportItems, importQuotation]);
```

**عرض المجموع** بين ScrollArea و DialogFooter:
- شريط ملخص يعرض: "إجمالي البنود المحددة: X,XXX SAR"
- تنسيق بخلفية خضراء فاتحة مع أيقونة Calculator

## التفاصيل التقنية

### التغييرات في سطور محددة:

1. **سطر ~151**: إضافة `importSearchQuery` state
2. **سطر ~780-792**: تحديث "تحديد الكل" ليعمل مع البنود المفلترة
3. **سطر ~793**: إضافة حقل البحث (Input + Search icon)
4. **سطر ~796**: تصفية البنود بناءً على البحث
5. **سطر ~822-823**: إضافة شريط السعر الإجمالي قبل DialogFooter
6. **إغلاق الحوار**: مسح `importSearchQuery`

### النتيجة المتوقعة
- حقل بحث يصفي البنود فورياً أثناء الكتابة
- عداد "تحديد الكل" يتكيف مع نتائج البحث
- شريط إجمالي يعرض مجموع أسعار البنود المحددة (سعر x كمية)
- تجربة مستخدم سلسة دون تجاوز أو مشاكل عرض


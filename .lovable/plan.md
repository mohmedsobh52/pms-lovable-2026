

# معالجة مشكلة حوار استيراد بنود عرض السعر إلى المكتبة

## المشكلة

حوار "استيراد بنود عرض السعر إلى المكتبة" يعاني من مشكلة تجاوز العناصر (overflow) حيث تمتد حدود البنود الخضراء خارج حدود الحوار. السبب الرئيسي:
1. `DialogContent` لا يحتوي على `overflow-hidden`
2. أوصاف البنود الطويلة (مثل "PRESSURE REDUCING VALVE DN400 PN16 GGG50") تتجاوز عرض الحاوية رغم وجود `truncate`
3. `ScrollArea` لا تقيد المحتوى بشكل صحيح

## الحل

### الملف: `src/components/QuotationUpload.tsx` (سطر 1747-1820)

1. **إضافة `overflow-hidden` إلى `DialogContent`** لمنع تجاوز المحتوى:
   - تغيير: `className="max-w-lg max-h-[80vh]"` 
   - إلى: `className="max-w-lg max-h-[80vh] overflow-hidden"`

2. **إضافة `overflow-hidden` إلى حاوية كل بند** لمنع تجاوز النص:
   - تغيير: `className="flex-1 min-w-0"`
   - إلى: `className="flex-1 min-w-0 overflow-hidden"`

3. **تحسين عرض الوصف** ليكون `break-words` بدلاً من `truncate` لأن البنود التقنية الطويلة تحتاج لعرض كامل:
   - تغيير: `className="text-sm truncate"`
   - إلى: `className="text-sm break-words line-clamp-2"` (عرض سطرين كحد أقصى)

4. **تقييد عرض `ScrollArea`** بإضافة `overflow-hidden` لمنع التجاوز الأفقي:
   - إضافة `className="overflow-hidden"` للحاوية الخارجية `space-y-3`

### النتيجة المتوقعة

- البنود ستظهر بشكل منظم داخل حدود الحوار
- النصوص الطويلة ستُعرض في سطرين كحد أقصى بدلاً من التجاوز
- الحدود الخضراء ستبقى ضمن حدود الحوار
- لن يحدث تجاوز أفقي أو رأسي


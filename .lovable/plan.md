
# إصلاح مشكلة ظهور نقطة حمراء بدلاً من النص العربي

## تحليل المشكلة

عند تحليل ملف BOQ يحتوي على وصف إنجليزي فقط، يظهر عمود "الوصف العربي" بنقطة حمراء (●) بدلاً من أن يكون فارغاً أو مخفياً. السبب الجذري:

1. **الذكاء الاصطناعي يُرجع قيمة غير صالحة في `description_ar`** - قد يكون حرف واحد أو رمز خاص أو نص غير عربي
2. **`hasArabicDescriptions` (سطر 269)** يتحقق فقط من وجود قيمة غير فارغة بدون التأكد أنها فعلاً نص عربي
3. **العرض في الخلية (سطر 2399)** يعرض أي قيمة موجودة دون التحقق من صلاحيتها كنص عربي

## الحل (3 تعديلات في ملف واحد)

### الملف: `src/components/AnalysisResults.tsx`

#### 1. تشديد فحص `hasArabicDescriptions` (سطر 268-270)
استبدال `.trim()` بفحص فعلي لوجود أحرف عربية:

```typescript
const hasArabicDescriptions = useMemo(() => {
  return data?.items?.some(item => {
    const descAr = (item as any).description_ar;
    return descAr && typeof descAr === 'string' && descAr.trim().length > 1 
      && /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(descAr);
  }) ?? false;
}, [data?.items]);
```

هذا يضمن أن العمود يظهر فقط عندما يوجد نص عربي حقيقي (أحرف عربية فعلية وليس رموز أو أحرف لاتينية).

#### 2. تحسين عرض الخلية (سطر 2399)
إضافة نفس التحقق عند عرض محتوى الخلية:

```typescript
const descAr = (item as any).description_ar;
const text = descAr && /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(descAr) 
  ? cleanText(descAr) : "-";
```

#### 3. تنظيف `description_ar` عند استلام البيانات من AI في `BOQAnalyzerPanel.tsx` (سطر 474-488)

إضافة تحقق إضافي بعد الكشف الذكي: إذا لم يحتوِ `description_ar` على أحرف عربية فعلية، يتم تفريغه:

```typescript
// بعد السطر 476
if (description_ar && !/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(description_ar)) {
  description_ar = ''; // ليس نصاً عربياً حقيقياً
}
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/AnalysisResults.tsx` | تشديد فحص `hasArabicDescriptions` + تحسين عرض الخلية |
| `src/components/BOQAnalyzerPanel.tsx` | تنظيف `description_ar` غير الصالح من نتائج AI |

## النتيجة المتوقعة

- إذا كان الملف يحتوي على وصف إنجليزي فقط: عمود "الوصف العربي" لن يظهر إطلاقاً
- إذا كان الملف يحتوي على وصف عربي حقيقي: يظهر العمود بالنص الصحيح
- لن تظهر نقاط حمراء أو رموز غير مفهومة بعد الآن

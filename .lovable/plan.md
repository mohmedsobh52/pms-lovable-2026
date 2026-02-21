

# إضافة عمود الوصف العربي في جدول BOQ

## الوضع الحالي

جدول BOQ في `AnalysisResults.tsx` يعرض عمود `Description` واحد فقط. البيانات قد تحتوي على حقل `description_ar` (الوصف العربي) لكنه لا يُعرض في الجدول.

## التغيير المطلوب

عند وجود وصف عربي ووصف إنجليزي في البنود، يتم عرض كلاهما في الجدول - إما كعمودين منفصلين أو كعمود واحد يعرض الوصفين معاً (العربي تحت الإنجليزي).

## التفاصيل التقنية

### الملف: `src/components/TableControls.tsx`

- إضافة عمود جديد في `BOQ_TABLE_COLUMNS`:
```text
{ id: "description_ar", label: "Arabic Desc.", labelAr: "الوصف العربي" }
```

### الملف: `src/components/AnalysisResults.tsx`

**1. الكشف التلقائي عن وجود وصف عربي:**
- إضافة `useMemo` يفحص إذا كان أي بند يحتوي على `description_ar` غير فارغ
- إذا وُجد، يتم إضافة `description_ar` تلقائياً إلى `visibleColumns` عند التحميل الأول

**2. إضافة عمود الوصف العربي في الجدول (header + body):**
- **Header** (سطر ~2244): إضافة `<th>` جديد بعد عمود Description مباشرة بعنوان "الوصف العربي / Arabic Desc."
- **Body** (سطر ~2362): إضافة `<td>` جديد يعرض `(item as any).description_ar` مع:
  - نفس تنسيق عمود Description (break-words, leading-relaxed)
  - اتجاه النص RTL لأنه عربي (`dir="rtl"`)
  - دعم البحث (highlight) مثل عمود Description الإنجليزي
  - عرض "-" إذا لم يكن هناك وصف عربي للبند

**3. تحديث تصدير CSV المفلتر (سطر ~2139):**
- إضافة عمود "Arabic Description" في التصدير

### الملف: `src/components/AnalysisResults.tsx` - واجهة BOQItem

- تحديث `interface BOQItem` (سطر 115-124) لإضافة:
```text
description_ar?: string;
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/TableControls.tsx` | إضافة عمود `description_ar` في `BOQ_TABLE_COLUMNS` |
| `src/components/AnalysisResults.tsx` | إضافة الحقل في الواجهة + الكشف التلقائي + عرض العمود في الجدول + تحديث التصدير |


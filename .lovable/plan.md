
# إصلاح مشكلة عدم ظهور الوصف العربي

## المشكلة
عمود "الوصف العربي" يظهر في رأس الجدول لكن محتواه فارغ (`-`) لجميع البنود، رغم أن البيانات قد تحتوي على نصوص عربية في حقل `description`.

## السبب الجذري
ثلاث مشاكل متداخلة:

1. **فحص ضعيف لوجود الوصف العربي**: الفحص الحالي `item.description_ar && item.description_ar.trim() !== ''` لا يتحقق من وجود أحرف عربية فعلية، فقد يُفعّل العمود بسبب نص إنجليزي أو رموز في الحقل
2. **عدم نقل النص العربي من حقل `description`**: عند وجود وصف عربي في `description` بدون نسخه إلى `description_ar`، لا يتم ذلك تلقائياً أثناء تحميل البنود أو ترحيلها
3. **الذكاء الاصطناعي لا يُرجع `description_ar` دائماً**: خاصة للمستندات الإنجليزية فقط

---

## التغييرات المطلوبة

### 1. تحسين فحص `hasArabicDescriptions` في `ProjectBOQTab.tsx`

**السطر 110**: تغيير الفحص ليشمل التحقق من وجود أحرف عربية فعلية:
```text
الحالي: item.description_ar && item.description_ar.trim() !== ''
الجديد: فحص regex للأحرف العربية في description_ar أو description
```

### 2. إضافة دالة `ensureArabicDescriptions` في `ProjectBOQTab.tsx`

إضافة `useMemo` يعالج البنود المعروضة ليضمن:
- إذا كان `description` يحتوي على عربي و `description_ar` فارغ: نسخ النص العربي إلى `description_ar`
- إذا كان `description_ar` لا يحتوي على عربي فعلي: تفريغه

### 3. تحسين الترحيل في `ProjectDetailsPage.tsx`

**السطر 230**: إضافة فحص وتصحيح `description_ar` أثناء ترحيل البنود من `analysis_data` إلى `project_items`:
- فحص `description` للمحتوى العربي ونسخه إلى `description_ar` إذا كان فارغاً
- تنظيف `description_ar` من النصوص غير العربية

---

## التفاصيل التقنية

### Regex للكشف عن العربية
```text
/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/
```

### المنطق المحسن في ProjectBOQTab
```text
const processedItems = useMemo(() => {
  return displayedItems.map(item => {
    let descAr = item.description_ar || '';
    // إذا كان description يحتوي عربي ولا يوجد description_ar
    if (!hasArabicChars(descAr) && hasArabicChars(item.description)) {
      descAr = item.description;
    }
    return { ...item, description_ar: hasArabicChars(descAr) ? descAr : null };
  });
}, [displayedItems]);

const hasArabicDescriptions = processedItems.some(item => 
  item.description_ar && hasArabicChars(item.description_ar)
);
```

### الملفات المتأثرة
| الملف | التغيير |
|-------|---------|
| `src/components/project-details/ProjectBOQTab.tsx` | تحسين فحص العربية + معالجة البنود |
| `src/pages/ProjectDetailsPage.tsx` | تصحيح الترحيل ليشمل نسخ الوصف العربي |

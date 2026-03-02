

# خطة: تطوير أداء شاشة النتائج وإضافة اقتراحات البنية التحتية

## 1. تحسين أداء وشكل شاشة النتائج

### تحسينات الأداء:
- تغليف `renderResultsView` و `renderInputView` و `renderProcessingView` بـ `useCallback` لمنع إعادة الإنشاء غير الضرورية
- استخدام `React.memo` لجدول النتائج عبر فصله كمكون مستقل `ResultsTable`
- تحسين `saveToDatabase` بـ `useCallback`

### تحسينات الشكل:
- تحسين ألوان النص في الجدول ليكون أسود/داكن بوضوح أكبر (`text-foreground` بدلاً من `text-muted-foreground`)
- تحسين عناوين الجدول بخلفية أوضح وخط أثقل
- تحسين مظهر أزرار "New Request" و "Close" بتصميم أكثر وضوحاً
- تحسين تباعد الصفوف وحجم الخط في الجدول

## 2. إضافة اقتراحات البنية التحتية المتكاملة

استبدال الاقتراحات الحالية (أجهزة لابتوب، أثاث مكتبي) باقتراحات مرتبطة بقواعد بيانات البنية التحتية من `reference-prices.ts`، مقسمة حسب الفئات:

**الاقتراحات الجديدة (10 اقتراحات متخصصة):**
- خرسانة جاهزة وحديد تسليح لمشروع إنشائي (concrete)
- أعمال حفر وردم وتسوية أرض (earthworks)
- شبكة مواسير صرف صحي ومياه (pipes)
- كابلات كهربائية ولوحات توزيع (electrical)
- أعمال أسفلت وبردورات طرق (roads)
- أنظمة تكييف مركزي HVAC (hvac)
- أعمال سباكة ومواسير PPR (plumbing)
- نظام إطفاء حريق ورشاشات (fire_fighting)
- كاميرات مراقبة ونظام BMS (smart)
- عزل مائي وحراري للمباني (waterproofing)

## 3. تفاصيل تقنية

### الملف: `src/components/procurement/RequestOfferDialog.tsx`

**تغييرات الاقتراحات:**
- استبدال مصفوفة `allSuggestions` بالاقتراحات المتخصصة في البنية التحتية
- إضافة أيقونة فئة لكل اقتراح (اختياري)

**تغييرات شكل الجدول:**
- `TableHead`: إضافة `text-foreground font-bold` وخلفية أغمق
- `TableCell` (الاسم): `text-foreground font-semibold`
- `TableCell` (السعر): `text-primary font-bold text-base`
- `TableCell` (الموردين): `text-foreground/80`
- تحسين padding الخلايا
- إضافة `hover:bg-muted/50` للصفوف
- تحسين أزرار الإجراءات بتصميم أوضح

**تحسينات الأداء:**
- `useCallback` لـ `saveToDatabase`, `handleNewRequest`, `handleSubmitWithQuery`
- `useMemo` لتحويل النتائج المعروضة

### الملف المتأثر:
- `src/components/procurement/RequestOfferDialog.tsx` فقط

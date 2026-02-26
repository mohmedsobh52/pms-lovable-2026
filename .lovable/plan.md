

# خطة التحسينات الشاملة للمكتبة وعروض الأسعار

## 1. إصلاح تحذير PriceValidityIndicator في EquipmentTab

**المشكلة:** تحذير "Function components cannot be given refs" لأن `TooltipTrigger asChild` يمرر ref إلى `Badge` أو `div` لكن أحياناً يتلقاه `PriceValidityIndicator` مباشرة في `EquipmentTab`.

**الحل:** تحويل `PriceValidityIndicator` لـ `forwardRef` في `src/components/library/PriceValidityIndicator.tsx`.

---

## 2. تحسين أداء جدول المواد في المكتبة

**الملفات:** `MaterialsTab.tsx`, `LaborTab.tsx`, `EquipmentTab.tsx`

- تأخير البحث (debounce) بـ 300ms لتقليل إعادة الحساب عند الكتابة السريعة
- استخدام `useDeferredValue` للبحث لتحسين الاستجابة
- لف دوال `exportToExcel` و `handleFileUpload` و `handleSubmit` في `useCallback` في LaborTab و EquipmentTab (تم في MaterialsTab سابقاً)

---

## 3. إضافة استيراد العمالة والمعدات من عروض الأسعار

**الملف:** `src/components/QuotationUpload.tsx`

**الوضع الحالي:** يوجد زر "استيراد إلى المكتبة" يستورد البنود كمواد فقط (`addMaterial`).

**التحسين:**
- إضافة اختيار نوع الاستيراد في حوار الاستيراد: مواد / عمالة / معدات
- عند اختيار "عمالة": استخدام `useLaborRates().addLaborRate()` بدلاً من `addMaterial`
- عند اختيار "معدات": استخدام `useEquipmentRates().addEquipmentRate()`
- إضافة 3 أزرار/tabs في أعلى حوار الاستيراد لاختيار النوع
- كل نوع يملأ الحقول المناسبة تلقائياً من بيانات عرض السعر

---

## 4. تقرير مقارنة شامل بين المكتبة وعروض الأسعار

**ملف جديد:** `src/components/library/LibraryQuotationReport.tsx`

**الميزات:**
- جلب جميع عروض الأسعار المحللة من Supabase (`price_quotations` بحالة `analyzed`)
- مطابقة بنود العروض ببنود المكتبة (مواد + عمالة + معدات) باستخدام محرك المطابقة الموجود
- عرض:
  - بطاقات إحصائية: عدد البنود المطابقة، نسبة التغطية، متوسط الفرق السعري، الوفورات المحتملة
  - رسم بياني شريطي (Bar Chart) يقارن أسعار المكتبة بمتوسط أسعار العروض
  - رسم دائري (Pie Chart) يوضح توزيع المطابقات حسب النوع
  - جدول تفصيلي مع فلترة وبحث
- إمكانية تصدير التقرير لـ Excel و PDF
- إضافة تبويب جديد "تقرير المقارنة" في `LibraryDatabase.tsx`

**التكامل:** إضافة تبويب رابع في `LibraryDatabase.tsx` باسم "مقارنة العروض" / "Quotation Comparison".

---

## التفاصيل التقنية

### هيكل حوار الاستيراد المحسن (QuotationUpload.tsx)

```text
+-----------------------------------------------+
|  استيراد إلى المكتبة                           |
|  [مواد] [عمالة] [معدات]  <-- أزرار التبديل     |
|                                                |
|  [ ] بند 1 - وصف البند - السعر                 |
|  [ ] بند 2 - وصف البند - السعر                 |
|                                                |
|  [إلغاء]              [استيراد (5)]             |
+-----------------------------------------------+
```

### هيكل تبويب تقرير المقارنة

```text
+--------------------------------------------------+
| [مواد] [عمالة] [معدات] [مقارنة العروض]            |
|                                                    |
| بطاقات: مطابقة | تغطية % | فرق سعري | وفورات      |
|                                                    |
| [رسم بياني شريطي - أسعار المكتبة vs العروض]        |
| [رسم دائري - توزيع المطابقات]                      |
|                                                    |
| جدول: بند | سعر المكتبة | سعر العرض | الفرق %      |
|                                                    |
| [تصدير Excel] [تصدير PDF]                          |
+--------------------------------------------------+
```

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/library/PriceValidityIndicator.tsx` | إضافة `forwardRef` |
| `src/components/library/MaterialsTab.tsx` | إضافة debounce للبحث |
| `src/components/library/LaborTab.tsx` | إضافة debounce + useCallback |
| `src/components/library/EquipmentTab.tsx` | إضافة debounce + useCallback |
| `src/components/QuotationUpload.tsx` | تحسين حوار الاستيراد لدعم 3 أنواع |
| `src/components/library/LibraryQuotationReport.tsx` | ملف جديد - تقرير المقارنة |
| `src/components/LibraryDatabase.tsx` | إضافة تبويب رابع "مقارنة العروض" |


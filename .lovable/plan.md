

# تحسين لوحة مؤشرات الأداء (KPI Dashboard) وتحليل المخاطر

## المشاكل المحددة

### 1. القيمة الإجمالية تظهر صفر (0)
السبب: في `AnalysisResults.tsx` (سطر 891)، يعتمد `totalValue` على `data.summary?.total_value` أولاً، وإذا كان صفراً يحسب مجموع `total_price` للبنود. لكن عندما تكون البنود غير مسعرة يظهر 0. المشكلة الأخرى أن `projectAnalysisData` في `ProjectDetailsPage` يمرر `pricingStats.totalValue` بشكل صحيح لكن `AnalysisResults` لا يعيد حساب القيمة عند تغيير الأسعار لأن `useMemo` يعتمد على `[data]` فقط.

**الحل**: تحسين حساب `totalValue` ليشمل حساب `quantity * unit_price` كبديل عندما يكون `total_price` صفراً، وإضافة `items` كتبعية للـ memo.

### 2. تحليل المخاطر غير مرتبط بقاعدة البيانات
حالياً `highRiskCount` يعتمد على فحص بدائي (البحث عن كلمة "risk" في الملاحظات أو بنود أكبر من 5% من القيمة). لا يقرأ من جدول `risks` في قاعدة البيانات.

**الحل**: ربط `EnhancedKPIDashboard` ببيانات المخاطر الفعلية من جدول `risks` عبر `projectId`.

### 3. تحسين الشكل والأداء
- تحسين بطاقات KPI بألوان وأيقونات أوضح
- إضافة تأثيرات حركية أفضل
- تحسين عرض القيمة الإجمالية بتنسيق مالي واضح مع عرض الرقم كاملاً

---

## التغييرات التقنية

### الملف 1: `src/components/AnalysisResults.tsx`
**تحسين حساب `kpiData` (سطر 889-911)**:
- تعديل حساب `totalValue` ليحسب `sum(quantity * unit_price)` كبديل عند غياب `total_price`
- تحسين حساب `highRiskCount` ليكون أكثر دقة (استبعاد القيمة الصفرية من حساب نسبة 5%)
- إضافة خاصية `projectId` لربط المخاطر

### الملف 2: `src/components/EnhancedKPIDashboard.tsx`
**تحسين الشكل والأداء**:
- تعديل `formatCurrency` لعرض الأرقام كاملة بفواصل الآلاف بدلاً من الاختصار (M/K)
- إضافة `projectId` كخاصية اختيارية وجلب عدد المخاطر الفعلي من جدول `risks`
- تحسين تصميم بطاقة القيمة الإجمالية بخلفية مميزة وخط أكبر
- إضافة عداد المخاطر الفعلي من قاعدة البيانات عند توفر `projectId`
- تحسين ألوان الأيقونات والخلفيات

### الملف 3: `src/pages/ProjectDetailsPage.tsx`
**ربط المخاطر بالمشروع**:
- تمرير `projectId` إلى `projectAnalysisData` ليتم استخدامه في `AnalysisResults`
- تحسين حساب `pricingStats.totalValue` ليحسب `quantity * unit_price` عند غياب `total_price`

---

## ملخص التحسينات

| التحسين | الملف | التأثير |
|---------|-------|---------|
| إصلاح القيمة الإجمالية | AnalysisResults + ProjectDetailsPage | القيمة تظهر صحيحة حتى بدون total_price |
| ربط تحليل المخاطر | EnhancedKPIDashboard | عرض عدد المخاطر الفعلي من قاعدة البيانات |
| تنسيق مالي محسن | EnhancedKPIDashboard | عرض الأرقام كاملة بفواصل الآلاف |
| تحسين بصري | EnhancedKPIDashboard | بطاقات أوضح بألوان وتأثيرات محسنة |




# تحديث شامل - التسعير، المستخلصات، لوحة المعلومات، المقاولين، العقود، والمشتريات

## ملخص التحديثات المطلوبة

8 مجالات رئيسية: تحسين دقة التسعير، ربط أسعار السوق، تحديث المستخلصات، تحسين التقارير ولوحة المعلومات، تحسين جدول الكميات، إضافة عروض أسعار لمواد غير موجودة، تحديث شاشة المقاولين/المشتريات، تحديث العقود.

---

## 1. تحسين دقة التسعير + ربط أسعار السوق

### `src/lib/reference-prices.ts`
- إضافة 40+ بند مرجعي جديد: elevator/lifts, fire doors, glass curtain wall, marble, granite, raised floor, access floor, solar panels, EV charging, steel railing, stainless steel, aluminum cladding, GRC panels, precast panels, swimming pool, fountain, parking system
- تحديث أسعار 2026 للبنود الحالية (تضخم 3-5%)

### `supabase/functions/suggest-market-rates/index.ts`
- تحسين المطابقة: إضافة bonus score عند تطابق الوحدة (+0.15)
- إضافة penalty عند عدم تطابق الوحدة (-0.2)
- زيادة عدد البنود المرسلة للـ AI من 20 إلى 30
- إضافة `market_trend` field (up/down/stable) في الاستجابة

### `src/components/project-details/AutoPriceDialog.tsx`
- إضافة مصدر ثامن: "أسعار السوق الحالية" يستدعي `fetch-market-prices` تلقائياً للبنود غير المطابقة
- عرض مؤشر اتجاه السوق (سهم أعلى/أسفل) بجانب كل سعر مقترح

---

## 2. تحديث شاشة المستخلصات

### `src/pages/ProgressCertificatesPage.tsx`
- إضافة رسوم بيانية: bar chart لمقارنة الأعمال السابقة/الحالية، pie chart لتوزيع الاستقطاعات
- إضافة بطاقات KPI في الأعلى: إجمالي المستخلصات، إجمالي صافي المبالغ، نسبة الإنجاز الكلية، متوسط الاستقطاعات
- تحسين جدول البنود: إضافة عمود "نسبة الإنجاز" مع شريط تقدم ملون
- إضافة زر "تصدير ملخص" يولد PDF بملخص كل المستخلصات
- تطبيق ألوان البراند (#F3570C كـ primary)

---

## 3. تحسين التقارير ولوحة المعلومات

### `src/components/MainDashboard.tsx`
- استبدال ألوان الرسوم البيانية القديمة بألوان البراند:
  - `CHART_COLORS` → `["#F3570C", "#161616", "#605F5F", "#10B981", "#7C3AED"]`
  - `STATUS_COLORS.pending` → `"#F3570C"`
  - `STATUS_COLORS.under_review` → `"#605F5F"`
- تحسين gradients في `MonthlyActivityChart` لتستخدم `#F3570C` بدل `#3B82F6`
- إضافة بطاقة "صحة التسعير" تعرض: عدد البنود المسعرة من AI vs يدوي vs مكتبة، مع donut chart
- إضافة قسم "أحدث أسعار السوق" يعرض آخر 5 أسعار من `market_price_cache`

### `src/pages/ReportsPage.tsx`
- إضافة بطاقة إحصائية جديدة: "دقة التسعير" تحسب متوسط deviation بين الأسعار المقترحة والنهائية من `pricing_history`
- تحسين tab "تحليل الأسعار" بإضافة مقارنة مصادر التسعير

---

## 4. تحسين جدول الكميات (BOQ)

### `src/components/project-details/ProjectBOQTab.tsx`
- إضافة عمود "مصدر السعر" يعرض badge ملون (AI/مكتبة/يدوي/تاريخي/سوق)
- إضافة "تلوين شرطي": البنود بسعر 0 تظهر بخلفية حمراء خفيفة، البنود عالية القيمة بخلفية برتقالية
- تحسين الفلترة: إضافة فلتر "حسب مصدر السعر" و"حسب الفئة"
- إضافة زر "تسعير البنود الفارغة" يفتح AutoPriceDialog مع فلتر مسبق للبنود صفرية السعر

---

## 5. عروض أسعار لمواد غير موجودة

### `src/components/QuotationUpload.tsx`
- إضافة زر "طلب عرض سعر لمواد غير متوفرة" يفتح dialog يعرض البنود التي لم تُطابق في المكتبة
- إضافة خيار "إرسال طلب عرض سعر" يولد PDF بقائمة المواد المطلوبة مع الكميات
- ربط مع `RequestOfferDialog` من المشتريات لتسهيل طلب العروض

### `src/pages/QuotationsPage.tsx`
- إضافة tab ثالث "مواد غير مسعرة" يعرض قائمة بالبنود التي ليس لها سعر في أي مصدر
- إضافة زر "بحث في السوق" يستدعي `fetch-market-prices` للبنود المحددة

---

## 6. تحديث شاشة مقاولي الباطن

### `src/pages/SubcontractorsPage.tsx`
- إضافة بطاقات KPI محسنة: إجمالي قيمة العقود، متوسط نسبة الإنجاز، مقاولين متأخرين، مدفوعات معلقة
- تحسين الألوان لتتبع البراند

### `src/components/SubcontractorManagement.tsx`
- إضافة رسم بياني: bar chart أفقي لمقارنة إنجاز المقاولين
- إضافة نظام تقييم أداء: 5 نجوم مع ملاحظات
- إضافة عمود "الانحراف عن الجدول" (أيام تأخير/تقدم)

---

## 7. تحديث شاشة المشتريات

### `src/pages/ProcurementPage.tsx`
- تحديث لون زر "طلب عرض سعر" من `#F5A623` إلى `#F3570C`
- إضافة بطاقات KPI: عدد الشركاء النشطين، إجمالي العقود، عروض أسعار معلقة
- إضافة tab "تحليل الموردين" يعرض مقارنة أداء وتقييم الموردين

### `src/components/procurement/ExternalPartners.tsx`
- إضافة فلتر "حسب التقييم" و"حسب التخصص"
- تحسين بطاقة الشريك بإضافة: آخر عرض سعر، عدد العقود، مؤشر الموثوقية

---

## 8. تحديث شاشة العقود

### `src/pages/ContractsPage.tsx`
- إضافة بطاقة "عقود متأخرة" في الإحصائيات مع تنبيه بصري أحمر
- تحسين ألوان الأيقونات لتتبع البراند

### `src/components/contracts/ContractsDashboard.tsx`
- استبدال الألوان القديمة بألوان البراند
- إضافة radar chart لتقييم صحة العقود (القيمة، الإنجاز، المدفوعات، المخاطر)
- إضافة timeline مرئي يعرض العقود على خط زمني

---

## الملفات المتأثرة

| الملف | نوع التعديل |
|---|---|
| `src/lib/reference-prices.ts` | إضافة 40+ بند مرجعي |
| `supabase/functions/suggest-market-rates/index.ts` | تحسين المطابقة |
| `src/components/project-details/AutoPriceDialog.tsx` | مصدر تسعير جديد |
| `src/pages/ProgressCertificatesPage.tsx` | رسوم + KPI + ألوان |
| `src/components/MainDashboard.tsx` | ألوان البراند + بطاقات جديدة |
| `src/pages/ReportsPage.tsx` | إحصائية دقة التسعير |
| `src/components/project-details/ProjectBOQTab.tsx` | أعمدة + فلاتر + تلوين |
| `src/components/QuotationUpload.tsx` | طلب عروض للمواد الناقصة |
| `src/pages/QuotationsPage.tsx` | tab مواد غير مسعرة |
| `src/pages/SubcontractorsPage.tsx` | KPI محسنة |
| `src/components/SubcontractorManagement.tsx` | رسوم + تقييم |
| `src/pages/ProcurementPage.tsx` | ألوان + KPI |
| `src/pages/ContractsPage.tsx` | إحصائيات + ألوان |
| `src/components/contracts/ContractsDashboard.tsx` | radar chart + timeline |


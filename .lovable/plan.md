

# تحسين لوحة التحكم: إصلاح + رسم بياني للمخاطر + تنبيهات ذكية

## 1. إصلاح مشكلة الأداء الحالية

يوجد تحذير في الكونسول: `Function components cannot be given refs` في `ProjectValueChart` بسبب استخدام `LabelList` مع مكون دالة. سيتم إزالة `LabelList` واستبداله بـ `label` مباشر على `Bar` لحل المشكلة.

---

## 2. إضافة رسم بياني لتوزيع المخاطر حسب الحالة والأولوية

### البيانات:
- جلب بيانات المخاطر من جدول `risks` (بدلا من `cost_benefit_analysis` الحالي) عبر `Promise.all` في `fetchDashboardData`
- تجميع المخاطر حسب:
  - **الحالة** (identified, mitigated, active, closed)
  - **الأولوية** (critical, high, medium, low) باستخدام `risk_score`

### الرسم البياني:
- إضافة **رسم بياني مزدوج** في صف جديد بعد الرسوم الحالية:
  - **Donut Chart** لتوزيع المخاطر حسب الحالة (ألوان مميزة لكل حالة)
  - **Bar Chart أفقي** لتوزيع المخاطر حسب مستوى الخطورة (أحمر/برتقالي/أصفر/أخضر)
- مكون `RiskDistributionChart` مغلف بـ `React.memo`

### تحديث بطاقة الإحصائيات:
- تغيير بطاقة "تحليلات التكلفة" إلى "المخاطر النشطة" مع العدد الفعلي من جدول `risks`

---

## 3. إضافة تنبيهات ذكية للعقود والدفعات

### البيانات:
- جلب العقود القريبة من الانتهاء (`end_date` خلال 30 يوم) من جدول `contracts`
- جلب الدفعات المتأخرة (`due_date` < اليوم و `status = 'pending'`) من جدول `contract_payments`

### العرض:
- إضافة **شريط تنبيهات** أسفل شريط الميزانية الحالي وقبل بطاقات الإحصائيات
- كل تنبيه يعرض:
  - أيقونة ملونة (أحمر للمتأخر، برتقالي للقريب)
  - عنوان العقد/الدفعة
  - عدد الأيام المتبقية أو المتأخرة
  - زر للانتقال لصفحة العقود
- التنبيهات قابلة للإغلاق (dismiss) مؤقتا عبر state محلي

---

## التفاصيل التقنية

### تعديلات `fetchDashboardData`:
```text
- إضافة استعلام risks: supabase.from("risks").select("id, status, risk_score, probability, impact")
- إضافة استعلام expiringContracts: contracts مع end_date <= 30 يوم
- إضافة استعلام overduePayments: contract_payments مع due_date < now() و status = pending
```

### مكونات جديدة (داخل نفس الملف):
- `RiskDistributionChart` (memo) - دونات + بار للمخاطر
- `SmartAlertsBanner` - شريط التنبيهات الذكية

### تعديل DashboardStats interface:
```text
+ risksByStatus: { status: string; count: number; color: string }[]
+ risksByLevel: { level: string; count: number; color: string }[]
+ expiringContracts: { id: string; title: string; end_date: string; daysLeft: number }[]
+ overduePayments: { id: string; contract_title: string; amount: number; due_date: string; daysOverdue: number }[]
```

### إصلاح ProjectValueChart:
- إزالة `LabelList` واستخدام خاصية `label` المدمجة في `Bar`

---

## الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/components/MainDashboard.tsx` | إصلاح تحذير + رسم مخاطر + تنبيهات ذكية |


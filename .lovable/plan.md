

# المرحلة 17: خلفية تفاعلية + Radar Chart + تحسين صفحة تفاصيل المشروع

---

## 17.1 إزالة صور الخلفيات وإنشاء خلفية تفاعلية

### المشكلة
- `BackgroundImage.tsx` يستخدم صورة ثابتة (`pms-dashboard-bg.png`) مما يبطئ التحميل ويبدو غير عصري
- الصورة مستخدمة في `App.tsx` (عامة) و `HomePage.tsx` و `PageLayout.tsx`

### الحل
**الملف:** `src/components/BackgroundImage.tsx`
- حذف مرجع الصورة بالكامل
- استبدالها بخلفية تفاعلية CSS-only تتضمن:
  - تدرج متحرك (Animated Gradient) باستخدام ألوان النظام الجديدة (أزرق داكن + ذهبي)
  - شبكة نقاط خفيفة (Dot Grid) تعطي إحساس تقني
  - تأثير متحرك `@keyframes gradient-shift` للتدرج البطيء
  - لا صور خارجية = تحميل أسرع بكثير

**الملف:** `src/pages/FastExtractionPage.tsx`
- إزالة مرجع `construction-bg.png` واستخدام `bg-background` بدلاً منه

---

## 17.2 إضافة Radar Chart لمؤشرات الأداء KPI

**الملف:** `src/components/MainDashboard.tsx`

- إضافة import لـ `Radar`, `RadarChart`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis` من `recharts`
- إضافة قسم جديد بعد KPI Cards يعرض Radar Chart تفاعلي يضم:
  - Project Health (صحة المشاريع)
  - Pricing Efficiency (كفاءة التسعير)
  - Risk Score (مؤشر المخاطر)
  - Contract Health (صحة العقود)
- استخدام ألوان النظام: `#F5A623` (ذهبي) للخط الرئيسي و `#2563EB` (أزرق) للمقارنة
- وضعه بجانب بطاقات KPI الحالية في تخطيط `grid grid-cols-1 lg:grid-cols-3`
  - عمودين لـ KPI cards (2x2 grid)
  - عمود واحد لـ Radar Chart

---

## 17.3 تحسين صفحة تفاصيل المشروع بالألوان الجديدة

**الملف:** `src/components/project-details/ProjectHeader.tsx`
- تطبيق تدرج أزرق-ذهبي على خلفية الهيدر
- تحسين ألوان أزرار الإجراءات لتتماشى مع النظام

**الملف:** `src/components/project-details/ProjectOverviewTab.tsx`
- تحسين ألوان بطاقات الإحصائيات (استخدام الذهبي للقيم المالية)
- تحسين ألوان الرسوم البيانية

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`
- تحسين ألوان شريط التقدم (Progress bar) لتستخدم الذهبي للاكتمال العالي
- تحسين ألوان أزرار الإجراءات

---

## 17.4 إضافة أنماط CSS للخلفية التفاعلية

**الملف:** `src/index.css`
- إضافة `@keyframes gradient-shift` لحركة التدرج البطيئة
- إضافة `.interactive-bg` class
- إضافة `.dot-grid` pattern class

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/components/BackgroundImage.tsx` | خلفية تفاعلية CSS بدلاً من صورة |
| `src/index.css` | keyframes وأنماط جديدة |
| `src/components/MainDashboard.tsx` | Radar Chart + إعادة تخطيط KPI |
| `src/components/project-details/ProjectHeader.tsx` | ألوان أزرق-ذهبي |
| `src/components/project-details/ProjectOverviewTab.tsx` | ألوان محسنة |
| `src/components/project-details/ProjectBOQTab.tsx` | ألوان محسنة |
| `src/pages/FastExtractionPage.tsx` | إزالة صورة الخلفية |

## ترتيب التنفيذ

1. تحديث `BackgroundImage.tsx` (إزالة الصور + خلفية تفاعلية)
2. إضافة CSS animations في `index.css`
3. إضافة Radar Chart في `MainDashboard.tsx`
4. تحسين ألوان صفحة تفاصيل المشروع
5. تنظيف مراجع الصور المتبقية

## النتيجة المتوقعة

- خلفية تفاعلية أنيقة بدون صور (تحميل أسرع)
- Radar Chart تفاعلي يعطي نظرة شاملة على KPIs
- ألوان موحدة (أزرق داكن + ذهبي) عبر جميع صفحات المشروع
- تباين عالي وقراءة ممتازة في الوضعين الفاتح والداكن


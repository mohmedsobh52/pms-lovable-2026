
# خطة شاملة: إصلاح الأخطاء وتحديث الواجهة الرئيسية

## الجزء الأول: إصلاح زر "مستخلص جديد" (حل نهائي)

### المشكلة
بعد 5 محاولات (Radix controlled, forwardRef, custom div, DialogTrigger, createPortal) - جميعها فشلت. الضغط على الزر لا ينتج أي عنصر في DOM ولا أخطاء في Console.

### الحل: صفحة منفصلة بدلا من Modal
بدلا من محاولة فتح نافذة داخل الصفحة، سننشئ صفحة مستقلة `/progress-certificates/new` للإنشاء. هذا يتجنب كل مشاكل الـ modal/portal/dialog تماما.

**التغييرات:**

1. **ملف جديد:** `src/pages/NewCertificatePage.tsx`
   - ينقل كل محتوى `CreateCertificateModal` إلى صفحة مستقلة
   - يستخدم `PageLayout` كبقية الصفحات
   - زر "إلغاء" يعود بـ `navigate(-1)`
   - بعد الحفظ الناجح يعود لصفحة المستخلصات

2. **تحديث:** `src/pages/ProgressCertificatesPage.tsx`
   - استبدال `onClick={() => setShowCreateDialog(true)}` بـ `onClick={() => navigate('/progress-certificates/new')}`
   - حذف استيراد CreateCertificateModal وكل المنطق المرتبط بها
   - حذف state الـ `showCreateDialog`

3. **تحديث:** `src/App.tsx`
   - إضافة route: `/progress-certificates/new` -> `NewCertificatePage`

4. **حذف:** `src/components/certificates/CreateCertificateModal.tsx`
   - لم يعد مطلوبا

---

## الجزء الثاني: تحديث الواجهة الرئيسية

بناء على الصورة المرجعية المرفقة، الواجهة الحالية قريبة جدا من التصميم المطلوب لكن تحتاج تحسينات:

### التحسينات المطلوبة في `src/pages/HomePage.tsx`:

1. **تحسين بطاقات الإحصائيات العلوية (Hero Section)**
   - إضافة أيقونات ملونة مميزة لكل بطاقة (Active, Progress, Items, Value)
   - تحسين التخطيط ليتوافق مع التصميم المرجعي - صف أفقي مع خلفيات مميزة

2. **تحسين قسم دورة حياة المشروع**
   - التأكد من ظهور الـ 6 مراحل بوضوح مع أيقونات ملونة
   - شريط التقدم أسفلها

3. **تحسين قسم البطاقات الإحصائية (6 بطاقات)**
   - Projects, Items, Quotations, Contracts, Active Risks + Total Value
   - تحسين الألوان والتخطيط لتتوافق مع التصميم

4. **تحسين قسم الأداء والرسوم البيانية**
   - Performance Indicators (CPI, SPI) بتصميم أنظف
   - Project Trends رسم بياني محسّن
   - Cost Distribution رسم بياني

5. **تحسين قسم Quick Access**
   - 7 وحدات بأيقونات واضحة وتصميم بطاقات نظيف
   - إضافة Certificates إلى القائمة (موجود بالفعل)

6. **تحسين Footer**
   - `2024 PMS - Project Management System` مع روابط About و Changelog

### الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/pages/NewCertificatePage.tsx` | ملف جديد - صفحة إنشاء المستخلص |
| `src/pages/ProgressCertificatesPage.tsx` | تبسيط - إزالة Modal واستخدام navigate |
| `src/App.tsx` | إضافة route جديد |
| `src/components/certificates/CreateCertificateModal.tsx` | حذف |
| `src/pages/HomePage.tsx` | تحسينات التصميم والتخطيط |

### ترتيب التنفيذ

1. إنشاء `NewCertificatePage.tsx` (نقل المحتوى من CreateCertificateModal)
2. تحديث `App.tsx` (إضافة Route)
3. تحديث `ProgressCertificatesPage.tsx` (استخدام navigate بدل modal)
4. حذف `CreateCertificateModal.tsx`
5. تحسين `HomePage.tsx` (تحديثات التصميم)

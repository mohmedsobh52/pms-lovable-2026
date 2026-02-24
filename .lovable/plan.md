

# المرحلة 5: الاقتراحات المتبقية - ميزات متقدمة وتحسينات إضافية

---

## 5.1 تنبيهات الأسعار الشاذة (Outlier Price Alerts)

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

اضافة مكون تنبيه يظهر أعلى جدول BOQ عند وجود بنود بأسعار شاذة (أعلى أو أقل من المتوسط بنسبة كبيرة).

**المنطق:**
- حساب متوسط سعر الوحدة لكل فئة
- البنود التي يتجاوز سعرها 200% أو يقل عن 30% من المتوسط تُعتبر شاذة
- عرض شريط تحذيري بعدد البنود الشاذة مع زر لعرض القائمة

**التعديلات:**
- إضافة prop `outlierAlerts` محسوب في `ProjectDetailsPage.tsx`
- عرض `Alert` component أعلى الإحصائيات
- تمييز الصفوف الشاذة بخط border أحمر متقطع

---

## 5.2 آخر نشاط (Recent Activity Feed)

**الملف:** `src/pages/HomePage.tsx`

إضافة قسم "آخر الأنشطة" أسفل Quick Stats strip يعرض آخر 5 إجراءات:
- آخر مشروع تم إنشاؤه/تعديله
- آخر تسعير تم تطبيقه
- آخر عقد تم إنشاؤه

**المنطق:**
- استعلام مشترك من `saved_projects` و `contracts` و `project_items` مرتب بالتاريخ
- عرض كل نشاط بأيقونة مناسبة ووقت نسبي (منذ 5 دقائق، منذ ساعة)
- تخزين مؤقت مع Quick Stats

---

## 5.3 لوحة إجراءات سريعة (Quick Actions Panel)

**الملف:** `src/pages/ProjectDetailsPage.tsx`

إضافة شريط إجراءات سريعة (floating أو ثابت) يظهر في صفحة تفاصيل المشروع يحتوي على:
- زر "تسعير تلقائي" (يفتح Auto Price مباشرة)
- زر "تصدير BOQ" (Excel/PDF)
- زر "تحليل AI" (يذهب لتبويب Analysis)
- زر "رفع ملف" (يفتح Upload dialog)

**التصميم:**
- شريط ثابت أسفل الصفحة (sticky bottom) على الموبايل
- شريط جانبي على الديسكتوب

---

## 5.4 تحرير مباشر في خلايا الجدول (Inline Editing)

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

تمكين المستخدم من النقر المزدوج على خلية سعر الوحدة أو الكمية لتعديلها مباشرة بدون فتح dialog.

**المنطق:**
- إضافة state `editingCell: { itemId: string; field: 'unit_price' | 'quantity' } | null`
- عند double-click على الخلية: تحويلها لـ Input
- عند Enter أو blur: حفظ التعديل في Supabase وتحديث الصف
- عند Escape: إلغاء التعديل

**التعديلات:**
- إضافة props جديدة: `onInlineEdit: (itemId: string, field: string, value: number) => void`
- تعديل خلايا `unit_price` و `quantity` لدعم الوضع المزدوج (عرض/تعديل)

---

## 5.5 تصدير شهادة التسعير (Pricing Certificate)

**ملف جديد:** `src/components/PricingCertificate.tsx`

مستند رسمي قابل للتصدير كـ PDF يحتوي على:
- شعار الشركة والترويسة (من letterhead-utils)
- اسم المشروع وتفاصيله
- ملخص التسعير: عدد البنود، نسبة الثقة، المصادر المستخدمة
- جدول ملخص بالفئات الرئيسية وقيمها
- ختم "معتمد" أو "مسودة"
- QR code يربط بالتقرير الرقمي

**الملف المرتبط:** `src/pages/ProjectDetailsPage.tsx` (إضافة زر التصدير في تبويب BOQ)

---

## 5.6 تحسين Skeleton Loading في Dashboard

**الملف:** `src/components/MainDashboard.tsx`

استبدال spinner بـ Skeleton loading:
- 4 بطاقات skeleton للإحصائيات
- skeleton لجدول المشاريع الأخيرة
- skeleton للرسوم البيانية

هذا يحسن تجربة المستخدم عبر عرض هيكل الصفحة أثناء التحميل بدلاً من شاشة فارغة.

---

## 5.7 تحسين تجربة الموبايل في جدول BOQ

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

على الشاشات الصغيرة (< 768px):
- تحويل الجدول إلى بطاقات (Card layout) بدلاً من جدول أفقي
- إخفاء الأعمدة الأقل أهمية (الوصف العربي، الحالة)
- إضافة swipe actions (سحب يمين للتسعير، سحب يسار للحذف)
- تكبير مناطق اللمس (touch targets)

---

## 5.8 مقارنة أسعار جنباً إلى جنب (Side-by-side Comparison)

**ملف جديد:** `src/components/SideBySidePriceComparison.tsx`

مكون يعرض 3 مصادر تسعير جنباً إلى جنب لكل بند:
- السعر الحالي (المُدخل)
- سعر AI المقترح
- السعر المرجعي من المكتبة

مع:
- رسم بياني شريطي مصغر لكل بند
- تمييز بالألوان للفروقات
- زر "تطبيق الأفضل" لكل بند

**الملف المرتبط:** إضافة كزر في toolbar جدول BOQ

---

## ملخص الملفات المتأثرة

| الملف | التعديلات |
|-------|-----------|
| `src/components/project-details/ProjectBOQTab.tsx` | Outlier alerts, inline editing, mobile responsive |
| `src/pages/ProjectDetailsPage.tsx` | Quick actions panel, outlier calculation, inline edit handler |
| `src/pages/HomePage.tsx` | Recent activity feed |
| `src/components/MainDashboard.tsx` | Skeleton loading |
| `src/components/PricingCertificate.tsx` | ملف جديد - شهادة التسعير |
| `src/components/SideBySidePriceComparison.tsx` | ملف جديد - مقارنة الأسعار |

## ترتيب التنفيذ المقترح

1. Outlier Alerts + Inline Editing (تأثير مباشر على الإنتاجية)
2. Quick Actions Panel + Skeleton Loading (تحسين UX)
3. Recent Activity Feed (معلومات مفيدة)
4. Pricing Certificate + Side-by-side Comparison (ميزات متقدمة)
5. Mobile BOQ optimization (تحسين الموبايل)


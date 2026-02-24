

# المرحلة 19: توحيد الهيدرات والعناوين وتحسين الخلفية عبر كامل البرنامج

---

## المشكلة الحالية

كل صفحة تستخدم تصميم هيدر مختلف تماماً:
- **ContractsPage**: أيقونة + عنوان بسيط + 6 بطاقات إحصائيات بألوان متعددة
- **ReportsPage**: عنوان نص فقط بدون أيقونة ولا تدرج
- **SettingsPage**: عنوان `h2` بسيط بدون وصف
- **LibraryPage**: عنوان مع breadcrumb مختلف
- **MaterialPricesPage**: عنوان `h2` بسيط
- **ProcurementPage**: عنوان + وصف بدون gradient

**المطلوب (مطابقة الصورة المرفقة):**
- هيدر بتدرج أزرق داكن الى أزرق (Navy gradient)
- عنوان أبيض كبير بخط عريض
- عنوان فرعي رمادي فاتح
- أيقونة مربعة بزاوية مستديرة
- أزرار إجراء على اليمين
- شريط إحصائيات سفلي مدمج مع ألوان ذهبية للقيم المالية

---

## 19.1 إنشاء مكوّن هيدر موحّد (PageHeader)

**ملف جديد:** `src/components/PageHeader.tsx`

مكوّن قابل لإعادة الاستخدام يقبل:

```text
interface PageHeaderProps {
  icon: LucideIcon           // أيقونة الصفحة
  title: string              // العنوان الرئيسي
  subtitle?: string          // العنوان الفرعي
  actions?: ReactNode        // أزرار الإجراءات (يمين)
  stats?: StatItem[]         // بطاقات الإحصائيات السفلية
}

interface StatItem {
  value: string | number
  label: string
  type?: 'default' | 'gold' | 'percentage'  // gold = قيمة مالية ذهبية
}
```

**التصميم (مطابق للصورة):**
- خلفية: `bg-gradient-to-r from-[#1a2744] via-[#1e3054] to-[#2563EB]` (تدرج أزرق داكن)
- العنوان: أبيض، `text-2xl font-bold`، خط Inter/Cairo
- العنوان الفرعي: `text-white/70`، حجم أصغر
- الأيقونة: مربع مستدير `rounded-xl` بخلفية `white/10`
- شريط الإحصائيات: خلفية `white/5` بتأثير `backdrop-blur`، القيم المالية بالذهبي `#F5A623`، النسب بالبرتقالي الذهبي
- الأزرار: `variant="outline"` بلون أبيض شفاف + زر رئيسي بخلفية ذهبية/برتقالية

---

## 19.2 تطبيق PageHeader على جميع الصفحات

| الصفحة | الأيقونة | العنوان | الإحصائيات |
|--------|----------|---------|------------|
| `ContractsPage.tsx` | Building2 | Professional Engineering Contracts | Total Contracts, Active, Total Value (gold), Completion % |
| `ReportsPage.tsx` | BarChart3 | Reports | Total Projects, In Progress, Total Value (gold), Completed |
| `SettingsPage.tsx` | Settings2 | Settings | (بدون إحصائيات) |
| `LibraryPage.tsx` | Library | Library | (بدون إحصائيات) |
| `MaterialPricesPage.tsx` | DollarSign | Price Database | (بدون إحصائيات) |
| `ProcurementPage.tsx` | Package | Procurement | (بدون إحصائيات) |
| `SubcontractorsPage.tsx` | Users | Subcontractors | Total, Active, Total Value (gold), Progress % |
| `BOQItemsPage.tsx` | FileSpreadsheet | BOQ Items | (بدون إحصائيات) |
| `CalendarPage.tsx` | Calendar | Calendar | (بدون إحصائيات) |
| `AdminDashboardPage.tsx` | ShieldAlert | Admin Dashboard | (يحتفظ ببطاقاته الخاصة) |

---

## 19.3 تحسين CSS للهيدر الموحد

**الملف:** `src/index.css`

إضافة أنماط جديدة:
- `.page-header-gradient`: تدرج أزرق داكن موحد لجميع الهيدرات
- `.page-header-stat`: بطاقة إحصائية شفافة داخل الهيدر
- `.page-header-stat-gold`: قيمة مالية ذهبية مع تأثير glow
- تحسين تباين النصوص داخل الهيدر (أبيض على أزرق داكن)

---

## 19.4 تحسين خلفية التطبيق

**الملف:** `src/components/BackgroundImage.tsx`

- تعزيز `.interactive-bg` بتدرج أكثر تناغماً مع الهيدر الأزرق الداكن
- الوضع الفاتح: تدرج أبيض مائل للأزرق الخفيف
- الوضع الداكن: تدرج أزرق داكن عميق يتناغم مع هيدرات الصفحات
- تحسين `.dot-grid` لتكون أكثر نعومة

**الملف:** `src/index.css`
- تحسين ألوان `.interactive-bg` لتتلاءم مع التدرج الأزرق الداكن للهيدرات
- ضمان انتقال سلس بين الهيدر والمحتوى

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/components/PageHeader.tsx` | **جديد** - مكوّن هيدر موحد |
| `src/index.css` | أنماط CSS جديدة للهيدر |
| `src/components/BackgroundImage.tsx` | تحسين الخلفية |
| `src/pages/ContractsPage.tsx` | استبدال الهيدر القديم بـ PageHeader |
| `src/pages/ReportsPage.tsx` | استبدال الهيدر القديم بـ PageHeader |
| `src/pages/SettingsPage.tsx` | استبدال الهيدر القديم بـ PageHeader |
| `src/pages/LibraryPage.tsx` | استبدال الهيدر القديم بـ PageHeader |
| `src/pages/MaterialPricesPage.tsx` | استبدال الهيدر القديم بـ PageHeader |
| `src/pages/ProcurementPage.tsx` | استبدال الهيدر القديم بـ PageHeader |
| `src/pages/SubcontractorsPage.tsx` | استبدال الهيدر القديم بـ PageHeader |
| `src/pages/BOQItemsPage.tsx` | استبدال الهيدر القديم بـ PageHeader |
| `src/pages/CalendarPage.tsx` | استبدال الهيدر القديم بـ PageHeader |

## ترتيب التنفيذ

1. إنشاء `PageHeader.tsx` (المكوّن الأساسي)
2. إضافة أنماط CSS في `index.css`
3. تحسين `BackgroundImage.tsx`
4. تطبيق `PageHeader` على جميع الصفحات (بالتوازي)

## النتيجة المتوقعة

- هيدر موحد بتدرج أزرق داكن عبر جميع الصفحات (مطابق للصورة المرفقة)
- عناوين بنفس الخط والحجم واللون في كل مكان
- القيم المالية دائماً بالذهبي `#F5A623`
- خلفية تفاعلية متناغمة مع الهيدرات
- تجربة بصرية متسقة واحترافية




# المرحلة 8: لوحة تحكم إدارية + Dark/Light Mode محسّن + مراجعة التحسينات

---

## 8.1 لوحة تحكم إدارية (Admin Dashboard)

### المشكلة الحالية
صفحة `AdminVersions.tsx` تستخدم فحص أمان ضعيف (`ADMIN_EMAILS` hardcoded). لا توجد لوحة إدارية شاملة لعرض إحصائيات النظام.

### التعديلات المطلوبة

#### أ. إنشاء صفحة إدارية جديدة
**ملف جديد:** `src/pages/AdminDashboardPage.tsx`

صفحة تعرض:
- عدد المستخدمين المسجلين (من `saved_projects` بـ `distinct user_id`)
- عدد المشاريع الإجمالي والنشطة (آخر 30 يوم)
- عدد العقود والعروض المقدمة
- إحصائيات الاستخدام الشهري (رسم بياني خطي)
- آخر المشاريع المنشأة (جدول)
- توزيع المشاريع حسب الحالة (رسم دائري)

**ملاحظة أمنية:** سيتم استخدام جدول `user_roles` الموجود مع دالة `has_role` للتحقق من صلاحية Admin عبر Edge Function آمنة.

#### ب. إنشاء Edge Function لجلب الإحصائيات
**ملف جديد:** `supabase/functions/admin-stats/index.ts`

- تتحقق من أن المستخدم لديه دور `admin` في `user_roles`
- تجلب الإحصائيات من الجداول المختلفة باستخدام `service_role_key`
- ترجع البيانات بتنسيق JSON

#### ج. تسجيل المسار في App.tsx
إضافة route جديد: `/admin/dashboard`

---

## 8.2 تحسين نظام Dark/Light Mode

### المشكلة الحالية
- `ThemeToggle.tsx` يدير الثيم محلياً بـ `useState` مستقل
- `UnifiedHeader.tsx` يكرر نفس المنطق (سطور 106-120)
- لا يوجد Context مشترك، مما يعني أن التبديل في مكان لا ينعكس فوراً في مكان آخر
- بعض الصفحات تستخدم `ThemeToggle` مباشرة خارج `UnifiedHeader`

### التعديلات المطلوبة

#### أ. إنشاء ThemeProvider مركزي
**ملف جديد:** `src/hooks/useTheme.tsx`

```text
ThemeProvider:
- يقرأ الثيم من localStorage عند التحميل
- يستمع لتغييرات النظام (prefers-color-scheme)
- يوفر toggleTheme() و theme و setTheme()
- يطبق الفئة "dark" على document.documentElement
```

#### ب. تحديث ThemeToggle.tsx
تبسيط المكون ليستخدم `useTheme()` بدلاً من إدارة الحالة محلياً.

#### ج. تحديث UnifiedHeader.tsx
إزالة منطق الثيم المكرر (سطور 106-120) واستخدام `useTheme()`.

#### د. تحديث App.tsx
لف التطبيق بـ `ThemeProvider`.

#### هـ. تحسين ألوان Dark Mode في index.css
- تحسين تباين `--warning` في الوضع الداكن
- إضافة `--shadow-*` مخصصة للوضع الداكن
- ضبط شفافية الحدود لتكون أوضح

---

## 8.3 مراجعة وإصلاح التحسينات السابقة

### التحققات المطلوبة

#### أ. فحص كونسول المتصفح
- التأكد من عدم وجود أخطاء JavaScript
- فحص التحذيرات المتعلقة بـ React keys أو deprecated APIs

#### ب. فحص الشبكة
- التأكد من نجاح استعلامات Supabase
- فحص أي طلبات فاشلة (4xx/5xx)

#### ج. إصلاح مشاكل معروفة
- التأكد من أن Skeleton Loading يظهر بشكل صحيح
- التأكد من عمل فلاتر حالة التسعير
- التأكد من عمل نظام المفضلة
- التأكد من عمل البحث الشامل في العقود

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/pages/AdminDashboardPage.tsx` | ملف جديد - لوحة تحكم إدارية |
| `supabase/functions/admin-stats/index.ts` | ملف جديد - Edge Function للإحصائيات |
| `src/hooks/useTheme.tsx` | ملف جديد - ThemeProvider مركزي |
| `src/components/ThemeToggle.tsx` | تبسيط لاستخدام useTheme |
| `src/components/UnifiedHeader.tsx` | إزالة منطق الثيم المكرر |
| `src/App.tsx` | إضافة ThemeProvider + route admin |
| `src/index.css` | تحسين ألوان Dark Mode |
| `supabase/config.toml` | تسجيل admin-stats function |

## ترتيب التنفيذ

1. ThemeProvider + تحديث ThemeToggle + UnifiedHeader (أساسي)
2. تحسين ألوان Dark Mode في CSS
3. Edge Function للإحصائيات الإدارية
4. صفحة Admin Dashboard + Route
5. مراجعة وإصلاح التحسينات السابقة




# إصلاح خطأ `useBlocker must be used within a data router`

## المشكلة

صفحة تفاصيل المشروع تستخدم `useBlocker` من React Router، لكن التطبيق يستخدم `BrowserRouter` وليس `createBrowserRouter` (data router). هذا يسبب خطأ قاتل يُسقط الصفحة.

## الحل

استبدال `useBlocker` بحل يدوي يعمل مع `BrowserRouter`:
- إضافة state (`showLeaveDialog` + `pendingPath`) لإظهار dialog تأكيد عند محاولة المغادرة
- اعتراض النقرات على الروابط عبر `useEffect` + `window.addEventListener("click")` أو ببساطة استخدام `window.onbeforeunload` (موجود بالفعل) مع dialog يدوي للتنقل الداخلي
- الأبسط والأنظف: **إزالة `useBlocker` بالكامل** والاكتفاء بـ `beforeunload` الموجود أصلاً (سطر 316-325) الذي يحذر المستخدم عند إغلاق/تحديث الصفحة

### الملف: `src/pages/ProjectDetailsPage.tsx`

| التعديل | التفاصيل |
|---------|----------|
| إزالة `useBlocker` من import | سطر 4 |
| إزالة `const blocker = useBlocker(...)` | سطر 328 |
| استبدال blocker dialog بنظام يدوي | سطر 1560-1582: استخدام `showLeaveDialog` state + اعتراض التنقل عبر `useNavigate` wrapper |

### آلية العمل البديلة:
1. إضافة `showLeaveDialog` و `pendingPath` state
2. إنشاء `safeNavigate(path)` يتحقق من `hasUnsavedChanges` قبل التنقل
3. عرض Dialog تأكيد → "البقاء" يغلق الـ dialog، "مغادرة" ينفذ `navigate(pendingPath)`
4. `beforeunload` يبقى كما هو لحماية إغلاق التبويب


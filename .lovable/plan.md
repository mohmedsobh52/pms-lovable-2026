
# إصلاح صفحة إدارة المستخدمين المعلقة في حالة التحميل

## المشكلة
صفحة `/admin/users` تظهر skeletons (حالة تحميل) ولا تعرض البيانات أو شاشة "غير مصرح". السبب:
1. وظيفة `manage-users` لم تكن منشورة بشكل صحيح (تم نشرها الآن)
2. استخدام `method: "GET"` في `supabase.functions.invoke` غير موثوق - بعض البيئات ترسله كـ POST مما يسبب خطأ في الدالة
3. لم يكن هناك مشرف أصلا (تم تعيينك كمشرف الآن)

## الحلول

### 1. تغيير طريقة استدعاء manage-users من GET إلى POST
في `UserManagementPage.tsx`، تغيير الاستدعاء لاستخدام POST مع `action: "list_users"` بدلا من `method: "GET"` لأنه أكثر موثوقية عبر جميع البيئات.

### 2. تحديث manage-users Edge Function
- إضافة action `list_users` لمعالجة طلب قائمة المستخدمين عبر POST
- إضافة تمييز بين `not_authenticated` و `unauthorized` في رسائل الخطأ
- إبقاء دعم GET للتوافق الخلفي

### 3. تحسين معالجة الأخطاء في الصفحة
- إضافة timeout لمنع التعليق اللانهائي
- معالجة حالة `not_authenticated` بالتوجيه لصفحة الدخول

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/pages/UserManagementPage.tsx` | تغيير invoke لاستخدام POST مع action: "list_users" |
| `supabase/functions/manage-users/index.ts` | إضافة action "list_users" + رسائل خطأ أوضح |

### تغيير الاستدعاء في الصفحة
```text
// قبل (غير موثوق):
supabase.functions.invoke("manage-users", { method: "GET" })

// بعد (موثوق):
supabase.functions.invoke("manage-users", { body: { action: "list_users" } })
```

### تحديث Edge Function
```text
// إضافة في قسم POST:
if (action === "list_users") {
  // نفس منطق GET الحالي - إرجاع قائمة المستخدمين
}

// تحسين verifyAdmin لإرجاع سبب الفشل:
// "not_authenticated" عند عدم وجود token أو token غير صالح
// "unauthorized" عند عدم وجود صلاحية admin
```

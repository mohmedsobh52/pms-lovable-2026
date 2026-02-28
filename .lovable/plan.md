

# نظام إشعارات فورية للمشرفين عند تسجيل مستخدمين جدد

## الملخص
إضافة نظام يراقب تسجيل المستخدمين الجدد ويرسل إشعارات فورية لجميع المشرفين (Admins) عبر جدول إشعارات في قاعدة البيانات مع دعم Realtime.

## الخطوات

### 1. إنشاء جدول إشعارات المشرفين
جدول `admin_notifications` لتخزين الإشعارات مع سياسات أمان تسمح للمشرفين فقط بالقراءة والتحديث، وتفعيل Realtime عليه.

### 2. إنشاء وظيفة خلفية `notify-admin-new-user`
وظيفة Edge Function يتم استدعاؤها عند تسجيل مستخدم جديد. تقوم بالتالي:
- التحقق من أن الطلب يحتوي على بيانات المستخدم الجديد
- جلب قائمة المشرفين من جدول `user_roles`
- إدراج إشعار لكل مشرف في جدول `admin_notifications`

### 3. استدعاء الإشعار من صفحة التسجيل
بعد نجاح تسجيل مستخدم جديد في صفحة `/auth`، يتم استدعاء الوظيفة الخلفية لإرسال الإشعارات.

### 4. عرض الإشعارات في لوحة الإدارة
إضافة قسم إشعارات في صفحة `AdminDashboardPage` و `UserManagementPage` يعرض الإشعارات الجديدة مع:
- اشتراك Realtime للإشعارات الفورية
- عداد الإشعارات غير المقروءة
- إمكانية تحديد الإشعارات كمقروءة

---

## التفاصيل التقنية

### جدول قاعدة البيانات

```text
admin_notifications
- id: uuid (PK)
- admin_user_id: uuid (المشرف المستلم)
- type: text (نوع الإشعار: new_user, role_change, etc.)
- title: text
- message: text  
- metadata: jsonb (بيانات إضافية مثل email المستخدم الجديد)
- read: boolean (default false)
- created_at: timestamptz
```

سياسات RLS:
- SELECT: المشرفون فقط (باستخدام `has_role(auth.uid(), 'admin')`)
- UPDATE: المشرفون فقط (لتحديث حالة القراءة)
- INSERT: ممنوع من العميل (فقط عبر Edge Function بـ service_role)
- DELETE: المشرفون فقط

### الملفات المتأثرة

| الملف | التغيير |
|---|---|
| Migration SQL | إنشاء جدول `admin_notifications` + RLS + Realtime |
| `supabase/functions/notify-admin-new-user/index.ts` | وظيفة جديدة لإنشاء الإشعارات |
| `src/pages/Auth.tsx` | استدعاء الإشعار بعد التسجيل الناجح |
| `src/components/AdminNotificationsBell.tsx` | مكون جديد لعرض إشعارات المشرفين |
| `src/pages/AdminDashboardPage.tsx` | إضافة مكون الإشعارات |
| `src/pages/UserManagementPage.tsx` | إضافة مكون الإشعارات |
| `supabase/config.toml` | إضافة إعدادات الوظيفة الجديدة |

### نمط Realtime للإشعارات الفورية
```text
supabase
  .channel('admin-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'admin_notifications',
    filter: `admin_user_id=eq.${user.id}`
  }, (payload) => {
    // عرض toast + تحديث العداد
  })
  .subscribe()
```


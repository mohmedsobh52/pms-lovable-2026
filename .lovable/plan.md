
# إضافة إشعارات بريد إلكتروني للمشرفين + صفحة سجل النشاطات

## الميزة 1: إشعارات بريد إلكتروني عند تسجيل مستخدم جديد

### الوصف
تحديث وظيفة `notify-admin-new-user` لإرسال بريد إلكتروني لكل مشرف بالإضافة إلى الإشعار الداخلي الحالي، باستخدام Resend (مفتاح API متوفر بالفعل).

### التغييرات
- تحديث `supabase/functions/notify-admin-new-user/index.ts`:
  - إضافة استدعاء Resend API لإرسال بريد إلكتروني HTML لكل مشرف
  - جلب بريد كل مشرف من `auth.admin.getUserById()`
  - تصميم قالب بريد بسيط باللغة العربية يتضمن اسم المستخدم الجديد ووقت التسجيل
  - الإرسال fire-and-forget (لا يوقف العملية في حال فشل البريد)

---

## الميزة 2: صفحة سجل النشاطات (Activity Log)

### الوصف
إنشاء جدول `admin_activity_log` وصفحة `/admin/activity` لتتبع جميع العمليات الإدارية.

### تغييرات قاعدة البيانات
جدول جديد `admin_activity_log`:

```text
- id: uuid (PK)
- actor_id: uuid (المستخدم الذي قام بالعملية)
- actor_email: text
- action: text (مثل: role_change, new_user, user_login)
- target_type: text (مثل: user, project, system)
- target_id: text (معرف الهدف)
- details: jsonb (تفاصيل إضافية)
- created_at: timestamptz
```

سياسات RLS: القراءة للمشرفين فقط، الإدراج عبر service_role فقط.
تفعيل Realtime للتحديث الفوري.

### تغييرات الكود

| الملف | التغيير |
|---|---|
| `supabase/functions/notify-admin-new-user/index.ts` | إضافة إرسال بريد Resend + تسجيل نشاط |
| `supabase/functions/manage-users/index.ts` | تسجيل نشاط تغيير الأدوار في activity_log |
| `src/pages/ActivityLogPage.tsx` | صفحة جديدة لعرض سجل النشاطات |
| `src/App.tsx` | إضافة مسار `/admin/activity` |
| `src/pages/AdminDashboardPage.tsx` | إضافة زر سريع لسجل النشاطات |

### صفحة سجل النشاطات تتضمن
- جدول يعرض: الوقت، المستخدم، الإجراء، الهدف، التفاصيل
- فلاتر حسب نوع الإجراء والتاريخ
- تحديث فوري عبر Realtime
- ترقيم صفحات للنتائج
- أيقونات مميزة لكل نوع إجراء (تسجيل جديد، تغيير دور، تسجيل دخول)
- دعم اللغة العربية والإنجليزية

### تدفق البيانات

```text
عملية إدارية (تسجيل/تغيير دور)
        |
        v
Edge Function يسجل في admin_activity_log
        |
        +---> إشعار داخلي (admin_notifications)
        +---> بريد إلكتروني (Resend)
        |
        v
صفحة سجل النشاطات تعرض البيانات فورياً (Realtime)
```

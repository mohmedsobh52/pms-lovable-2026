
# نظام تقارير مجدولة أسبوعية + Push Notifications للمشرفين + اختبار النظام

## 1. اختبار نظام الإشعارات
سيتم التحقق من صفحة الإدارة عبر المتصفح للتأكد من:
- ظهور جرس الإشعارات (AdminNotificationsBell)
- ظهور الرسوم البيانية (Area Chart + Pie Chart)
- عمل بطاقات الإحصائيات وجدول المشاريع

---

## 2. Push Notifications للمشرفين عند تسجيل مستخدمين جدد

### الوصف
دمج hook `usePushNotifications` الموجود بالفعل في مكون `AdminNotificationsBell` لإظهار إشعارات المتصفح (Browser Notifications) عند وصول إشعار جديد عبر Realtime.

### التغييرات
**ملف: `src/components/AdminNotificationsBell.tsx`**
- استيراد `usePushNotifications` 
- طلب إذن الإشعارات عند أول تحميل
- إضافة زر تفعيل/تعطيل push notifications في واجهة الجرس
- عند وصول إشعار جديد عبر Realtime، استدعاء `showNotification()` لإظهار إشعار المتصفح (يظهر فقط عندما تكون الصفحة مخفية)

---

## 3. نظام تقارير مجدولة أسبوعية للمشرفين

### الوصف
إنشاء Edge Function جديدة `send-admin-weekly-report` تجمع إحصائيات النظام وترسلها بالبريد عبر Resend، مع إضافة واجهة في لوحة الإدارة لإدارة هذا التقرير.

### Edge Function: `supabase/functions/send-admin-weekly-report/index.ts`
- تجمع إحصائيات آخر 7 أيام من:
  - `admin_activity_log`: عدد المستخدمين الجدد، تغييرات الأدوار
  - `saved_projects`: المشاريع الجديدة
  - `contracts`: العقود الجديدة
- تجلب بريد كل مشرف من `user_roles` + `auth.admin.getUserById()`
- ترسل بريد HTML منسق عبر Resend يتضمن:
  - ملخص الأسبوع (مستخدمين جدد، مشاريع، عقود)
  - جدول بأهم الأحداث
  - تنسيق RTL للعربية
- تُسجّل نشاط الإرسال في `admin_activity_log`

### تحديث config.toml
```text
[functions.send-admin-weekly-report]
verify_jwt = false
```

### واجهة التقارير المجدولة في لوحة الإدارة
**ملف: `src/pages/AdminDashboardPage.tsx`**
- إضافة قسم "التقارير المجدولة" يتضمن:
  - زر "إرسال تقرير أسبوعي الآن" (يدوي)
  - حالة آخر إرسال
  - إعدادات بسيطة (تفعيل/تعطيل)

### جدولة تلقائية (pg_cron)
- إعداد cron job أسبوعي باستخدام `pg_cron` + `pg_net` لاستدعاء الوظيفة كل يوم أحد الساعة 8 صباحاً
- يتطلب تفعيل extensions: `pg_cron`, `pg_net`

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/components/AdminNotificationsBell.tsx` | دمج push notifications + زر تفعيل |
| `supabase/functions/send-admin-weekly-report/index.ts` | Edge Function جديدة للتقرير الأسبوعي |
| `supabase/config.toml` | إضافة إعداد verify_jwt للوظيفة الجديدة |
| `src/pages/AdminDashboardPage.tsx` | إضافة قسم التقارير المجدولة + زر إرسال يدوي |

### تدفق Push Notifications

```text
مستخدم جديد يسجّل
      |
      v
notify-admin-new-user (Edge Function)
      |
      v
INSERT في admin_notifications
      |
      v
Supabase Realtime يرسل الحدث
      |
      v
AdminNotificationsBell يستقبل الحدث
      |
      +---> toast (إذا الصفحة ظاهرة)
      +---> Browser Notification (إذا الصفحة مخفية)
```

### تدفق التقرير الأسبوعي

```text
pg_cron (كل أحد 8 صباحاً)
      |
      v
send-admin-weekly-report (Edge Function)
      |
      +---> جمع إحصائيات 7 أيام
      +---> جلب بريد المشرفين
      +---> إرسال HTML email عبر Resend
      +---> تسجيل في admin_activity_log
```

### قالب البريد الأسبوعي
- ترويسة بتدرج لوني مع اسم النظام
- ملخص رقمي: مستخدمين جدد، مشاريع، عقود، نشاطات
- جدول بآخر 10 أحداث إدارية
- تذييل بحقوق النشر
- دعم RTL كامل

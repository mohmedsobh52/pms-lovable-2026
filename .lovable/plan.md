
# إصلاح مشكلة "Unauthorized" في صفحات الإدارة

## المشكلة الجذرية

الملف `client.runtime.ts` يحتوي على بيانات اتصال مشفرة (hardcoded) لمشروع خلفي **مختلف** (`brbgdvesterjvwduvsrf`)، بينما المشروع الفعلي هو (`zsfwdkpbhcyxotsjpqab`). إعدادات Vite توجه جميع الاستيرادات لاستخدام هذا الملف، مما يجعل كل طلبات API تذهب للمشروع الخطأ.

هذا يفسر:
- لماذا `auth.users` فارغ (المستخدم مسجل في المشروع القديم)
- لماذا "Failed to fetch" (الطلبات تذهب لعنوان خاطئ)
- لماذا setup-admin يفشل دائما

## الحل

### 1. حذف ملف `client.runtime.ts` وإزالة Vite alias
- حذف `src/integrations/supabase/client.runtime.ts` بالكامل
- إزالة alias التحويل من `vite.config.ts` حتى يستخدم التطبيق `client.ts` الرسمي الذي يقرأ من `.env` تلقائيا
- `.env` يحتوي بالفعل على البيانات الصحيحة للمشروع الحالي

### 2. تحديث Edge Functions لاستخدام `getClaims()` بدلا من `getUser()`
حسب إعدادات Lovable Cloud مع `verify_jwt = false`، يجب استخدام `getClaims(token)` بدلا من `getUser()`:
- تحديث `setup-admin/index.ts`
- تحديث `admin-stats/index.ts`
- تحديث `manage-users/index.ts`

### 3. إعادة تسجيل الدخول
بعد التعديلات، سيحتاج المستخدم لتسجيل الخروج وإعادة الدخول لإنشاء جلسة صالحة على المشروع الصحيح.

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/integrations/supabase/client.runtime.ts` | **حذف** |
| `vite.config.ts` | إزالة alias التحويل |
| `supabase/functions/setup-admin/index.ts` | استخدام `getClaims()` |
| `supabase/functions/admin-stats/index.ts` | استخدام `getClaims()` |
| `supabase/functions/manage-users/index.ts` | استخدام `getClaims()` |

### تغيير Vite Config
```text
// إزالة هذا:
{
  find: /^@\/integrations\/supabase\/client$/,
  replacement: path.resolve(__dirname, "./src/integrations/supabase/client.runtime.ts"),
}
```

### نمط المصادقة الصحيح في Edge Functions
```text
const token = authHeader.replace('Bearer ', '');
const { data, error } = await supabase.auth.getClaims(token);
const userId = data.claims.sub;
```

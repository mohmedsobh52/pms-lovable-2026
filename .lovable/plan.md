

# تحسين الأداء العام + إنشاء شاشة إدارة صلاحيات المستخدمين

## 1. إنشاء شاشة إدارة صلاحيات المستخدمين

### أ) Edge Function جديدة: `manage-users`

إنشاء `supabase/functions/manage-users/index.ts` تدعم العمليات التالية (للمشرفين فقط):

- **GET**: جلب قائمة المستخدمين مع أدوارهم من `auth.users` + `user_roles`
- **POST**: إضافة/تعديل دور مستخدم (admin, moderator, user)
- **DELETE**: حذف دور مستخدم

تستخدم نفس نمط المصادقة من `admin-stats` (JWT claims + فحص دور admin عبر service role key).

### ب) صفحة جديدة: `src/pages/UserManagementPage.tsx`

**الأقسام:**
- **بطاقات إحصائية**: إجمالي المستخدمين، المشرفين، المشرفين المساعدين، المستخدمين العاديين
- **جدول المستخدمين**: البريد الإلكتروني، الدور الحالي، تاريخ الانضمام، آخر تسجيل دخول
- **إجراءات**: تغيير الدور عبر قائمة منسدلة (Select)، حذف الدور
- **بحث وفلترة**: بحث بالبريد، فلتر بالدور
- **حماية**: التحقق من صلاحية admin قبل عرض الصفحة (نفس نمط AdminDashboardPage)

### ج) تحديث التنقل

- إضافة Route `/admin/users` في `App.tsx`
- إضافة رابط "إدارة المستخدمين" في `AdminDashboardPage`

### الأدوار المتاحة (من enum الموجود):
| الدور | الوصف |
|---|---|
| `admin` | مشرف كامل - وصول لجميع الميزات + إدارة المستخدمين |
| `moderator` | مشرف مساعد - وصول للتقارير والإحصائيات |
| `user` | مستخدم عادي - وصول لمشاريعه فقط |

---

## 2. تحسينات الأداء العامة

### أ) تحسين `MainDashboard.tsx`
- إضافة `sessionStorage` caching لإحصائيات Dashboard (مدة 5 دقائق)
- تقليل عدد الاستعلامات المتكررة باستخدام `Promise.all` (موجود جزئيا - توسيعه)
- إضافة `React.memo` للرسوم البيانية الثقيلة

### ب) تحسين `QueryClient` في `App.tsx`
- ضبط `staleTime` الافتراضي إلى 5 دقائق لتقليل إعادة الجلب
- ضبط `gcTime` (garbage collection) إلى 10 دقائق
- تفعيل `refetchOnWindowFocus: false` لمنع الجلب عند التبديل بين النوافذ

### ج) تحسين التحميل الكسول (Lazy Loading)
- التأكد من أن جميع الصفحات الجديدة تستخدم `React.lazy`
- إضافة `UserManagementPage` كصفحة lazy-loaded

---

## التفاصيل التقنية

### Edge Function `manage-users`:
```text
GET  -> جلب المستخدمين (auth.admin.listUsers) + user_roles
POST -> { action: "set_role", user_id, role } -> upsert في user_roles
POST -> { action: "remove_role", user_id } -> delete من user_roles
```

### صفحة `UserManagementPage.tsx`:
- تستدعي `supabase.functions.invoke("manage-users")` لجلب/تعديل البيانات
- تعرض جدول مع أعمدة: البريد، الدور، تاريخ الإنشاء، الإجراءات
- تستخدم `Select` لتغيير الدور مباشرة من الجدول
- حوار تأكيد قبل تغيير أي دور
- ثنائية اللغة (عربي/إنجليزي)

### تحسين QueryClient:
```text
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

## الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `supabase/functions/manage-users/index.ts` | Edge Function جديدة لإدارة المستخدمين |
| `src/pages/UserManagementPage.tsx` | صفحة جديدة لإدارة الصلاحيات |
| `src/App.tsx` | إضافة Route + تحسين QueryClient |
| `src/pages/AdminDashboardPage.tsx` | إضافة رابط لشاشة الصلاحيات |
| `src/components/MainDashboard.tsx` | تحسين أداء بالتخزين المؤقت + memo |
| `supabase/config.toml` | إضافة تكوين manage-users (verify_jwt=false) |


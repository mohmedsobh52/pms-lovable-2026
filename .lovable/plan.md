

# تحسين شكل وأداء قسم Recent Activity في الهوم

---

## التغييرات في `src/pages/HomePage.tsx`

### 1. تحسين شكل Recent Activity
- استبدال إيموجي `📊` و `📄` بأيقونات Lucide ملونة (`BarChart3` للمشاريع، `FileText` للعقود) داخل دوائر ملونة خفيفة
- تكبير حجم النصوص وتحسين التباعد (`py-2.5` بدل `py-1.5`)
- إضافة فاصل خطي رفيع (`border-b border-white/5`) بين العناصر
- تحسين خلفية البطاقة: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl` مع ظل
- تحسين عنوان "Recent Activity" بحجم أكبر (`text-sm font-semibold`)
- إضافة hover effect أقوى لكل عنصر (`hover:bg-white/10 rounded-xl`)
- توسيع العرض من `max-w-2xl` إلى `max-w-3xl`

### 2. تحسين الأداء
- تغليف قسم Activity بـ `memo` لمنع إعادة الرسم غير الضرورية
- إضافة `useMemo` لتنسيق التواريخ بدل حسابها في كل render
- نقل fetch الأنشطة ليكون متوازي مع fetch الإحصائيات (وليس بعده) لتسريع التحميل

### 3. إضافة تأثير دخول حركي
- إضافة animation `activity-enter` مع تأخير متدرج لكل عنصر (staggered)

---

## التفاصيل التقنية

### الشكل الجديد

```text
الحالي:  إيموجي + نص + تاريخ (بسيط وصغير)
الجديد:  أيقونة Lucide في دائرة ملونة + نص أكبر + تاريخ أوضح
         فواصل بين العناصر + hover effect + rounded-2xl
         عرض أكبر max-w-3xl
```

### تحسين الأداء

```text
الحالي:  fetch activities بعد انتهاء fetch counts (متسلسل)
الجديد:  fetch activities و counts بالتوازي (Promise.all واحد)
         + memo للمكون + useMemo للتواريخ المنسقة
```

---

## الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/pages/HomePage.tsx` | تحسين شكل Activity + أداء التحميل |


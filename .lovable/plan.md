

# إضافة زر Home + Back ثابت أعلى اليسار + تغيير خلفية الهوم

---

## 1. إنشاء زر ثابت أعلى اليسار (Home + Back)

**ملف جديد:** `src/components/FixedTopNav.tsx`

- زر ثابت (`fixed top-4 left-4 z-50`) يظهر في **جميع الصفحات** ما عدا الصفحة الرئيسية `/`
- يحتوي على زرين مدمجين في شريط واحد أنيق:
  - **سهم رجوع** (ArrowLeft) - للعودة للصفحة السابقة
  - **أيقونة Home** - للذهاب للرئيسية مباشرة
- تصميم: خلفية شبه شفافة مع `backdrop-blur` وحدود ناعمة، بنظام الألوان الكحلي
- يدعم RTL (العربية): يظهر أعلى اليمين بدلاً من اليسار
- في صفحة الهوم `/`: يظهر فقط زر Dashboard صغير (اختياري)

**التعديل في:** `src/App.tsx`

- إضافة `<FixedTopNav />` بجانب `<FloatingBackButton />` في الـ layout العام

**التعديل في:** `src/components/NavigationBar.tsx`

- إزالة أزرار Back و Home من NavigationBar لتجنب التكرار (الآن موجودة في FixedTopNav)
- الإبقاء على Breadcrumbs فقط

---

## 2. تغيير خلفية صفحة الهوم

**الملف:** `src/pages/HomePage.tsx`

- تغيير الخلفية من الأزرق/الكحلي الغامق الحالي إلى تدرج أكثر حيوية:
  - تدرج من كحلي عميق `#0f1729` إلى أزرق متوسط `#1a365d` مع لمسة ذهبية خفيفة
- تحسين تباين النصوص البيضاء مع الخلفية الجديدة
- إزالة اعتماد الهوم على `BackgroundImage` واستخدام خلفية مخصصة خاصة بها

**الملف:** `src/index.css`

- إضافة class جديد `.home-bg` بتدرج كحلي-أزرق مميز مختلف عن باقي الصفحات

---

## التفاصيل التقنية

### FixedTopNav Component

```text
+---------------------------+
|  [<-] [Home]              |   <-- fixed top-left, z-50
+---------------------------+
```

- `position: fixed; top: 1rem; left: 1rem` (أو `right` في RTL)
- `z-index: 50` ليظهر فوق المحتوى
- `bg-background/80 backdrop-blur-md border rounded-full shadow-lg`
- الأزرار بحجم صغير `size="icon"` مع `gap-1`

### خلفية الهوم الجديدة

```text
الحالي:  interactive-bg (رمادي فاتح / كحلي غامق)
الجديد:  تدرج مخصص من كحلي عميق (#0f1729) 
         الى أزرق ملكي (#1e3a5f) 
         مع وهج ذهبي خفيف في المنتصف
```

---

## الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/components/FixedTopNav.tsx` | ملف جديد - زر Home + Back ثابت |
| `src/App.tsx` | إضافة FixedTopNav في Layout |
| `src/components/NavigationBar.tsx` | إزالة أزرار Home/Back (الآن في FixedTopNav) |
| `src/pages/HomePage.tsx` | تغيير الخلفية لتدرج كحلي-أزرق مميز |
| `src/index.css` | إضافة `.home-bg` class |

## ترتيب التنفيذ

1. إنشاء `FixedTopNav.tsx`
2. تحديث `App.tsx` لإضافة المكون
3. تحديث `NavigationBar.tsx` لإزالة التكرار
4. تحديث خلفية الهوم (`HomePage.tsx` + `index.css`)

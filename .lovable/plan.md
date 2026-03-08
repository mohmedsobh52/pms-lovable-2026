

# تحديث شامل للبرنامج - ألوان العلامة التجارية + تحسين الأداء + إصلاح المشاكل

## ملخص التحديث

تطبيق ألوان علامتك التجارية على كامل البرنامج، مع تحسينات في دقة التسعير وإصلاح مشاكل معروفة.

---

## 1. تطبيق ألوان العلامة التجارية

**الألوان:**
- Main: `#F3570C` (برتقالي) → يصبح `primary`
- Second: `#161616` (أسود) → يصبح `navy`/dark backgrounds
- Third: `#605F5F` (رمادي غامق) → يصبح `secondary`/`muted-foreground`
- Fourth: `#A0A09F` (رمادي فاتح) → يصبح `border`/`input`
- Fifth: `#FBFAFA` (أبيض مائل) → يصبح `background`

### الملف: `src/index.css`
**Light mode (:root):**
- `--primary` → `16 93% 50%` (#F3570C)
- `--primary-foreground` → `0 0% 100%`
- `--background` → `0 17% 98%` (#FBFAFA)
- `--foreground` → `0 0% 9%` (#161616)
- `--navy` → `0 0% 9%`
- `--secondary` → `0 0% 37%` (#605F5F)
- `--border` → `0 0% 63%` (#A0A09F)
- `--accent` → `16 93% 50%` (same as primary for cohesion)
- `--ring` → `16 93% 50%`
- تحديث كل التدرجات (gradients) لتستخدم البرتقالي بدل الذهبي والكحلي
- `--gold` → `16 93% 50%`

**Dark mode (.dark):**
- `--background` → `0 0% 9%` (#161616)
- `--primary` → `16 93% 50%` (#F3570C)
- `--card` → `0 0% 12%`
- `--border` → `0 0% 22%`
- تحديث التدرجات والظلال

**Interactive backgrounds / gradients:**
- تحديث `.interactive-bg`, `.home-bg`, `.dot-grid` للألوان الجديدة

### الملف: `tailwind.config.ts`
- لا تغيير مطلوب (يستخدم CSS variables بالفعل)

---

## 2. تحسين دقة التسعير

### الملف: `src/lib/reference-prices.ts`
- إضافة 30+ بند مرجعي جديد (finishing، HVAC، plumbing، landscaping)
- تحسين نطاقات الأسعار بناءً على أسعار السوق 2025

### الملف: `supabase/functions/suggest-market-rates/index.ts`
- تحسين خوارزمية المطابقة: إضافة وزن أعلى للوحدة المطابقة
- تقليل عتبة الثقة الدنيا من الافتراضي إلى 0.5 لتقليل النتائج الضعيفة

---

## 3. إصلاح مشاكل معروفة

### أ. إصلاح `queryClient` ليكون خارج render tree (بالفعل صحيح ✓)

### ب. إصلاح تكرار `BackgroundImage` 
**الملف: `src/App.tsx`**
- `BackgroundImage` يُعرض دائماً في `App.tsx` + أيضاً في `PageLayout.tsx` عبر `showBackground`
- إزالة `BackgroundImage` من `App.tsx` لمنع التكرار

### ج. تحسين أداء الصفحة الرئيسية
**الملف: `src/pages/HomePage.tsx`**
- تقليل عدد استعلامات Supabase المتزامنة عبر تجميعها

---

## 4. تحسينات الشكل والتجربة

### الملف: `src/components/home/HeroSection.tsx`
- تحديث ألوان الرسوم البيانية لتطابق العلامة التجارية
- استبدال ألوان hardcoded (`#22c55e`, `#f59e0b`) بألوان البراند

### الملف: `src/components/PageLayout.tsx`
- تحديث Footer ليستخدم ألوان البراند الجديدة

### الملف: `src/components/BackgroundImage.tsx`
- تحديث overlay opacity للتناسق مع الألوان الجديدة

---

## الملفات المتأثرة

| الملف | نوع التعديل |
|-------|-------------|
| `src/index.css` | تحديث كامل لمتغيرات الألوان |
| `src/lib/reference-prices.ts` | إضافة بنود مرجعية |
| `src/App.tsx` | إزالة BackgroundImage المكرر |
| `src/components/home/HeroSection.tsx` | ألوان البراند |
| `src/components/BackgroundImage.tsx` | تناسق الألوان |
| `src/components/PageLayout.tsx` | تحديث Footer |


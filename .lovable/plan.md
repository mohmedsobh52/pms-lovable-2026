
# المرحلة 20.2: التحديث الشامل النهائي

تأثيرات حركية ذهبية + ألوان موحدة للجداول + إصلاح الخلفية + PageHeader للصفحات المتبقية

---

## 1. تأثيرات حركية ذهبية (hover + click)

### `src/index.css`
اضافة أنماط CSS جديدة في نهاية قسم `@layer components`:

```text
.card-gold-hover    -> hover: border-gold/40, shadow gold/15, translateY(-2px)
.btn-gold-hover     -> hover: shadow gold/20, border-gold/50
.btn-gold-press     -> active: scale(0.97), inset shadow gold/30
```

### `src/components/ui/card.tsx`
- تغيير `transition` من بدون الى `transition-all duration-200`
- اضافة `hover:shadow-md hover:-translate-y-0.5` للـ Card الافتراضي

### `src/components/ui/button.tsx`
- تغيير `transition-colors` الى `transition-all duration-200`
- اضافة `active:scale-[0.98]` لتأثير الضغط على جميع الأزرار

---

## 2. ألوان كحلي/أزرق/ذهبي للجداول

### `src/components/ui/table.tsx`
- `TableHead`: تغيير من `text-muted-foreground` الى `bg-[#1a2744]/5 dark:bg-[#1a2744]/20 text-[#1a2744] dark:text-white/80 font-semibold`
- `TableRow`: تغيير من `hover:bg-muted/50` الى `hover:bg-[#2563EB]/5 dark:hover:bg-[#2563EB]/10`

---

## 3. اصلاح الخلفية والتباين

### `src/components/BackgroundImage.tsx`
- تعديل overlay من `bg-background/80 dark:bg-background/40` الى `bg-background/85 dark:bg-background/50`

### `src/index.css`
- تفتيح `.interactive-bg` اكثر في الوضع الفاتح (99% lightness)
- تحسين `--foreground` في الوضع الفاتح ليكون اغمق لتباين افضل

---

## 4. تطبيق PageHeader على الصفحات المتبقية

### 4.1 `src/pages/SavedProjectsPage.tsx`
- استبدال الهيدر المحلي (سطور 806-837) بـ `PageHeader`
- ايقونة: `FolderOpen`
- عنوان: "Projects" / "المشاريع"
- وصف: "Manage projects and analyze BOQ files"
- stats: عدد المشاريع، القيمة الاجمالية (gold)، البنود الاجمالية
- الاحتفاظ بأزرار اللغة/الثيم/الاعدادات/المستخدم في `actions`

### 4.2 `src/pages/CostAnalysisPage.tsx`
- استبدال الهيدر المحلي (سطور 986-1004) بـ `PageHeader`
- ايقونة: `Calculator`
- عنوان: "Cost Analysis" / "تحليل تكاليف البنود"
- الاحتفاظ بزر العودة وThemeToggle في actions

### 4.3 `src/pages/FastExtractionPage.tsx`
- استبدال الهيدر المحلي (سطور 89-160) بـ `PageHeader`
- ايقونة: `Upload`
- عنوان: "Fast Extraction" / "الاستخراج السريع"
- وصف: "Upload, classify and extract files"
- الاحتفاظ بالأزرار الوظيفية في actions

### 4.4 `src/pages/TenderSummaryPage.tsx`
- استبدال الهيدر المحلي (سطور 552-647) بـ `PageHeader`
- ايقونة: `Calculator`
- عنوان: "Tender Summary" / "ملخص العطاء"
- وصف: اسم المشروع
- الاحتفاظ بالBreadcrumbs وSaveStatus وأزرار الاجراءات في actions

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/index.css` | تأثيرات حركية ذهبية + تحسين خلفية |
| `src/components/ui/card.tsx` | hover + transition |
| `src/components/ui/button.tsx` | active scale + transition-all |
| `src/components/ui/table.tsx` | ألوان كحلي/أزرق |
| `src/components/BackgroundImage.tsx` | تحسين overlay |
| `src/pages/SavedProjectsPage.tsx` | PageHeader موحد |
| `src/pages/CostAnalysisPage.tsx` | PageHeader موحد |
| `src/pages/FastExtractionPage.tsx` | PageHeader موحد |
| `src/pages/TenderSummaryPage.tsx` | PageHeader موحد |

## ترتيب التنفيذ

1. تحديث `index.css` (تأثيرات + خلفية)
2. تحديث `card.tsx` + `button.tsx` + `table.tsx` (بالتوازي)
3. تحسين `BackgroundImage.tsx`
4. تطبيق `PageHeader` على الصفحات الأربع (بالتوازي)

## النتيجة المتوقعة

- تأثيرات hover ذهبية على جميع البطاقات في البرنامج
- تأثير ضغط (active scale) على جميع الأزرار
- رؤوس الجداول بلون كحلي خفيف
- صفوف الجداول بتأثير hover أزرق خفيف
- خلفية واضحة مع تباين عالي في كلا الوضعين
- جميع الصفحات تستخدم PageHeader الموحد بدون استثناء

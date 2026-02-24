
# المرحلة 20.2: التحديث الشامل النهائي - تأثيرات حركية + ألوان موحدة للجداول + إصلاح الخلفية

---

## 1. تأثيرات حركية ذهبية للبطاقات والأزرار (hover + click)

**الملف:** `src/index.css`

اضافة أنماط CSS جديدة:

```css
/* Gold hover glow for cards */
.card-gold-hover {
  transition: all 0.3s ease;
}
.card-gold-hover:hover {
  border-color: hsl(var(--gold) / 0.4);
  box-shadow: 0 0 20px hsl(var(--gold) / 0.15);
  transform: translateY(-2px);
}

/* Gold click effect for buttons */
.btn-gold-press:active {
  transform: scale(0.97);
  box-shadow: 0 0 15px hsl(var(--gold) / 0.3) inset;
}

/* Gold hover for buttons */
.btn-gold-hover {
  transition: all 0.2s ease;
}
.btn-gold-hover:hover {
  box-shadow: 0 0 15px hsl(var(--gold) / 0.2);
  border-color: hsl(var(--gold) / 0.5);
}
```

**الملف:** `src/components/ui/card.tsx`

- اضافة `transition-all duration-200 hover:shadow-lg hover:border-[hsl(var(--gold)/0.3)] hover:-translate-y-0.5` للـ Card الافتراضي

**الملف:** `src/components/ui/button.tsx`

- اضافة `active:scale-[0.98]` للـ Button الافتراضي لتأثير الضغط
- اضافة `transition-all` (بدلاً من `transition-colors` فقط) لدعم تأثير الـ transform

---

## 2. نظام ألوان الجداول والبطاقات الداخلية (كحلي + أزرق + ذهبي)

**الملف:** `src/components/ui/table.tsx`

- `TableHead`: تغيير الخلفية من `muted` الى تدرج كحلي خفيف: `bg-[#1a2744]/5 dark:bg-[#1a2744]/30` مع نص كحلي `text-[#1a2744] dark:text-white/80`
- `TableRow` hover: تغيير من `hover:bg-muted/50` الى `hover:bg-[#2563EB]/5 dark:hover:bg-[#2563EB]/10` (لمسة أزرق خفيفة عند المرور)

**الملف:** `src/index.css` (تحسين `.data-table`)

- `.data-table th`: خلفية كحلية خفيفة `bg-[#1a2744]/8` + نص كحلي `text-[#1a2744]`
- `.data-table tr:hover td`: خلفية أزرق خفيف `bg-[#2563EB]/5`

**الملف:** `src/components/ui/card.tsx`

- البطاقات تحصل على hover ذهبي خفيف (border-gold/30)

---

## 3. اصلاح الخلفية - وضوح النصوص

**الملف:** `src/index.css`

- **الوضع الفاتح**: التأكد ان `.interactive-bg` يستخدم ألوان فاتحة جداً (98% lightness)
- **الوضع الداكن**: التأكد ان الخلفية كحلية عميقة بدون تداخل مع النصوص
- تحسين `--foreground` في الوضع الفاتح ليكون أغمق `222 47% 8%` لتباين أعلى

**الملف:** `src/components/BackgroundImage.tsx`

- التأكد من overlay: `bg-background/85 dark:bg-background/50` لضمان وضوح النصوص

---

## 4. تطبيق PageHeader على الصفحات المتبقية

### 4.1 SavedProjectsPage.tsx
- استبدال الهيدر المحلي (سطور 806-837) بـ `PageHeader` بايقونة `FolderOpen`
- عنوان: "Projects" / "المشاريع"
- وصف: "Manage projects and analyze BOQ files"
- stats: عدد المشاريع، القيمة الاجمالية (gold)، البنود الاجمالية
- الاحتفاظ بأزرار اللغة/الثيم/الاعدادات/المستخدم في actions

### 4.2 CostAnalysisPage.tsx
- استبدال الهيدر المحلي (سطور 986-1004) بـ `PageHeader` بايقونة `Calculator`
- عنوان: "تحليل تكاليف البنود" / "Cost Analysis"
- الاحتفاظ بزر العودة وThemeToggle في actions

### 4.3 FastExtractionPage.tsx
- استبدال الهيدر المحلي (سطور 89-165) بـ `PageHeader` بايقونة `Upload`
- عنوان: "Fast Extraction" / "الاستخراج السريع"
- الاحتفاظ بالأزرار الوظيفية في actions

### 4.4 TenderSummaryPage.tsx
- استبدال الهيدر المحلي (سطور 552-635) بـ `PageHeader` بايقونة `Calculator`
- عنوان: "Tender Summary" / "ملخص التسعير"
- الاحتفاظ بالBreadcrumbs والأزرار في actions

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/index.css` | تأثيرات حركية ذهبية + اصلاح خلفية + أنماط جداول |
| `src/components/ui/card.tsx` | hover ذهبي + transition |
| `src/components/ui/button.tsx` | active scale + transition-all |
| `src/components/ui/table.tsx` | ألوان كحلي/أزرق للجداول |
| `src/components/BackgroundImage.tsx` | تحسين overlay |
| `src/pages/SavedProjectsPage.tsx` | PageHeader موحد |
| `src/pages/CostAnalysisPage.tsx` | PageHeader موحد |
| `src/pages/FastExtractionPage.tsx` | PageHeader موحد |
| `src/pages/TenderSummaryPage.tsx` | PageHeader موحد |

## ترتيب التنفيذ

1. تحديث `index.css` (تأثيرات حركية + خلفية + جداول)
2. تحديث `card.tsx` + `button.tsx` + `table.tsx` (مكونات UI)
3. تحسين `BackgroundImage.tsx`
4. تطبيق `PageHeader` على الصفحات الأربع المتبقية (بالتوازي)

## النتيجة المتوقعة

- تأثيرات hover ذهبية أنيقة على جميع البطاقات في البرنامج
- تأثير ضغط (active scale) على جميع الأزرار
- رؤوس الجداول بلون كحلي خفيف بدلاً من الرمادي العادي
- صفوف الجداول بتأثير hover أزرق خفيف
- خلفية واضحة لا تتداخل مع النصوص في كلا الوضعين
- جميع الصفحات بدون استثناء تستخدم PageHeader الموحد

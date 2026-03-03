

# معالجة بطء تحميل شاشة المشاريع

## المشكلة
ملف `SavedProjectsPage.tsx` يبلغ **1912 سطر** مما يسبب:
1. بطء شديد في التحميل الديناميكي (dynamic import)
2. أخطاء "Failed to fetch dynamically imported module" عند ضعف الاتصال
3. استهلاك ذاكرة عالي عند تحميل الصفحة

## الحل: تقسيم الملف وتحسين الأداء

### 1. استخراج الدوال المساعدة إلى ملف منفصل
نقل `sanitizeItemPrice`, `getSafeProjectTotal`, `formatLargeNumber`, `computeSafeTotalFromItems` والأنواع (`ProjectData`, `ProjectItem`) إلى ملف `src/lib/project-utils.ts`.

### 2. استخراج مكون بطاقة المشروع
إنشاء `src/components/projects/ProjectCard.tsx` يحتوي على مكون بطاقة المشروع المنفصل (الجزء الأكبر من الـ UI المتكرر لكل مشروع).

### 3. استخراج مكون تفاصيل المشروع السريعة
إنشاء `src/components/projects/ProjectQuickView.tsx` للـ Dialog الذي يعرض تفاصيل المشروع وبنوده.

### 4. تحسين `SavedProjectsPage.tsx`
- تقليل حجم الملف من ~1900 سطر إلى ~500 سطر
- استيراد المكونات المستخرجة
- تحميل `BOQAnalyzerPanel` و `RecycleBin` بشكل كسول داخل التبويبات

### الملفات المتأثرة
- **جديد:** `src/lib/project-utils.ts`
- **جديد:** `src/components/projects/ProjectCard.tsx`
- **جديد:** `src/components/projects/ProjectQuickView.tsx`
- **تعديل:** `src/pages/SavedProjectsPage.tsx`


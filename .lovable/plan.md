

# اقتراحات تحسين أداء وشكل شاشة تحليل المخططات

## الوضع الحالي

الملف `DrawingAnalysisPage.tsx` يحتوي على **2085 سطر** في ملف واحد — يشمل كل شيء: prompts, helpers, PDF rendering, AI calls, UI, CSS, theme. هذا يسبب:
- بطء في التحميل الأولي (كل الكود يُحمّل دفعة واحدة)
- صعوبة في الصيانة
- إعادة رسم (re-render) غير ضرورية عند أي تغيير في state

---

## 1. تحسينات الأداء

### أ. تقسيم الملف إلى مكونات منفصلة
| المكون الجديد | المسؤولية | الأسطر تقريباً |
|---|---|---|
| `drawing-analysis/constants.ts` | SAR_REF_2025, DRAW_TYPES, CFG_O, MODS_O, TMPL, QP | ~500 سطر |
| `drawing-analysis/helpers.ts` | detectDrawingType, extractPipeDetails, renderThumb, apiCall, md, exports | ~300 سطر |
| `drawing-analysis/PdfNavigator.tsx` | PdfNav component | ~60 سطر |
| `drawing-analysis/SmartSuggestions.tsx` | SmartSuggestions component | ~80 سطر |
| `drawing-analysis/ConfigTab.tsx` | tab==="config" UI | ~80 سطر |
| `drawing-analysis/PdfTab.tsx` | tab==="pdf" UI | ~100 سطر |
| `drawing-analysis/AnalysisTab.tsx` | tab==="analysis" + chat UI | ~200 سطر |
| `drawing-analysis/HistoryTab.tsx` | tab==="history" UI | ~100 سطر |
| `drawing-analysis/theme.ts` | T theme object + CSS string | ~80 سطر |

### ب. تحسين إعادة الرسم
- لف `PdfNav` و `SmartSuggestions` بـ `React.memo`
- استخدام `useCallback` لـ `pushMsg`, `copyMsg`, `openPreview` (بعضها موجود بالفعل)
- نقل `mdCached` لـ `useMemo` مع dependency على `msgs` فقط

### ج. Lazy loading للتبويبات
- تحميل `HistoryTab` و `PdfTab` عبر `React.lazy` لتسريع التحميل الأولي

### د. تحسين PDF thumbnails
- حالياً يتم رسم thumbnails عند التمرير بدون debounce — إضافة `debounce` 150ms على `onScroll`

---

## 2. تحسينات الشكل

### أ. تطبيق ألوان البراند الجديدة
الشاشة تستخدم theme داخلي (`T` object) بألوان hardcoded لا تتبع ألوان البراند:
- `T.gold` حالياً `#f0b429/#b45309` → تغيير إلى `#F3570C` (البرتقالي الرئيسي)
- `T.bg` حالياً `#f0f4fa` → تغيير إلى `#FBFAFA`
- `T.t1` حالياً `#1a2535` → تغيير إلى `#161616`
- `T.bd` حالياً `#d1dde8` → تغيير إلى `#A0A09F`
- `T.t3` حالياً `#7a92a8` → تغيير إلى `#605F5F`

### ب. تحسين تبويبات الـ Sidebar
- حالياً التبويبات مكدسة رأسياً بأسلوب بسيط — تحسين بإضافة:
  - Active indicator (شريط برتقالي جانبي)
  - أيقونات أوضح بألوان البراند
  - Hover effects متناسقة

### ج. تحسين بطاقات الإعداد (Config Tab)
- إضافة أيقونات ملونة لكل قسم
- تحسين تباعد العناصر
- إضافة tooltip لشرح كل خيار

### د. تحسين شريط التقدم
- استخدام `primary` color بدل الأخضر الثابت
- إضافة نسبة مئوية واضحة بجانب الشريط

### هـ. تحسين منطقة الدردشة (Chat)
- إضافة فاصل زمني بين الرسائل
- تحسين تنسيق جداول BOQ بألوان البراند
- إضافة زر "scroll to bottom" عائم

---

## 3. إصلاحات مطلوبة

### أ. Dark mode لا يتبع إعداد التطبيق
- الشاشة تستخدم `darkMode` state محلي مستقل عن `useTheme` — يجب ربطه بالثيم العام

### ب. الـ CSS مكتوب inline بالكامل
- أكثر من 100 سطر CSS مدمج في JSX — نقل الأنماط المتكررة لـ Tailwind classes أو ملف CSS منفصل

---

## الخطة التنفيذية (الأولوية)

| الترتيب | المهمة | التأثير |
|---|---|---|
| 1 | تطبيق ألوان البراند على theme `T` | شكل ✨ |
| 2 | ربط dark mode بالثيم العام | إصلاح 🔧 |
| 3 | تقسيم الملف إلى مكونات | أداء + صيانة 🚀 |
| 4 | تحسين UI للتبويبات والبطاقات | شكل ✨ |
| 5 | Lazy loading + memo | أداء 🚀 |

### الملفات المتأثرة
- `src/pages/DrawingAnalysisPage.tsx` (تعديل رئيسي + تقسيم)
- `src/components/drawing-analysis/*.tsx` (ملفات جديدة)
- `src/components/drawing-analysis/constants.ts` (جديد)
- `src/components/drawing-analysis/helpers.ts` (جديد)
- `src/components/drawing-analysis/theme.ts` (جديد)


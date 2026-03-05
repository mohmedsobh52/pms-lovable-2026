

# خطة التنفيذ: 3 مهام

## 1. التحقق من الاقتراحات الذكية في شاشة تحليل المخططات ✅
الاقتراحات الذكية (`SmartSuggestions`) موجودة ومدمجة بالفعل في `DrawingAnalysisPage.tsx`:
- **تبويب config** (سطر 1290): `configSuggestions` — 7 اقتراحات ديناميكية للأداء والدقة
- **تبويب analysis** (سطر 1434): `analysisSuggestions` — 5 اقتراحات بناءً على حالة التحليل
- كلاهما يعمل مع أزرار إجراء مباشرة وإمكانية إخفاء

**لا يلزم تغيير** — المنظومة مكتملة وتعمل.

---

## 2. تحسين اقتراحات تبويب النظرة العامة في صفحة تفاصيل المشروع

### الملف: `src/components/project-details/ProjectOverviewTab.tsx`

**الوضع الحالي**: مكون `ImprovementSuggestions` يعرض 5 اقتراحات ثابتة بدون أزرار إجراء.

**التحسين المطلوب**: تحويلها لاقتراحات ذكية تفاعلية مع أزرار إجراء مباشرة:
- تمرير `items`, `attachments`, `projectId`, `onNavigateToTab` كـ props إضافية
- إضافة اقتراحات ديناميكية جديدة:
  - بنود بكمية صفرية → زر "مراجعة البنود"
  - لا مرفقات → زر "رفع مستندات" (ينتقل لتبويب المستندات)
  - تسعير < 50% → زر "تسعير تلقائي"
  - تسعير مكتمل → رسالة نجاح خضراء
  - لا عقد مربوط → زر "إضافة عقد" (ينتقل لتبويب العقود)
- كل اقتراح يحتوي أيقونة + نص + **زر إجراء** (Button) ينفذ العملية مباشرة

### الملف: `src/pages/ProjectDetailsPage.tsx`
- تمرير props إضافية لـ `ProjectOverviewTab`: `items`, `attachments`, `onNavigateToTab`

---

## 3. إضافة مؤشر جودة التحليل لنتائج تحليل المخططات

### الملف: `src/pages/DrawingAnalysisPage.tsx`
- استخراج BOQ items من رسائل التحليل (`msgs`) باستخدام regex لاكتشاف بنود BOQ
- إنشاء مكون `DrawingAnalysisQualityIndicator` مخصص (inline) يحسب الجودة بناءً على:
  - **الأوصاف** (25%): وجود وصف عربي وإنجليزي
  - **الوحدات** (20%): صحة وحدات القياس (م³, م.ط, عدد, إلخ)
  - **الكميات** (20%): نسبة البنود بكمية > 0
  - **الأسعار** (20%): نسبة البنود المسعرة بمرجع SAR_REF_2025
  - **التصنيفات** (15%): وجود تصنيف (EARTHWORKS, SEWER, إلخ)
- يُعرض أعلى ملخص الجلسة في تبويب analysis عندما توجد نتائج (`boqCount > 0`)
- تصميم مطابق لـ `AnalysisQualityIndicator` الموجود: دائرة نسبة + شرائح مقاييس + توصيات

### الملفات المتأثرة
| الملف | التعديل |
|-------|---------|
| `src/components/project-details/ProjectOverviewTab.tsx` | تحسين `ImprovementSuggestions` بأزرار إجراء + props جديدة |
| `src/pages/ProjectDetailsPage.tsx` | تمرير `items`, `attachments`, `onNavigateToTab` |
| `src/pages/DrawingAnalysisPage.tsx` | إضافة `DrawingAnalysisQualityIndicator` inline |


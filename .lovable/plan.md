

# خطة: تعزيز الاقتراحات والنصائح في صفحة تحليل التكاليف

## الوضع الحالي
- يوجد 6 اقتراحات ديناميكية في الشريط الجانبي (suggestions useMemo)
- يوجد 4 نصائح ثابتة في page-tips.ts
- الصفحة تعمل لكن تعلق في شاشة التحميل (مشكلة أداء منفصلة)

## التحسينات المطلوبة

### 1. إضافة اقتراحات ديناميكية جديدة (Smart Suggestions)

| الشرط | الاقتراح (عربي) | الاقتراح (إنجليزي) |
|---|---|---|
| items.length === 0 | ابدأ بإضافة بند أو استورد من ملف Excel | Start by adding an item or importing from Excel |
| adminPercentage === 0 | أضف نسبة مصاريف إدارية لتقدير شامل | Add admin percentage for comprehensive estimate |
| sheetTabs.length > 0 | ادمج الشيتات المستوردة في البنود الأساسية | Merge imported sheets into main items |
| items.length > 5 وليس هناك تصدير | صدّر التحليل كتقرير PDF احترافي | Export analysis as professional PDF report |
| جميع البنود بدون AI | حلل جميع البنود بالذكاء الاصطناعي دفعة واحدة | Analyze all items with AI in batch |
| totalCost > 0 | قارن التكلفة مع الأسعار التاريخية | Compare cost with historical prices |

### 2. إضافة نصائح ثابتة إضافية (Page Tips)

اضافة 4 نصائح جديدة لمسار `/cost-analysis`:
- "استخدم السحب والإفلات لإعادة ترتيب البنود حسب الأولوية"
- "اضغط على أي رقم في الجدول لتعديله مباشرة"
- "استورد ملف Excel متعدد الشيتات وسيظهر كل شيت كتاب منفصل"
- "أضف نسبة الهالك والمصاريف الإدارية للحصول على تكلفة شاملة"

### 3. جعل الاقتراحات تفاعلية (Actionable)
تحويل بعض الاقتراحات من نص فقط إلى أزرار قابلة للضغط:
- "ابدأ بإضافة بند" -> يضيف صف جديد
- "حلل الكل بـ AI" -> يشغل analyzeAllWithAI
- "ادمج الشيتات" -> يدمج كل الشيتات

## التفاصيل التقنية

### الملف: `src/pages/CostAnalysisPage.tsx`
- توسيع `suggestions useMemo` بإضافة الشروط والاقتراحات الجديدة
- إضافة حقل `action` اختياري لكل اقتراح (callback function)
- تعديل عرض الاقتراحات ليدعم الضغط عند وجود action
- إضافة `onClick` handler للاقتراحات التفاعلية

### الملف: `src/lib/page-tips.ts`
- إضافة 4 نصائح جديدة لمسار `/cost-analysis`

### الملفات المتأثرة:
1. `src/pages/CostAnalysisPage.tsx`
2. `src/lib/page-tips.ts`


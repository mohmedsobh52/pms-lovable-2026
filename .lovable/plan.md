

# إضافة اقتراحات ذكية تلقائية لشاشة تحليل المخططات

## الفكرة
إضافة بطاقة "اقتراحات للتحسين" مشابهة لتلك الموجودة في `ProjectOverviewTab.tsx` (`ImprovementSuggestions`)، تعرض توصيات ديناميكية بناءً على حالة التحليل الحالية.

## الاقتراحات الذكية المقترحة

| الحالة | الاقتراح (عربي) | الاقتراح (إنجليزي) |
|--------|------------------|---------------------|
| لم يتم رفع ملفات | ارفع مخططات PDF أو صور للبدء | Upload PDF drawings or images to start |
| لم يتم اختيار نوع مخطط مناسب | تأكد من اختيار نوع المخطط الصحيح للحصول على نتائج أدق | Select the correct drawing type for better results |
| لم يتم ربط مشروع | اربط التحليل بمشروع لحفظ النتائج مع بيانات المشروع | Link analysis to a project to keep results organized |
| نتائج موجودة ولم تُحفظ | احفظ النتائج قبل مغادرة الصفحة | Save results before leaving the page |
| نتائج بكميات صفرية | راجع النتائج - بعض البنود بكمية صفرية قد تحتاج مراجعة يدوية | Review results - some items have zero quantities |
| لا توجد تحليلات محفوظة سابقة | ابدأ أول تحليل واحفظه لبناء قاعدة بيانات الكميات | Start your first analysis to build a quantities database |
| نتائج موجودة ولم يتم التصدير | صدّر النتائج إلى Excel أو PDF للمشاركة مع الفريق | Export results to Excel or PDF to share with your team |

## التغييرات التقنية

### ملف واحد: `src/pages/DrawingAnalysisPage.tsx`
- إضافة مكون `SmartSuggestions` داخل الملف نفسه (inline component)
- يأخذ الحالات: `files.length`, `results.length`, `selectedProjectId`, `savedAnalyses.length`, وجود كميات صفرية
- يُعرض بعد منطقة الرفع والإعدادات وقبل بطاقات الملخص
- تصميم مطابق لنمط الاقتراحات في `ProjectOverviewTab`: بطاقة بلون amber مع أيقونة Lightbulb وقائمة اقتراحات ديناميكية
- كل اقتراح يحتوي على أيقونة ونص وصفي وزر إجراء (مثل "ارفع ملفات" → يفتح نافذة اختيار الملفات)


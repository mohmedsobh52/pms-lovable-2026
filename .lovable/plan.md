
# معالجة مشاكل WBS

## المشكلة الرئيسية

تبويب WBS يظهر فارغاً تماماً لأن:
1. **صفحة ProjectDetailsPage** لا تمرر `wbsData` كـ prop لمكون `AnalysisResults` (السطر 1017-1020)
2. **لا توجد حالة فراغ** - عندما لا تتوفر بيانات WBS، لا يظهر أي شيء بدلاً من رسالة مساعدة
3. نفس المشكلة تؤثر على تبويب "الجدول الزمني" (Timeline) الذي يعتمد أيضاً على `wbsData`

## الحل

### 1. تمرير بيانات WBS من ProjectDetailsPage

في `src/pages/ProjectDetailsPage.tsx`:
- استخراج `wbs_data` من `saved_projects` أو `analysis_data.wbs` عند تحميل المشروع
- إنشاء `projectWbsData` وتمريره كـ prop إلى `AnalysisResults`

### 2. إضافة حالة فارغة مع زر إنشاء WBS

في `src/components/AnalysisResults.tsx`:
- عندما يكون `activeTab === "wbs"` و `wbsData?.wbs` غير موجود، عرض واجهة فارغة تحتوي على:
  - أيقونة ورسالة توضيحية (عربي/إنجليزي)
  - زر "إنشاء هيكل العمل تلقائياً" يستدعي Edge Function لتوليد WBS من البنود الموجودة
- نفس المعالجة لتبويب Timeline

### 3. إضافة إمكانية توليد WBS من البنود

- إضافة prop جديد `onGenerateWBS` في `AnalysisResults`
- عند الضغط على الزر، يتم استدعاء `analyze-boq` بنوع `create_wbs` لتوليد هيكل WBS من بنود المشروع
- حفظ النتيجة في `analysis_data` أو `wbs_data`

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/ProjectDetailsPage.tsx` | استخراج وتمرير wbsData + دالة generateWBS |
| `src/components/AnalysisResults.tsx` | إضافة حالة فارغة + زر إنشاء WBS + حالة فارغة للـ Timeline |

## التفاصيل التقنية

### استخراج WBS في ProjectDetailsPage

```text
المصادر المحتملة لبيانات WBS:
1. saved_projects.wbs_data
2. project.analysis_data.wbs
3. لا توجد بيانات -> عرض حالة فارغة مع زر إنشاء
```

### واجهة الحالة الفارغة

```text
+------------------------------------------+
|  [أيقونة Layers]                          |
|  لا يوجد هيكل تجزئة عمل (WBS)            |
|  يمكنك إنشاء WBS تلقائياً من بنود المشروع |
|                                          |
|  [🔄 إنشاء هيكل العمل تلقائياً]           |
+------------------------------------------+
```

### تدفق إنشاء WBS

```text
زر "إنشاء WBS" 
  -> جمع وصف البنود
  -> استدعاء analyze-boq مع analysis_type: "create_wbs"
  -> حفظ النتيجة في state
  -> عرض WBS Tree + Flow diagrams
```

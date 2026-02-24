

# إضافة تبويب "Analyze BOQ" في صفحة تفاصيل المشروع

## الهدف
إضافة تبويب جديد "Analyze BOQ" بين تبويب "BOQ" وتبويب "Analysis" في صفحة تفاصيل المشروع، يعرض واجهة رفع ملفات BOQ (PDF/Excel) مع السحب والإفلات كما في الصورة المرفقة.

## التغييرات المطلوبة

### 1. إضافة التبويب في صفحة تفاصيل المشروع

**الملف:** `src/pages/ProjectDetailsPage.tsx`

- إضافة `TabsTrigger` جديد باسم "analyze-boq" بين تبويب "boq" و "analysis"
- إضافة `TabsContent` جديد يحتوي على مكون `BOQAnalyzerPanel` (موجود بالفعل ومستورد في الصفحة)
- عند نجاح تحليل الملف، يتم تحديث بنود المشروع (`project_items`) تلقائياً وإعادة تحميلها في تبويب BOQ
- أيقونة التبويب: `Upload` أو `FileUp`

### 2. ربط نتائج التحليل بالمشروع الحالي

عند اكتمال التحليل بنجاح من داخل التبويب الجديد:
- حفظ البنود المستخرجة في جدول `project_items` مرتبطة بـ `projectId` الحالي
- تحديث `analysis_data` في `project_data`
- إعادة تحميل قائمة البنود في الصفحة لتظهر فوراً في تبويب BOQ
- إظهار رسالة نجاح للمستخدم

---

## التفاصيل التقنية

### التبويب الجديد في TabsList (سطر ~1089)
```text
<TabsTrigger value="analyze-boq" className="flex items-center gap-1 flex-shrink-0">
  <FileUp className="w-3.5 h-3.5" />
  {isArabic ? "تحليل BOQ" : "Analyze BOQ"}
</TabsTrigger>
```

### محتوى التبويب (TabsContent)
```text
<TabsContent value="analyze-boq">
  <BOQAnalyzerPanel
    embedded={true}
    onProjectSaved={handleBOQAnalyzerSuccess}
  />
</TabsContent>
```

### دالة معالجة النجاح
```text
handleBOQAnalyzerSuccess:
  - إعادة تحميل بنود المشروع من project_items
  - تحديث الحالة المحلية (items state)
  - التبديل تلقائياً إلى تبويب "boq" لعرض النتائج
```

### الملفات المتأثرة
| الملف | نوع التغيير |
|-------|-------------|
| `src/pages/ProjectDetailsPage.tsx` | إضافة TabsTrigger + TabsContent + handler |

لا حاجة لإنشاء ملفات جديدة - المكون `BOQAnalyzerPanel` موجود بالفعل ومستورد في الصفحة.

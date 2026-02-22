

# تطبيق شاشة "Upload BOQ File" داخل تبويب Analysis

## الوضع الحالي

عند عدم وجود بيانات تحليل في تبويب Analysis، يظهر حالياً نص بسيط مع أيقونة وزر صغير "Upload BOQ". المطلوب استبدال هذه الحالة الفارغة ببطاقة احترافية كما في الصورة المرفقة تحتوي على:
- عنوان "Upload BOQ File" مع أيقونة
- وصف "Upload a PDF or Excel file containing the Bill of Quantities for analysis"
- منطقة سحب وإفلات بإطار منقط مع أيقونة رفع
- نص "Drag file here or click to upload"
- نص "Supports PDF and Excel files"

## التعديل المطلوب

### ملف واحد: `src/pages/ProjectDetailsPage.tsx`

**الأسطر 1139-1151** - استبدال الحالة الفارغة الحالية ببطاقة رفع ملفات متكاملة:

الحالة الحالية (نص بسيط + زر):
```typescript
<div className="text-center py-16 text-muted-foreground">
  <Brain className="w-16 h-16 mx-auto mb-4 opacity-30" />
  <p>...</p>
  <Button onClick={() => setShowBOQUploadDialog(true)}>Upload BOQ</Button>
</div>
```

سيتم استبدالها ببطاقة احترافية تحتوي على:
- بطاقة (Card) بعنوان وأيقونة `FileUp`
- وصف توضيحي باللغتين
- منطقة سحب وإفلات (drag & drop) بإطار منقط
- أيقونة `Upload` في المنتصف
- نص إرشادي "Drag file here or click to upload"
- نص "Supports PDF and Excel files"
- عند السحب أو النقر يتم فتح `BOQUploadDialog` الموجود فعلاً

البطاقة ستدعم:
- السحب والإفلات المباشر (drag over يغير لون الإطار)
- النقر لفتح dialog الرفع
- عرض ثنائي اللغة (عربي/إنجليزي)

## التفاصيل التقنية

- لا حاجة لإضافة مكونات جديدة - التعديل في ملف واحد فقط
- الاستفادة من `BOQUploadDialog` الموجود فعلاً للتعامل مع الرفع الفعلي
- النقر على منطقة السحب والإفلات سيفتح الـ dialog مباشرة
- التصميم يتبع نظام الألوان والتنسيق الحالي للتطبيق


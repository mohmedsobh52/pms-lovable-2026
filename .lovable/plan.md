
# توحيد شاشة الحالة الفارغة في جدول الكميات مع شاشة رفع الملفات

## الهدف
تحويل الحالة الفارغة (Empty State) في تبويب BOQ بصفحة تفاصيل المشروع (الصورة الثانية) لتعمل بنفس إمكانيات ومواصفات شاشة رفع الملفات في BOQ Analyzer (الصورة الأولى)، بما يشمل السحب والإفلات المباشر ومعالجة الملفات فوراً.

## التغييرات المطلوبة

### الملف 1: `src/components/project-details/ProjectBOQTab.tsx`

**تحويل الحالة الفارغة (أسطر 198-228) إلى منطقة رفع كاملة:**

- إضافة حالة `isDragOver` للتحكم في تأثير السحب البصري
- إضافة معالجات السحب والإفلات (`onDragOver`, `onDragLeave`, `onDrop`)
- تضمين `<input type="file">` مخفي يقبل `.pdf,.xlsx,.xls`
- عند إسقاط/اختيار ملف، يتم استدعاء callback جديد `onFileSelected` بدلاً من فتح Dialog
- الاحتفاظ بزر "Add Item Manually"
- تطبيق نفس التصميم البصري: حدود متقطعة، أيقونة Upload كبيرة، نص "Drag file here or click to upload"، ونص فرعي "Supports PDF and Excel files"

**إضافة props جديدة:**

| Prop | النوع | الوصف |
|------|-------|-------|
| `onFileSelected` | `(file: File) => void` (اختياري) | يُستدعى عند سحب/اختيار ملف مباشرة |

### الملف 2: `src/pages/ProjectDetailsPage.tsx`

**تمرير معالج الملف الجديد:**

- إضافة دالة `handleDirectFileUpload(file: File)` تقوم بـ:
  1. فتح `BOQUploadDialog` مع تمرير الملف مباشرة
  2. أو معالجة الملف مباشرة (استخراج + حفظ البنود)
- تمرير `onFileSelected={handleDirectFileUpload}` إلى `ProjectBOQTab`

---

## التفاصيل التقنية

### تصميم منطقة الرفع الجديدة في الحالة الفارغة

```text
+--------------------------------------------------+
|  (حدود متقطعة مع تأثير hover/drag)               |
|                                                    |
|              [أيقونة Upload كبيرة]                 |
|                                                    |
|         "No BOQ Items Yet"                         |
|    "Drag file here or click to upload"             |
|       "Supports PDF and Excel files"               |
|                                                    |
|   [Upload BOQ File]  [+ Add Item Manually]         |
|                                                    |
+--------------------------------------------------+
```

### منطق السحب والإفلات
- `handleDragOver`: منع السلوك الافتراضي + تفعيل `isDragOver`
- `handleDragLeave`: إلغاء `isDragOver`
- `handleDrop`: استخراج الملف + التحقق من النوع + استدعاء `onFileSelected` أو `onUploadBOQ`
- التحقق من أنواع الملفات المقبولة: `.pdf`, `.xlsx`, `.xls`

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/project-details/ProjectBOQTab.tsx` | إعادة تصميم الحالة الفارغة مع دعم السحب والإفلات |
| `src/pages/ProjectDetailsPage.tsx` | إضافة معالج الملف المباشر وتمريره |

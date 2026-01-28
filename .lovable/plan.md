

# خطة إصلاح مشكلة رفع الملفات بأسماء عربية

## تحليل المشكلة

### الخطأ الظاهر
```
Error uploading file
Invalid key: f269ae08-bcee-4935-a740-d236c26578bc/84eadb52-5ab6-491c-9afc-aa8dca200ee7/1769596624630_جدول الكميات_بفاتة المنح بالجبيل_اكسيا.xlsx
```

### السبب الجذري
Supabase Storage يرفض مفاتيح الملفات (file keys) التي تحتوي على:
- أحرف عربية
- مسافات
- أحرف خاصة غير مسموح بها

### الكود الحالي المُسبب للمشكلة
في ملف `src/pages/ProjectDetailsPage.tsx` السطر 305:
```typescript
const filePath = `${user.id}/${projectId}/${Date.now()}_${file.name}`;
```

`file.name` يحتوي على الاسم الأصلي للملف (بما فيه الأحرف العربية).

### كيف يتم التعامل في الملفات الأخرى (الحل الصحيح)
في `ProjectAttachments.tsx` و `FastExtractionUploader.tsx`:
```typescript
const fileExt = file.name.split(".").pop();
const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
```

---

## الحل المطلوب

### التغيير: تحديث `src/pages/ProjectDetailsPage.tsx`

استبدال الكود الحالي في دالة `handleFileUpload`:

```typescript
// قبل (السطر 304-305):
for (const file of Array.from(files)) {
  const filePath = `${user.id}/${projectId}/${Date.now()}_${file.name}`;

// بعد:
for (const file of Array.from(files)) {
  const fileExt = file.name.split(".").pop() || "file";
  const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${user.id}/${projectId}/${safeFileName}`;
```

### توضيح التغييرات

| العنصر | قبل | بعد |
|--------|-----|-----|
| اسم الملف في Storage | `1769596624630_جدول الكميات.xlsx` | `1769596624630_x7k2m9.xlsx` |
| اسم الملف المحفوظ | `file.name` مباشرة | `safeFileName` (آمن) |
| الاسم المعروض للمستخدم | يُحفظ في DB في عمود `file_name` | لا تغيير - يبقى الاسم الأصلي |

### آلية العمل بعد التغيير

```text
1. المستخدم يرفع ملف: "جدول الكميات_المنح.xlsx"

2. التحويل:
   - file.name = "جدول الكميات_المنح.xlsx"
   - fileExt = "xlsx"
   - safeFileName = "1769596624630_x7k2m9.xlsx"
   - filePath = "user-id/project-id/1769596624630_x7k2m9.xlsx"

3. الحفظ:
   - Storage: يُرفع الملف بالمسار الآمن ✅
   - Database: يُحفظ الاسم الأصلي "جدول الكميات_المنح.xlsx" ✅

4. العرض للمستخدم:
   - يرى المستخدم الاسم الأصلي "جدول الكميات_المنح.xlsx" ✅
   - التحميل يعمل باستخدام file_path من DB ✅
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/ProjectDetailsPage.tsx` | تحديث بناء `filePath` ليستخدم اسم ملف آمن بدلاً من الاسم الأصلي |

---

## النتيجة المتوقعة

### قبل الإصلاح
- ❌ رفع ملفات بأسماء عربية يفشل بخطأ "Invalid key"
- ❌ رفع ملفات بأسماء تحتوي مسافات يفشل
- ❌ رفع ملفات بأحرف خاصة يفشل

### بعد الإصلاح
- ✅ رفع ملفات بأسماء عربية يعمل بنجاح
- ✅ رفع ملفات بأي اسم يعمل بنجاح
- ✅ المستخدم يرى الاسم الأصلي للملف في الواجهة
- ✅ التحميل يعمل بشكل صحيح

---

## خطوات الاختبار

1. الذهاب لصفحة تفاصيل المشروع
2. النقر على تبويب Documents
3. النقر على "Upload File"
4. اختيار ملف بأسم عربي (مثل: جدول الكميات.xlsx)
5. التحقق من أن الملف يُرفع بنجاح
6. التحقق من ظهور الملف في القائمة بالاسم الأصلي
7. التحقق من أن التحميل يعمل بشكل صحيح


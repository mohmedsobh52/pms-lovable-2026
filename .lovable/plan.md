

# إصلاح رفع الملف المباشر من جدول الكميات

## المشكلة
عند سحب/اختيار ملف من الحالة الفارغة في تبويب BOQ، يتم فتح نافذة الرفع فارغة بدون الملف المحدد. السبب أن `onFileSelected` في `ProjectDetailsPage` يفتح `BOQUploadDialog` فقط دون تمرير الملف إليه.

## الحل

### الملف 1: `src/components/project-details/BOQUploadDialog.tsx`
- إضافة prop جديد `initialFile?: File` إلى `BOQUploadDialogProps`
- إضافة `useEffect` يستمع لتغير `initialFile` + `open`: عندما يفتح الـ dialog مع ملف مبدئي، يتم ضبط `selectedFile` تلقائياً

### الملف 2: `src/pages/ProjectDetailsPage.tsx`
- إضافة state جديد `pendingFile` من نوع `File | null`
- تعديل `onFileSelected` ليحفظ الملف في `pendingFile` ثم يفتح الـ dialog
- تمرير `initialFile={pendingFile}` إلى `BOQUploadDialog`
- مسح `pendingFile` عند إغلاق الـ dialog

## التفاصيل التقنية

### التغيير في BOQUploadDialog

```typescript
// إضافة للـ interface
interface BOQUploadDialogProps {
  // ... الخصائص الحالية
  initialFile?: File;
}

// إضافة useEffect داخل المكون
useEffect(() => {
  if (open && initialFile && !selectedFile) {
    setSelectedFile(initialFile);
  }
}, [open, initialFile]);
```

### التغيير في ProjectDetailsPage

```typescript
// إضافة state
const [pendingFile, setPendingFile] = useState<File | null>(null);

// تعديل onFileSelected
onFileSelected={(file: File) => {
  setPendingFile(file);
  setShowBOQUploadDialog(true);
}}

// تمرير للـ dialog
<BOQUploadDialog
  open={showBOQUploadDialog}
  onClose={() => {
    setShowBOQUploadDialog(false);
    setPendingFile(null);
  }}
  initialFile={pendingFile}
  // ... باقي الخصائص
/>
```

### النتيجة المتوقعة
عند سحب ملف PDF أو Excel على المنطقة الفارغة في تبويب BOQ، سيفتح الـ dialog مع الملف محدد مسبقاً وجاهز للتحليل مباشرة - تماماً كما يعمل BOQ Analyzer.

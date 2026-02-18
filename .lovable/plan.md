
# إصلاح صفحة BOQ Items الفارغة

## المشكلة
صفحة `/items` تعرض الآن رسالة فارغة بسيطة عندما لا يوجد `analysisData` في الذاكرة المؤقتة. هذا يحدث عند:
- زيارة الصفحة مباشرة من الشريط العلوي
- بعد تحديث المتصفح
- بعد العودة من صفحة أخرى

## التغييرات المطلوبة

### 1. تعديل `BOQUploadDialog.tsx` — جعل `projectId` اختيارياً

المكون الحالي يتطلب `projectId` لحفظ البنود في قاعدة البيانات. نحتاج:
- جعل `projectId` اختيارياً (`projectId?: string`)
- إضافة callback جديد `onSuccessWithData?: (data: any) => void` يُستدعى بدلاً من الحفظ في قاعدة البيانات عندما لا يوجد `projectId`
- الحفاظ على السلوك الحالي كاملاً عندما يوجد `projectId`

### 2. تحديث `BOQItemsPage.tsx` — صفحة إرشادية ذكية

بدلاً من الرسالة الفارغة الحالية، عرض:

```
┌─────────────────────────────────────────────────────┐
│   📋  بنود جدول الكميات (BOQ)                       │
│   لم يتم تحميل أي ملف تحليل بعد                     │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │  📤 رفع ملف BOQ  │  │  📁 فتح مشروع محفوظ      │ │
│  │  (PDF / Excel)   │  │  من قائمة مشاريعك        │ │
│  └──────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

عند رفع الملف وإكمال التحليل:
- يتم تحميل البيانات في `analysisData` context
- تُعرض `AnalysisResults` مباشرة في نفس الصفحة دون انتقال

## التغييرات التقنية

### الملف 1: `src/components/project-details/BOQUploadDialog.tsx`

**تحديث الـ interface:**
```typescript
interface BOQUploadDialogProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;           // اختياري الآن
  isArabic: boolean;
  onSuccess: () => void;
  onSuccessWithData?: (data: any) => void; // جديد — عند غياب projectId
}
```

**تحديث منطق الحفظ:**
```typescript
// إذا لم يكن هناك projectId، نستدعي onSuccessWithData بدلاً من الحفظ في DB
if (!projectId) {
  onSuccessWithData?.({ items, file_name: selectedFile.name });
  setStatus("success");
  setTimeout(handleSuccess, 1500);
  return;
}
await saveItemsToProject(items);
```

### الملف 2: `src/pages/BOQItemsPage.tsx`

**إضافات جديدة:**
- استيراد `useState` + `BOQUploadDialog` + أيقونات Lucide
- إضافة `const [showUploadDialog, setShowUploadDialog] = useState(false)`
- استبدال الحالة الفارغة بالتصميم الجديد

**الكود الجديد للحالة الفارغة:**
```typescript
import { useState } from "react";
import { Upload, FolderOpen, FileSpreadsheet } from "lucide-react";
import { BOQUploadDialog } from "@/components/project-details/BOQUploadDialog";

// داخل المكون
const [showUploadDialog, setShowUploadDialog] = useState(false);

if (!analysisData) {
  return (
    <PageLayout>
      <div className="flex flex-col items-center justify-center py-16 gap-8 max-w-2xl mx-auto px-4">
        
        {/* أيقونة + عنوان */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">
            {isArabic ? "بنود جدول الكميات" : "BOQ Items"}
          </h2>
          <p className="text-muted-foreground">
            {isArabic
              ? "لا توجد بيانات تحليل. ارفع ملف BOQ أو افتح مشروعاً محفوظاً."
              : "No analysis data. Upload a BOQ file or open a saved project."}
          </p>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Button size="lg" className="flex-1 gap-2" onClick={() => setShowUploadDialog(true)}>
            <Upload className="w-5 h-5" />
            {isArabic ? "رفع ملف BOQ" : "Upload BOQ File"}
          </Button>
          <Button size="lg" variant="outline" className="flex-1 gap-2" asChild>
            <Link to="/projects">
              <FolderOpen className="w-5 h-5" />
              {isArabic ? "فتح مشروع" : "Open Project"}
            </Link>
          </Button>
        </div>
      </div>

      {/* Dialog رفع BOQ بدون projectId */}
      <BOQUploadDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        isArabic={isArabic}
        onSuccess={() => setShowUploadDialog(false)}
        onSuccessWithData={(data) => {
          setAnalysisData(data);
          setShowUploadDialog(false);
        }}
      />
    </PageLayout>
  );
}
```

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|------------|
| `src/pages/BOQItemsPage.tsx` | تحديث الحالة الفارغة + ربط BOQUploadDialog |
| `src/components/project-details/BOQUploadDialog.tsx` | جعل `projectId` اختيارياً + إضافة `onSuccessWithData` |

لا تغييرات على قاعدة البيانات أو الـ Edge Functions.

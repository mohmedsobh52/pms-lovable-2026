
# إصلاح صفحة BOQ Items الفارغة (`/items`)

## تشخيص المشكلة

صفحة `/items` تعتمد بالكامل على `analysisData` المخزنة في `sessionStorage` (context مؤقت). عند زيارة الصفحة مباشرة أو بعد تحديث المتصفح:

- `analysisData` يساوي `null`
- يظهر fallback بسيط: نص + زر "Go to Home"
- لا توجد أي محتوى مفيد للمستخدم

هذا هو ما يراه المستخدم — صفحة فارغة تقريباً مع زر واحد في المنتصف.

## الحل المقترح

بدلاً من إظهار شاشة فارغة، نحوّل الصفحة إلى **صفحة ذكية** تعرض:

1. **إذا كانت هناك بيانات** (`analysisData` موجود) → تعرض `AnalysisResults` كما هو الحال الآن ✓
2. **إذا لم تكن هناك بيانات** → تعرض صفحة إرشادية جميلة بدلاً من الفراغ

## التصميم المقترح للحالة الفارغة

```text
┌─────────────────────────────────────────────────────┐
│                                                     │
│   📋  بنود BOQ                                      │
│   لم يتم تحميل أي ملف تحليل بعد                    │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  📤 رفع ملف BOQ │  │  📁 فتح مشروع محفوظ    │  │
│  │  (PDF / Excel)  │  │  من قائمة مشاريعك       │  │
│  └─────────────────┘  └─────────────────────────┘  │
│                                                     │
│  ─── أو ───                                         │
│                                                     │
│  🔍 مشاريعك الأخيرة:                               │
│  ┌─────────────────────────────────────────────┐   │
│  │  مشروع 1  │  مشروع 2  │  مشروع 3           │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## التغييرات التقنية

### الملف الوحيد: `src/pages/BOQItemsPage.tsx`

**الحالة الفارغة الجديدة تحتوي على:**

1. **بطاقة رفع BOQ مباشرة** — باستخدام `BOQUploadDialog` الذي أنشأناه مسبقاً في التحسينات السابقة. عند رفع الملف يتم تحميل البيانات في الـ context ويعاد عرض `AnalysisResults` مباشرة.

2. **رابط للمشاريع المحفوظة** — زر يوجه إلى `/projects` لفتح مشروع موجود.

3. **رسالة توضيحية واضحة** بالعربية والإنجليزية.

**الكود الجديد:**

```typescript
// إضافة state للتحكم في BOQUploadDialog
const [showUploadDialog, setShowUploadDialog] = useState(false);

// الحالة الفارغة الجديدة
if (!analysisData) {
  return (
    <PageLayout>
      <div className="flex flex-col items-center justify-center py-16 gap-8 max-w-2xl mx-auto">
        
        {/* Icon + Title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">
            {isArabic ? "بنود BOQ" : "BOQ Items"}
          </h2>
          <p className="text-muted-foreground">
            {isArabic 
              ? "لا توجد بيانات تحليل. ارفع ملف BOQ أو افتح مشروعاً محفوظاً"
              : "No analysis data. Upload a BOQ file or open a saved project."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Button 
            size="lg" 
            className="flex-1 gap-2"
            onClick={() => setShowUploadDialog(true)}
          >
            <Upload className="w-5 h-5" />
            {isArabic ? "رفع ملف BOQ" : "Upload BOQ File"}
          </Button>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="flex-1 gap-2"
            asChild
          >
            <Link to="/projects">
              <FolderOpen className="w-5 h-5" />
              {isArabic ? "فتح مشروع محفوظ" : "Open Saved Project"}
            </Link>
          </Button>
        </div>
      </div>

      {/* BOQ Upload Dialog */}
      <BOQUploadDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onSuccess={(data) => {
          setAnalysisData(data);
          setShowUploadDialog(false);
        }}
        isArabic={isArabic}
      />
    </PageLayout>
  );
}
```

### تعديل بسيط على `BOQUploadDialog`

المكون الحالي `BOQUploadDialog` مرتبط بـ `projectId`. نضيف prop اختياري `projectId?: string` بدلاً من إلزامي، لأن هنا لا يوجد مشروع مرتبط — نريد فقط تحميل البيانات في الـ context.

## ملخص الملفات المتأثرة

| الملف | نوع التغيير |
|-------|------------|
| `src/pages/BOQItemsPage.tsx` | تحديث الحالة الفارغة + إضافة BOQUploadDialog |
| `src/components/project-details/BOQUploadDialog.tsx` | جعل `projectId` اختيارياً + إضافة callback `onSuccessWithData` |

لا تغييرات على قاعدة البيانات.


# تحسين صفحة المشاريع: السحب والإفلات المباشر + تحسينات UX

## الوضع الحالي

بعد التحديثات السابقة، الوضع الحالي هو:
- ✅ تبويب "تحليل BOQ" موجود ويعمل
- ✅ شاشة المشاريع الفارغة تحتوي على زر الانتقال لتبويب التحليل
- ✅ بعد الحفظ يُعيد تحميل المشاريع وينتقل للقائمة

**ما ينقص:** السحب والإفلات مباشرةً على تبويب المشاريع (بدون الدخول لتبويب التحليل أولاً).

## التحسينات المطلوبة

### 1. السحب والإفلات على تبويب المشاريع
عندما يسحب المستخدم ملف PDF أو Excel فوق محتوى تبويب "المشاريع":
- تظهر منطقة استقبال الملف بصرياً (overlay شبه شفاف أزرق)
- عند إفلات الملف: ينتقل تلقائياً لتبويب "تحليل BOQ" مع تمرير الملف للمكوّن
- يبدأ التحليل مباشرة دون أن يحتاج المستخدم لاختيار الملف مجدداً

### 2. تمرير الملف لـ `BOQAnalyzerPanel`
يحتاج `BOQAnalyzerPanel` لخاصية `initialFile?: File` جديدة لاستقبال الملف المسحوب:
```typescript
interface BOQAnalyzerPanelProps {
  onProjectSaved?: (projectId: string) => void;
  embedded?: boolean;
  initialFile?: File;  // ← جديد
}
```
عند استلام `initialFile`، يُضبط كـ `selectedFile` تلقائياً عبر `useEffect`.

### 3. تحسين بصري لشاشة المشاريع الفارغة
تحسين بسيط على التصميم الحالي: إضافة نص توضيحي أن السحب والإفلات يعمل مباشرة.

## التغييرات التقنية

### الملف 1: `src/components/BOQAnalyzerPanel.tsx`

**إضافة `initialFile` prop:**
```typescript
interface BOQAnalyzerPanelProps {
  onProjectSaved?: (projectId: string) => void;
  embedded?: boolean;
  initialFile?: File;
}

export function BOQAnalyzerPanel({ onProjectSaved, embedded = false, initialFile }: BOQAnalyzerPanelProps) {
  // ...
  useEffect(() => {
    if (initialFile) {
      setSelectedFile(initialFile);
    }
  }, [initialFile]);
```

### الملف 2: `src/pages/SavedProjectsPage.tsx`

**أ. إضافة state للملف المسحوب وحالة drag:**
```typescript
const [draggedFile, setDraggedFile] = useState<File | null>(null);
const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);
```

**ب. منطق السحب والإفلات على المحتوى الكامل لتبويب المشاريع:**
```typescript
const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  const files = e.dataTransfer.items;
  if (files.length > 0) setIsGlobalDragOver(true);
}, []);

const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
  // التحقق من أن الماوس خرج من المنطقة كلياً
  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
    setIsGlobalDragOver(false);
  }
}, []);

const handleGlobalDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  setIsGlobalDragOver(false);
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    // التحقق من نوع الملف
    const isValid = file.name.endsWith('.pdf') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isValid) {
      setDraggedFile(file);
      setActiveTab("analyze"); // الانتقال لتبويب التحليل
    }
  }
}, []);
```

**ج. تطبيق السحب والإفلات على `TabsContent value="projects"`:**
```typescript
<TabsContent 
  value="projects" 
  className="space-y-6 relative"
  onDragOver={handleGlobalDragOver}
  onDragLeave={handleGlobalDragLeave}
  onDrop={handleGlobalDrop}
>
  {/* Drag Overlay */}
  {isGlobalDragOver && activeTab === "projects" && (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-xl backdrop-blur-sm">
      <div className="text-center">
        <Upload className="w-16 h-16 mx-auto mb-3 text-primary" />
        <p className="text-xl font-semibold text-primary">
          {isArabic ? "أفلت الملف لبدء التحليل" : "Drop file to start analysis"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">PDF, Excel</p>
      </div>
    </div>
  )}
  {/* ... rest of content */}
</TabsContent>
```

**د. تمرير `draggedFile` لـ `BOQAnalyzerPanel` ومسحه بعد الاستخدام:**
```typescript
<TabsContent value="analyze">
  <BOQAnalyzerPanel
    key={draggedFile?.name} // إعادة mount عند تغيير الملف
    initialFile={draggedFile || undefined}
    onProjectSaved={(projectId) => {
      setDraggedFile(null);
      fetchProjects();
      setActiveTab("projects");
    }}
    embedded={true}
  />
</TabsContent>
```

**هـ. تحسين شاشة المشاريع الفارغة:**
إضافة نص توضيحي عن السحب والإفلات تحت الزر الموجود:
```typescript
<p className="text-xs text-muted-foreground mt-2">
  {isArabic ? "أو اسحب وأفلت ملف PDF/Excel مباشرةً هنا" : "Or drag & drop a PDF/Excel file directly here"}
</p>
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/BOQAnalyzerPanel.tsx` | إضافة `initialFile` prop + `useEffect` لضبطه |
| `src/pages/SavedProjectsPage.tsx` | إضافة drag-and-drop overlay + تمرير الملف للمكوّن |

## لا تغييرات على قاعدة البيانات

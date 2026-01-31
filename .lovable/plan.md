

# تحسين شكل التبويب والمربع الحواري وإضافة فلتر التصنيف

## المشاكل الحالية (من الصورة)

1. **المربع الحواري (Quantity Takeoff):**
   - تصميم بسيط يحتاج لتحسين
   - لا يوجد فلتر لاختيار الملفات حسب التصنيف
   - شريط التقدم بسيط

2. **تحسينات مطلوبة:**
   - إضافة أزرار اختيار سريع حسب التصنيف
   - تحسين شكل قائمة الملفات
   - تحسين مظهر شريط التقدم

## التغييرات المطلوبة

### 1. تحديث `BatchAnalysisDialog.tsx`

**إضافة فلتر التصنيف:**

```text
┌─────────────────────────────────────────────────────────────┐
│  📊 تحليل مجموعة ملفات                                       │
│  ───────────────────────────────────────────────────────────│
│                                                              │
│  اختيار حسب التصنيف:                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ الكل │ │ BOQ  │ │رسومات│ │عقود  │ │عروض  │              │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘              │
│                                                              │
│  ☐ تحديد الكل (15)                                         │
│  ─────────────────────────────────────────────────────────  │
│  📄 file1.pdf              [BOQ]                            │
│  📄 file2.xlsx             [Drawings]                       │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

**التعديلات التقنية:**
- إضافة state للتصنيف المختار
- أزرار فلترة سريعة (chips) لكل تصنيف
- زر "Select by Category" يفتح قائمة منسدلة
- تحسين تنسيق القائمة

### 2. تحديث `DrawingQuantityExtractor.tsx`

**إضافة نفس نظام الفلترة:**
- فلتر حسب نوع الملف (PDF, DWG, Images)
- أزرار اختيار سريع
- تحسين تصميم البطاقات

### 3. تحسينات عامة للمربعات الحوارية

**تحسين الشكل:**
- إضافة أيقونات ملونة للتصنيفات
- تحسين الـ badges
- إضافة ظلال وتأثيرات hover أفضل
- تحسين الـ ScrollArea

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `BatchAnalysisDialog.tsx` | إضافة فلتر التصنيف + تحسين UI |
| `DrawingQuantityExtractor.tsx` | إضافة فلتر نوع الملف + تحسين UI |
| `AttachmentsTab.tsx` | تحسين مظهر الفلاتر (اختياري) |

## تفاصيل التنفيذ

### إضافة فلتر التصنيف في BatchAnalysisDialog

```typescript
// State للفلتر
const [categoryFilter, setCategoryFilter] = useState<string>("all");

// أزرار التصنيف
const categories = [
  { value: "all", label: isArabic ? "الكل" : "All" },
  { value: "boq", label: "BOQ" },
  { value: "drawings", label: isArabic ? "الرسومات" : "Drawings" },
  { value: "contracts", label: isArabic ? "العقود" : "Contracts" },
  { value: "quotations", label: isArabic ? "عروض الأسعار" : "Quotations" },
];

// فلترة الملفات
const filteredFiles = useMemo(() => {
  if (categoryFilter === "all") return unanalyzedFiles;
  return unanalyzedFiles.filter(f => f.category === categoryFilter);
}, [unanalyzedFiles, categoryFilter]);
```

### تحسين واجهة أزرار الفلترة

```text
┌─────────────────────────────────────────────────┐
│  Filter by Category:                            │
│                                                 │
│  [🔘 All (15)] [📋 BOQ (5)] [📐 Drawings (3)]  │
│  [📜 Contracts (4)] [💰 Quotations (3)]         │
│                                                 │
│  ────────────────────────────────────────────   │
│                                                 │
│  Quick Actions:                                 │
│  [Select All BOQ] [Select All Drawings]         │
└─────────────────────────────────────────────────┘
```

### تحسين مظهر بطاقات الملفات

```typescript
<Card 
  className={cn(
    "cursor-pointer transition-all duration-200",
    "hover:shadow-md hover:border-primary/50",
    selectedFiles.has(file.id) && "border-primary bg-primary/5 shadow-sm"
  )}
>
  <CardContent className="py-3">
    <div className="flex items-center gap-3">
      <Checkbox checked={selectedFiles.has(file.id)} />
      <FileIcon type={file.file_type} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{file.file_name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
      <CategoryBadge category={file.category} />
    </div>
  </CardContent>
</Card>
```

## النتائج المتوقعة

- فلترة سريعة للملفات حسب التصنيف
- اختيار جماعي لملفات تصنيف معين
- تحسين واضح في تجربة المستخدم
- تصميم أكثر احترافية وسهولة في الاستخدام
- أزرار واضحة للاختيار السريع


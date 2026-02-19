
# تحسينات Advanced Analysis + صفحة المشاريع

## ما سيتغير

### 1. قائمة Actions في جدول البنود (AnalysisResults.tsx)

الصورة المرفقة تظهر Dropdown menu بالخيارات:
- **$ Quick Price** — تطبيق AI Rate مباشرة
- **📄 Detailed Price** — فتح محرر التكاليف المفصل
- **✏️ Edit** — تعديل الوصف/البيانات
- **⊗ Clear Price** — مسح السعر المحسوب
- **🗑️ Delete** — حذف البند

حالياً عمود Actions يحتوي فقط على زر `Edit` من `ItemCostEditor` + زر حذف مشروط (للبنود بكمية صفر فقط).

**التغيير:** استبدال الأزرار الحالية بـ `DropdownMenu` موحد بالخيارات الخمسة المطلوبة:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
      <MoreHorizontal className="w-4 h-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-44">
    <DropdownMenuItem onClick={() => handleQuickPrice(item)}>
      <DollarSign className="w-4 h-4 text-green-600" />
      {isArabic ? "سعر سريع" : "Quick Price"}
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => openDetailedPrice(item)}>
      <FileText className="w-4 h-4 text-blue-600" />
      {isArabic ? "سعر مفصل" : "Detailed Price"}
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => openCostEditor(item)}>
      <Edit className="w-4 h-4" />
      {isArabic ? "تعديل" : "Edit"}
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleClearPrice(item.item_number)}>
      <XCircle className="w-4 h-4" />
      {isArabic ? "مسح السعر" : "Clear Price"}
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      onClick={() => handleDeleteZeroQtyRow(item.item_number)}
      className="text-destructive focus:text-destructive"
    >
      <Trash2 className="w-4 h-4" />
      {isArabic ? "حذف" : "Delete"}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Quick Price:** يستخدم `updateAIRate` لضبط AI Rate للبند بقيمة مقترحة (يفتح input صغير أو يطبق متوسط الأسعار المماثلة).

**Detailed Price:** يفتح `ItemCostEditor` (ExcavationCostAnalysis dialog الحالي).

**Clear Price:** يستدعي `updateAIRate(item.item_number, 0)` لمسح الـ AI Rate.

**Delete:** يستدعي `handleDeleteZeroQtyRow` الموجودة (مع إزالة شرط الكمية = صفر لتكون متاحة لأي بند).

---

### 2. البحث الفوري مع تمييز النص بالأصفر (AnalysisResults.tsx)

**الوضع الحالي:** `searchQuery` state موجود (سطر 593) وتُفلتر البنود بناءً عليه في `filteredItems`. لكن النص في خلية Description يُعرض كنص عادي:
```tsx
<p className="text-sm ...">
  {cleanText(item.description)}
</p>
```

**التغيير:** إنشاء دالة `highlightText` تُقسّم النص عند تطابق `searchQuery` وتُلف الأجزاء المطابقة بـ `<mark>`:

```tsx
const highlightText = useCallback((text: string, query: string) => {
  if (!query.trim()) return <span>{text}</span>;
  
  const cleanedText = cleanText(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = cleanedText.split(regex);
  
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300 dark:bg-yellow-600/70 text-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}, []);
```

ثم استخدامها في خلية Description:
```tsx
<p className="text-sm font-medium ...">
  {highlightText(item.description, searchQuery)}
</p>
```

البحث فوري لأن `searchQuery` يتغير مع كل ضغطة مفتاح (controlled input موجود بالفعل).

---

### 3. مؤشر تقدم التسعير في كارت المشروع (SavedProjectsPage.tsx)

**الوضع الحالي:** بطاقة المشروع تعرض: الاسم، اسم الملف، عدد البنود، القيمة، التاريخ، والأزرار.

**التغيير:** إضافة شريط تقدم ملوّن يوضح نسبة البنود المسعّرة.

**مصدر البيانات:** كل مشروع يحتوي على `analysis_data` بداخله `items`. البنود المسعّرة هي تلك التي `unit_price > 0` أو `total_price > 0`.

```tsx
// حساب تقدم التسعير
const pricedCount = (project.analysis_data?.items || [])
  .filter((item: any) => (item.unit_price || 0) > 0 || (item.total_price || 0) > 0).length;
const totalCount = project.items_count || 0;
const pricingPct = totalCount > 0 ? Math.round((pricedCount / totalCount) * 100) : 0;
```

**واجهة المستخدم داخل الكارت (بين Stats وDate):**
```tsx
{totalCount > 0 && (
  <div className="mb-3">
    <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
      <span>{isArabic ? "التسعير" : "Pricing"}</span>
      <span className={cn(
        "font-semibold",
        pricingPct === 100 ? "text-green-600" : pricingPct > 50 ? "text-primary" : "text-orange-500"
      )}>
        {pricedCount}/{totalCount} ({pricingPct}%)
      </span>
    </div>
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          pricingPct === 100
            ? "bg-green-500"
            : pricingPct > 50
              ? "bg-primary"
              : "bg-orange-400"
        )}
        style={{ width: `${pricingPct}%` }}
      />
    </div>
  </div>
)}
```

---

## الملفات المتأثرة

| الملف | التغييرات |
|-------|-----------|
| `src/components/AnalysisResults.tsx` | (1) استبدال Actions buttons بـ DropdownMenu موحد، (2) دالة `highlightText` + تطبيقها في خلية Description |
| `src/pages/SavedProjectsPage.tsx` | (3) إضافة شريط تقدم التسعير في بطاقة المشروع |

## لا تغييرات على قاعدة البيانات

جميع البيانات المطلوبة متوفرة في `analysis_data.items` المحفوظة مع كل مشروع.

## ملاحظات التنفيذ

- دالة `highlightText` تُهرّب أحرف regex الخاصة لتجنب الأخطاء عند البحث بنصوص تحتوي على `(`, `)`, `.` إلخ.
- يُعاد `regex.test()` مرتين لاختبار التطابق — يجب reset الـ `lastIndex` لأن الـ flag `g` يُبقي الـ index. سيتم استخدام `new RegExp(..., 'gi')` لكل عملية مقارنة بدلاً من regex.test() مباشرة.
- شريط التسعير في الكارت يستخدم `analysis_data?.items` المخزنة في المشروع وليس بيانات AI Rate الحية من localStorage (لأن بيانات localStorage خاصة بجهاز المستخدم وليست في قاعدة البيانات) — لذا يعرض النسبة بناءً على `unit_price > 0` الموجودة في بيانات التحليل المحفوظة.
- زر Delete في القائمة سيُتاح لجميع البنود (ليس فقط بكمية صفر) مع نفس آلية الـ Undo الموجودة.

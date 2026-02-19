
# تكملة التحسينات: Actions Dropdown + تمييز البحث + مؤشر التسعير في المشاريع

## ملخص ما تم تنفيذه مسبقاً ✅
- القائمة الجانبية القابلة للطي في `AnalysisResults.tsx`
- مؤشر تقدم التسعير في الشريط الجانبي
- هيكل السطور والأعمدة في الجدول

## ما يحتاج تنفيذاً الآن

### 1. استبدال أزرار Actions بـ Dropdown Menu موحد

**الوضع الحالي (السطور 2379-2410):**
```tsx
<div className="flex items-center justify-center gap-1">
  <ItemCostEditor ... />   {/* زر "تفاصيل التكاليف" */}
  {(!item.quantity || item.quantity === 0) && (
    <Button ...><XCircle ... /></Button>  {/* زر الحذف فقط للكمية صفر */}
  )}
</div>
```

**الجديد:** Dropdown Menu بخمسة خيارات:

```
⚡ Quick Price   ← يفتح input صغير لإدخال سعر سريع مباشرة
📄 Detailed Price ← يفتح ItemCostEditor (الموجود)
──────────
✏️ Edit          ← يفتح ItemCostEditor أيضاً (نفس الوظيفة حالياً)
⊘ Clear Price   ← updateAIRate(item_number, 0)
──────────
🗑️ Delete        ← handleDeleteZeroQtyRow - متاح لجميع البنود (بدون شرط الكمية)
```

التنفيذ سيستخدم `DropdownMenu` المستورد فعلاً في السطر 6-11.

سيُضاف state صغير `quickPriceItemId` لتتبع البند المختار للسعر السريع.

---

### 2. تمييز نص البحث بالأصفر في عمود Description

**الوضع الحالي (السطر 2328-2330):**
```tsx
<p className="text-sm font-medium ...">
  {cleanText(item.description)}
</p>
```

**الجديد:** إضافة دالة `highlightText` بعد `cleanText` (سطر ~70):

```typescript
const highlightText = (text: string, query: string): React.ReactNode => {
  const cleaned = cleanText(text);
  if (!query.trim()) return cleaned;
  
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = cleaned.split(new RegExp(`(${escaped})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-300 dark:bg-yellow-600/60 text-foreground rounded-sm px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};
```

ثم تغيير السطر 2329:
```tsx
{highlightText(item.description, searchQuery)}
```

البحث فوري لأن `searchQuery` controlled state.

---

### 3. مؤشر تقدم التسعير في كروت المشاريع

**الملف:** `src/pages/SavedProjectsPage.tsx`
**الموضع:** داخل كارت المشروع (السطر 596-624)، بين Stats وDate

**المنطق:**
```typescript
const pricedCount = (project.analysis_data?.items || [])
  .filter((item: any) => (item.unit_price || 0) > 0 || (item.total_price || 0) > 0).length;
const totalCount = project.items_count || 0;
const pricingPct = totalCount > 0 ? Math.round((pricedCount / totalCount) * 100) : 0;
```

**الإضافة بين Stats و Date (بعد السطر 613):**
```tsx
{/* Pricing Progress Bar */}
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
          pricingPct === 100 ? "bg-green-500" : pricingPct > 50 ? "bg-primary" : "bg-orange-400"
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
| `src/components/AnalysisResults.tsx` | دالة `highlightText` + تطبيقها في Description + استبدال Actions بـ Dropdown |
| `src/pages/SavedProjectsPage.tsx` | إضافة شريط تقدم التسعير داخل كارت المشروع |

## لا تغييرات على قاعدة البيانات

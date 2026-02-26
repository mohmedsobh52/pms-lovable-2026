
# تحسين شكل جداول المكتبة وتوحيد التصنيفات

## 1. تحسين شكل الجداول (الثلاث تبويبات)

تطبيق نمط الجداول الموحد المستخدم في باقي التطبيق (BOQ tables) على جداول المكتبة:

### التغييرات المرئية:
- **رؤوس الجداول**: استبدال `bg-muted/50` بخلفية navy احترافية `bg-[hsl(218,50%,18%)]/5` مع نص `font-semibold`
- **الصفوف**: إضافة تأثير hover أزرق فاتح `hover:bg-blue-50/50 dark:hover:bg-blue-900/10`
- **الحدود**: تحسين `rounded-lg border shadow-sm` للجدول
- **الخلايا**: تحسين padding وتنسيق الأعمدة (محاذاة الأسعار في المنتصف، الأكواد بخط monospace)
- **أزرار الإجراءات**: تحسين أزرار التعديل والحذف بتأثيرات hover ملونة
- **عدد النتائج**: نقله لأعلى الجدول في شريط معلومات أنيق

## 2. توحيد وتحسين التصنيفات

### تحسين عرض التصنيفات في الثلاث تبويبات:
- استبدال `Badge variant="outline"` العادي بـ badges ملونة حسب المجموعة:
  - مواسير: لون أزرق
  - شبكات: لون بنفسجي  
  - عام: لون رمادي
  - حفر ونقل: لون برتقالي
  - إشراف: لون أخضر

## 3. تحسين Pagination موحد

توحيد شكل ترقيم الصفحات في الثلاث تبويبات ليكون متطابقاً:
- عرض "Showing X-Y of Z" على اليسار
- أزرار التنقل على اليمين مع رقم الصفحة

## 4. تحسين شريط البحث والفلاتر

- توسيع شريط البحث ليأخذ مساحة أكبر
- تحسين تصميم فلتر التصنيف مع أيقونة Filter
- إضافة عدد النتائج بجانب الفلتر

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/library/MaterialsTab.tsx` | تحسين شكل الجدول + pagination + badges ملونة |
| `src/components/library/LaborTab.tsx` | تحسين شكل الجدول + pagination + badges ملونة |
| `src/components/library/EquipmentTab.tsx` | تحسين شكل الجدول + pagination + badges ملونة |

### نمط الجدول المحسّن

```typescript
// Header row
<TableRow className="bg-[hsl(218,50%,18%)]/5 dark:bg-[hsl(218,45%,18%)]/20">
  <TableHead className="font-semibold text-[hsl(218,50%,18%)] dark:text-white/80">...</TableHead>
</TableRow>

// Data row  
<TableRow className="hover:bg-[hsl(217,91%,60%)]/5 dark:hover:bg-[hsl(217,91%,60%)]/10">

// Category badge with color
<Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
  {categoryLabel}
</Badge>
```

### Pagination موحد

```typescript
<div className="flex items-center justify-between px-2 pt-3">
  <span className="text-sm text-muted-foreground">
    Showing {from}-{to} of {total}
  </span>
  <div className="flex items-center gap-1">
    <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1}>
      <ChevronRight className="h-4 w-4" />
    </Button>
    <span className="text-sm min-w-[60px] text-center">{currentPage} / {totalPages}</span>
    <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages}>
      <ChevronLeft className="h-4 w-4" />
    </Button>
  </div>
</div>
```

### ألوان التصنيفات حسب المجموعة

```typescript
const getCategoryBadgeColor = (category: string) => {
  // Pipes
  if (category.startsWith('pipes_')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30';
  // Networks  
  if (['fittings_valves','manholes','pumps_stations','water_tanks','water_treatment'].includes(category))
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30';
  // Construction
  if (['concrete','steel','cement'].includes(category))
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800';
};
```


# خطة إصلاح مشكلة عدم عمل "Quick Price" في القائمة الجانبية

## تشخيص المشكلة

### السبب الجذري
تم تغيير `onClick` إلى `onSelect` في آخر تعديل، لكن هذا سبب مشكلة:

| المعالج | التوقيت | المشكلة |
|---------|---------|---------|
| `onClick` | يُنفذ فوراً عند النقر | ✅ يفتح الـ Dialog مباشرة |
| `onSelect` | يُنفذ بعد إغلاق القائمة | ❌ قد يتأخر أو يُفقد |

### الكود الحالي (لا يعمل):
```typescript
<DropdownMenuItem 
  onSelect={() => onQuickPrice(item.id)}
  className="gap-2"
>
```

### الدليل على أن `onClick` يعمل:
الملفات التالية تستخدم `onClick` وتعمل بشكل صحيح:
- `AnalysisResults.tsx` (سطر 1401-1437)
- `AttachmentFolders.tsx` (سطر 392)
- `ProjectAttachments.tsx` (سطر 1010-1025)

---

## الحل المقترح

### إعادة `onClick` بدلاً من `onSelect` مع إضافة `e.preventDefault()`

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

**التغييرات (السطور 328-365):**

```typescript
<DropdownMenuItem 
  onClick={(e) => {
    e.preventDefault();
    onQuickPrice(item.id);
  }}
  className="gap-2"
>
  <DollarSign className="w-4 h-4" />
  {isArabic ? "تسعير سريع" : "Quick Price"}
</DropdownMenuItem>

<DropdownMenuItem 
  onClick={(e) => {
    e.preventDefault();
    onDetailedPrice(item);
  }}
  className="gap-2"
>
  <FileText className="w-4 h-4" />
  {isArabic ? "تسعير مفصل" : "Detailed Price"}
</DropdownMenuItem>

<DropdownMenuItem 
  onClick={(e) => {
    e.preventDefault();
    onEditItem(item);
  }}
  className="gap-2"
>
  <Edit className="w-4 h-4" />
  {isArabic ? "تعديل" : "Edit"}
</DropdownMenuItem>

<DropdownMenuItem 
  onClick={(e) => {
    e.preventDefault();
    onUnconfirmItem(item.id);
  }}
  className="gap-2"
  disabled={!item.unit_price || item.unit_price === 0}
>
  <XCircle className="w-4 h-4" />
  {isArabic ? "إلغاء التحقق" : "Clear Price"}
</DropdownMenuItem>

<DropdownMenuItem 
  onClick={(e) => {
    e.preventDefault();
    onDeleteItem(item.id);
  }}
  className="gap-2 text-destructive"
>
  <Trash2 className="w-4 h-4" />
  {isArabic ? "حذف" : "Delete"}
</DropdownMenuItem>
```

---

## ملخص التغييرات

| الملف | السطر | التغيير |
|-------|-------|---------|
| `ProjectBOQTab.tsx` | 328-365 | إعادة `onClick` بدلاً من `onSelect` مع `e.preventDefault()` |

---

## الاختبار المطلوب بعد التنفيذ

1. **النقر على زر النقاط الثلاث (⋮)** → القائمة تظهر ✓
2. **النقر على "Quick Price"** → يفتح dialog التسعير السريع فوراً
3. **النقر على "Detailed Price"** → يفتح dialog التسعير المفصل
4. **النقر على "Edit"** → يفتح dialog التعديل
5. **النقر على "Clear Price"** → يمسح السعر (للبنود المسعرة فقط)
6. **النقر على "Delete"** → يحذف البند

---

## لماذا يعمل `onClick` بينما `onSelect` لا يعمل؟

```text
┌─────────────────────────────────────────────────────────────┐
│                 سلسلة الأحداث مع onClick                     │
├─────────────────────────────────────────────────────────────┤
│ 1. المستخدم ينقر على العنصر                                  │
│ 2. onClick يُنفذ فوراً → setShowQuickPriceDialog(itemId)     │
│ 3. Dialog يظهر مباشرة                                        │
│ 4. القائمة تُغلق                                             │
│                                                             │
│ النتيجة: ✅ Dialog يظهر                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 سلسلة الأحداث مع onSelect                    │
├─────────────────────────────────────────────────────────────┤
│ 1. المستخدم ينقر على العنصر                                  │
│ 2. القائمة تبدأ بالإغلاق                                     │
│ 3. onSelect يُنفذ بعد الإغلاق                                │
│ 4. قد يكون هناك تعارض مع pointer-events                     │
│                                                             │
│ النتيجة: ❌ Dialog قد لا يظهر                                │
└─────────────────────────────────────────────────────────────┘
```


# خطة إصلاح تبويب "Site Staff"

## تشخيص المشكلة

### السبب الجذري
بعد فحص الكود، وجدت أن المشكلة هي **نفس مشكلة z-index** التي أصلحناها في الصفحات السابقة:

```text
ترتيب الطبقات الحالي:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Header (TenderSummaryPage):  z-40   
Tabs Navigation:             z-55   (من CSS)
Dialog Overlay:              z-50   
TabsTrigger:                 z-56   (من CSS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

المشكلة الرئيسية:
1. **TabsList في TenderSummaryPage** لا يحتوي على class `tabs-navigation-safe` 
2. الاعتماد على CSS selector `[data-radix-tabs-list]` قد لا يكون كافياً بسبب stacking context
3. الـ overflow-x-auto على TabsList قد يُنشئ stacking context جديد يتعارض مع z-index

---

## الحل المقترح

### 1. إضافة class للـ TabsList في TenderSummaryPage

**في ملف `src/pages/TenderSummaryPage.tsx` - السطر 650:**

```typescript
// قبل
<TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6 bg-muted/50">

// بعد
<TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6 bg-muted/50 tabs-navigation-safe">
```

---

### 2. إضافة CSS لضمان أن TabsTrigger قابل للنقر دائماً

**في ملف `src/components/ui/dialog-custom.css`:**

```css
/* Ensure all tabs on Tender Summary page are clickable */
.tabs-navigation-safe > button,
.tabs-navigation-safe [role="tab"] {
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

---

## ملخص التغييرات

| الملف | السطر | التغيير | الأثر |
|-------|-------|---------|-------|
| `TenderSummaryPage.tsx` | 650 | إضافة `tabs-navigation-safe` class | يحمي جميع tabs من z-index conflicts |
| `dialog-custom.css` | جديد | CSS rules للـ tabs triggers | يضمن pointer-events للتبويبات |

---

## ترتيب الطبقات بعد الإصلاح

```text
ترتيب الطبقات الجديد:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Select Dropdowns:          z-[70] ✅
Project Actions:           z-[60] ✅
Tabs Navigation:           z-55   ✅ (مع class صريح)
Dialog Overlay:            z-50
Header:                    z-40
Normal Content:            z-auto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## التبويبات المحمية بعد الإصلاح

1. ✅ **Tender Summary** - سيعمل بشكل صحيح
2. ✅ **Site Staff** - سيعمل بشكل صحيح
3. ✅ **Facilities** - سيعمل بشكل صحيح
4. ✅ **Insurance** - سيعمل بشكل صحيح
5. ✅ **Guarantees** - سيعمل بشكل صحيح
6. ✅ **Indirect Costs** - سيعمل بشكل صحيح
7. ✅ **Subcontractors** - سيعمل بشكل صحيح
8. ✅ **Settings** - سيعمل بشكل صحيح

---

## الاختبار المطلوب

بعد تطبيق التغييرات:

1. **اختبار Site Staff tab:**
   - النقر على "Site Staff" → يجب أن يظهر جدول طاقم الموقع
   - التأكد من ظهور جميع الموظفين في الجدول

2. **اختبار باقي التبويبات:**
   - النقر على كل تبويب → يجب أن يتغير المحتوى
   - التأكد من عدم وجود "تجميد" عند النقر

3. **اختبار بعد إغلاق Dialog:**
   - فتح dialog "Add Staff" → إغلاقه → النقر على تبويب آخر → يجب أن يعمل فوراً

4. **اختبار Console:**
   - لا أخطاء جديدة متعلقة بالتبويبات

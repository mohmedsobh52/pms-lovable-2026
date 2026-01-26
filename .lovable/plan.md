

# خطة إصلاح تبويب "Analyze BOQ"

## تشخيص المشكلة

### السبب الجذري
تبويب "Analyze BOQ" في صفحة Projects يعاني من **نفس مشكلة z-index** التي أصلحناها في الصفحات السابقة:

```text
ترتيب الطبقات الحالي:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Header:                    z-50   
TabsList:                  z-auto ❌ (غير محمي!)
Dialog Overlay:            z-50   (قد يحجب الـ tabs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**TabsList** في `SavedProjectsPage.tsx` (السطر 291) لا يحتوي على class `tabs-navigation-safe` الذي يحمي التبويبات من مشاكل z-index.

---

## الحل المقترح

### إضافة class للـ TabsList في SavedProjectsPage

**في ملف `src/pages/SavedProjectsPage.tsx` - السطر 291:**

```typescript
// قبل
<TabsList className="grid w-full sm:w-auto grid-cols-2">

// بعد
<TabsList className="grid w-full sm:w-auto grid-cols-2 tabs-navigation-safe">
```

هذا يطبق نفس CSS المحمي الذي أضفناه سابقاً:
- `z-index: 55`
- `pointer-events: auto`
- `cursor: pointer`

---

## ملخص التغييرات

| الملف | السطر | التغيير | الأثر |
|-------|-------|---------|-------|
| `SavedProjectsPage.tsx` | 291 | إضافة `tabs-navigation-safe` class | يحمي tabs من z-index conflicts |

---

## التبويبات المحمية بعد الإصلاح

1. **Saved Projects** - سيعمل بشكل صحيح
2. **Analyze BOQ** - سيعمل بشكل صحيح

---

## ترتيب الطبقات بعد الإصلاح

```text
ترتيب الطبقات الجديد:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Select Dropdowns:          z-[70] ✅
Project Actions:           z-[60] ✅
Tabs Navigation:           z-55   ✅ (مع class tabs-navigation-safe)
Header:                    z-50
Dialog Overlay:            z-50
Normal Content:            z-auto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## الاختبار المطلوب

بعد تطبيق التغييرات:

1. **اختبار Analyze BOQ tab:**
   - النقر على "Analyze BOQ" → يجب أن يظهر قسم رفع الملفات
   - التأكد من عمل منطقة السحب والإفلات

2. **اختبار Saved Projects tab:**
   - النقر على "Saved Projects" → يجب أن تظهر قائمة المشاريع
   - التأكد من عمل البحث والفلترة

3. **اختبار التبديل السريع:**
   - التبديل المتكرر بين التبويبين → يجب أن يعمل بسلاسة

4. **اختبار بعد إغلاق Dialog:**
   - فتح أي dialog → إغلاقه → النقر على تبويب → يجب أن يعمل فوراً


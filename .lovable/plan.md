
# خطة إصلاح تبويب Project Status و Project Type

## تشخيص المشكلة

### الأعراض
- القوائم المنسدلة لـ **Project Type** و **Project Status** لا تفتح عند النقر
- Console يُظهر تحذير ref warning من Select داخل ProjectSettingsTab

### السبب الجذري

**تعارض z-index بين SelectContent و TabsList:**

```text
ترتيب الطبقات الحالي:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project Actions:  z-[60]  ✅
Tabs Trigger:     z-56    ✅
Tabs List:        z-55    ⚠️ (يحجب Select dropdown)
Select Content:   z-50    ❌ (أقل من Tabs!)
Dialog Overlay:   z-50
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**المشكلة**: عندما يفتح Select dropdown، يظهر في Portal مع `z-50`، لكنه يُحجب تحت TabsList الذي له `z-55`.

---

## الحل المقترح

### 1. رفع z-index للـ SelectContent

**في ملف `src/components/ui/select.tsx` - السطر 69:**

```typescript
// قبل
"relative z-50 max-h-96..."

// بعد
"relative z-[70] max-h-96..."
```

هذا يضمن أن القائمة المنسدلة **دائماً فوق** أي عنصر آخر.

---

### 2. إضافة CSS لضمان أن Select popups فوق كل شيء

**في ملف `src/components/ui/dialog-custom.css`:**

```css
/* Select dropdown - ensure it appears above everything */
[data-radix-select-content] {
  z-index: 70 !important;
}

[data-radix-select-viewport] {
  pointer-events: auto !important;
}

/* Ensure select items are clickable */
[data-radix-select-item] {
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

---

## ملخص التغييرات

| الملف | السطر | التغيير | الأثر |
|-------|-------|---------|-------|
| `select.tsx` | 69 | تغيير `z-50` إلى `z-[70]` | يرفع Select dropdown فوق Tabs |
| `dialog-custom.css` | جديد | CSS rules للـ Select | يضمن pointer-events للخيارات |

---

## ترتيب الطبقات الجديد

```text
ترتيب الطبقات بعد الإصلاح:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Select Content:   z-[70]  ✅ (الأعلى - يظهر فوق كل شيء)
Project Actions:  z-[60]  ✅
Tabs Trigger:     z-56    ✅
Tabs List:        z-55    ✅
Dialog Overlay:   z-50
Normal Content:   z-auto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## الفوائد المتوقعة

### 1. إصلاح Project Type dropdown
- النقر على "Project Type" → تظهر قائمة بالخيارات
- اختيار Construction/Infrastructure/Renovation/Maintenance/Other → يُحدث القيمة

### 2. إصلاح Project Status dropdown
- النقر على "Project Status" → تظهر قائمة بالحالات
- اختيار Draft/In Progress/Completed/Suspended → يُحدث الحالة

### 3. إصلاح Currency dropdown
- نفس السلوك المتوقع لقائمة العملات

---

## الاختبار المطلوب

بعد تطبيق التغييرات:

1. **اختبار Project Type:**
   - الانتقال لـ Settings tab
   - النقر على "Edit"
   - النقر على Project Type dropdown → يجب أن تظهر القائمة
   - اختيار نوع مختلف → يجب أن تتغير القيمة

2. **اختبار Project Status:**
   - النقر على Project Status dropdown → يجب أن تظهر القائمة
   - اختيار حالة مختلفة → يجب أن تتغير القيمة مع الدائرة الملونة

3. **اختبار الحفظ:**
   - النقر على "Save" → يجب أن تُحفظ التغييرات
   - إعادة تحميل الصفحة → يجب أن تظهر القيم المحفوظة

4. **اختبار Console:**
   - لا أخطاء جديدة
   - اختفاء تحذير ref warning

---

## ملاحظة فنية

هذا الحل يتبع نمط **z-index hierarchy** المُنشأ سابقاً:
- يحافظ على حماية الأزرار والـ tabs
- يضيف طبقة أعلى للـ Select dropdowns
- لا يؤثر على Dialog Overlays

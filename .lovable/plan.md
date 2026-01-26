

# خطة إصلاح مشكلة القائمة الجانبية (⋮) - الخيارات لا تعمل عند النقر

## تشخيص المشكلة

بعد فحص الكود، وجدت أن القائمة **تظهر بشكل صحيح** (كما في الصورة) لكن **الخيارات لا تعمل عند النقر عليها**.

### السبب المحتمل:
Radix UI `DropdownMenuItem` يستخدم `onSelect` كـ handler رئيسي بدلاً من `onClick`. بينما `onClick` قد يعمل أحياناً، لكنه قد يتعارض مع الـ internal event handling في Radix.

---

## الحل المقترح

### تغيير `onClick` إلى `onSelect` في جميع DropdownMenuItem

في ملف `src/components/project-details/ProjectBOQTab.tsx`:

| السطر | قبل | بعد |
|-------|-----|-----|
| 329 | `onClick={() => onQuickPrice(item.id)}` | `onSelect={() => onQuickPrice(item.id)}` |
| 336 | `onClick={() => onDetailedPrice(item)}` | `onSelect={() => onDetailedPrice(item)}` |
| 344 | `onClick={() => onEditItem(item)}` | `onSelect={() => onEditItem(item)}` |
| 351 | `onClick={() => onUnconfirmItem(item.id)}` | `onSelect={() => onUnconfirmItem(item.id)}` |
| 360 | `onClick={() => onDeleteItem(item.id)}` | `onSelect={() => onDeleteItem(item.id)}` |

### إضافة حماية إضافية في CSS

في `dialog-custom.css`، سنضيف:

```css
/* Additional protection for dropdown item interaction */
[data-radix-dropdown-menu-item]:hover {
  background-color: hsl(var(--accent));
  cursor: pointer !important;
}

[data-radix-dropdown-menu-content] * {
  pointer-events: auto !important;
}
```

### تحديث `cursor-default` إلى `cursor-pointer`

في `dropdown-menu.tsx` سطر 82:

```typescript
// قبل
"relative flex cursor-default select-none items-center..."

// بعد  
"relative flex cursor-pointer select-none items-center..."
```

---

## ملخص التغييرات

| الملف | السطر | التغيير |
|-------|-------|---------|
| `ProjectBOQTab.tsx` | 329, 336, 344, 351, 360 | تغيير `onClick` إلى `onSelect` |
| `dialog-custom.css` | جديد | إضافة حماية hover والـ content children |
| `dropdown-menu.tsx` | 82 | تغيير `cursor-default` إلى `cursor-pointer` |

---

## الاختبار المطلوب بعد التنفيذ

1. **النقر على زر النقاط الثلاث (⋮)** → القائمة تظهر ✓
2. **النقر على "Quick Price"** → يفتح dialog التسعير السريع
3. **النقر على "Detailed Price"** → يفتح dialog التسعير المفصل
4. **النقر على "Edit"** → يفتح dialog التعديل
5. **النقر على "Clear Price"** → يمسح السعر (للبنود المسعرة فقط)
6. **النقر على "Delete"** → يحذف البند


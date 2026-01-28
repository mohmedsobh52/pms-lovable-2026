

# خطة إصلاح صندوق البحث غير المستجيب

## المشكلة المكتشفة

صندوق البحث في الـ Header بالصفحة الرئيسية لا يستجيب للنقر. بناءً على تحليل الكود:

1. **صندوق البحث** (HomePage.tsx سطر 356-374) هو `div` بسيط يستدعي `setSearchOpen(true)` عند النقر
2. **مشكلة z-index**: رغم أن الـ Header لديه `z-50`، صندوق البحث نفسه لا يملك حماية `pointer-events` صريحة
3. **تداخل محتمل**: قد تتداخل طبقة `BackgroundImage` أو عناصر أخرى مع صندوق البحث

---

## الحل المقترح

### 1. ملف: `src/components/ui/dialog-custom.css`

إضافة CSS class لحماية صندوق البحث في الـ Header:

```css
/* ============================================
   HEADER SEARCH BOX PROTECTION
   Ensure header search box is always clickable
   ============================================ */

.header-search-box {
  position: relative;
  z-index: 55;
  pointer-events: auto !important;
  cursor: pointer !important;
}

.header-search-box * {
  pointer-events: auto !important;
}
```

### 2. ملف: `src/pages/HomePage.tsx`

تحديث div صندوق البحث (سطر 356):

**من:**
```tsx
<div 
  onClick={() => setSearchOpen(true)}
  className="flex-1 max-w-xl mx-4 cursor-pointer group hidden sm:block"
>
```

**إلى:**
```tsx
<div 
  onClick={() => setSearchOpen(true)}
  className="flex-1 max-w-xl mx-4 cursor-pointer group hidden sm:block header-search-box"
>
```

### 3. ملف: `src/components/UnifiedHeader.tsx`

تحديث زر البحث بإضافة حماية إضافية:

**من:** (سطر 179)
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setSearchOpen(true)}
  className="gap-1.5 h-9 px-2 sm:px-3"
  title={isArabic ? "بحث (⌘K)" : "Search (⌘K)"}
>
```

**إلى:**
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setSearchOpen(true)}
  className="gap-1.5 h-9 px-2 sm:px-3 relative z-[55] pointer-events-auto"
  title={isArabic ? "بحث (⌘K)" : "Search (⌘K)"}
>
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/ui/dialog-custom.css` | إضافة `.header-search-box` CSS class |
| `src/pages/HomePage.tsx` | إضافة class `header-search-box` لـ div البحث |
| `src/components/UnifiedHeader.tsx` | إضافة `z-[55] pointer-events-auto` لزر البحث |

---

## تسلسل z-index النهائي

| العنصر | z-index |
|--------|---------|
| Dialog Content | 100 |
| Dialog Overlay | 99 |
| Select/Dropdown Content | 70 |
| Form Actions Buttons | 65 |
| Form Actions Container | 60 |
| **Header Search Box** | **55** (جديد) |
| Navigation Tabs | 55 |
| Header | 50 |
| Input/Textarea | 45 |
| BackgroundImage | 10 |

---

## النتيجة المتوقعة

| العنصر | قبل | بعد |
|--------|-----|-----|
| صندوق البحث (HomePage) | ❌ لا يستجيب | ✅ يعمل |
| زر البحث (UnifiedHeader) | ❓ قد لا يعمل | ✅ يعمل |
| اختصار لوحة المفاتيح (⌘K) | ✅ يعمل | ✅ يعمل |
| فتح نافذة البحث | ❌ لا يفتح | ✅ يفتح |

---

## ملاحظات تقنية

1. **سبب اختيار z-index: 55**: 
   - أعلى من Header (50)
   - أعلى من Input/Textarea (45)
   - أقل من Form Actions (60)
   - لا يتعارض مع Dialog (99-100)

2. **pointer-events: auto !important**: يضمن أن النقر يصل للعنصر حتى مع وجود طبقات أخرى

3. **cursor: pointer !important**: يُحسن UX بإظهار مؤشر الإصبع عند التمرير




# معالجة خطأ "Failed to fetch dynamically imported module"

## المشكلة
عند إعادة بناء التطبيق، تتغير أسماء ملفات JavaScript المجزأة (chunks). إذا كان المتصفح يحتفظ بنسخة قديمة مخزنة مؤقتاً، يحاول تحميل ملف لم يعد موجوداً مما يسبب هذا الخطأ.

## الحل
إضافة دالة مساعدة `lazyWithRetry` في `src/App.tsx` تعيد محاولة تحميل الصفحة مع إعادة تحميل الصفحة تلقائياً عند فشل التحميل الديناميكي.

## التعديلات على `src/App.tsx`

### 1. إضافة دالة `lazyWithRetry`
```typescript
function lazyWithRetry(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().catch(() => {
      // Force reload on chunk load failure (stale cache)
      if (!sessionStorage.getItem('chunk_retry')) {
        sessionStorage.setItem('chunk_retry', '1');
        window.location.reload();
      }
      return importFn();
    })
  );
}
```

### 2. استبدال جميع استدعاءات `lazy()` بـ `lazyWithRetry()`
تحويل كل `const X = lazy(() => import(...))` إلى `const X = lazyWithRetry(() => import(...))`.

### 3. مسح علامة إعادة المحاولة عند التحميل الناجح
إضافة `sessionStorage.removeItem('chunk_retry')` في `App` component لمنع حلقة إعادة التحميل.

**ملف واحد يتأثر:** `src/App.tsx`


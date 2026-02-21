

# اصلاح مشكلة التبويبات غير العاملة في شاشة التحليل المتقدم

## المشكلة

التبويبات الجانبية (Items, WBS, Cost, Charts...) في شاشة التحليل المتقدم لا تستجيب للنقر. السبب هو أن حوارات Radix Dialog المغلقة (مثل MarketRateSuggestions و EnhancedPricingAnalysis) تترك طبقات overlay غير مرئية تحجب النقر على الأزرار.

التبويبات الجانبية هي أزرار HTML عادية (`<button>`) وليست Radix Tab triggers، لذلك لا تستفيد من قواعد CSS الموجودة التي تحمي `[role="tab"]`.

## الحل

### 1. إضافة حماية CSS للتبويبات الجانبية

اضافة قواعد CSS جديدة في `src/components/ui/dialog-custom.css` لحماية أزرار التنقل الجانبية:

```css
/* Sidebar navigation protection */
nav button,
nav a {
  position: relative;
  z-index: 56 !important;
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

### 2. إضافة class حماية على sidebar في AnalysisResults

في `src/components/AnalysisResults.tsx`، إضافة class `navigation-bar-safe` على عنصر الـ sidebar `<nav>` لضمان أن الأزرار محمية من الحجب.

### 3. استخدام Conditional Rendering للحوارات الثقيلة

تغيير MarketRateSuggestions و EnhancedPricingAnalysis لاستخدام conditional rendering بحيث لا يتم رندرة DialogContent إلا عند فتح الحوار فعلياً. هذا يمنع وجود overlay غير مرئي في DOM.

في `src/components/MarketRateSuggestions.tsx`:
- نقل `DialogContent` داخل شرط `{isOpen && <DialogContent>...</DialogContent>}`

في `src/components/EnhancedPricingAnalysis.tsx`:
- نفس التغيير

### 4. تعزيز قاعدة CSS لإخفاء overlay المغلق

في `src/components/ui/dialog-custom.css`، تعزيز القاعدة الحالية:

```css
/* Force remove closed dialog portals from interaction */
[data-radix-portal]:has([data-state="closed"]) {
  pointer-events: none !important;
  visibility: hidden !important;
}
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/ui/dialog-custom.css` | إضافة قواعد حماية جديدة |
| `src/components/AnalysisResults.tsx` | إضافة class حماية على nav |
| `src/components/MarketRateSuggestions.tsx` | conditional rendering للحوار |
| `src/components/EnhancedPricingAnalysis.tsx` | conditional rendering للحوار |


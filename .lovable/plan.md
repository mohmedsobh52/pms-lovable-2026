

# إصلاح أخطاء شاشة تحليل المخططات

## الأخطاء المكتشفة

### 1. خطأ قاتل: `Cannot access 'selPages' before initialization` (Runtime Error)
**السبب**: دالة `selPages` معرّفة بـ `useCallback` في السطر 1029، لكنها تُستخدم قبل ذلك في `useMemo` الخاص بـ `configSuggestions` (سطر 823):
```
if(pdfSess && selPages(pdfSess).length === 0) // ← سطر 823 — قبل التعريف!
```
هذا يسبب خطأ TDZ (Temporal Dead Zone) في JavaScript ويُسقط الصفحة بالكامل.

**الإصلاح**: نقل `selPages` useCallback إلى **قبل** `configSuggestions` useMemo (قبل سطر 758).

### 2. تحذير React: `Function components cannot be given refs`
**السبب**: مكون `SmartSuggestions` (سطر 572) و `PageTransition` يتلقيان refs بدون `React.forwardRef`.

**الإصلاح**: لف `SmartSuggestions` بـ `React.forwardRef` — أو الأبسط: التأكد من عدم تمرير ref إليه. بما أن التحذير من `PageLayout`، هذا ثانوي ولكن يُنظّف.

### 3. مشاكل محتملة في تسلسل الـ hooks
بعد نقل `selPages`، يجب التأكد من أن جميع المتغيرات التي يعتمد عليها (مثل `parseRange`) معرّفة قبله.

## الملف المتأثر

| الملف | التعديل |
|-------|---------|
| `src/pages/DrawingAnalysisPage.tsx` | نقل `selPages` + `pushMsg` + `suggestChunkSize` للأعلى قبل `configSuggestions`، إصلاح `SmartSuggestions` ref warning |

## التغييرات
1. نقل كتلة `selPages` useCallback (سطر 1027-1034) إلى ما بعد تعريفات الـ state مباشرة (بعد سطر 755)
2. نقل `pushMsg` معها لأنها بنفس المنطقة
3. لف `SmartSuggestions` بـ `React.memo` لإزالة تحذير الـ ref


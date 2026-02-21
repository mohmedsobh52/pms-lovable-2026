

# إظهار وصف البند كاملاً (عربي + إنجليزي) بدون قص

## المشكلة

في ملف `src/components/HistoricalItemsTable.tsx` سطر 192، خلية الوصف تستخدم `truncate` و `max-w-[300px]` مما يقص النص الطويل ويظهر "..." بدلاً من النص الكامل.

```
<span className="text-xs truncate max-w-[300px]">
```

## الحل

### الملف: `src/components/HistoricalItemsTable.tsx`

#### 1. إزالة القص من خلايا الوصف (سطر 192)

```text
// الحالي:
<span className={`text-xs truncate ${isDescription ? 'max-w-[300px]' : 'max-w-[120px]'}`}>

// الجديد:
<span className={`text-xs ${isDescription ? 'whitespace-pre-wrap break-words' : 'truncate max-w-[120px]'}`}>
```

هذا يجعل الوصف (العربي والإنجليزي) يظهر كاملاً مع التفاف تلقائي للنص، بينما تبقى الحقول الأخرى (الكمية، السعر...) مقصوصة كما هي.

#### 2. توسيع عرض أعمدة الوصف (سطر 269-270)

```text
// الحالي:
<TableHead className="text-xs whitespace-nowrap px-2 min-w-[200px]">Description</TableHead>
<TableHead className="text-xs whitespace-nowrap px-2 min-w-[200px]">وصف البند</TableHead>

// الجديد:
<TableHead className="text-xs whitespace-nowrap px-2 min-w-[280px]">Description</TableHead>
<TableHead className="text-xs whitespace-nowrap px-2 min-w-[280px]">وصف البند</TableHead>
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/HistoricalItemsTable.tsx` | إزالة truncate من الوصف + توسيع الأعمدة |


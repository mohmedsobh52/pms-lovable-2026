
# خطة تنفيذ الحفظ التلقائي وإظهار التسعير في التقارير

## نظرة عامة

### المتطلبات:
1. **الحفظ التلقائي عند أي تغيير في الجدول** - بحيث عند مسح صف لا يرجع ثانية
2. **ظهور التسعير (AI Rate × Qty) في التقرير عند الطباعة**

---

## التحليل الحالي

### المشكلة 1: الصفوف المحذوفة ترجع
| الوضع الحالي | المشكلة |
|------------|---------|
| `deletedItemNumbers` محفوظة في `useState` فقط | عند إعادة تحميل الصفحة تختفي البيانات |
| لا يوجد ربط مع `useAutoSave` | التغييرات لا تُحفظ تلقائياً |

### المشكلة 2: التسعير لا يظهر في التقرير
| الوضع الحالي | المشكلة |
|------------|---------|
| `PrintableReport` يستخدم `unit_price` و `total_price` الأصليين | لا يظهر AI Rate |
| لا يوجد prop لتمرير الأسعار المحسوبة | البيانات المحسوبة غير متاحة |

---

## الحل المقترح

### الجزء 1: حفظ الصفوف المحذوفة بشكل دائم

#### الملف: `src/components/AnalysisResults.tsx`

**1. حفظ `deletedItemNumbers` في localStorage:**

```typescript
// تحميل الصفوف المحذوفة من localStorage
const [deletedItemNumbers, setDeletedItemNumbers] = useState<Set<string>>(() => {
  const saved = localStorage.getItem('boq_deleted_items');
  return saved ? new Set(JSON.parse(saved)) : new Set();
});

// حفظ تلقائي عند أي تغيير
useEffect(() => {
  localStorage.setItem('boq_deleted_items', JSON.stringify([...deletedItemNumbers]));
}, [deletedItemNumbers]);
```

**2. تحديث دالة المسح للحفظ الفوري:**

```typescript
const handleDeleteZeroQtyRow = useCallback((itemNumber: string) => {
  // ... الكود الحالي ...
  
  // الحفظ الفوري
  const newDeletedItems = [...deletedItemNumbers, itemNumber];
  localStorage.setItem('boq_deleted_items', JSON.stringify(newDeletedItems));
}, [deletedItemNumbers, ...]);
```

---

### الجزء 2: إظهار التسعير في التقرير

#### الملف: `src/components/PrintableReport.tsx`

**1. توسيع interface لتشمل AI Rate:**

```typescript
interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
  ai_rate?: number;        // جديد: سعر AI
  calculated_total?: number; // جديد: الإجمالي المحسوب
}
```

**2. تحديث جدول BOQ في التقرير:**

```html
<!-- Header جديد -->
<th>${isArabic ? "سعر AI" : "AI Rate"}</th>
<th>${isArabic ? "الإجمالي" : "Total"}</th>

<!-- Body جديد -->
<td>${formatCurrency(item.ai_rate || item.unit_price || 0)}</td>
<td>${formatCurrency(item.calculated_total || item.total_price || 0)}</td>
```

#### الملف: `src/components/AnalysisResults.tsx`

**3. تمرير البيانات المحسوبة للتقرير:**

```typescript
<PrintableReport
  projectName={fileName || "المشروع"}
  boqItems={(data.items || []).map(item => {
    const calcCosts = getItemCalculatedCosts(item.item_number);
    return {
      ...item,
      ai_rate: calcCosts.aiSuggestedRate || item.unit_price || 0,
      calculated_total: (calcCosts.aiSuggestedRate || 0) * (item.quantity || 0)
    };
  })}
  // ... باقي الـ props ...
/>
```

---

## ملخص الملفات المتأثرة

| الملف | التغييرات |
|-------|----------|
| `src/components/AnalysisResults.tsx` | 1. حفظ `deletedItemNumbers` في localStorage<br>2. تمرير AI Rate للتقرير |
| `src/components/PrintableReport.tsx` | 1. توسيع interface<br>2. عرض AI Rate و Total في الجدول |

---

## تفاصيل التنفيذ

### ملف 1: `src/components/AnalysisResults.tsx`

#### التغيير 1 - تحميل الصفوف المحذوفة (السطر 216):

```typescript
// قبل
const [deletedItemNumbers, setDeletedItemNumbers] = useState<Set<string>>(new Set());

// بعد
const [deletedItemNumbers, setDeletedItemNumbers] = useState<Set<string>>(() => {
  try {
    const saved = localStorage.getItem('boq_deleted_items');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch {
    return new Set();
  }
});
```

#### التغيير 2 - حفظ تلقائي للصفوف المحذوفة (إضافة useEffect جديد):

```typescript
// حفظ الصفوف المحذوفة تلقائياً في localStorage
useEffect(() => {
  try {
    localStorage.setItem('boq_deleted_items', JSON.stringify([...deletedItemNumbers]));
  } catch (error) {
    console.error('Failed to save deleted items:', error);
  }
}, [deletedItemNumbers]);
```

#### التغيير 3 - تمرير البيانات للتقرير (السطر 1510-1525):

```typescript
<PrintableReport
  projectName={fileName || "المشروع"}
  boqItems={(data.items || [])
    .filter(item => !deletedItemNumbers.has(item.item_number))
    .map(item => {
      const calcCosts = getItemCalculatedCosts(item.item_number);
      const aiRate = calcCosts.aiSuggestedRate || 0;
      return {
        ...item,
        ai_rate: aiRate,
        calculated_total: aiRate * (item.quantity || 0)
      };
    })}
  timelineItems={...}
  currency={data.summary?.currency || "SAR"}
  companyName={companyInfo?.name}
  companyLogo={getStoredLogo() || undefined}
/>
```

### ملف 2: `src/components/PrintableReport.tsx`

#### التغيير 1 - توسيع Interface (السطر 16-24):

```typescript
interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
  ai_rate?: number;
  calculated_total?: number;
}
```

#### التغيير 2 - تحديث جدول BOQ (السطور 381-407):

```typescript
// Header الجديد
<tr>
  <th>#</th>
  <th>${isArabic ? "رقم البند" : "Item No."}</th>
  <th>${isArabic ? "الوصف" : "Description"}</th>
  <th>${isArabic ? "الوحدة" : "Unit"}</th>
  <th>${isArabic ? "الكمية" : "Qty"}</th>
  <th>${isArabic ? "سعر AI" : "AI Rate"}</th>
  <th>${isArabic ? "الإجمالي" : "Total"}</th>
</tr>

// Body الجديد
${boqItems.slice(0, 50).map((item, idx) => `
  <tr>
    <td>${idx + 1}</td>
    <td>${item.item_number}</td>
    <td>${item.description?.substring(0, 50) || ''}</td>
    <td>${item.unit || ''}</td>
    <td>${(item.quantity || 0).toLocaleString()}</td>
    <td>${formatCurrency(item.ai_rate || item.unit_price || 0)}</td>
    <td>${formatCurrency(item.calculated_total || item.total_price || 0)}</td>
  </tr>
`).join('')}
```

#### التغيير 3 - تحديث حساب الإجمالي (السطر 112):

```typescript
// قبل
const totalValue = boqItems.reduce((sum, item) => sum + (item.total_price || 0), 0);

// بعد
const totalValue = boqItems.reduce((sum, item) => 
  sum + (item.calculated_total || item.total_price || 0), 0);
```

---

## النتيجة المتوقعة

### الحفظ التلقائي:
| الحالة | قبل | بعد |
|--------|-----|-----|
| حذف صف | يرجع بعد إعادة التحميل | محذوف نهائياً ✓ |
| تغيير في الجدول | لا يُحفظ | يُحفظ تلقائياً ✓ |

### التقرير المطبوع:
| العمود | قبل | بعد |
|--------|-----|-----|
| Unit Price | السعر الأصلي | AI Rate ✓ |
| Total | الإجمالي الأصلي | Qty × AI Rate ✓ |

### مثال من التقرير:

| # | رقم البند | الوصف | الوحدة | الكمية | سعر AI | الإجمالي |
|---|----------|-------|--------|--------|--------|----------|
| 1 | 1 | أعمال الحفر | م³ | 279,250 | 62.00 | 17,313,500 |
| 2 | 2 | الردم | م³ | 70,000 | 47.00 | 3,290,000 |
| 3 | 3 | الخرسانة | م³ | 350,000 | 25.00 | 8,750,000 |

---

## اختبارات التحقق

| الاختبار | النتيجة المتوقعة |
|---------|----------------|
| حذف صف ثم إعادة تحميل الصفحة | الصف يظل محذوفاً |
| استعادة صف ثم إعادة التحميل | الصف يظل مستعاداً |
| طباعة التقرير | يظهر AI Rate والإجمالي الصحيح |
| فتح التقرير بدون AI rates | يعرض الأسعار الأصلية كـ fallback |

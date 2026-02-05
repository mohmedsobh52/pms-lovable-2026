

# خطة إزالة عمود AI Rate وتثبيت هيدر الجدول في التقارير

## المشكلة

1. **عمود AI Rate موجود في التقارير** - المستخدم يريد إزالته
2. **هيدر الجدول لا يتكرر في كل صفحة** - يجب تثبيته عند الطباعة

## التحليل الفني

### المواقع التي تحتاج تعديل في `ExportTab.tsx`:

#### 1. دالة `handlePrintReport` (سطر 681-895)
تحتوي على عمود AI Rate:
```typescript
// سطر 847
<th>${isArabic ? "سعر AI" : "AI Rate"}</th>

// سطر 865
<td class="ai-price">${aiRate > 0 ? aiRate.toLocaleString(...) : '-'}</td>
```

#### 2. CSS للطباعة
الكود الحالي يحاول تكرار الهيدر لكن ينقصه بعض الخصائص:
```css
thead {
  display: table-header-group;
}
```

## الحل المقترح

### 1. إزالة عمود AI Rate

**قبل:**
| # | Description | Qty | Unit | Unit Price | AI Rate | Total |
|---|-------------|-----|------|------------|---------|-------|

**بعد:**
| # | Description | Qty | Unit | Unit Price | Total |
|---|-------------|-----|------|------------|-------|

### 2. تحسين CSS لتكرار هيدر الجدول

إضافة خصائص CSS متقدمة لضمان تكرار الهيدر:
```css
@media print {
  thead {
    display: table-header-group !important;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
  }
  
  tr {
    page-break-inside: avoid;
  }
  
  /* تأكيد تكرار الهيدر */
  thead tr {
    break-inside: avoid;
    break-after: auto;
  }
  
  @page {
    margin: 15mm 10mm;
  }
}
```

## التغييرات المطلوبة

### ملف: `src/components/reports/ExportTab.tsx`

#### التغيير 1: إزالة عمود AI Rate من `handlePrintReport`

```typescript
// إزالة من thead (سطر ~847)
<th>${isArabic ? "سعر AI" : "AI Rate"}</th>  // ← حذف

// إزالة من tbody (سطر ~865)
<td class="ai-price">${aiRate > 0 ? ... : '-'}</td>  // ← حذف

// تحديث colspan في صف الإجمالي (سطر ~871)
<td colspan="6">  // ← تغيير إلى colspan="5"
```

#### التغيير 2: تحسين CSS للطباعة

```css
/* تكرار هيدر الجدول في كل صفحة */
@media print {
  thead {
    display: table-header-group !important;
    break-inside: avoid;
  }
  
  tbody {
    display: table-row-group;
  }
  
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  
  table {
    border-collapse: collapse;
    page-break-inside: auto;
  }
  
  th {
    background: #3b82f6 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color: white !important;
  }
}
```

#### التغيير 3: إزالة CSS والمتغيرات المتعلقة بـ AI Rate

```typescript
// إزالة class
.ai-price { color: #7c3aed; font-weight: 600; }  // ← حذف
.auto-priced { background: #f5f3ff; }  // ← حذف

// إزالة المتغيرات
const hasAIPrice = ...  // ← حذف
const aiRate = ...  // ← يمكن الاحتفاظ به للحساب الداخلي فقط
```

#### التغيير 4: تحديث ملاحظة أسفل التقرير

```typescript
// إزالة ذكر AI من الملاحظة
${isArabic 
  ? "تم استثناء البنود ذات الكمية صفر من هذا التقرير."
  : "Items with zero quantity are excluded from this report."}
```

## الدوال الأخرى التي قد تحتاج تعديل

### `handleViewPriceAnalysis` (سطر 332-489)
- هذه الدالة لا تحتوي على عمود AI Rate منفصل ✓

### `handleExportComprehensivePDF` (سطر 491-679)
- هذه الدالة لا تحتوي على عمود AI Rate منفصل ✓

## مخطط التغييرات

```text
handlePrintReport()
│
├── thead
│   ├── # ✓
│   ├── Description ✓
│   ├── Qty ✓
│   ├── Unit ✓
│   ├── Unit Price ✓
│   ├── AI Rate ← حذف
│   └── Total ✓
│
├── tbody rows
│   ├── ... (بدون عمود AI Rate)
│   └── Total row: colspan 6→5
│
├── CSS
│   ├── .ai-price ← حذف
│   ├── .auto-priced ← حذف
│   └── @media print { thead: table-header-group !important }
│
└── Note ← تحديث النص
```

## ملاحظات للاختبار

1. ✅ فتح تقرير Print والتأكد من عدم وجود عمود AI Rate
2. ✅ طباعة تقرير متعدد الصفحات والتأكد من تكرار الهيدر
3. ✅ التأكد من أن الأسعار تظهر في عمود Unit Price
4. ✅ التأكد من صحة حساب Total


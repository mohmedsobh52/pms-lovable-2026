
# خطة نقل تتبع دقة التسعير إلى التبويب الرئيسي للتسعير

## نظرة عامة

نقل محتوى صفحة `PricingAccuracyPage` (تتبع دقة التسعير) إلى تبويب جديد داخل صفحة التسعير الرئيسية `TenderSummaryPage` بدلاً من وجودها كصفحة منفصلة.

---

## الوضع الحالي

```text
/projects/:projectId/pricing  →  TenderSummaryPage.tsx
├── Summary (ملخص العطاء)
├── Staff (طاقم الموقع)
├── Facilities (المرافق)
├── Insurance (التأمين)
├── Guarantees (الضمانات)
├── Indirect Costs (التكاليف غير المباشرة)
├── Subcontractors (مقاولو الباطن)
└── Settings (الإعدادات)

/pricing-accuracy  →  PricingAccuracyPage.tsx (صفحة منفصلة)
├── Price Comparison
├── Import Reference
└── PDF Report
```

---

## الهيكل الجديد

```text
/projects/:projectId/pricing  →  TenderSummaryPage.tsx
├── Summary (ملخص العطاء)
├── Staff (طاقم الموقع)
├── Facilities (المرافق)
├── Insurance (التأمين)
├── Guarantees (الضمانات)
├── Indirect Costs (التكاليف غير المباشرة)
├── Subcontractors (مقاولو الباطن)
├── Accuracy (دقة التسعير)  ← تبويب جديد
│   ├── Price Comparison (مقارنة الأسعار)
│   ├── Import Reference (استيراد المرجعية)
│   └── PDF Report (تقرير PDF)
└── Settings (الإعدادات)
```

---

## التعديلات المطلوبة

### 1. إنشاء مكون PricingAccuracyTab

**الملف الجديد:** `src/components/tender/PricingAccuracyTab.tsx`

مكون يجمع كل محتوى تتبع دقة التسعير:

```typescript
// استيراد المكونات الموجودة
import PriceComparisonTracker from '@/components/PriceComparisonTracker';
import ReferencePriceImporter from '@/components/ReferencePriceImporter';
import PricingAccuracyPDFReport from '@/components/PricingAccuracyPDFReport';

export function PricingAccuracyTab({ isArabic }: { isArabic: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState('comparison');
  
  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
      <TabsList>
        <TabsTrigger value="comparison">مقارنة الأسعار</TabsTrigger>
        <TabsTrigger value="import">استيراد المرجعية</TabsTrigger>
        <TabsTrigger value="report">تقرير PDF</TabsTrigger>
      </TabsList>
      
      <TabsContent value="comparison">
        <PriceComparisonTracker />
      </TabsContent>
      {/* ... */}
    </Tabs>
  );
}
```

---

### 2. تعديل TenderSummaryPage.tsx

إضافة التبويب الجديد:

```typescript
// إضافة في الـ imports
import { PricingAccuracyTab } from "@/components/tender/PricingAccuracyTab";
import { Target } from "lucide-react";

// إضافة في مصفوفة tabs (سطر 509)
const tabs = [
  { id: "summary", labelAr: "ملخص العطاء", labelEn: "Tender Summary", icon: FileText },
  { id: "staff", labelAr: "طاقم الموقع", labelEn: "Site Staff", icon: Users },
  { id: "facilities", labelAr: "المرافق", labelEn: "Facilities", icon: Building2 },
  { id: "insurance", labelAr: "التأمين", labelEn: "Insurance", icon: Shield },
  { id: "guarantees", labelAr: "الضمانات", labelEn: "Guarantees", icon: FileCheck },
  { id: "indirect", labelAr: "التكاليف غير المباشرة", labelEn: "Indirect Costs", icon: Calculator },
  { id: "subcontractors", labelAr: "مقاولو الباطن", labelEn: "Subcontractors", icon: HardHat },
  { id: "accuracy", labelAr: "دقة التسعير", labelEn: "Accuracy", icon: Target }, // جديد
  { id: "settings", labelAr: "الإعدادات", labelEn: "Settings", icon: Settings },
];

// إضافة TabsContent للتبويب الجديد
<TabsContent value="accuracy">
  <PricingAccuracyTab isArabic={isArabic} />
</TabsContent>
```

---

### 3. تحديث التوجيه (اختياري)

حذف أو إعادة توجيه المسار القديم `/pricing-accuracy`:

```typescript
// في App.tsx - إما حذف أو إعادة توجيه
// الخيار 1: حذف المسار تماماً
// حذف: <Route path="/pricing-accuracy" element={<PricingAccuracyPage />} />

// الخيار 2: إعادة توجيه (للتوافق مع الروابط القديمة)
<Route path="/pricing-accuracy" element={<Navigate to="/projects" replace />} />
```

---

### 4. تحديث البحث الشامل

تعديل `useGlobalSearch.tsx` لتحديث رابط "Pricing Accuracy":

```typescript
// تغيير الرابط من صفحة منفصلة إلى تبويب
{
  id: 'pricing-accuracy',
  type: 'page',
  label: 'Pricing Accuracy',
  labelAr: 'دقة التسعير',
  icon: 'Target',
  // إما حذفه أو توجيهه للمشاريع
  href: '/projects', 
  keywords: ['accuracy', 'pricing', 'دقة', 'تسعير']
}
```

---

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `src/components/tender/PricingAccuracyTab.tsx` | **جديد** - مكون التبويب الداخلي |
| `src/pages/TenderSummaryPage.tsx` | إضافة تبويب "Accuracy" |
| `src/App.tsx` | حذف أو إعادة توجيه `/pricing-accuracy` |
| `src/hooks/useGlobalSearch.tsx` | تحديث رابط البحث |

---

## النتيجة المتوقعة

```text
✅ تبويب "دقة التسعير" داخل صفحة التسعير الرئيسية
✅ تبويبات فرعية للمقارنة والاستيراد والتقرير
✅ وصول سهل من نفس واجهة التسعير
✅ حذف/إعادة توجيه المسار المنفصل القديم
✅ تحديث البحث الشامل
```

---

## القسم التقني

### هيكل المكون الجديد

```typescript
// src/components/tender/PricingAccuracyTab.tsx

interface PricingAccuracyTabProps {
  isArabic: boolean;
  projectId?: string; // للربط مع المشروع الحالي
}

export function PricingAccuracyTab({ isArabic, projectId }: PricingAccuracyTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('comparison');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Target className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">
            {isArabic ? 'تتبع دقة التسعير' : 'Pricing Accuracy Tracking'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isArabic 
              ? 'تتبع ومقارنة الأسعار المقترحة مع الأسعار النهائية'
              : 'Track and compare suggested vs final prices'}
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="comparison" className="gap-2">
            <GitCompare className="h-4 w-4" />
            {isArabic ? 'مقارنة الأسعار' : 'Price Comparison'}
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            {isArabic ? 'استيراد المرجعية' : 'Import Reference'}
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <FileText className="h-4 w-4" />
            {isArabic ? 'تقرير PDF' : 'PDF Report'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-6">
          <PriceComparisonTracker projectId={projectId} />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <ReferencePriceImporter />
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <PricingAccuracyPDFReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### تعديل TenderSummaryPage

```typescript
// سطر 509 - إضافة التبويب الجديد
const tabs = [
  // ... التبويبات الموجودة
  { id: "accuracy", labelAr: "دقة التسعير", labelEn: "Accuracy", icon: Target },
  { id: "settings", labelAr: "الإعدادات", labelEn: "Settings", icon: Settings },
];

// إضافة TabsContent بعد subcontractors (حوالي سطر 990+)
<TabsContent value="accuracy">
  <PricingAccuracyTab isArabic={isArabic} projectId={projectId} />
</TabsContent>
```

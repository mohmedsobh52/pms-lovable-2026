
# خطة إضافة ميزات تتبع دقة التسعير

## نظرة عامة

إضافة ثلاث ميزات جديدة لتتبع وتحسين دقة التسعير:
1. شاشة مقارنة الأسعار المقترحة vs النهائية
2. استيراد الأسعار المرجعية من Excel
3. تقرير PDF لإحصائيات دقة التسعير

---

## الميزة 1: شاشة مقارنة الأسعار

### الملف الجديد: `src/components/PriceComparisonTracker.tsx`

#### الوظائف:
- جلب البيانات من `pricing_history` مع `suggested_price` و `final_price`
- حساب نسبة الانحراف لكل بند
- عرض جدول مقارنة مع:
  - رقم البند، الوصف
  - السعر المقترح، السعر النهائي المعتمد
  - الفرق (%)، المصدر، الثقة
- رسم بياني خطي لتتبع الدقة عبر الزمن
- فلترة حسب المشروع/الفترة الزمنية

```typescript
interface PriceComparison {
  id: string;
  item_number: string;
  description: string;
  suggested_price: number;
  final_price: number | null;
  deviation_percent: number;
  source: string;
  confidence: string;
  created_at: string;
  is_approved: boolean;
}
```

#### المكونات الفرعية:
- جدول المقارنة مع Sorting و Pagination
- رسم بياني (Line Chart) للدقة عبر الوقت
- بطاقات KPI: متوسط الانحراف، أعلى/أقل انحراف
- فلتر حسب: المصدر، الثقة، الفترة

---

## الميزة 2: استيراد الأسعار المرجعية من Excel

### الملف الجديد: `src/components/ReferencepriceImporter.tsx`

#### الوظائف:
- رفع ملف Excel بتنسيق محدد
- معاينة البيانات قبل الاستيراد
- تحديث جدول `reference_prices` (جديد) أو `pricing_history`
- التحقق من صحة البيانات

#### تنسيق Excel المطلوب:
| Category | Item | Unit | Min Price | Max Price | Keywords |
|----------|------|------|-----------|-----------|----------|
| CIVIL | Excavation | M3 | 25 | 45 | حفر,excavation |

#### خطوات العمل:
1. رفع الملف باستخدام `readExcelFile`
2. تحويل البيانات باستخدام `worksheetToJson`
3. عرض معاينة للتحقق
4. حفظ في قاعدة البيانات (جدول جديد `reference_prices`)

---

## الميزة 3: تقرير PDF لإحصائيات الدقة

### الملف الجديد: `src/components/PricingAccuracyPDFReport.tsx`

#### المحتويات:
1. **الغلاف**: عنوان، تاريخ، شعار الشركة
2. **ملخص تنفيذي**: KPIs الرئيسية
3. **توزيع المصادر**: Pie Chart (Library/Reference/AI)
4. **مستويات الثقة**: Bar Chart (High/Medium/Low)
5. **تحليل الدقة**: مقارنة الأسعار المقترحة vs النهائية
6. **جدول تفصيلي**: أعلى 20 بند انحرافاً

#### باستخدام jsPDF:
```typescript
const generatePDFReport = async (stats: PricingStats) => {
  const doc = new jsPDF();
  
  // Header with logo
  doc.addImage(companyLogo, 'PNG', 15, 10, 30, 15);
  doc.setFontSize(20);
  doc.text('تقرير دقة التسعير', 105, 35, { align: 'center' });
  
  // KPI Summary
  doc.autoTable({
    head: [['المؤشر', 'القيمة']],
    body: [
      ['الدقة المتوقعة', `${stats.estimatedAccuracy}%`],
      ['إجمالي البنود', stats.total],
      ['البنود المعتمدة', stats.approved],
    ],
  });
  
  // Charts as images
  const sourceChartImage = await chartToImage(sourceChartRef);
  doc.addImage(sourceChartImage, 'PNG', 15, 80, 80, 60);
  
  doc.save('Pricing_Accuracy_Report.pdf');
};
```

---

## قاعدة البيانات

### جدول جديد: `reference_prices`
```sql
CREATE TABLE reference_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_name_ar TEXT,
  unit TEXT,
  min_price NUMERIC,
  max_price NUMERIC,
  keywords TEXT[],
  location TEXT,
  year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ملخص الملفات

| الملف | الوصف |
|-------|-------|
| `src/components/PriceComparisonTracker.tsx` | شاشة مقارنة الأسعار |
| `src/components/ReferencePriceImporter.tsx` | استيراد Excel |
| `src/components/PricingAccuracyPDFReport.tsx` | تقرير PDF |
| `src/pages/PricingAccuracyPage.tsx` | صفحة جديدة تجمع الميزات |
| Migration: `reference_prices` table | جدول الأسعار المرجعية |

---

## النتيجة المتوقعة

```
✅ مقارنة مرئية بين الأسعار المقترحة والنهائية
✅ رسوم بيانية لتتبع الدقة عبر الوقت
✅ استيراد أسعار مرجعية من Excel
✅ تقرير PDF احترافي مع رسوم بيانية
✅ دعم ثنائي اللغة (AR/EN)
✅ ربط مع pricing_history الحالي
```

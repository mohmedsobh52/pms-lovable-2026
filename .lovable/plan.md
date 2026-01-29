
# تحسين تحليل المخططات لاستخراج كميات الحفر والردم والمواسير بالتفصيل

## المشكلة الحالية

التحليل الحالي يستخرج كميات عامة مثل "Water Profiles" و "Water Network" لكنه لا يُفصّل:
- **كميات الحفر** بأنواعها (حفر عادي، حفر صخري، إلخ)
- **كميات الردم** بأنواعها (ردم عادي، ردم محسن، إلخ)
- **أنواع المواسير** وقطر كل نوع وكميته (PVC 6"، HDPE 4"، إلخ)

## الحل المقترح

### 1. إضافة نوع مخطط جديد "أعمال شبكات" (Infrastructure/Networks)

إضافة خيار متخصص في أنواع المخططات يركز على أعمال البنية التحتية والشبكات.

### 2. تحسين الـ System Prompt للاستخراج التفصيلي

تعديل الـ Edge Function لتتضمن prompt متخصص يطلب:
- تفصيل أعمال الحفر حسب العمق والنوع
- تفصيل أعمال الردم حسب طبقات التأسيس
- جدول أنواع المواسير مع القطر والطول

### 3. إضافة تصنيفات (Categories) متخصصة

```text
Excavation Categories:
- Trench Excavation (حفر خنادق)
- Rock Excavation (حفر صخري)
- Normal Soil Excavation (حفر تربة عادية)

Backfilling Categories:
- Sand Bedding (فرشة رملية)
- Selected Backfill (ردم محسن)
- Normal Backfill (ردم عادي)

Pipe Categories:
- uPVC Pipes (by diameter)
- HDPE Pipes (by diameter)
- GRP Pipes (by diameter)
- Steel Pipes (by diameter)
- Fittings & Accessories
```

## التغييرات التقنية

### الملف 1: `src/components/FastExtractionDrawingAnalyzer.tsx`

**إضافة نوع مخطط جديد:**
```typescript
const drawingTypes = [
  // ... existing types
  { id: "infrastructure", labelEn: "Infrastructure/Networks", labelAr: "شبكات وبنية تحتية" },
];
```

### الملف 2: `supabase/functions/analyze-drawings/index.ts`

**إضافة Prompt متخصص لأعمال الشبكات:**

```typescript
const infrastructurePromptArabic = `أنت خبير حصر كميات متخصص في أعمال شبكات المياه والصرف والبنية التحتية.

المطلوب استخراجه بالتفصيل:

### 1. أعمال الحفر (Excavation):
- حفر الخنادق: الطول × العرض × العمق = الحجم (م³)
- حفر غرف التفتيش: العدد والأبعاد
- التفريق بين: حفر عادي / حفر صخري / حفر في مياه جوفية

### 2. أعمال الردم (Backfilling):
- فرشة رملية تحت المواسير (سمك 10-15 سم)
- ردم جوانب المواسير (رمل أو تربة محسنة)
- ردم نهائي فوق المواسير (تربة عادية)
- حساب كل طبقة بشكل منفصل

### 3. المواسير (Pipes):
لكل نوع من المواسير أذكر:
| النوع | القطر | الطول (م.ط) | العدد/الكمية |
مثال: 
- uPVC 6" (150mm) - 245 م.ط
- HDPE 4" (100mm) - 180 م.ط

### 4. القطع والتركيبات (Fittings):
- المحابس (Valves) - العدد لكل قطر
- الكيعان (Elbows) - العدد لكل قطر  
- النقاط T و Y
- وصلات الفلنج

### 5. غرف التفتيش (Manholes):
- عدد الغرف
- الأبعاد والعمق لكل غرفة

أعد النتائج بتنسيق JSON مع category واضح لكل بند.`;
```

**تحديث JSON Schema المتوقع:**

```json
{
  "quantities": [
    {
      "item_number": "1",
      "category": "Excavation",
      "subcategory": "Trench Excavation",
      "description": "حفر خنادق لمواسير المياه عمق 1.5م",
      "quantity": 850,
      "unit": "m³",
      "measurement_basis": "Length 450m × Width 1.2m × Depth 1.5m",
      "pipe_diameter": null,
      "pipe_material": null
    },
    {
      "item_number": "2", 
      "category": "Pipes",
      "subcategory": "uPVC Water Pipes",
      "description": "مواسير uPVC قطر 6 بوصة (150مم)",
      "quantity": 450,
      "unit": "m",
      "pipe_diameter": "150mm / 6 inch",
      "pipe_material": "uPVC"
    },
    {
      "item_number": "3",
      "category": "Backfilling",
      "subcategory": "Sand Bedding",
      "description": "فرشة رملية تحت المواسير سمك 10سم",
      "quantity": 54,
      "unit": "m³"
    }
  ]
}
```

### الملف 3: تحسين عرض النتائج

إضافة تجميع حسب الفئة (Grouping by Category) لتسهيل القراءة:

```text
┌─────────────────────────────────────┐
│ 📊 Excavation Works (أعمال الحفر)  │
├─────────────────────────────────────┤
│ 1. Trench Excavation    850 m³      │
│ 2. Rock Excavation      120 m³      │
│                   Total: 970 m³     │
├─────────────────────────────────────┤
│ 🔧 Pipes (المواسير)                 │
├─────────────────────────────────────┤
│ uPVC 6" (150mm)         450 m       │
│ uPVC 4" (100mm)         280 m       │
│ HDPE 8" (200mm)         150 m       │
├─────────────────────────────────────┤
│ 🏗️ Backfilling (الردم)             │
├─────────────────────────────────────┤
│ Sand Bedding            54 m³       │
│ Selected Fill           180 m³      │
│ Normal Backfill         650 m³      │
└─────────────────────────────────────┘
```

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `FastExtractionDrawingAnalyzer.tsx` | إضافة نوع "شبكات وبنية تحتية" + تحسين عرض النتائج بتجميع الفئات |
| `analyze-drawings/index.ts` | إضافة prompt متخصص للحفر/الردم/المواسير + تحديث JSON Schema |

## النتيجة المتوقعة

بعد التحديث، عند تحليل ملف "المخططات.pdf" مع اختيار نوع "شبكات وبنية تحتية":

```text
✅ استخراج كميات الحفر منفصلة عن بعضها
✅ استخراج كميات الردم بطبقاتها المختلفة
✅ جدول تفصيلي بأنواع المواسير وأقطارها وأطوالها
✅ حساب كميات القطع والتركيبات (Fittings)
✅ عرض النتائج مجمعة حسب الفئة
```

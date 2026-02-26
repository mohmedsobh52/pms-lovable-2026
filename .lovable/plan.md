

# إضافة حذف البيانات التجريبية وتصدير المكتبة الشامل

## 1. حذف جميع البيانات التجريبية دفعة واحدة

### الملف: `src/hooks/useSampleLibraryData.tsx`
- إضافة دالة `deleteAllSampleData()` تحذف من الجداول الثلاثة:
  - `material_prices` حيث `source = 'sample_data'` أو `source = 'water_sewage_data'`
  - `labor_rates` للمستخدم الحالي
  - `equipment_rates` للمستخدم الحالي
- إضافة دالة `deleteNetworkDataOnly()` تحذف بيانات الشبكات فقط (source = 'water_sewage_data' للمواد)
- إرجاع الدوال الجديدة من الـ hook

### الملف: `src/components/LibraryDatabase.tsx`
- إضافة زر "حذف جميع البيانات" بأيقونة `Trash2` يظهر فقط عند وجود بيانات (`!showEmptyState`)
- حوار تأكيد `AlertDialog` يوضح عدد العناصر التي ستُحذف من كل فئة
- تعطيل الزر أثناء عملية الحذف مع عرض أيقونة تحميل

---

## 2. تصدير بيانات المكتبة كاملة إلى Excel

### الملف: `src/components/LibraryDatabase.tsx`
- إضافة زر "تصدير المكتبة" بأيقونة `Download`
- عند الضغط: إنشاء ملف Excel واحد يحتوي على 3 أوراق:
  - **المواد (Materials)**: جميع بيانات `materials` مع الأعمدة: الاسم، الاسم العربي، الفئة، الوحدة، السعر، المورد، العلامة التجارية، تاريخ السعر، صالح حتى
  - **العمالة (Labor)**: جميع بيانات `laborRates` مع الأعمدة: الكود، الاسم، الاسم العربي، الفئة، المعدل اليومي، المعدل بالساعة، مستوى المهارة
  - **المعدات (Equipment)**: جميع بيانات `equipmentRates` مع الأعمدة: الكود، الاسم، الاسم العربي، الفئة، معدل الإيجار، يشمل مشغل، يشمل وقود
- استخدام `exceljs` (الموجود بالفعل) مع تنسيق RTL للأعمدة العربية
- إضافة صف ملخص في نهاية كل ورقة
- تنزيل الملف بتسمية `Library_Export_[التاريخ].xlsx`

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/hooks/useSampleLibraryData.tsx` | إضافة `deleteAllSampleData` و `deleteNetworkDataOnly` |
| `src/components/LibraryDatabase.tsx` | إضافة زر حذف + زر تصدير Excel شامل |

### هيكل الأزرار الجديدة (في شريط الأزرار العلوي)

```text
[حذف جميع البيانات] [تصدير المكتبة] [إضافة مواد الشبكات] [عمالة ومعدات] [إضافة الكل]
```

### بنية ملف Excel المُصدَّر

```text
Library_Export_2026-02-26.xlsx
  |-- Sheet 1: Materials (الأعمدة مع تنسيق RTL)
  |-- Sheet 2: Labor
  |-- Sheet 3: Equipment
```


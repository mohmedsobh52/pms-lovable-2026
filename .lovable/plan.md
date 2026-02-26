
# تحسين المكتبة: تعديل مباشر من الجدول + تصدير Excel

## الملخص
إضافة خاصية التعديل المباشر (inline editing) للأسعار والأسماء في جداول المكتبة الثلاثة، مع زر تصدير Excel شامل لكل تبويب.

---

## 1. التعديل المباشر من الجدول (Inline Editing)

### الآلية
عند الضغط على زر التعديل (Edit) في أي صف، يتحول الصف إلى وضع التعديل حيث تظهر حقول إدخال بدلاً من النصوص الثابتة. يمكن للمستخدم تعديل الحقول ثم الحفظ أو الإلغاء.

### الحقول القابلة للتعديل في كل تبويب

**المواد (MaterialsTab):**
- الاسم (name)
- سعر الوحدة (unit_price)
- الوحدة (unit)
- العلامة التجارية (brand)

**العمالة (LaborTab):**
- الاسم (name)
- سعر اليوم (unit_rate)
- مستوى المهارة (skill_level)

**المعدات (EquipmentTab):**
- الاسم (name)
- سعر اليوم (rental_rate)

### التصميم
- State: `editingId` لتتبع الصف قيد التعديل، و `editData` لتخزين القيم المؤقتة
- عند الضغط على Edit: يتم تعيين `editingId` وتعبئة `editData` بالقيم الحالية
- حقول الإدخال تظهر بحجم مصغر (`h-8`) داخل خلايا الجدول
- أزرار Save (Check) و Cancel (X) تحل محل أزرار Edit/Delete
- Enter للحفظ، Escape للإلغاء
- عند الحفظ يتم استدعاء `updateMaterial` / `updateLaborRate` / `updateEquipmentRate`

---

## 2. تصدير بيانات المكتبة إلى Excel

### الآلية
إضافة زر "تصدير" بجانب زر "استيراد" في كل تبويب. عند الضغط عليه يتم إنشاء ملف Excel باستخدام `exceljs` يحتوي على جميع البيانات المفلترة حالياً.

### محتوى ملف Excel لكل تبويب

**المواد:**
الكود | الاسم | الاسم العربي | التصنيف | الوحدة | سعر الوحدة | العملة | العلامة التجارية | المورد | المواصفات

**العمالة:**
الكود | المسمى | الاسم العربي | التصنيف | مستوى المهارة | الوحدة | سعر اليوم | سعر الساعة | العملة

**المعدات:**
الكود | الاسم | الاسم العربي | التصنيف | سعر اليوم | سعر الساعة | سعر الشهر | العملة | يشمل المشغل | يشمل الوقود

### التنسيق
- رأس الجدول بخلفية ملونة وخط عريض
- عمود الاسم العربي بتنسيق RTL
- تنسيق العملة للأعمدة الرقمية
- اسم الملف: `Library_Materials_YYYY-MM-DD.xlsx`

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/library/MaterialsTab.tsx` | inline editing + export Excel |
| `src/components/library/LaborTab.tsx` | inline editing + export Excel |
| `src/components/library/EquipmentTab.tsx` | inline editing + export Excel |

### نمط التعديل المباشر

```typescript
// State للتعديل
const [editingId, setEditingId] = useState<string | null>(null);
const [editData, setEditData] = useState<Record<string, any>>({});

// بدء التعديل
const startEdit = (item: MaterialPrice) => {
  setEditingId(item.id);
  setEditData({ name: item.name, unit_price: item.unit_price, unit: item.unit, brand: item.brand });
};

// حفظ التعديل
const saveEdit = async () => {
  if (!editingId) return;
  await updateMaterial(editingId, editData);
  setEditingId(null);
};

// في الجدول - خلية السعر
<TableCell>
  {editingId === item.id ? (
    <Input type="number" className="h-8 w-24" value={editData.unit_price}
      onChange={(e) => setEditData(prev => ({...prev, unit_price: parseFloat(e.target.value)}))}
      onKeyDown={(e) => e.key === 'Enter' ? saveEdit() : e.key === 'Escape' ? cancelEdit() : null}
    />
  ) : (
    <span>{item.unit_price.toLocaleString()}</span>
  )}
</TableCell>
```

### نمط تصدير Excel

```typescript
const exportToExcel = async () => {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Materials');
  
  // Headers
  sheet.addRow(['Code','Name','Name (AR)','Category','Unit','Unit Price','Currency','Brand']);
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2744' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Data rows
  filteredMaterials.forEach(m => {
    sheet.addRow([`M${...}`, m.name, m.name_ar, getCategoryLabel(m.category), m.unit, m.unit_price, m.currency, m.brand]);
  });
  
  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Library_Materials_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
};
```

### تعديل زر Edit الحالي

حالياً الزر موجود لكنه لا يفعل شيئاً. سيتم ربطه بدالة `startEdit`:

```typescript
// قبل (لا يعمل)
<Button variant="ghost" size="icon"><Edit2 /></Button>

// بعد (يعمل)
<Button variant="ghost" size="icon" onClick={() => startEdit(material)}>
  <Edit2 />
</Button>

// في وضع التعديل - أزرار حفظ وإلغاء
{editingId === material.id && (
  <>
    <Button size="icon" onClick={saveEdit}><Check /></Button>
    <Button size="icon" onClick={cancelEdit}><X /></Button>
  </>
)}
```

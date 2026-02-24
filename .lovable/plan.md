
# إضافة زر رفع BOQ وتحميل البنود تلقائياً في تبويب جدول الكميات

## المشكلة

عند فتح مشروع في تبويب "BOQ"، يظهر جدول فارغ بدون أي بنود وبدون طريقة واضحة لرفع ملف BOQ. المستخدم يحتاج للذهاب لتبويب "Analysis" لرفع الملفات، وهذا غير بديهي.

بالإضافة لذلك، عند فتح مشروع محفوظ يحتوي على بنود في `analysis_data` ولكن ليس في `project_items`، لا يتم عرض البنود.

## التعديلات المطلوبة

### 1. إضافة حالة "لا توجد بنود" مع زر رفع في ProjectBOQTab

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

عندما يكون عدد البنود = 0، بدلاً من عرض جدول فارغ مع "No items found"، يتم عرض واجهة تحفيزية تتضمن:
- أيقونة وعنوان توضيحي
- زر "رفع ملف BOQ" يفتح dialog الرفع
- زر "إضافة بند يدوياً"

### 2. إضافة زر رفع BOQ في شريط أدوات الجدول

**الملف:** `src/components/project-details/ProjectBOQTab.tsx`

إضافة زر `Upload BOQ` بجانب زر `Add Item` في شريط الأدوات ليكون متاحاً دائماً حتى عند وجود بنود.

### 3. تفعيل فتح dialog الرفع من تبويب BOQ

**الملف:** `src/pages/ProjectDetailsPage.tsx`

- إضافة prop جديد `onUploadBOQ` لـ `ProjectBOQTab` يفتح `showBOQUploadDialog`
- ربط الزر الجديد بالـ dialog الموجود

### 4. تحميل البنود من analysis_data عند غياب project_items

**الملف:** `src/pages/ProjectDetailsPage.tsx`

بعد تحميل المشروع والتحقق من أن `project_items` فارغ، إذا وُجدت بنود في `analysis_data.items`:
- يتم إدراجها تلقائياً في جدول `project_items`
- يتم تحديث واجهة المستخدم لعرض البنود مباشرة

```text
المسار الحالي:
  فتح مشروع → جدول فارغ → لا يعرف المستخدم ماذا يفعل

المسار المحسّن:
  فتح مشروع → (إذا analysis_data فيها بنود) → نقلها لـ project_items تلقائياً → عرض الجدول
  فتح مشروع → (إذا لا توجد بنود) → عرض واجهة تحفيزية مع زر رفع
```

## تفاصيل التنفيذ

### الملفات المتأثرة

1. **`src/components/project-details/ProjectBOQTab.tsx`**
   - إضافة prop `onUploadBOQ?: () => void`
   - إضافة واجهة empty state مع أزرار رفع وإضافة
   - إضافة زر رفع في شريط الأدوات

2. **`src/pages/ProjectDetailsPage.tsx`**
   - تمرير `onUploadBOQ={() => setShowBOQUploadDialog(true)}` لمكون `ProjectBOQTab`
   - إضافة منطق ترحيل البنود من `analysis_data` إلى `project_items` عند تحميل المشروع (في useEffect الرئيسي، بعد سطر 210)
   - عند اكتشاف بنود في `analysis_data.items` وعدم وجود `project_items`، يتم إدراجها تلقائياً

### منطق ترحيل البنود (Pseudo-code)

```typescript
// بعد سطر 210 في ProjectDetailsPage.tsx
if ((!itemsData || itemsData.length === 0) && analysisItems?.length > 0) {
  // ترحيل البنود من analysis_data إلى project_items
  const rows = analysisItems.map((item, idx) => ({
    project_id: projectId,
    item_number: item.item_number || String(idx + 1),
    description: item.description || '',
    description_ar: item.description_ar || null,
    unit: item.unit || '',
    quantity: item.quantity || 0,
    unit_price: item.unit_price || null,
    total_price: item.total_price || null,
    sort_order: idx,
  }));
  
  const { data: migratedItems } = await supabase
    .from("project_items")
    .insert(rows)
    .select("*");
  
  if (migratedItems) setItems(migratedItems);
}
```

## النتيجة المتوقعة

- عند فتح مشروع يحتوي على بنود محفوظة في `analysis_data`، تظهر البنود تلقائياً في جدول BOQ
- عند فتح مشروع فارغ، تظهر واجهة تحفيزية واضحة مع خيارات رفع ملف أو إضافة بند
- زر رفع BOQ متاح دائماً في شريط الأدوات

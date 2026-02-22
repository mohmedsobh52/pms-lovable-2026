

# إصلاح استخراج وعرض عمودي الوصف العربي والإنجليزي جنباً إلى جنب

## المشكلة الجذرية

عند وجود عمودين منفصلين في ملف Excel أو PDF - عمود بالعربية (مثل "البيان" أو "الوصف") وعمود بالإنجليزية (مثل "Description") - يحدث أحياناً خلط في تعيين الأعمدة بسبب:

1. **ترتيب فحص الأنماط**: النظام يفحص أنماط `description` قبل `descriptionAr`، فبعض الكلمات العربية مثل "المواصفات" موجودة في أنماط `description` مما يجعلها تُعيَّن خطأً
2. **منطق الدمج**: عند وجود عمود عربي فقط، النظام يدمجه مع `description` (سطر 175-186) مما قد يفقد التمييز
3. **PDF عبر الذكاء الاصطناعي**: دالة `process-pdf-boq` تعيد الأعمدة بأسمائها العربية الأصلية دون تعيينها إلى `description_ar`

## الملفات المتأثرة والتعديلات

### 1. `src/lib/excel-utils.ts` - إصلاح ترتيب فحص الأعمدة

**المشكلة**: أنماط `description` تحتوي على كلمات عربية ("المواصفات"، "مواصفات") تتنافس مع أنماط `descriptionAr`.

**الحل**:
- نقل الكلمات العربية من أنماط `description` إلى `descriptionAr` فقط
- تعديل `detectColumnMapping` ليفحص `descriptionAr` قبل `description`
- إضافة منطق ذكي: إذا وُجد عمودان نصيان طويلان (أحدهما عربي والآخر إنجليزي)، يُعيَّن كل منهما تلقائياً

```typescript
// تعديل COLUMN_PATTERNS.description - إزالة الكلمات العربية
description: [
  'description', 'details', 'scope', 'name', 'desc', 'item description',
  'work description', 'work', 'activity', 'task', 'spec', 'specification', 'specifications',
],

// تعديل COLUMN_PATTERNS.descriptionAr - إضافة الكلمات المنقولة
descriptionAr: [
  'المواصفات', 'مواصفات', 'وصف البند', 'الوصف', 'البيان', 'الوصف العربي',
  'بيان الأعمال', 'وصف', 'بيان', 'التفاصيل', 'الأعمال', 'شرح', 'تفاصيل',
  'اسم البند', 'العمل', 'العنصر', 'الصنف', 'المادة', 'البيانات', 'اسم',
  'وصف الأعمال', 'وصف العمل', 'النشاط', 'المهمة', 'بيان العمل', 'تفصيل',
],
```

**تعديل `detectColumnMapping`**: إضافة منطق ذكي بعد التعيين الأولي:
- إذا وُجد `descriptionAr` ولم يُوجد `description`: البحث عن عمود نصي إنجليزي آخر في الصف
- إذا وُجد `description` ولم يُوجد `descriptionAr`: فحص إذا كان محتوى عمود `description` عربي، ثم البحث عن عمود إنجليزي منفصل
- إضافة دالة `findSecondDescriptionColumn` تبحث في بيانات الصفوف عن عمود نصي طويل بلغة مختلفة

### 2. `src/lib/local-text-analysis.ts` - تحسين استخراج الوصف المزدوج من PDF

**المشكلة**: عند استخراج النص من PDF، إذا كان البند يحتوي على وصف عربي وإنجليزي في نفس السطر، يتم تخزينه فقط في `description`.

**الحل**: تحسين دالة `extractItemsFromText` لاكتشاف وجود نص مختلط (عربي + إنجليزي) وتقسيمه:

```typescript
// بعد استخراج البند، فحص إذا كان الوصف يحتوي على لغتين
function splitBilingualDescription(text: string): { en: string; ar: string } | null {
  const arabicParts: string[] = [];
  const englishParts: string[] = [];
  
  // تقسيم النص حسب اللغة
  const segments = text.split(/\s+/);
  for (const seg of segments) {
    if (/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(seg)) {
      arabicParts.push(seg);
    } else if (/[a-zA-Z]/.test(seg)) {
      englishParts.push(seg);
    }
  }
  
  if (arabicParts.length > 2 && englishParts.length > 2) {
    return { en: englishParts.join(' '), ar: arabicParts.join(' ') };
  }
  return null;
}
```

### 3. `src/components/project-details/BOQUploadDialog.tsx` - تعزيز حفظ `description_ar`

**المشكلة**: دالة `saveItemsToProject` (سطر 225-239) تكتشف العربي في `description` وتضعه في `description_ar`، لكنها لا تعالج الحالة التي يكون فيها `descriptionAr` (بصيغة camelCase) هو الحقل الصحيح.

**الحل**: التأكد من أن التعيين يشمل جميع الصيغ الممكنة وأن `description` يحتفظ بالنص الإنجليزي عند وجود عمودين منفصلين:

```typescript
const rows = items.map((item: any, idx: number) => {
  const desc = item.description || item.desc || "";
  let descAr = item.description_ar || item.descriptionAr || null;
  
  // إذا لم يوجد وصف عربي منفصل، فحص هل description نفسه عربي
  if (!descAr && desc && /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(desc)) {
    descAr = desc;
  }
  
  return {
    project_id: projectId,
    item_number: item.item_number || item.number || String(idx + 1),
    description: desc,
    description_ar: descAr,
    // ... باقي الحقول
  };
});
```

### 4. `src/components/project-details/ProjectBOQTab.tsx` - تأكيد عمل العرض (موجود بالفعل)

العمود موجود بالفعل ويعمل. لا تعديل مطلوب على هذا الملف.

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `src/lib/excel-utils.ts` | إصلاح أنماط الأعمدة + منطق ذكي لاكتشاف عمودين منفصلين |
| `src/lib/local-text-analysis.ts` | إضافة تقسيم الوصف ثنائي اللغة من PDF |
| `src/components/project-details/BOQUploadDialog.tsx` | تعزيز منطق حفظ description_ar |

## النتيجة المتوقعة

- ملفات Excel بعمودين منفصلين (عربي + إنجليزي): يظهر كل عمود بشكل مستقل في الجدول
- ملفات PDF بوصف مزدوج اللغة: يتم تقسيم الوصف وعرضه في عمودين
- الجدول يعرض العمودين جنباً إلى جنب تلقائياً عند وجود بيانات عربية




# إضافة تبويب إدارة العقود الهندسية في صفحة تفاصيل المشروع

## الهدف

إضافة تبويب جديد "العقود" في صفحة تفاصيل المشروع (`ProjectDetailsPage`) لربط إدارة العقود الهندسية مباشرة بالمشروع، مع استخدام المكونات الموجودة بالفعل (`ContractManagement`).

## التغييرات المطلوبة

### 1. تعديل `src/pages/ProjectDetailsPage.tsx`

- إضافة import لـ `ContractManagement` و أيقونة `FileText`
- إضافة `TabsTrigger` جديد باسم "العقود" / "Contracts" بعد تبويب المستندات
- إضافة `TabsContent` جديد يعرض مكون `ContractManagement` مع تمرير `projectId`

```text
التبويبات بعد التعديل:
نظرة عامة | جدول الكميات | تحليل متقدم | المستندات | العقود | الإعدادات
```

### 2. تعديل `src/components/ContractManagement.tsx`

- إضافة prop اختياري `projectId` لتصفية العقود حسب المشروع
- عند تمرير `projectId`، يتم فلترة العقود المرتبطة بهذا المشروع فقط
- عند إنشاء عقد جديد من داخل المشروع، يتم ربطه تلقائياً بالمشروع الحالي

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/ProjectDetailsPage.tsx` | إضافة تبويب العقود + import |
| `src/components/ContractManagement.tsx` | إضافة `projectId` prop اختياري + فلترة |

### تبويب العقود الجديد

```typescript
<TabsTrigger value="contracts" className="flex items-center gap-1 flex-shrink-0">
  <FileText className="w-3.5 h-3.5" />
  {isArabic ? "العقود" : "Contracts"}
</TabsTrigger>

<TabsContent value="contracts">
  <ContractManagement projectId={projectId} />
</TabsContent>
```

### فلترة العقود حسب المشروع

في `ContractManagement.tsx`، عند وجود `projectId`:
- الاستعلام يضيف `.eq("project_id", projectId)` 
- عند إنشاء عقد جديد يتم تعيين `project_id` تلقائياً
- يبقى المكون يعمل بدون `projectId` في الصفحات الأخرى (مثل `ContractsPage`)


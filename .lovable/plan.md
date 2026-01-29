
# خطة إصلاح مشكلة حفظ الملفات

## تشخيص المشكلة

### السبب الجذري
الكود يقرأ المشاريع من جدول `saved_projects` لكن الـ foreign key في جدول `project_attachments` يشير إلى جدول `project_data`.

```text
الكود الحالي:
┌─────────────────────────┐      ┌───────────────────────┐
│   saved_projects        │  ←   │ FastExtractionProject │
│   (يقرأ المشاريع منه)   │      │ Selector.tsx          │
└─────────────────────────┘      └───────────────────────┘
                                           │
                                           ▼
                                 ┌───────────────────────┐
                                 │ project_attachments   │
                                 │ (يحاول الحفظ هنا)     │
                                 └───────────────────────┘
                                           │
                                           ▼ Foreign Key
                                 ┌───────────────────────┐
                                 │   project_data ❌     │
                                 │ (لا يجد المشروع!)     │
                                 └─────────────────────── 
```

### مثال عملي
- مشروع "الدلم" في `saved_projects`: `921a8167-cd66-4cec-b196-0c35eadac7a9`
- نفس المشروع في `project_data`: `706395e9-7ec9-4da9-aed5-36ff68e952c2`
- عند الحفظ بـ ID من `saved_projects`، يفشل لأن الـ FK يتوقع ID من `project_data`

## الحل المقترح

تغيير الكود ليقرأ المشاريع من جدول `project_data` بدلاً من `saved_projects`.

### التغييرات المطلوبة

#### الملف: `src/components/FastExtractionProjectSelector.tsx`

**التغيير 1: تعديل دالة `fetchProjects`**
```typescript
// قبل (السطر 64-68)
const { data: projectsData, error } = await supabase
  .from("saved_projects")
  .select("id, name, file_name, created_at")
  ...

// بعد
const { data: projectsData, error } = await supabase
  .from("project_data")
  .select("id, name, created_at")
  ...
```

**التغيير 2: تعديل إنشاء مشروع جديد**
```typescript
// قبل (السطر 129-136)
const { data: newProject, error: projectError } = await supabase
  .from("saved_projects")
  .insert({
    name: newProjectName.trim(),
    user_id: user.id,
    file_name: successFiles[0]?.name || null,
  })
  ...

// بعد
const { data: newProject, error: projectError } = await supabase
  .from("project_data")
  .insert({
    name: newProjectName.trim(),
    user_id: user.id,
  })
  ...
```

**التغيير 3: تحديث الـ Interface**
```typescript
// تعديل Interface ليتوافق مع project_data
interface Project {
  id: string;
  name: string;
  created_at: string;
  files_count: number;
  categories: string[];
}
```

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `FastExtractionProjectSelector.tsx` | تغيير من `saved_projects` إلى `project_data` |

## النتيجة المتوقعة

```text
بعد التغيير:
┌─────────────────────────┐      ┌───────────────────────┐
│   project_data          │  ←   │ FastExtractionProject │
│   (يقرأ المشاريع منه)   │      │ Selector.tsx          │
└─────────────────────────┘      └───────────────────────┘
           │                               │
           │                               ▼
           │                     ┌───────────────────────┐
           │                     │ project_attachments   │
           │                     │ (يحاول الحفظ هنا)     │
           │                     └───────────────────────┘
           │                               │
           └───────────────────────────────┘
                    Foreign Key ✅
```

- ✅ الملفات ستُحفظ بنجاح
- ✅ المشاريع ستظهر مع عدد الملفات الصحيح
- ✅ الكميات المستخرجة ستُحفظ مع الملفات

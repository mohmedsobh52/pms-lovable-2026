
# خطة إصلاح مشكلة "Project not found"

## تشخيص المشكلة

### السبب الجذري
يوجد **جدولان منفصلان** لتخزين المشاريع مما يسبب تضارباً:

```text
┌────────────────────────────────────────────────────────────────┐
│                    مسار البيانات الحالي                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  MainDashboard.tsx                                            │
│  ↓                                                            │
│  يجلب المشاريع من: saved_projects                             │
│  ↓                                                            │
│  ينتقل إلى: /projects/${project.id}                           │
│  ↓                                                            │
│  ProjectDetailsPage.tsx                                       │
│  ↓                                                            │
│  يبحث في: project_data ❌                                     │
│  ↓                                                            │
│  النتيجة: "Project not found"                                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### الجدولان المتضاربان:

| الجدول | المصدر | الأعمدة |
|--------|--------|---------|
| `saved_projects` | MainDashboard, SavedProjects component | id, name, status, analysis_data |
| `project_data` | ProjectDetailsPage, SavedProjectsPage | id, name, currency, total_value, analysis_data |

### المشروع المتأثر:
- **ID:** `53146e3a-70eb-40a2-8ad1-50ee4957a1dd`
- **الاسم:** "The Beach"
- **موجود في:** `saved_projects` ✅
- **غير موجود في:** `project_data` ❌

---

## الحل المقترح

### الخيار 1: دمج البحث في كلا الجدولين (الحل الموصى به)

تعديل `ProjectDetailsPage.tsx` ليبحث في كلا الجدولين:
1. البحث أولاً في `project_data`
2. إذا لم يوجد، البحث في `saved_projects`
3. تحويل البيانات لتتوافق مع الواجهة المطلوبة

### الخيار 2: توحيد مصادر البيانات (حل طويل المدى)

جعل جميع المكونات تستخدم جدول `project_data` فقط:
1. تعديل `MainDashboard.tsx` ليجلب من `project_data`
2. ترحيل البيانات من `saved_projects` إلى `project_data`

---

## التغييرات المطلوبة (الخيار 1)

### الملف: src/pages/ProjectDetailsPage.tsx

تعديل useEffect لجلب البيانات (السطور 91-151):

```typescript
useEffect(() => {
  if (!user || !projectId) return;

  const fetchProjectData = async () => {
    setIsLoading(true);
    try {
      // 1. البحث أولاً في project_data
      let { data: projectData, error: projectError } = await supabase
        .from("project_data")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (projectError) throw projectError;
      
      // 2. إذا لم يوجد، البحث في saved_projects
      if (!projectData) {
        const { data: savedProject, error: savedError } = await supabase
          .from("saved_projects")
          .select("*")
          .eq("id", projectId)
          .maybeSingle();
          
        if (savedError) throw savedError;
        
        if (savedProject) {
          // تحويل البيانات لتتوافق مع واجهة ProjectData
          projectData = {
            ...savedProject,
            currency: "SAR",
            total_value: savedProject.analysis_data?.summary?.total_value || 0,
            items_count: savedProject.analysis_data?.items?.length || 0,
          };
        }
      }
      
      // 3. التعامل مع حالة عدم وجود المشروع
      if (!projectData) {
        setIsLoading(false);
        setProject(null);
        return;
      }

      setProject(projectData);
      // ... باقي الكود كما هو
    } catch (error: any) {
      // معالجة الأخطاء
    }
  };

  fetchProjectData();
}, [user, projectId]);
```

### الملف: src/components/MainDashboard.tsx (اختياري)

تحديث التنقل ليذهب إلى صفحة مختلفة للمشاريع من `saved_projects`:

```typescript
// السطر 1096 - إضافة معامل لتحديد نوع المشروع
onClick={() => navigate(`/projects/${project.id}?source=saved`)}
```

---

## ملخص التغييرات

| الملف | السطور | التغيير |
|-------|--------|---------|
| `ProjectDetailsPage.tsx` | 91-151 | البحث في كلا الجدولين |
| `ProjectDetailsPage.tsx` | جديد | تحويل بيانات saved_projects |

---

## اختبار بعد التطبيق

1. **فتح مشروع من MainDashboard:**
   - النقر على أي مشروع → يجب أن يفتح التفاصيل بدون "Project not found"

2. **فتح مشروع من SavedProjectsPage:**
   - النقر على "Open" → يجب أن يعمل بشكل صحيح

3. **زر "Back to Projects":**
   - النقر على الزر → يجب أن ينتقل إلى `/projects`

4. **المشاريع الجديدة:**
   - إنشاء مشروع جديد → يجب أن يفتح من `project_data`

---

## ملاحظات فنية

### هيكل البيانات المتوقع:

```typescript
interface ProjectData {
  id: string;
  name: string;
  file_name: string | null;
  analysis_data: any;
  wbs_data: any;
  currency: string;        // غير موجود في saved_projects
  total_value: number;     // غير موجود في saved_projects
  items_count: number;     // غير موجود في saved_projects
  created_at: string;
  updated_at: string;
  status?: string;         // موجود في saved_projects فقط
}
```

### التحويل المطلوب:
- `currency`: استخدام "SAR" كقيمة افتراضية
- `total_value`: حسابها من `analysis_data.summary.total_value` أو `analysis_data.items`
- `items_count`: حسابها من `analysis_data.items.length`

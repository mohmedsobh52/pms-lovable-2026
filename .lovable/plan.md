
# خطة إصلاح عرض جميع المشاريع المحفوظة

## تشخيص المشكلة

### السبب الجذري
هناك جدولان للمشاريع في قاعدة البيانات:
- **`saved_projects`**: يحتوي على **13 مشروع** (الجدول الأساسي المستخدم في معظم الأماكن)
- **`project_data`**: يحتوي على **3 مشاريع** (جدول ثانوي)

### المشكلة
صفحة `SavedProjectsPage.tsx` تستعلم فقط من جدول `project_data`:

```tsx
// السطور 106-109 - تستعلم فقط من project_data
const { data, error } = await supabase
  .from("project_data")
  .select("*")
  .order("created_at", { ascending: false });
```

بينما صفحات أخرى مثل `HomePage` و `ReportsTab` تستعلم من `saved_projects` أو كليهما.

---

## الحل

تحديث دالة `fetchProjects` في `SavedProjectsPage.tsx` لجلب المشاريع من **كلا الجدولين** ودمجها، بنفس المنهج المستخدم في `ReportsTab.tsx`.

### التغييرات المطلوبة

#### ملف: `src/pages/SavedProjectsPage.tsx`

**تحديث دالة `fetchProjects` (السطور 101-123):**

```tsx
const fetchProjects = async () => {
  if (!user) return;
  
  setIsLoading(true);
  try {
    // Fetch from both tables in parallel
    const [savedProjectsRes, projectDataRes] = await Promise.all([
      supabase
        .from("saved_projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("project_data")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

    const savedProjects = savedProjectsRes.data || [];
    const projectDataList = projectDataRes.data || [];

    // Merge projects - use Map to avoid duplicates
    const projectMap = new Map<string, ProjectData>();

    // Add saved_projects first (prioritize)
    savedProjects.forEach(p => {
      const analysisData = p.analysis_data as any;
      projectMap.set(p.id, {
        id: p.id,
        name: p.name,
        file_name: p.file_name,
        analysis_data: p.analysis_data,
        wbs_data: p.wbs_data,
        items_count: analysisData?.items?.length || analysisData?.summary?.total_items || 0,
        total_value: analysisData?.summary?.total_value || 0,
        currency: analysisData?.summary?.currency || 'SAR',
        created_at: p.created_at,
        updated_at: p.updated_at,
      });
    });

    // Add project_data if not already in map
    projectDataList.forEach(p => {
      if (!projectMap.has(p.id)) {
        projectMap.set(p.id, {
          id: p.id,
          name: p.name,
          file_name: p.file_name,
          analysis_data: p.analysis_data,
          wbs_data: p.wbs_data,
          items_count: p.items_count || 0,
          total_value: p.total_value || 0,
          currency: p.currency || 'SAR',
          created_at: p.created_at,
          updated_at: p.updated_at,
        });
      }
    });

    // Convert map to array and sort by created_at
    const allProjects = Array.from(projectMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setProjects(allProjects);
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    toast({
      title: isArabic ? "خطأ في تحميل المشاريع" : "Error loading projects",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};
```

**تحديث دالة `handleDelete` (السطور 131-152):**

```tsx
const handleDelete = async (id: string) => {
  try {
    // Try to delete from both tables
    // Delete project items first (if any)
    await supabase.from("project_items").delete().eq("project_id", id);
    
    // Delete from project_data
    await supabase.from("project_data").delete().eq("id", id);
    
    // Delete from saved_projects
    await supabase.from("saved_projects").delete().eq("id", id);
    
    toast({
      title: isArabic ? "تم حذف المشروع" : "Project deleted",
    });
    fetchProjects();
  } catch (error: any) {
    toast({
      title: isArabic ? "خطأ في حذف المشروع" : "Error deleting project",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/SavedProjectsPage.tsx` | تحديث `fetchProjects` لجلب من كلا الجدولين + تحديث `handleDelete` |

---

## النتيجة المتوقعة

| قبل الإصلاح | بعد الإصلاح |
|-------------|-------------|
| 3 مشاريع ظاهرة | 13 مشروع (أو أكثر) ظاهرة |
| استعلام من `project_data` فقط | استعلام من كلا الجدولين |
| ❌ مشاريع مفقودة | ✅ جميع المشاريع مرئية |

---

## ملاحظات تقنية

### لماذا يوجد جدولان؟

- **`saved_projects`**: الجدول الأصلي القديم للمشاريع المحفوظة (يحتوي على `analysis_data` JSON)
- **`project_data`**: جدول أحدث مع بنية مختلفة (يستخدم `project_items` منفصل)

### استراتيجية الدمج

1. **الأولوية لـ `saved_projects`**: إذا وُجد مشروع في كلا الجدولين، نستخدم بيانات `saved_projects`
2. **استخدام Map**: لتجنب التكرار عند وجود نفس الـ ID في كلا الجدولين
3. **توحيد الـ Schema**: تحويل البيانات لتتوافق مع interface `ProjectData`

### التوافق مع الصفحات الأخرى

هذا الحل يتبع نفس المنهج المستخدم في:
- `ReportsTab.tsx` (سطور 75-117)
- `HomePage.tsx` (dashboard statistics)

---

## التحسينات المستقبلية (اختيارية)

للتخلص من ازدواجية الجداول، يمكن لاحقاً:
1. ترحيل جميع البيانات من `saved_projects` إلى `project_data`
2. تحديث جميع الاستعلامات لاستخدام جدول واحد
3. حذف الجدول القديم

لكن هذا يتطلب خطة ترحيل بيانات كاملة وليس جزءاً من هذا الإصلاح.

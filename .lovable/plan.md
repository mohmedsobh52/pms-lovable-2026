

# حذف مشاريع دفعة واحدة + نسخ/استنساخ مشروع

## 1. حذف عدة مشاريع دفعة واحدة (Bulk Delete)

### التغييرات في `src/pages/SavedProjectsPage.tsx`:

**إضافة حالات جديدة:**
- `selectedProjectIds: Set<string>` لتتبع المشاريع المحددة
- `isBulkDeleting: boolean` لحالة التحميل أثناء الحذف الجماعي

**إضافة checkbox لكل بطاقة مشروع:**
- خانة اختيار (Checkbox) في الزاوية العلوية اليسرى لكل بطاقة
- خانة "تحديد الكل" في شريط الأدوات

**شريط إجراءات جماعي:**
- يظهر عند تحديد مشروع واحد أو أكثر
- يعرض عدد المشاريع المحددة
- زر "حذف المحدد" مع تأكيد عبر AlertDialog
- زر "إلغاء التحديد"

**دالة `handleBulkDelete`:**
- حذف `project_items` ثم `project_data` ثم `saved_projects` لكل مشروع محدد
- تحديث القائمة المحلية
- إعادة تعيين التحديد

---

## 2. نسخ/استنساخ مشروع (Clone Project)

### التغييرات في `src/pages/SavedProjectsPage.tsx`:

**إضافة زر نسخ في بطاقة المشروع:**
- زر جديد بأيقونة Copy بجانب أزرار التصدير والحذف

**دالة `handleCloneProject(project)`:**
1. توليد اسم جديد تلقائي: `"${project.name} - نسخة"` أو `"${project.name} - Copy"`
2. فحص تكرار الاسم وإضافة رقم تسلسلي إذا لزم (نسخة 2، نسخة 3...)
3. إنشاء سجل جديد في `project_data` بنفس `analysis_data` و `wbs_data`
4. إنشاء سجل في `saved_projects` بنفس المعرف الجديد
5. جلب `project_items` الأصلية وإنشاء نسخ منها مع `project_id` الجديد
6. جلب `item_costs` المرتبطة ونسخها للبنود الجديدة
7. إعادة تحميل القائمة

---

## التفاصيل التقنية

### شريط الإجراءات الجماعي (Bulk Actions Bar)

```text
عند selectedProjectIds.size > 0:
  يظهر شريط ثابت أعلى قائمة المشاريع:
  [✓ تحديد الكل] [X محدد] [🗑 حذف المحدد] [← إلغاء التحديد]
```

### منطق الاستنساخ

```text
handleCloneProject(project):
  1. baseName = project.name + (isArabic ? " - نسخة" : " - Copy")
  2. التحقق من عدم تكرار الاسم (إضافة رقم إذا لزم)
  3. إنشاء projectId جديد (UUID)
  4. INSERT INTO project_data (id, name, analysis_data, wbs_data, ...)
  5. INSERT INTO saved_projects (id, name, analysis_data, wbs_data, ...)
  6. SELECT * FROM project_items WHERE project_id = originalId
  7. لكل بند: INSERT INTO project_items مع project_id الجديد → حفظ mapping قديم→جديد
  8. SELECT * FROM item_costs WHERE project_item_id IN (original item ids)
  9. لكل تكلفة: INSERT INTO item_costs مع project_item_id الجديد (من mapping)
  10. fetchProjects() لتحديث القائمة
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/SavedProjectsPage.tsx` | Checkbox + شريط إجراءات جماعي + حذف دفعة واحدة + زر نسخ + دالة استنساخ |


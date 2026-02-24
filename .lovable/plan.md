

# إصلاح مشكلة حذف المشاريع

## المشكلة الجذرية

هناك مشكلتان رئيسيتان تمنعان الحذف من العمل بشكل صحيح:

1. **ذاكرة التخزين المؤقت (Cache)**: بعد حذف المشروع، يتم استدعاء `fetchProjects()` الذي يقرأ البيانات من cache في `sessionStorage` (مدة 3 دقائق) بدلاً من قاعدة البيانات، مما يُظهر المشروع المحذوف مجدداً
2. **عدم فحص أخطاء الحذف**: استدعاءات Supabase لا تتحقق من وجود أخطاء في الاستجابة - الكود يعرض رسالة نجاح دائماً حتى لو فشل الحذف فعلياً
3. **جداول مرتبطة لا يتم تنظيفها**: مثل `item_costs`، `edited_boq_prices`، `item_pricing_details` وغيرها

---

## التغييرات المطلوبة

### الملف: `src/pages/SavedProjectsPage.tsx`

#### 1. إصلاح دالة الحذف الفردي `handleDelete`
- إضافة فحص الأخطاء لكل عملية حذف (`.delete()` ثم التحقق من `error`)
- حذف البيانات المرتبطة قبل حذف المشروع:
  - `item_costs` (عبر `project_items`)
  - `item_pricing_details` (عبر `project_items`)
  - `edited_boq_prices`
  - `project_items`
  - `project_data`
  - `saved_projects`
- **مسح cache من `sessionStorage`** بعد الحذف الناجح قبل استدعاء `fetchProjects`
- أو استدعاء `fetchProjects(true)` لتخطي الـ cache

#### 2. إصلاح دالة الحذف الجماعي `handleBulkDelete`
- نفس الإصلاحات: فحص الأخطاء، حذف الجداول المرتبطة، ومسح الـ cache

#### 3. تحديث `fetchProjects` بعد الحذف
- استخدام `fetchProjects(true)` (skipCache) في كلا دالتي الحذف لضمان تحميل البيانات الحقيقية من قاعدة البيانات

---

## التفاصيل التقنية

### ترتيب الحذف الصحيح (من الأعمق للأعلى)
```text
1. item_costs         (مرتبط بـ project_items.id)
2. item_pricing_details (مرتبط بـ project_items.id)  
3. edited_boq_prices  (مرتبط بـ project_id)
4. project_items      (مرتبط بـ project_id)
5. project_data       (المشروع المؤقت)
6. saved_projects     (المشروع الدائم)
```

### فحص الأخطاء
```text
const { error } = await supabase.from("table").delete().eq("id", id);
if (error) throw error;  // بدلاً من تجاهل الخطأ
```

### مسح الـ Cache
```text
sessionStorage.removeItem(`pms_projects_${user.id}`);
fetchProjects(true);  // skipCache = true
```


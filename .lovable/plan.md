
# خطة إصلاح حفظ المشروع بنفس الاسم (الاستبدال التلقائي)

## المشكلة

عند محاولة حفظ مشروع باستخدام زر "Save Project" الأخضر، إذا كان اسم المشروع موجوداً بالفعل، يفشل الحفظ بدون إعطاء خيار للاستبدال.

## تحليل الوضع الحالي

| المكون | الحالة | السلوك |
|--------|--------|--------|
| `SaveProjectDialog.tsx` | ✅ يعمل | يتحقق من الاسم المكرر ويعرض حوار للاستبدال أو الحفظ باسم جديد |
| `SaveProjectButton.tsx` | ❌ يحتاج إصلاح | يحاول الإدراج مباشرة بدون التحقق من الاسم المكرر |

## الحل المقترح

تحديث `SaveProjectButton.tsx` لإضافة نفس آلية الاستبدال الموجودة في `SaveProjectDialog.tsx`:

### 1. إضافة حالة لحوار التأكيد

```tsx
const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
const [duplicateProject, setDuplicateProject] = useState<{id: string, name: string} | null>(null);
```

### 2. التحقق من وجود مشروع بنفس الاسم قبل الحفظ

في دالة `handleSave`:
```tsx
// Check for duplicate project name in both tables
const { data: existingProjects } = await supabase
  .from("project_data")
  .select("id, name")
  .eq("user_id", user.id)
  .ilike("name", projectName.trim());

if (existingProjects && existingProjects.length > 0) {
  // Show duplicate confirmation dialog
  setDuplicateProject(existingProjects[0]);
  setDuplicateDialogOpen(true);
  setIsSaving(false);
  return;
}
```

### 3. إضافة دالة الاستبدال

```tsx
const handleOverwrite = async () => {
  if (!duplicateProject || !user) return;
  
  setIsSaving(true);
  
  try {
    // Delete existing project and its items
    await supabase.from('project_items').delete().eq('project_id', duplicateProject.id);
    await supabase.from('project_data').delete().eq('id', duplicateProject.id);
    await supabase.from('saved_projects').delete().eq('user_id', user.id).ilike('name', duplicateProject.name);
    
    // Save new project with same name
    await saveNewProject();
  } catch (error) {
    // Handle error
  }
};
```

### 4. إضافة AlertDialog للتأكيد

```tsx
<AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
  <AlertDialogContent dir="rtl">
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        يوجد مشروع بنفس الاسم
      </AlertDialogTitle>
      <AlertDialogDescription>
        يوجد مشروع محفوظ باسم "{duplicateProject?.name}". هل تريد استبداله بالمشروع الجديد؟
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter className="flex-row-reverse gap-2">
      <AlertDialogCancel>إلغاء</AlertDialogCancel>
      <AlertDialogAction onClick={handleOverwrite} className="bg-destructive">
        استبدال القديم
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/SaveProjectButton.tsx` | إضافة التحقق من الاسم المكرر وحوار الاستبدال |

---

## التغييرات التفصيلية

### `SaveProjectButton.tsx`

1. **الاستيرادات الجديدة:**
   - إضافة `AlertTriangle` من lucide-react
   - إضافة `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`

2. **الحالات الجديدة:**
   - `duplicateDialogOpen: boolean`
   - `duplicateProject: {id: string, name: string} | null`

3. **دالة `handleSave` المُحدثة:**
   - إضافة التحقق من وجود مشروع بنفس الاسم في `project_data`
   - إظهار حوار التأكيد إذا وُجد مشروع مكرر

4. **دالة `handleOverwrite` الجديدة:**
   - حذف المشروع القديم وعناصره
   - حفظ المشروع الجديد بنفس الاسم

5. **AlertDialog للتأكيد:**
   - يعرض خيارات: إلغاء أو استبدال القديم

---

## النتيجة المتوقعة

### قبل الإصلاح:
- عند محاولة حفظ مشروع باسم موجود، يفشل الحفظ بدون رسالة واضحة

### بعد الإصلاح:
- عند إدخال اسم مشروع موجود، يظهر حوار تأكيد
- المستخدم يمكنه اختيار:
  - **إلغاء**: العودة لتغيير الاسم
  - **استبدال القديم**: حذف المشروع القديم وحفظ الجديد بنفس الاسم

---

## ملاحظات تقنية

1. **الاستبدال الكامل:**
   - يتم حذف المشروع القديم من `project_data`
   - يتم حذف عناصر المشروع من `project_items`
   - يتم حذف المشروع من `saved_projects` أيضاً
   - ثم يتم إنشاء مشروع جديد بنفس الاسم

2. **التحقق من الاسم:**
   - يستخدم `ilike` للمقارنة بدون حساسية لحالة الأحرف
   - يتحقق فقط من مشاريع المستخدم الحالي

3. **التوافق:**
   - نفس آلية `SaveProjectDialog.tsx` المُثبتة والعاملة

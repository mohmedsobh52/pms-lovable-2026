

# إضافة خيارات عند حفظ مشروع بنفس الاسم

## المشكلة الحالية

عند حفظ مشروع بنفس اسم مشروع موجود، يظهر فقط خياران: "إلغاء" و "استبدال القديم". المستخدم يحتاج خيارات إضافية.

## الحل

### الملف: `src/components/SaveProjectButton.tsx`

تحسين نافذة تأكيد التكرار لتقدم 3 خيارات:

1. **استبدال القديم** - حذف المشروع القديم وحفظ الجديد مكانه (موجود حالياً)
2. **حفظ باسم جديد** - إضافة رقم أو وقت تلقائي للاسم وحفظه كمشروع منفصل (جديد)
3. **إلغاء** - إغلاق النافذة (موجود حالياً)

#### التغييرات:

1. إضافة دالة `handleSaveWithNewName` تولّد اسماً فريداً بإضافة الوقت الحالي للاسم، ثم تحفظ المشروع مباشرة:

```text
const handleSaveWithNewName = async () => {
  const timestamp = new Date().toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  setProjectName(`${projectName.trim()} (${timestamp})`);
  setDuplicateDialogOpen(false);
  setDuplicateProject(null);
  // حفظ مباشر بالاسم الجديد
  await saveNewProject();
};
```

2. تحديث `AlertDialogFooter` لتضمين 3 أزرار بتصميم واضح:

```text
<AlertDialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
  <AlertDialogCancel>إلغاء</AlertDialogCancel>
  <AlertDialogAction 
    onClick={handleSaveWithNewName}
    className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
  >
    حفظ باسم جديد
  </AlertDialogAction>
  <AlertDialogAction 
    onClick={handleOverwrite}
    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
  >
    استبدال القديم
  </AlertDialogAction>
</AlertDialogFooter>
```

3. تحسين وصف النافذة ليوضح الخيارات المتاحة:

```text
<AlertDialogDescription>
  يوجد مشروع محفوظ باسم "{duplicateProject?.name}". 
  يمكنك استبداله بالبيانات الجديدة أو حفظه باسم مختلف.
</AlertDialogDescription>
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/SaveProjectButton.tsx` | إضافة زر "حفظ باسم جديد" وتحسين نافذة التأكيد |


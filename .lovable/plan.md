

# إضافة تتبع التغييرات غير المحفوظة وتحذير المغادرة

## الوضع الحالي
- مؤشر الحفظ `AutoSaveIndicator` موجود بالفعل بجانب زر الحفظ (سطر 1112)
- `lastSaved` و `isSaving` يعملان بشكل صحيح
- لكن `hasUnsavedChanges` ثابت على `false` ولا يتتبع التغييرات الفعلية

## التغييرات المطلوبة

### ملف: `src/pages/ProjectDetailsPage.tsx`

1. **تتبع التغييرات غير المحفوظة**:
   - إضافة `savedSnapshotRef` يحفظ لقطة من البيانات عند التحميل وبعد كل حفظ ناجح
   - إضافة `hasUnsavedChanges` محسوب يقارن البيانات الحالية مع اللقطة
   - تمرير القيمة الفعلية لـ `AutoSaveIndicator` بدلاً من `false`

2. **تحذير عند مغادرة الصفحة**:
   - إضافة `useEffect` مع `beforeunload` event لتحذير المستخدم عند إغلاق/تحديث الصفحة
   - استخدام `useBlocker` من react-router لتحذير عند التنقل داخل التطبيق مع dialog تأكيد

### الملفات المتأثرة
- `src/pages/ProjectDetailsPage.tsx` فقط


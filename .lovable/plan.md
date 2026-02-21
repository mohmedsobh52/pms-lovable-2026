

# ربط إنشاء مشروع جديد بتبويب Analyze BOQ

## الوضع الحالي

عند إنشاء مشروع جديد من `NewProjectPage`، يتم التوجيه إلى:
```
navigate(`/projects/${data.id}`, { state: { isNewProject: true } })
```
هذا يفتح صفحة تفاصيل المشروع مع onboarding عادي.

## التغيير المطلوب

بعد إنشاء المشروع بنجاح، توجيه المستخدم مباشرة إلى صفحة المشاريع مع فتح تبويب "Analyze BOQ" تلقائياً، مع إظهار رسالة تحفيزية لرفع ملف BOQ.

## التفاصيل التقنية

### الملف: `src/pages/NewProjectPage.tsx`

**التغيير:** تعديل `navigate` بعد إنشاء المشروع ليوجّه إلى تبويب Analyze BOQ:

```text
// Before:
navigate(`/projects/${data.id}`, { state: { isNewProject: true } });

// After:
navigate(`/projects?tab=analyze`, { state: { newProjectId: data.id, newProjectName: data.name } });
```

تحديث رسالة toast لتوضح الخطوة التالية (رفع ملف BOQ).

### الملف: `src/pages/SavedProjectsPage.tsx`

**التغييرات:**
- قراءة `state` من `useLocation` للتعرف على المشروع الجديد
- عرض بانر تحفيزي أعلى تبويب Analyze BOQ عند القدوم من إنشاء مشروع جديد (مثلاً: "تم إنشاء المشروع! ارفع ملف BOQ الآن لبدء التحليل")
- إضافة تمييز بصري لتبويب Analyze BOQ عند الوصول من مشروع جديد

### تحسينات الشكل

- إضافة أيقونة متحركة (sparkles) على تبويب Analyze BOQ عند القدوم من مشروع جديد
- بانر ترحيبي بتدرج لوني يوضح الخطوة التالية
- زر إغلاق البانر بعد القراءة

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/NewProjectPage.tsx` | تغيير التوجيه بعد الإنشاء ليفتح تبويب Analyze BOQ |
| `src/pages/SavedProjectsPage.tsx` | عرض بانر تحفيزي للمشروع الجديد + تحسينات بصرية |


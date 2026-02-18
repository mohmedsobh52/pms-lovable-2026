
# نقل شاشة "Upload & Analyze New BOQ" لتظهر بعد إنشاء مشروع جديد

## المشكلة الحالية

بطاقة "رفع وتحليل BOQ جديد" موجودة فقط في صفحة قائمة المشاريع (`/projects`). بعد إنشاء مشروع جديد، يتم التوجيه إلى صفحة تفاصيل المشروع مباشرةً دون أي دعوة لرفع ملف BOQ.

## الحل المقترح

### 1. تمرير حالة "مشروع جديد" عند الانتقال

في `NewProjectPage.tsx` بعد نجاح الإنشاء، بدلاً من:
```typescript
navigate(`/projects/${data.id}`);
```

نغير إلى:
```typescript
navigate(`/projects/${data.id}`, { state: { isNewProject: true } });
```

### 2. إضافة بانر "رفع وتحليل BOQ" في ProjectDetailsPage

في `ProjectDetailsPage.tsx`، نقرأ `location.state`:
```typescript
const location = useLocation();
const isNewProject = location.state?.isNewProject === true;
const [showBOQUploadBanner, setShowBOQUploadBanner] = useState(isNewProject);
```

ثم نعرض بانر/بطاقة مشابهة لما في SavedProjectsPage أعلى تبويبات المشروع مباشرةً، وتحتوي على:
- أيقونة وعنوان: "رفع وتحليل BOQ جديد"
- زر "ابدأ التحليل" يوجه إلى `/analyze`
- زر إغلاق (X) لإخفاء البانر
- تختفي تلقائياً إذا كانت البيانات موجودة أو عند الإغلاق

### التدفق الكامل بعد التعديل

```text
إنشاء مشروع جديد
      ↓
صفحة تفاصيل المشروع
      ↓
[بانر أعلى الصفحة]
┌─────────────────────────────────────────┐
│  📤 رفع وتحليل BOQ جديد               │
│  حلل ملفات PDF/Excel لاستخراج البنود   │
│           [ابدأ التحليل]    [×]         │
└─────────────────────────────────────────┘
      ↓ (يختفي عند الإغلاق أو الانتقال)
تبويبات المشروع: نظرة عامة | BOQ | المستندات | الإعدادات
```

## التغييرات التقنية

| الملف | التغيير |
|-------|---------|
| `src/pages/NewProjectPage.tsx` | إضافة `{ state: { isNewProject: true } }` عند navigate |
| `src/pages/ProjectDetailsPage.tsx` | قراءة location.state + إضافة بانر شرطي + import useLocation |

## ملاحظات

- البانر يظهر فقط عند أول زيارة للمشروع الجديد (مرة واحدة)
- لا يظهر عند زيارة مشاريع قديمة
- عند الضغط على "ابدأ التحليل" يتم التوجيه إلى `/analyze` (الصفحة الرئيسية للتحليل)
- لا تغييرات على قاعدة البيانات

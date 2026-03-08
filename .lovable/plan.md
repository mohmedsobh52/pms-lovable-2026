

# معالجة مشكلة عدم حفظ المشاريع

## المشاكل المكتشفة

بعد فحص الكود وقاعدة البيانات، وجدت 3 مشاكل رئيسية تسبب فقدان البيانات:

### 1. زر "حفظ المشروع" يحذف بيانات المشروع الأساسية
في `ProjectDetailsPage.tsx` (سطر 1151-1166)، عند الحفظ يتم إعادة بناء `analysis_data` بـ `items` و `summary` فقط، مما يحذف `project_info` (نوع المشروع، الموقع، العميل، الحالة، التواريخ) و `created_at` من البيانات المحفوظة.

### 2. إنشاء المشروع الجديد لا يُنشئ سجل في `project_data`
في `NewProjectPage.tsx` (سطر 138-142)، يتم الحفظ في `saved_projects` فقط. عند فتح المشروع لاحقاً، يحاول النظام مزامنة البيانات لـ `project_data` لكن هذا قد يفشل بصمت (سطر 181).

### 3. زر الحفظ لا يتحقق من نجاح العملية
`Promise.all` في سطر 1179 لا يفحص `error` من أي من الاستعلامين — إذا فشل أحدهما يمر الخطأ بصمت.

---

## الحل

### الملف: `src/pages/ProjectDetailsPage.tsx`
- إصلاح `analysisPayload` ليحافظ على `project_info` و `created_at` من `analysis_data` الأصلي عبر spread operator
- إضافة `name` للـ update payload
- فحص `error` من كلا الاستعلامين بعد `Promise.all`
- استخدام `upsert` بدل `update` لـ `project_data` لضمان وجود السجل

### الملف: `src/pages/NewProjectPage.tsx`
- إضافة insert متوازي لـ `project_data` عند إنشاء مشروع جديد بنفس الـ ID

### الملفات المتأثرة
| الملف | التعديل |
|---|---|
| `src/pages/ProjectDetailsPage.tsx` | إصلاح منطق الحفظ |
| `src/pages/NewProjectPage.tsx` | إنشاء سجل project_data |


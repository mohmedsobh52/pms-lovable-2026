

# إصلاح خطأ "Cannot read properties of null (reading 'total_value')"

## السبب الجذري

الدالة `getSafeProjectTotal` تُستدعى في سطرين 826-827 بـ `selectedProject!` (non-null assertion) داخل محتوى الـ Dialog. رغم أن الـ Dialog يكون مغلقاً عندما `selectedProject === null`، إلا أن React يقيّم (renders) المحتوى الداخلي حتى لو كان الـ Dialog مغلقاً. النتيجة: `getSafeProjectTotal(null!)` يحاول قراءة `null.total_value` فيحدث الكراش.

## الحل

### 1. إضافة حماية null في `getSafeProjectTotal`

```typescript
function getSafeProjectTotal(project: ProjectData | null | undefined): number {
  if (!project) return 0;
  const storedTotal = project.total_value || 0;
  // ... باقي المنطق كما هو
}
```

### 2. إزالة non-null assertions في حوار التفاصيل (سطر 826-827)

```typescript
// الحالي:
getSafeProjectTotal(selectedProject!)

// الجديد:
getSafeProjectTotal(selectedProject)
```

### 3. إضافة حماية إضافية لمحتوى الـ Dialog

لف محتوى الـ Dialog بشرط `selectedProject` لتجنب أي عمليات حساب غير ضرورية عندما لا يوجد مشروع محدد:

```typescript
<DialogContent>
  {selectedProject && (
    // ... المحتوى الحالي
  )}
</DialogContent>
```

## التفاصيل التقنية

| الملف | التغيير |
|-------|---------|
| `src/pages/SavedProjectsPage.tsx` | إضافة null guard في getSafeProjectTotal + إزالة non-null assertions + لف محتوى Dialog بشرط |

هذا إصلاح بسيط ومباشر يمنع الكراش نهائياً.

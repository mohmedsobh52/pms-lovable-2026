

# إصلاح خطأ user_id + إضافة المشاريع الأخيرة في صفحة BOQ Items

## 1. تشخيص الخطأ (السبب الجذري)

في `src/components/project-details/BOQUploadDialog.tsx`، الدالة `saveItemsToProject` تبني كل صف بهذا الشكل:

```typescript
const rows = items.map((item: any, idx: number) => ({
  project_id: projectId,
  user_id: user.id,   // ← هذا هو المشكلة
  ...
}));
```

جدول `project_items` في قاعدة البيانات **لا يحتوي على عمود `user_id`**. الأعمدة الموجودة هي:

`id, project_id, item_number, description, unit, quantity, unit_price, total_price, category, notes, created_at, overhead_percentage, profit_percentage, pricing_notes, is_detailed_priced, sort_order, description_ar, subcategory, specifications, is_section`

**الإصلاح:** حذف `user_id: user.id` من كائن الصف المُدرَج، والاكتفاء بـ `project_id` للربط.

## 2. إضافة المشاريع الأخيرة في صفحة BOQ Items

في `src/pages/BOQItemsPage.tsx`، عند غياب `analysisData`، نضيف قسماً يعرض آخر 4 مشاريع حديثة من `saved_projects` مع إمكانية فتح أي منها مباشرة (تحميل `analysis_data` في الـ context).

**التصميم:**
```
┌─────────────────────────────────────────────────────┐
│  📋  بنود جدول الكميات                              │
│  لا توجد بيانات تحليل حالياً                        │
│                                                     │
│  [ 📤 رفع ملف BOQ ]   [ 📁 فتح مشروع ]             │
│                                                     │
│  ── المشاريع الأخيرة ──                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│  │  مشروع أ    │ │  مشروع ب    │ │  مشروع ج    ││
│  │  120 بند    │ │   85 بند    │ │   67 بند    ││
│  │  [فتح]      │ │  [فتح]      │ │  [فتح]      ││
│  └──────────────┘ └──────────────┘ └──────────────┘│
└─────────────────────────────────────────────────────┘
```

عند الضغط على "فتح" لأي مشروع:
- يُحمَّل `analysis_data` من `saved_projects` مباشرة في الـ context
- تُعرض `AnalysisResults` فوراً دون انتقال لصفحة أخرى

## التغييرات التقنية التفصيلية

### الملف 1: `src/components/project-details/BOQUploadDialog.tsx`

**السطر المُصلَح (78-88):** حذف `user_id` فقط:

```typescript
const rows = items.map((item: any, idx: number) => ({
  project_id: projectId,
  // user_id: user.id,  ← محذوف — العمود غير موجود في الجدول
  item_number: item.item_number || item.number || String(idx + 1),
  description: item.description || item.desc || "",
  unit: item.unit || "",
  quantity: parseFloat(item.quantity) || 0,
  unit_price: parseFloat(item.unit_price || item.rate || 0) || null,
  total_price: parseFloat(item.total_price || item.amount || 0) || null,
  sort_order: idx,
}));
```

يمكن أيضاً إزالة `const { data: { user } } = await supabase.auth.getUser()` إذا لم يُستخدم في مكان آخر داخل نفس الدالة (تنظيف الكود).

### الملف 2: `src/pages/BOQItemsPage.tsx`

**إضافات:**
1. استيراد `useEffect` + `useAuth` + `projectService`
2. State جديدة: `recentProjects` + `loadingRecent`
3. `useEffect` يجلب المشاريع الأخيرة عند تحميل الصفحة
4. قسم "المشاريع الأخيرة" في الحالة الفارغة

**منطق تحميل المشروع للعرض المباشر:**
```typescript
const handleOpenProject = (project: any) => {
  if (project.analysis_data) {
    setAnalysisData({
      ...project.analysis_data,
      file_name: project.file_name || project.name,
    });
  }
};
```

**قسم المشاريع الأخيرة:**
```typescript
{recentProjects.length > 0 && (
  <div className="w-full max-w-2xl">
    <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">
      {isArabic ? "المشاريع الأخيرة" : "Recent Projects"}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {recentProjects.map(project => (
        <div key={project.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div>
            <p className="font-medium text-sm">{project.name}</p>
            <p className="text-xs text-muted-foreground">
              {project.analysis_data?.items?.length || 0} {isArabic ? "بند" : "items"}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => handleOpenProject(project)}>
            {isArabic ? "فتح" : "Open"}
          </Button>
        </div>
      ))}
    </div>
  </div>
)}
```

## ملخص الملفات المتأثرة

| الملف | نوع التغيير | وصف |
|-------|------------|-----|
| `src/components/project-details/BOQUploadDialog.tsx` | إصلاح خطأ | حذف `user_id` من INSERT في `project_items` |
| `src/pages/BOQItemsPage.tsx` | تحسين | إضافة قسم المشاريع الأخيرة في الحالة الفارغة |

لا تغييرات على قاعدة البيانات أو Edge Functions.


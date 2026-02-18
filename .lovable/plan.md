
# إضافة تبويب "التحليل المتقدم" في صفحة تفاصيل المشروع

## ما يريده المستخدم

الشاشة في الصورة هي مكون `AnalysisResults` — واجهة التحليل الكاملة التي تحتوي على تبويبات:
- Items (جدول البنود مع التسعير والأكواد والفلاتر)
- WBS (هيكل تقسيم العمل)
- Cost (تحليل التكاليف)
- Brief (ملخص)
- Charts (الرسوم البيانية)
- Time Schedule (الجدول الزمني)
- Schedule Integration
- Synced

المستخدم يريد هذه الشاشة **داخل قسم المشاريع** — أي كتبويب إضافي في صفحة `/projects/:id`.

## التشخيص الحالي

صفحة `/projects/:id` (`ProjectDetailsPage.tsx`) تحتوي حالياً على 4 تبويبات:
1. **Overview** — نظرة عامة
2. **BOQ** — جدول كميات بسيط (`ProjectBOQTab`)
3. **Documents** — المستندات
4. **Settings** — الإعدادات

`ProjectBOQTab` هو مكون **بسيط** يعرض جدول البنود فقط. أما `AnalysisResults` فهو المكون **الكامل** بكل الإمكانيات المتقدمة.

## الحل

إضافة تبويب خامس اسمه **"تحليل متقدم"** يعرض `AnalysisResults` بالكامل، مع تحويل بيانات `project_items` من قاعدة البيانات إلى الصيغة المطلوبة.

## التغييرات التقنية

### الملف الوحيد: `src/pages/ProjectDetailsPage.tsx`

#### 1. استيراد `AnalysisResults`
```typescript
import { AnalysisResults } from "@/components/AnalysisResults";
```

#### 2. تحويل بيانات المشروع إلى صيغة AnalysisData

مكون `AnalysisResults` يقبل `data` من نوع `AnalysisData` يحتوي على:
```typescript
{
  analysis_type: string;
  items: BOQItem[];
  summary: { total_items, total_value, categories, currency };
}
```

بينما `project_items` من قاعدة البيانات يحتوي على نفس الحقول تقريباً. نبني دالة `useMemo` لتحويل البيانات:

```typescript
const projectAnalysisData = useMemo(() => {
  if (!project || items.length === 0) return null;
  return {
    analysis_type: "boq",
    file_name: project.file_name || project.name,
    items: items.map(item => ({
      item_number: item.item_number || "",
      description: item.description || "",
      unit: item.unit || "",
      quantity: item.quantity || 0,
      unit_price: item.unit_price || null,
      total_price: item.total_price || null,
      category: item.category || "General",
      is_section: item.is_section || false,
    })),
    summary: {
      total_items: items.length,
      total_value: pricingStats.totalValue,
      categories: [...new Set(items.map(i => i.category).filter(Boolean))],
      currency: project.currency || "SAR",
    },
  };
}, [project, items, pricingStats]);
```

#### 3. إضافة التبويب الجديد

في `TabsList`:
```typescript
<TabsTrigger value="analysis">
  <Brain className="w-4 h-4 mr-1" />
  {isArabic ? "تحليل متقدم" : "Advanced Analysis"}
</TabsTrigger>
```

في `TabsContent`:
```typescript
<TabsContent value="analysis">
  {projectAnalysisData ? (
    <AnalysisResults
      data={projectAnalysisData}
      fileName={project?.file_name || project?.name}
      savedProjectId={projectId}
      onApplyRate={async (itemNumber, newRate) => {
        // تحديث السعر مباشرة في قاعدة البيانات
        const item = items.find(i => i.item_number === itemNumber);
        if (!item) return;
        await supabase
          .from("project_items")
          .update({ unit_price: newRate, total_price: (item.quantity || 0) * newRate })
          .eq("id", item.id);
        // إعادة تحميل البنود
        const { data } = await supabase
          .from("project_items")
          .select("*")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true });
        if (data) setItems(data);
      }}
    />
  ) : (
    <div className="text-center py-16 text-muted-foreground">
      <p>{isArabic ? "لا توجد بنود للتحليل. ارفع ملف BOQ أولاً." : "No items to analyze. Upload a BOQ file first."}</p>
      <Button className="mt-4" onClick={() => setShowBOQUploadDialog(true)}>
        {isArabic ? "رفع ملف BOQ" : "Upload BOQ"}
      </Button>
    </div>
  )}
</TabsContent>
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/ProjectDetailsPage.tsx` | إضافة استيراد + `useMemo` لتحويل البيانات + تبويب جديد |

لا تغييرات على قاعدة البيانات أو أي ملفات أخرى.

## ملاحظة مهمة

`AnalysisResults` مكون ضخم جداً (2598 سطر) ويتضمن كل وظائف التسعير والتحليل والتصدير. عند فتح تبويب "تحليل متقدم":
- التغييرات في الأسعار ستُحفظ في قاعدة البيانات مباشرة عبر `onApplyRate`
- كل وظائف التصدير (Excel, PDF, Word) ستعمل تلقائياً بدون تعديل
- جميع التبويبات الداخلية (Items, WBS, Cost...) ستكون متاحة

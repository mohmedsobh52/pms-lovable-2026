
# المرحلة 12: إصلاح التنقل بين الصفحات + تحسين WBS + تحسين الأداء العام

---

## 12.1 إصلاح مشكلة العودة لنقطة البداية عند التنقل بين الصفحات (خلل حرج)

### المشكلة
عند التنقل بين تبويبات الشريط الجانبي (WBS, Cost, Brief, Charts, Time Schedule, Schedule Integration)، ثم الخروج من تبويب "Analysis" في ProjectDetailsPage والعودة إليه، يتم إعادة تعيين `activeTab` إلى `"items"` لأن:
1. Radix UI `TabsContent` يُلغي تحميل (unmount) المحتوى عند تبديل التبويب الخارجي
2. `AnalysisResults` يُعاد تحميله بالكامل (remount) فيعود `useState("items")` للقيمة الأولية

### التعديلات المطلوبة

**الملف:** `src/components/AnalysisResults.tsx`

- تغيير `useState("items")` لاستخدام `sessionStorage` لحفظ التبويب النشط:
```typescript
const [activeTab, setActiveTab] = useState<...>(() => {
  const saved = sessionStorage.getItem(`analysis_active_tab_${savedProjectId}`);
  return (saved as typeof activeTab) || "items";
});
```
- إضافة `useEffect` لحفظ التبويب عند تغييره:
```typescript
useEffect(() => {
  if (savedProjectId) {
    sessionStorage.setItem(`analysis_active_tab_${savedProjectId}`, activeTab);
  }
}, [activeTab, savedProjectId]);
```

**الملف:** `src/pages/ProjectDetailsPage.tsx`

- إضافة `forceMount` على `TabsContent` الخاص بـ "analysis" لمنع إلغاء التحميل:
```tsx
<TabsContent value="analysis" forceMount className={activeTab !== "analysis" ? "hidden" : ""}>
```

---

## 12.2 إصلاح أخطاء شاشة WBS

### المشكلة
1. تحذير Console: `CostAnalysis` لا يدعم `ref` (Radix يحاول تمرير ref)
2. شاشة WBS تعمل لكن تحتاج تحسينات أداء

### التعديلات المطلوبة

**الملف:** `src/components/CostAnalysis.tsx`

- تحويل `CostAnalysis` إلى `forwardRef` لإصلاح تحذير Console:
```typescript
export const CostAnalysis = React.forwardRef<HTMLDivElement, CostAnalysisProps>(
  function CostAnalysis({ items, currency = "ر.س" }, ref) {
    // ... existing code
    return <div ref={ref}>...</div>;
  }
);
```

**الملف:** `src/components/WBSFlowDiagram.tsx`

- تحسين حساب مواقع العُقد (nodes) باستخدام `useMemo`
- إضافة error boundary داخلي لمنع تعطل الصفحة عند بيانات WBS غير مكتملة
- إضافة null-check على `parent_code` قبل البحث عن العُقد الأب

**الملف:** `src/components/WBSTreeDiagram.tsx`

- التأكد أن `useMemo` و `React.memo` مطبقة بشكل صحيح (تم في المرحلة 10)
- إضافة حماية ضد البيانات الفارغة أو المكررة في `wbsData`

---

## 12.3 تحسين أداء شاشات Charts و DataCharts

### التعديلات المطلوبة

**الملف:** `src/components/DataCharts.tsx`

- التأكد أن `useMemo` مطبق على جميع حسابات الرسوم البيانية
- إضافة `useCallback` لدوال التفاعل (`fetchAIInsights`, `CustomTooltip`)
- تحسين responsive عبر تقليل عدد labels في المحور X للشاشات الصغيرة
- إضافة transition animation عند تبديل نوع الرسم

---

## 12.4 تحسين أداء شاشة Time Schedule و Schedule Integration

### التعديلات المطلوبة

**الملف:** `src/components/ProjectTimeline.tsx`

- التأكد أن `useMemo` مطبق على حسابات Gantt chart
- إضافة skeleton loading أثناء توليد الجدول الزمني
- تحسين عرض Critical Path بلون أحمر واضح + خط أعرض

**الملف:** `src/components/ScheduleIntegration.tsx`

- التأكد أن cache الـ `localStorage` يعمل بشكل صحيح (تم في المرحلة 10)
- تحسين loading state مع skeleton بدلاً من spinner

---

## 12.5 تحسين الرسوم البيانية والصور

### التعديلات المطلوبة

**الملفات:** `DataCharts.tsx`, `CostAnalysis.tsx`, `ScheduleIntegration.tsx`

- ضمان أن جميع الرسوم تستخدم `ResponsiveContainer` بأبعاد مناسبة
- تحسين الألوان والتدرجات في الرسوم
- إضافة خاصية `animationDuration` مناسبة لكل نوع رسم
- تحسين tooltip styling لجعلها أوضح

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/components/AnalysisResults.tsx` | حفظ التبويب في sessionStorage |
| `src/pages/ProjectDetailsPage.tsx` | forceMount على analysis tab |
| `src/components/CostAnalysis.tsx` | forwardRef + تحسين أداء |
| `src/components/WBSFlowDiagram.tsx` | null checks + error handling |
| `src/components/WBSTreeDiagram.tsx` | حماية بيانات فارغة |
| `src/components/DataCharts.tsx` | useCallback + responsive |
| `src/components/ProjectTimeline.tsx` | skeleton loading |
| `src/components/ScheduleIntegration.tsx` | تحسين loading state |

## ترتيب التنفيذ

1. إصلاح مشكلة العودة لنقطة البداية (الأهم - sessionStorage + forceMount)
2. إصلاح CostAnalysis forwardRef warning
3. تحسين WBS error handling
4. تحسين Charts و Timeline و Integration (responsive + skeleton + animations)

## النتيجة المتوقعة

- التنقل بين WBS/Cost/Brief/Charts/Timeline/Integration يحافظ على الموقع عند العودة
- اختفاء تحذير Console الخاص بـ CostAnalysis ref
- WBS لا يتعطل عند بيانات ناقصة
- رسوم بيانية أسرع وأجمل مع animations سلسة

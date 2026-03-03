

# خطة: إضافة أيقونة تحليل المخططات في الصفحة الرئيسية

## التعديل على `src/pages/HomePage.tsx`

1. إضافة `Ruler` (أو `PenTool`) من `lucide-react` في الـ imports
2. إضافة عنصر جديد في فئة "إدارة المشاريع" (Project Management):

```
{ nameAr: "تحليل المخططات", nameEn: "Drawing Analysis", descAr: "استخراج الكميات من المخططات", descEn: "Extract quantities from drawings", path: "/drawing-analysis", icon: Ruler, countKey: "drawing_analyses" }
```

3. إضافة `"drawing_analyses"` في مصفوفة `tableKeys` لعرض عدد التحليلات المحفوظة

**ملف واحد فقط يتأثر:** `src/pages/HomePage.tsx`


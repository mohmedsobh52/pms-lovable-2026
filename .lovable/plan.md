

# إضافة BOQAnalyzerPanel داخل تبويب Analysis

## الهدف

عند فتح مشروع محفوظ وعدم وجود بيانات تحليل، يظهر حالياً بطاقة "Upload BOQ File" فقط. المطلوب استبدالها بمكون `BOQAnalyzerPanel` الكامل (نفس المكون الموجود في تبويب "Analyze BOQ" بصفحة المشاريع المحفوظة) بحيث يتمكن المستخدم من تحليل ملف BOQ مباشرة من داخل صفحة تفاصيل المشروع.

## التعديل المطلوب

### ملف واحد: `src/pages/ProjectDetailsPage.tsx`

#### 1. إضافة import لمكون BOQAnalyzerPanel
```typescript
import { BOQAnalyzerPanel } from "@/components/BOQAnalyzerPanel";
```

#### 2. استبدال بطاقة "Upload BOQ File" (الأسطر 1140-1174) بمكون BOQAnalyzerPanel

الحالة الحالية: بطاقة رفع ملفات بسيطة.

الحالة الجديدة: تضمين `BOQAnalyzerPanel` بالكامل مع خاصية `embedded={true}` و `onProjectSaved` لإعادة تحميل بيانات المشروع بعد الحفظ.

```typescript
<BOQAnalyzerPanel 
  embedded={true}
  onProjectSaved={(savedProjectId) => {
    // إعادة تحميل بيانات المشروع بعد الحفظ
    fetchProjectData(); // أو الدالة المناسبة الموجودة فعلاً
  }}
/>
```

هذا يوفر للمستخدم كل إمكانيات تحليل BOQ:
- رفع ملف PDF أو Excel
- سحب وإفلات
- إدخال نص يدوي
- معاينة بيانات Excel
- تحليل محلي وتحليل بالذكاء الاصطناعي
- عرض النتائج وحفظ المشروع

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/ProjectDetailsPage.tsx` | إضافة import + استبدال بطاقة الرفع بـ BOQAnalyzerPanel |

## النتيجة المتوقعة

- عند عدم وجود بيانات تحليل في تبويب Analysis، يظهر BOQAnalyzerPanel الكامل
- عند وجود بيانات تحليل، يظهر AnalysisResults كما هو حالياً (لا تغيير)

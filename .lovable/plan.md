
# خطة: إصلاح خطأ NotificationProvider وإضافة الاقتراحات

## المشكلة
صفحة عروض الأسعار (Quotations) تعطي خطأ لأن مكون `QuotationUpload` يستخدم `useNotifications()` لكن `NotificationProvider` غير مضاف في `App.tsx`.

## الحل

### 1. إصلاح الخطأ (`src/App.tsx`)
- استيراد `NotificationProvider` من `@/hooks/useNotifications`
- إضافته كـ wrapper حول المحتوى داخل شجرة المكونات (بعد `AuthProvider`)

### 2. إضافة اقتراحات لصفحة عروض الأسعار (`src/lib/page-tips.ts`)
إضافة نصائح جديدة لمسار `/quotations`:
- "ارفع عروض أسعار PDF أو Excel لتحليلها تلقائياً بالذكاء الاصطناعي"
- "قارن بين عروض الأسعار من موردين مختلفين لاختيار الأفضل"
- "استورد البنود المحللة إلى مكتبة الأسعار لاستخدامها لاحقاً"
- "صدّر تقرير مقارنة العروض كملف PDF احترافي"

### الملفات المتأثرة:
1. `src/App.tsx` - إضافة NotificationProvider
2. `src/lib/page-tips.ts` - إضافة نصائح صفحة عروض الأسعار

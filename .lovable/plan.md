

# دمج مكونات v11 في شاشة تحليل المخططات

## المشكلة
اللوحات الثلاث الجديدة (PipeNetworkPanel, EarthworksPanel, AsphaltPanel) ومحركات الحساب v11 تم إنشاؤها لكنها **غير مدمجة** في الصفحة الرئيسية. الصفحة لا تزال تعرض "v9" ولا تستخدم الأدوات الجديدة.

## التعديلات على `src/pages/DrawingAnalysisPage.tsx`

### 1. تحديث الإصدار من v9 إلى v11
- تحديث كل نص "v9" → "v11" (sidebar، localStorage key، عناوين)

### 2. إضافة imports للمكونات الجديدة
- استيراد `PipeNetworkPanel`, `EarthworksPanel`, `AsphaltPanel` من `drawing-analysis`
- استيراد `exportPipeScheduleCSV`, `exportEarthworksCSV`, `exportAsphaltCSV`
- استيراد `buildPipeNetwork`, `calcTrenchEarthworks`, `calcAsphalt`, `extractEarthworksData`, `extractAsphaltLayers`

### 3. إضافة 3 tabs جديدة في الـ sidebar
- `pipes` — 🔧 شبكة المواسير
- `earthworks` — 🛣️ الحفر والردم  
- `asphalt` — 🛤️ الأسفلت
- تظهر فقط عند وجود بيانات (`infraMeta`)

### 4. إضافة state جديد لبيانات المحركات
- `pipeNetwork` — نتيجة `buildPipeNetwork`
- `earthworksData` — نتيجة حسابات الحفر
- `asphaltData` — نتيجة حسابات الأسفلت
- يتم حسابها تلقائياً بعد اكتمال الاستخراج (`feState?.phase === "done"`)

### 5. إضافة أزرار تصدير جديدة في شريط الأدوات
- CSV مواسير، CSV حفر، CSV أسفلت (تظهر فقط عند توفر البيانات)

### 6. إضافة 6 اقتراحات ذكية جديدة
**في configSuggestions:**
- عند اكتشاف أنابيب بدون تفعيل وحدة الحفر → "فعّل وحدة الحفر والردم"
- عند اكتشاف نوع ROAD بدون أسفلت → "فعّل قالب الأسفلت"

**في analysisSuggestions:**
- عند وجود أنابيب بدون استخدام قالب تفصيلي → "استخدم قالب مواسير تفصيلي"
- عند وجود بيانات حفر بدون حساب → "احسب الحفر والردم تلقائياً"
- عند وجود بيانات أسفلت بدون حساب → "احسب الأسفلت تلقائياً"
- عند اكتمال التحليل بدون حفظ → "احفظ التحليل"

### 7. عرض اللوحات الثلاث في tabs مستقلة
- كل tab يعرض اللوحة المقابلة مع تمرير `T` و `D` و البيانات المناسبة

## الملفات المتأثرة

| الملف | التعديل |
|---|---|
| `src/pages/DrawingAnalysisPage.tsx` | دمج اللوحات + tabs + exports + suggestions + v11 |


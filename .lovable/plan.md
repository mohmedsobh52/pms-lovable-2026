

# تحديث بيانات شاشة تحليل المخططات — ترقية من v9 إلى v11

## الفرق بين الحالي (v9) والملف المرفق (v11)

بعد مقارنة تفصيلية بين الملف المرفق `alimtyaz_v11.jsx` (3996 سطر) والكود الحالي، هناك **بيانات ومحركات حسابية كاملة غير موجودة** في الكود الحالي:

---

## 1. تحديث مرجع الأسعار (`constants.ts`)

**الحالي**: SAR_REF_2025 مختصر (~74 سطر) بأسعار عامة
**المطلوب**: SAR_REF_2025 مفصّل (~130 سطر) يشمل:
- أسعار الحفر حسب العمق (≤2م / 2-4م / 4-6م)
- أسعار الأسفلت حسب السماكة مع الكثافة (Wearing/Binder/Base)
- أسعار Prime Coat و Tack Coat
- أسعار حواجز نيوجرسي وأرصفة وعلامات مرورية
- دعم جوانب الخندق وضخ مياه جوفية
- معادلات الحفر والأسفلت الإلزامية
- مواصفات NWC الإلزامية (ميل أدنى، صمام هواء، كتلة دفع)

**إضافة 3 قوالب جديدة** إلى `TMPL`:
- `🔧 مواسير تفصيلي` — تحليل مواد وقطر وPN/SN
- `🛣️ حفر وردم تفصيلي` — جدول حفر/ردم/تخلص بالمعادلات
- `🛤️ أعمال الأسفلت` — طبقات الرصف بالكثافة والوزن

---

## 2. إضافة محركات الحساب (`helpers.ts`)

**غير موجودة حالياً — كلها جديدة:**

### أ. محرك الأنابيب v5
- `PIPE_MATERIALS` — قاموس 9 مواد (PVC/HDPE/GRP/DI/RCP/GI/Steel/Clay) مع PN/SN/Color
- `detectPipeMaterial(context)` — كشف المادة من السياق
- `detectPipeClass(context)` — كشف SN/PN/Class
- `extractPipeSlopes(text)` — استخراج ميل الأنابيب
- `buildPipeNetwork(extractedData)` — تجميع شبكة الأنابيب عبر الصفحات

### ب. محرك الحفر والردم v6
- `SOIL_PARAMS` — 5 أنواع تربة (رمل/عادية/طين/حصى/صخر) مع عوامل الانتفاش والانضغاط
- `trenchWidth(diaMM, depthM)` — عرض خندق معياري NWC/MOT
- `calcTrenchEarthworks({...})` — حساب كامل لخندق (فصل تربة/صخر، دعم جوانب، ضخ مياه)
- `sumEarthworks(trenchList)` — تجميع عدة خنادق
- `extractEarthworksData(text)` — استخراج بيانات التربة والصخر من النص

### ج. محرك الأسفلت v6
- `ASPHALT_LAYERS` — 7 طبقات مع كثافة وأسعار (Wearing/Binder/Base/Sub-base/Prime/Tack)
- `ROAD_STRUCTURES` — 5 هياكل MOT 2024 (محلي/جامع/شرياني/سريع/خدمي)
- `calcAsphalt({...})` — حساب شامل لقطاع طريق (وزن بالطن، تكاليف)
- `extractAsphaltLayers(text)` — استخراج سُمكات الطبقات من النص

---

## 3. تحديث استخراج بيانات PDF (`helpers.ts`)

`extractPageData` الحالي يفتقر إلى:
- استخراج `slopes` (ميل الأنابيب)
- استخراج `chainages` (محطات القياس)
- استخراج `manholes` (أرقام الغرف)
- استخراج `pipeSpecs` (مواصفات الأنابيب الكاملة مادة+قطر+فئة)
- استخراج `pipeEntries` (سجلات الأنابيب التفصيلية من الجداول)
- استخراج `ewData` (بيانات الحفر والتربة)
- استخراج `aspData` (بيانات الأسفلت)

---

## 4. تحديث System Prompts

**الحالي (v9)**: prompts عامة بدون تفصيل حسابات الحفر والأسفلت
**المطلوب (v11)**: prompts محدّثة تشمل:
- `SYS_MAIN` — بروتوكول v6 مع معادلات الحفر والأسفلت الإلزامية
- `SYS_VISUAL_INFRA` — 8 خطوات + بروتوكول الحفر v6 + بروتوكول الأسفلت MOT
- `SYS_MERGE` — 12 خطوة دمج (كانت مختصرة) + جداول حفر/أسفلت تفصيلية
- `SYS_FAST` — تحديث لتشمل حفر وأسفلت
- `SYS_HYBRID` — تحديث مطابقة المادة

---

## 5. إضافة مكونات عرض جديدة

- `PipeNetworkPanel.tsx` — لوحة شبكة الأنابيب (بطاقات ملونة + شريط مواد + تفاصيل)
- `EarthworksPanel.tsx` — لوحة الحفر والردم (KPIs + تنبيهات + جدول تفصيلي بالقطر)
- `AsphaltPanel.tsx` — لوحة الأسفلت (KPIs + مقطع طبقات + جدول كامل + BOQ جاهز)

---

## 6. تحديث التصدير

إضافة 3 دوال تصدير جديدة:
- `exportPipeScheduleCSV` — جدول الأنابيب التفصيلي
- `exportEarthworksCSV` — جدول الحفر والردم
- `exportAsphaltCSV` — جدول الأسفلت والرصف

تحديث `exportCSV`/`exportJSON`/`exportMD` لإصدار v11

---

## 7. تحديث `buildProjectContext`

الحالي يستخرج فقط: مشروع، مقياس، جهة، أكواد KSA
المطلوب إضافة: أعمال ترابية متراكمة، نوع التربة، صخر/مياه جوفية، أعمال رصف، إجمالي التكلفة

---

## الملفات المتأثرة

| الملف | نوع التعديل |
|---|---|
| `src/components/drawing-analysis/constants.ts` | تحديث SAR_REF_2025 + إضافة 3 TMPL |
| `src/components/drawing-analysis/helpers.ts` | إضافة محركات الحساب + تحديث extractPageData + prompts + exports + buildProjectContext |
| `src/components/drawing-analysis/PipeNetworkPanel.tsx` | **جديد** — لوحة شبكة الأنابيب |
| `src/components/drawing-analysis/EarthworksPanel.tsx` | **جديد** — لوحة الحفر والردم |
| `src/components/drawing-analysis/AsphaltPanel.tsx` | **جديد** — لوحة الأسفلت |
| `src/components/drawing-analysis/index.ts` | تحديث التصديرات |
| `src/pages/DrawingAnalysisPage.tsx` | دمج اللوحات الجديدة في الـ sidebar |


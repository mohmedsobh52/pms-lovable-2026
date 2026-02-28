
# خطة: توسيع قاعدة بيانات MEP + إعدادات تحسين دقة التسعير

## نظرة عامة

توسيع قاعدة الأسعار المرجعية لتشمل بنود الكهرباء والسباكة والميكانيك (MEP) بالتفصيل، وإضافة إعدادات تسعير متقدمة في `AnalysisSettingsDialog` لزيادة دقة النتائج، مع تحسين keywords المطابقة في محرك التسعير التلقائي.

---

## 1. توسيع قاعدة الأسعار المرجعية (MEP)

### تحديث `src/lib/reference-prices.ts`

إضافة **50+ بند MEP جديد** مقسم إلى 5 فئات فرعية:

| الفئة | عدد البنود | أمثلة |
|---|---|---|
| كهرباء (electrical) | ~15 بند | لوحة رئيسية MDB، قاطع، مفتاح، مقبس، UPS، مولد، إنارة LED، إنارة طوارئ |
| سباكة (plumbing) | ~12 بند | أنابيب PPR، نحاس، مواسير صرف، أحواض، مراحيض، سخان مياه، خلاطات |
| تكييف (hvac) | ~10 بنود | وحدة مركزية، مجاري هواء، diffuser، chiller، AHU، FCU، معزولات |
| حريق (fire_fighting) | ~8 بنود | شبكة رشاشات، خرطوم، طفاية، لوحة إنذار، كاشف دخان، صندوق حريق |
| ذكي/BMS (smart) | ~5 بنود | نظام BMS، كاميرات مراقبة، نظام دخول، إنتركم، أنظمة صوت |

### تحديث `src/components/project-details/AutoPriceDialog.tsx`

إضافة keywords خبير جديدة في `EXPERT_KEYWORDS`:
- كهرباء: mdb, switchgear, socket, outlet, led, generator, ups, breaker, mcb
- سباكة: ppr, cpvc, copper pipe, basin, wc, water heater, mixer, trap, floor drain
- تكييف: chiller, ahu, fcu, duct, diffuser, thermostat, vrf, split, package unit
- حريق: sprinkler system, fire hose, extinguisher, smoke detector, fire cabinet
- BMS: bms, cctv, access control, intercom

---

## 2. إعدادات تحسين دقة التسعير

### تحديث `src/components/AnalysisSettingsDialog.tsx`

إضافة قسم جديد "إعدادات التسعير" في الـ Dialog يتضمن:

| الإعداد | النوع | الافتراضي | الوصف |
|---|---|---|---|
| حد الثقة الأدنى | Slider (10-80) | 30 | الحد الأدنى لنسبة الثقة لقبول السعر |
| أولوية المصادر | ترتيب | عروض > تاريخي > مكتبة > مرجعي > AI | ترتيب مصادر التسعير |
| تفعيل MEP المتقدم | Switch | true | تفعيل بنود MEP التفصيلية |
| مطابقة ثنائية اللغة | Switch | true | البحث بالعربي والإنجليزي معاً |
| تطبيق معامل المدينة | Switch | true | تطبيق City Factor تلقائياً |
| المدينة الافتراضية | Select | Riyadh | المدينة المستخدمة للتسعير |

### تحديث interface `AnalysisSettings`
```text
+ pricingConfidenceThreshold: number (30)
+ enableMEPPricing: boolean (true)  
+ enableBilingualMatching: boolean (true)
+ applyCityFactor: boolean (true)
+ defaultCity: string ("Riyadh")
+ pricingSourcePriority: string[] (["quotation","historical","library","reference","market_ai"])
```

---

## 3. تحسين دقة محرك المطابقة

### تحديث `AutoPriceDialog.tsx` - خوارزمية المطابقة

- إضافة **MEP-specific matching**: عند كشف بند MEP (كهرباء/سباكة/تكييف)، زيادة وزن keywords المتخصصة بنسبة 20%
- إضافة **unit validation**: رفض المطابقة إذا كانت الوحدة مختلفة تماماً (مثلاً m3 vs no)
- إضافة **cross-reference check**: مقارنة السعر المقترح مع النطاق المرجعي وتحذير إذا خرج عن النطاق
- قراءة `pricingConfidenceThreshold` من الإعدادات بدلاً من القيمة الثابتة `[30]`

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/lib/reference-prices.ts` | إضافة 50+ بند MEP جديد |
| `src/components/project-details/AutoPriceDialog.tsx` | إضافة MEP keywords + قراءة الإعدادات + تحسين المطابقة |
| `src/components/AnalysisSettingsDialog.tsx` | إضافة قسم "إعدادات التسعير" مع 6 عناصر تحكم جديدة |
| `src/lib/local-excel-analysis.ts` | إضافة فئات MEP فرعية للتصنيف |

### بنية بنود MEP المرجعية الجديدة

```text
// Electrical - Extended
{ keywords: ["main distribution board", "mdb"], keywordsAr: ["لوحة توزيع رئيسية"], unit: "no", category: "electrical" }
{ keywords: ["socket outlet", "power socket"], keywordsAr: ["مقبس كهرباء", "بريزة"], unit: "no", category: "electrical" }
{ keywords: ["led light", "led panel", "led downlight"], keywordsAr: ["إضاءة ليد", "لمبة ليد"], unit: "no", category: "electrical" }
{ keywords: ["generator", "diesel generator"], keywordsAr: ["مولد كهربائي", "مولد ديزل"], unit: "no", category: "electrical" }

// Plumbing  
{ keywords: ["ppr pipe"], keywordsAr: ["مواسير بي بي آر"], unit: "m", category: "plumbing" }
{ keywords: ["wash basin", "lavatory"], keywordsAr: ["حوض غسيل", "مغسلة"], unit: "no", category: "plumbing" }
{ keywords: ["water closet", "wc", "toilet"], keywordsAr: ["مرحاض", "كرسي حمام"], unit: "no", category: "plumbing" }
{ keywords: ["water heater", "boiler"], keywordsAr: ["سخان مياه", "بويلر"], unit: "no", category: "plumbing" }

// HVAC
{ keywords: ["chiller", "water cooled chiller"], keywordsAr: ["تشيلر", "مبرد مياه"], unit: "no", category: "hvac" }
{ keywords: ["air handling unit", "ahu"], keywordsAr: ["وحدة مناولة هواء"], unit: "no", category: "hvac" }
{ keywords: ["fan coil unit", "fcu"], keywordsAr: ["وحدة ملف مروحة"], unit: "no", category: "hvac" }
{ keywords: ["ductwork", "gi duct", "galvanized duct"], keywordsAr: ["مجاري هواء", "دكت"], unit: "kg", category: "hvac" }

// Fire Fighting
{ keywords: ["fire hose cabinet", "fire cabinet"], keywordsAr: ["صندوق حريق", "خرطوم حريق"], unit: "no", category: "fire_fighting" }
{ keywords: ["smoke detector"], keywordsAr: ["كاشف دخان"], unit: "no", category: "fire_fighting" }
```

### منطق إعدادات التسعير

```text
// في AutoPriceDialog - قراءة الإعدادات
const settings = getAnalysisSettings();
const threshold = settings.pricingConfidenceThreshold || 30;

// تصفية النتائج حسب الإعدادات
if (!settings.enableMEPPricing) {
  // تخطي بنود MEP من المطابقة المرجعية
}

if (settings.applyCityFactor) {
  // تطبيق معامل المدينة على السعر المقترح
  suggestedPrice *= getCityFactor(settings.defaultCity);
}
```



# ترقية نظام العقود الهندسية - تصميم احترافي Pro Contracts

## الهدف

ترقية مكون `ContractManagement.tsx` ليتوافق مع التصميم الاحترافي المرفق، مع الحفاظ على جميع الوظائف الحالية وإضافة ميزات جديدة.

## التغييرات الرئيسية

### 1. إعادة تصميم الهيكل العام

**الملف:** `src/components/ContractManagement.tsx`

تحويل المكون من بطاقة بسيطة إلى واجهة متعددة التبويبات بتصميم احترافي:

- **هيدر احترافي** بتدرج لوني أزرق-ذهبي مع شريط إحصائيات (عدد العقود، النشطة، إجمالي القيمة، نسبة الإنجاز)
- **شريط تنقل داخلي** بـ 5 تبويبات: إنشاء عقد | FIDIC | القوالب | الميزات | العقود الحالية
- **تبويب إنشاء عقد**: النموذج الحالي مع تحسينات التصميم (بطاقات أقسام منفصلة، حقول ثنائية اللغة)
- **تبويب FIDIC**: بطاقات كتب FIDIC الستة (أحمر، أصفر، فضي، أخضر، ذهبي، أبيض) مع ألوان مميزة وإمكانية الاختيار
- **تبويب القوالب**: قوالب عقود جاهزة (مقاولات عامة، تصميم وبناء، استشارات، تشغيل وصيانة)
- **تبويب العقود الحالية**: القائمة الحالية للعقود مع البحث والفلترة

### 2. تحسين نموذج إنشاء العقد

بدلاً من Dialog بخطوات (wizard)، يصبح النموذج مباشراً في التبويب الأول مع:

- **قسم نوع العقد و FIDIC**: اختيار نوع المشروع + كتاب FIDIC + رقم العقد + التاريخ
- **قسم صاحب العمل (Employer)**: حقول ثنائية اللغة (الاسم عربي/إنجليزي، العنوان عربي/إنجليزي، الهوية، الهاتف)
- **قسم المقاول (Contractor)**: نفس البنية الثنائية اللغة
- **قسم القيم المالية**: قيمة العقد، المدة، النسب المالية (محتجز، دفعة مقدمة، ضمان)
- **قسم النطاق والشروط**: مع أزرار AI Generate والترجمة (الموجودة حالياً)

### 3. إضافة بطاقات FIDIC التفاعلية

بطاقات ملونة لكل كتاب FIDIC مع:
- لون مميز في الأعلى (أحمر، أصفر، فضي، أخضر، ذهبي، أبيض)
- اسم الكتاب ثنائي اللغة
- وصف مختصر لنوع المشاريع المناسبة
- علامة اختيار عند التحديد
- ربط مع حقل `contract_type` في النموذج

### 4. إضافة قوالب عقود جاهزة

بطاقات قوالب مع:
- أيقونة كبيرة + عنوان ثنائي اللغة
- وصف مختصر
- زر "استخدام القالب" يملأ النموذج تلقائياً بالبيانات الافتراضية

### 5. تحسينات التصميم

- تدرجات لونية احترافية في الهيدر والأيقونات
- بطاقات معلوماتية ملونة (info boxes) للنصائح
- أزرار بتصميم gradient
- حدود ملونة على يمين البطاقات (RTL-aware)
- تحسين hover effects وانتقالات
- دعم كامل RTL/LTR

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/ContractManagement.tsx` | إعادة تصميم كاملة مع Tabs داخلية + FIDIC cards + Templates |

### هيكل التبويبات الجديد

```text
Tabs (داخل ContractManagement)
  |-- إنشاء عقد (create): النموذج المحسن بأقسام بطاقات
  |-- FIDIC: بطاقات الكتب الستة مع وصف تفصيلي
  |-- القوالب (templates): قوالب جاهزة للاستخدام السريع
  |-- الميزات (features): عرض الميزات المتاحة
  |-- العقود (contracts): القائمة الحالية + البحث + الفلترة + الإحصائيات
```

### بطاقات FIDIC

```typescript
const FIDIC_BOOKS = [
  { id: "fidic_red", color: "red", nameAr: "الكتاب الأحمر", nameEn: "Red Book", 
    descAr: "المقاولات التقليدية - تصميم من صاحب العمل", descEn: "Traditional Construction - Employer's Design" },
  { id: "fidic_yellow", color: "yellow", nameAr: "الكتاب الأصفر", nameEn: "Yellow Book",
    descAr: "التصميم والبناء", descEn: "Design-Build" },
  { id: "fidic_silver", color: "silver", nameAr: "الكتاب الفضي", nameEn: "Silver Book",
    descAr: "تسليم مفتاح EPC", descEn: "EPC/Turnkey" },
  { id: "fidic_green", color: "green", nameAr: "الكتاب الأخضر", nameEn: "Green Book",
    descAr: "عقود قصيرة المدة", descEn: "Short Form" },
  { id: "fidic_gold", color: "gold", nameAr: "الكتاب الذهبي", nameEn: "Gold Book",
    descAr: "التصميم والبناء والتشغيل", descEn: "Design-Build-Operate" },
  { id: "fidic_white", color: "white", nameAr: "الكتاب الأبيض", nameEn: "White Book",
    descAr: "الاستشارات الهندسية", descEn: "Consulting Services" },
];
```

### حقول ثنائية اللغة (جديد)

إضافة حقول إضافية للنموذج لدعم الثنائية:
- `employer_name_ar`, `employer_name_en`
- `employer_address_ar`, `employer_address_en`
- `employer_id`, `employer_phone`
- `contractor_name_en` (بالإضافة للموجود `contractor_name`)
- `contractor_address_en`

هذه الحقول تُخزن في `notes` أو `terms_conditions` كـ JSON مؤقتاً لتجنب تعديل قاعدة البيانات.

### قوالب العقود

```typescript
const CONTRACT_TEMPLATES = [
  { id: "general", iconEmoji: "🏗️", nameAr: "عقد مقاولات عامة", nameEn: "General Contracting",
    defaults: { contract_type: "fidic_red", retention_percentage: "10", ... } },
  { id: "design_build", iconEmoji: "📐", nameAr: "عقد تصميم وبناء", nameEn: "Design & Build",
    defaults: { contract_type: "fidic_yellow", ... } },
  { id: "consulting", iconEmoji: "📋", nameAr: "عقد استشارات", nameEn: "Consulting Agreement",
    defaults: { contract_type: "fidic_white", ... } },
  { id: "operation", iconEmoji: "⚙️", nameAr: "عقد تشغيل وصيانة", nameEn: "O&M Contract",
    defaults: { contract_type: "fidic_gold", ... } },
];
```

### لا تغييرات على قاعدة البيانات

جميع الحقول الجديدة (بيانات صاحب العمل الثنائية) تُخزن في حقل `notes` أو `terms_conditions` الموجود كـ JSON string.


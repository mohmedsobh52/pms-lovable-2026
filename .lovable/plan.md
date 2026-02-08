

# خطة تنفيذ صفحة تفاصيل الشريك الشاملة

## نظرة عامة

عند الضغط على زر **View Details** في بطاقة الشريك، سيتم الانتقال إلى صفحة تفاصيل شاملة (كما في الصورة المرفقة) تتضمن:
- قسم Overview مع معلومات التواصل والتقييم
- المشاريع المرتبطة
- عقود الشريك في جدول
- مؤشرات الأداء (KPIs)
- تقييمات المديرين

---

## هيكل الصفحة الجديدة

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Back    PixelCraft Agency                                 🔍 Search   │
│  Main > Procurement > PixelCraft Agency                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ Overview ─────────────────────────────────────────────────────────┐ │
│  │  Rating     │ Category         │ Partner Type │ Contact Person     │ │
│  │  ⭐ 4/5     │ UI/UX Design...  │ 👤 Vendor    │ Lisa Johnson       │ │
│  ├─────────────┴──────────────────┴──────────────┴───────────────────┤ │
│  │  Role/Service: Lorem ipsum...                                     │ │
│  │  📞 112345678   📧 example@mail.com                               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Associated Projects: [Project 1] [Project 2] [Project 3]...            │
│                                                                          │
│  ┌─ Contracts ────────────────────────────────────────────────────────┐ │
│  │  [+ Add Contract]                    🔍 Search  ⚙ Filters  ↕ Sort │ │
│  │  ┌────────────────────────────────────────────────────────────────┐│ │
│  │  │ 📄 contract.pdf  active  │ Project Name │ $15,000 │ 24 Sep-Nov ││ │
│  │  │ 📄 contract.pdf  active  │ Project Name │ $15,000 │ 24 Sep-Nov ││ │
│  │  └────────────────────────────────────────────────────────────────┘│ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─ Performance Metrics ─────────────────────────────────────────────┐  │
│  │ ⏰ Delivery Time  │ ⭐ Quality Score │ 💬 Communication │ 💰 Budget│  │
│  │      95%          │      88%          │      92%          │   92%  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Manager Reviews ──────────────────────────────────────────────────┐ │
│  │  [+ Add Review]                                                    │ │
│  │  ┌────────────────────────────────────────────────────────────────┐│ │
│  │  │ JG  John Garcia ⭐4/5  12 September 2025                       ││ │
│  │  │     Lorem ipsum review text...                                 ││ │
│  │  └────────────────────────────────────────────────────────────────┘│ │
│  └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## التغييرات المطلوبة

### 1. جداول قاعدة البيانات الجديدة

#### جدول `partner_contracts` - عقود الشريك
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID | المفتاح الأساسي |
| partner_id | UUID | معرف الشريك (FK) |
| project_id | UUID | معرف المشروع (FK) |
| contract_file_name | TEXT | اسم ملف العقد |
| contract_file_url | TEXT | رابط الملف |
| contract_type | TEXT | نوع العقد (Fixed, Hourly) |
| contract_value | NUMERIC | قيمة العقد |
| currency | TEXT | العملة |
| start_date | DATE | تاريخ البداية |
| end_date | DATE | تاريخ النهاية |
| status | TEXT | الحالة (active, completed, cancelled) |

#### جدول `partner_reviews` - تقييمات المديرين
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID | المفتاح الأساسي |
| partner_id | UUID | معرف الشريك (FK) |
| reviewer_name | TEXT | اسم المقيّم |
| rating | NUMERIC | التقييم (1-5) |
| review_text | TEXT | نص التقييم |
| created_at | TIMESTAMPTZ | تاريخ الإنشاء |

#### جدول `partner_performance` - مؤشرات الأداء
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID | المفتاح الأساسي |
| partner_id | UUID | معرف الشريك (FK) |
| delivery_time_score | NUMERIC | نسبة الالتزام بالمواعيد |
| quality_score | NUMERIC | جودة العمل |
| communication_score | NUMERIC | مستوى التواصل |
| budget_compliance_score | NUMERIC | الالتزام بالميزانية |

#### تحديث جدول `external_partners`
إضافة حقول جديدة:
- `category` (TEXT) - فئة الشريك
- `contact_person` (TEXT) - اسم جهة الاتصال

---

### 2. الملفات الجديدة

| الملف | الوصف |
|-------|-------|
| `src/pages/PartnerDetailsPage.tsx` | صفحة تفاصيل الشريك الرئيسية |
| `src/components/procurement/PartnerOverview.tsx` | قسم Overview |
| `src/components/procurement/PartnerContracts.tsx` | قسم العقود |
| `src/components/procurement/PartnerPerformance.tsx` | مؤشرات الأداء |
| `src/components/procurement/PartnerReviews.tsx` | تقييمات المديرين |
| `src/components/procurement/AddPartnerContractDialog.tsx` | نافذة إضافة عقد |
| `src/components/procurement/AddPartnerReviewDialog.tsx` | نافذة إضافة تقييم |

---

### 3. تحديث الملفات الحالية

| الملف | التغيير |
|-------|---------|
| `src/App.tsx` | إضافة Route جديد `/procurement/partner/:id` |
| `src/components/procurement/PartnerCard.tsx` | تغيير onClick لـ View Details للتنقل بدل الـ Dialog |
| `src/components/procurement/ExternalPartners.tsx` | إزالة PartnerDetailsDialog واستخدام التنقل |
| `src/components/procurement/index.ts` | تصدير المكونات الجديدة |

---

## تفاصيل التنفيذ

### صفحة تفاصيل الشريك (`PartnerDetailsPage.tsx`)

```text
Route: /procurement/partner/:partnerId

الهيكل:
├── Header (اسم الشريك + Breadcrumbs)
├── PartnerOverview (البيانات الأساسية)
├── Associated Projects (badges)
├── PartnerContracts (جدول العقود)
├── PartnerPerformance (4 KPI cards)
└── PartnerReviews (قائمة التقييمات)
```

### قسم Overview

- شبكة 4 أعمدة: Rating, Category, Partner Type, Contact Person
- صف ثاني: Role/Service description
- صف ثالث: Phone, Email

### جدول العقود

```text
الأعمدة:
- أيقونة + اسم الملف
- الحالة (Badge)
- المشروع المرتبط
- القيمة
- الفترة الزمنية
- أزرار الإجراءات (⋮)
```

### مؤشرات الأداء (4 بطاقات)

| المؤشر | الأيقونة | اللون |
|--------|----------|-------|
| Delivery Time | ⏰ | أزرق |
| Quality Score | ⭐ | أصفر |
| Communication | 💬 | بنفسجي |
| Budget Compliance | 💰 | أخضر |

### تقييمات المديرين

- Avatar + اسم المقيّم + التقييم + التاريخ
- نص التقييم
- زر "Add Review" لإضافة تقييم جديد

---

## الإضافات المقترحة

### 1. ربط المشاريع
- عرض المشاريع المرتبطة بالشريك كـ badges قابلة للنقر
- الانتقال لصفحة المشروع عند النقر

### 2. رفع ملفات العقود
- دعم رفع ملفات PDF للعقود
- تخزين في Supabase Storage

### 3. حساب التقييم التلقائي
- حساب متوسط التقييم من جميع المراجعات
- تحديث `rating` في `external_partners` تلقائياً

### 4. تصدير البيانات
- زر لتصدير بيانات الشريك كـ PDF
- تقرير شامل يتضمن العقود والتقييمات

### 5. إشعارات العقود
- تنبيه قبل انتهاء العقد بـ 30 يوم
- ربط مع نظام الإشعارات الحالي

---

## خطوات التنفيذ

1. **إنشاء Migration** لجداول البيانات الجديدة
2. **إنشاء صفحة** `PartnerDetailsPage.tsx`
3. **إنشاء المكونات الفرعية**:
   - PartnerOverview
   - PartnerContracts
   - PartnerPerformance
   - PartnerReviews
4. **إنشاء Dialogs** لإضافة العقود والتقييمات
5. **تحديث التنقل** في App.tsx وPartnerCard
6. **تنفيذ الإضافات المقترحة**

---

## اختبار بعد التنفيذ

1. اذهب لصفحة `/procurement`
2. اضغط على **View Details** في أي بطاقة شريك
3. تحقق من:
   - الانتقال لصفحة التفاصيل `/procurement/partner/:id`
   - عرض بيانات الشريك بشكل صحيح
   - عمل قسم العقود مع إضافة/عرض العقود
   - عرض مؤشرات الأداء
   - إضافة وعرض التقييمات
   - عمل زر الرجوع


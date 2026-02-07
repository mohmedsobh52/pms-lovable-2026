
# تنفيذ شاشة الشركاء الخارجيين ودمجها مع صفحة المشتريات

## ملخص التنفيذ

سأقوم بإنشاء شاشة جديدة للشركاء الخارجيين (External Partners) مع كامل الوظائف المطلوبة ودمجها في صفحة المشتريات الحالية.

---

## المكونات المطلوبة

### 1. قاعدة البيانات

**جدول جديد: `external_partners`**
- يخزن بيانات الشركاء/الموردين
- يتضمن: الاسم، الوصف، التقييم، الحالة، النوع، تواريخ العقد
- محمي بـ RLS للمستخدمين

---

### 2. الملفات الجديدة

| الملف | الوصف |
|-------|-------|
| `src/components/procurement/ExternalPartners.tsx` | المكون الرئيسي لعرض الشركاء |
| `src/components/procurement/PartnerCard.tsx` | بطاقة الشريك الفردية |
| `src/components/procurement/AddPartnerDialog.tsx` | نافذة إضافة/تعديل شريك |
| `src/components/procurement/PartnerDetailsDialog.tsx` | نافذة تفاصيل الشريك |
| `src/components/procurement/ProcurementContracts.tsx` | قسم العقود المرتبطة |
| `src/components/procurement/RequestOfferDialog.tsx` | نافذة طلب عرض سعر |
| `src/components/procurement/index.ts` | ملف التصدير |

---

### 3. تحديث صفحة Procurement

**الملف:** `src/pages/ProcurementPage.tsx`

**التغييرات:**
- إضافة header مع زر "Request Offer"
- تحويل المحتوى إلى تبويبات:
  - **Partners** - الشركاء الخارجيين (الشاشة الجديدة)
  - **Procurement** - المشتريات (المحتوى الحالي)
  - **Contracts** - العقود المرتبطة

---

## تصميم بطاقة الشريك

```text
┌─────────────────────────────────────┐
│ 🏢  ⭐⭐⭐⭐⭐ 4.5/5        [✏️]    │
│ Qatar Tech Hub                      │
│ Premium technology solutions...     │
│                                     │
│ [🟢 Active]    📅 24 Sept - 23 Nov  │
│                                     │
│         [ View Details ]            │
└─────────────────────────────────────┘
```

---

## الفلاتر والبحث

- **البحث:** بالاسم أو الوصف
- **الحالة:** الكل / نشط / غير نشط / معلق
- **النوع:** مورد / بائع / مقاول / مستشار
- **الترتيب:** الاسم / التقييم / التاريخ

---

## قائمة الملفات النهائية

1. **قاعدة البيانات:** Migration لجدول `external_partners`
2. **src/components/procurement/ExternalPartners.tsx** - جديد
3. **src/components/procurement/PartnerCard.tsx** - جديد
4. **src/components/procurement/AddPartnerDialog.tsx** - جديد
5. **src/components/procurement/PartnerDetailsDialog.tsx** - جديد
6. **src/components/procurement/ProcurementContracts.tsx** - جديد
7. **src/components/procurement/RequestOfferDialog.tsx** - جديد
8. **src/components/procurement/index.ts** - جديد
9. **src/pages/ProcurementPage.tsx** - تعديل

---

## المميزات

- واجهة مشابهة للصورة المرفقة
- دعم كامل للغتين (عربي/إنجليزي)
- تقييم بالنجوم (5 نجوم)
- حالة الشريك (نشط/غير نشط/معلق)
- فترة العقد مع التواريخ
- بحث وفلاتر وترتيب
- زر طلب عرض سعر
- تكامل مع نظام العقود

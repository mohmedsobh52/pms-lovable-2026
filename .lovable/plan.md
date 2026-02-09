
# خطة إصلاح تفاعلية الأزرار في صفحة تفاصيل الشريك

## المشكلة
جميع الأزرار والتبويبات وزر العودة في صفحة `/procurement/partner/:id` لا تعمل. تم التحقق من الكود واكتشاف أن المكونات الجديدة لم يتم تطبيق فئات CSS الخاصة بالحماية (Safety Classes) التي تضمن تفاعلية العناصر.

## السبب الجذري
يستخدم التطبيق نظام z-index وpointer-events معقد (موثق في `dialog-custom.css`) يتطلب تطبيق فئات CSS محددة على العناصر التفاعلية. بدون هذه الفئات، يمكن أن تُحجب الأزرار بسبب طبقات Radix UI غير المرئية.

## الحل

### 1. تحديث `PartnerDetailsPage.tsx`
إضافة فئات الحماية للعناصر التفاعلية:

| العنصر | الفئة المطلوبة |
|--------|---------------|
| زر العودة (Back) | `navigation-bar-safe` |
| Breadcrumb | `breadcrumb-safe` |
| Associated Projects badges | `pointer-events-auto` |

### 2. تحديث `PartnerContracts.tsx`
| العنصر | الفئة المطلوبة |
|--------|---------------|
| CardHeader + Actions | `card-actions-safe` |
| Add Contract Button | `z-[65] pointer-events-auto` |
| Dropdown Menu | تفعيل z-index أعلى |

### 3. تحديث `PartnerPerformance.tsx`
| العنصر | الفئة المطلوبة |
|--------|---------------|
| CardHeader | `card-actions-safe` |
| Edit Button | `z-[65] pointer-events-auto` |

### 4. تحديث `PartnerReviews.tsx`
| العنصر | الفئة المطلوبة |
|--------|---------------|
| CardHeader + Actions | `card-actions-safe` |
| Add Review Button | `z-[65] pointer-events-auto` |
| Delete Button | `z-[65] pointer-events-auto` |

### 5. تحديث Dialog Components
إضافة `onOpenAutoFocus` و `onCloseAutoFocus` لمنع مشاكل focus trapping:
- `AddPartnerContractDialog.tsx`
- `AddPartnerReviewDialog.tsx`
- Performance Edit Dialog (داخل `PartnerPerformance.tsx`)

---

## التفاصيل التقنية

### فئات الحماية المستخدمة

```css
/* فئات من dialog-custom.css */
.navigation-bar-safe     → z-index: 50
.breadcrumb-safe         → z-index: 45
.card-actions-safe       → z-index: 60
button في card-actions   → z-index: 65
```

### نمط إصلاح Dialog Focus

```tsx
<DialogContent
  onOpenAutoFocus={(e) => e.preventDefault()}
  onCloseAutoFocus={(e) => e.preventDefault()}
>
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/PartnerDetailsPage.tsx` | إضافة فئات الحماية للـ header و navigation |
| `src/components/procurement/PartnerContracts.tsx` | إضافة فئات للـ CardHeader والأزرار |
| `src/components/procurement/PartnerPerformance.tsx` | إضافة فئات للـ CardHeader + Dialog fix |
| `src/components/procurement/PartnerReviews.tsx` | إضافة فئات للـ CardHeader والأزرار |
| `src/components/procurement/AddPartnerContractDialog.tsx` | إضافة focus handlers |
| `src/components/procurement/AddPartnerReviewDialog.tsx` | إضافة focus handlers |

---

## اختبار بعد الإصلاح

1. اذهب لصفحة `/procurement`
2. اضغط **View Details** على أي شريك
3. تحقق من:
   - ✅ عمل زر العودة (السهم الخلفي)
   - ✅ عمل روابط Breadcrumb (Home, Procurement)
   - ✅ عمل زر "Add Contract"
   - ✅ عمل زر "Edit" في Performance Metrics
   - ✅ عمل زر "Add Review"
   - ✅ فتح وإغلاق النوافذ الحوارية بشكل صحيح

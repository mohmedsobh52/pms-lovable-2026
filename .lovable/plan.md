
# تحسين شاشة الترحيب (Onboarding) مع 4 تحسينات

## ملخص التغييرات المطلوبة

1. **localStorage** — شاشة الترحيب تظهر مرة واحدة فقط لكل مشروع
2. **تتبع التقدم** — تلوين الخطوات عند إكمالها (BOQ مرفوع / تسعير / تقارير)
3. **رفع BOQ مباشرة** — إضافة Dialog لرفع الملفات داخل صفحة تفاصيل المشروع
4. **التحقق من صحة الأزرار** — مراجعة كاملة لمنطق البانر والنافذة

---

## 1. حفظ حالة الترحيب في localStorage

**المشكلة الحالية:** `showOnboarding` يعتمد على `location.state.isNewProject` فقط — لذا عند تحديث الصفحة يختفي الـ flag ولكن لا توجد مشكلة، والأهم: عند العودة لنفس المشروع من أي صفحة أخرى، لن يظهر الـ modal مجدداً (لأن state لا ينتقل) — هذا سلوك صحيح جزئياً.

**الحل الصحيح:** استخدام `localStorage` بمفتاح `onboarded_${projectId}` لمنع ظهور النافذة مرة ثانية حتى لو عاد المستخدم بـ `isNewProject: true` (إعادة تحميل نادرة).

**في `ProjectDetailsPage.tsx`:**
```typescript
// تحديد ما إذا كان يجب عرض الـ onboarding
const isNewProject = (location.state as any)?.isNewProject === true;
const onboardingKey = `onboarded_${projectId}`;
const alreadyOnboarded = localStorage.getItem(onboardingKey) === "true";

const [showOnboarding, setShowOnboarding] = useState(
  isNewProject && !alreadyOnboarded
);

// عند الإغلاق — حفظ الحالة
const handleCloseOnboarding = () => {
  localStorage.setItem(onboardingKey, "true");
  setShowOnboarding(false);
};
```

---

## 2. تتبع تقدم المشروع في شاشة الترحيب

**المنطق:**
- **خطوة 1 (رفع BOQ):** `items.length > 0` — يوجد بنود مستخرجة
- **خطوة 2 (التسعير):** `items.some(i => i.unit_price && i.unit_price > 0)` — يوجد بنود مسعّرة
- **خطوة 3 (التقارير):** تُعتبر مكتملة إذا اكتملت الخطوتان السابقتان

**تمرير البيانات إلى `OnboardingModal`:**
```typescript
// في ProjectDetailsPage.tsx — حساب التقدم
const hasItems = items.length > 0;
const hasPricing = items.some(i => (i.unit_price || 0) > 0);
const completedSteps = [hasItems, hasPricing, hasItems && hasPricing];
```

**تحديث `OnboardingModal.tsx` — props جديدة:**
```typescript
interface OnboardingModalProps {
  // ... الموجودة
  completedSteps?: boolean[]; // [boq, pricing, reports]
}
```

**تصميم الخطوات المكتملة:**

| الحالة | اللون | الأيقونة |
|--------|-------|----------|
| غير مكتملة | رمادي فاتح | رقم (1, 2, 3) |
| مكتملة | أخضر | ✓ CheckCircle |

```
┌──────────────────────────────────────────────┐
│  ✅ رفع BOQ         (أخضر — مكتمل)           │
│  ⭕ التسعير         (رمادي — لم يكتمل بعد)   │
│  ⭕ التقارير        (رمادي — لم يكتمل بعد)   │
└──────────────────────────────────────────────┘
```

---

## 3. رفع ملف BOQ مباشرة من صفحة المشروع

**المشكلة:** زر "ابدأ التحليل" يوجه المستخدم إلى الصفحة الرئيسية `/` لرفع الملف، وهذا يكسر سياق المشروع.

**الحل:** إضافة `Dialog` بسيط داخل `ProjectDetailsPage.tsx` يحتوي على `FileUpload` مكون موجود مسبقاً، مع منطق رفع الملف وتحليله وحفظ النتائج في المشروع الحالي.

**مكون جديد: `src/components/project-details/BOQUploadDialog.tsx`**

```typescript
interface BOQUploadDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  isArabic: boolean;
  onSuccess: () => void; // لإعادة تحميل البنود بعد الرفع
}
```

**يحتوي على:**
- `FileUpload` component (drag & drop + browse)
- حالات: اختيار الملف → تحليل → نجاح/خطأ
- يرسل الملف إلى edge function `analyze-boq` أو `process-pdf-boq`
- عند النجاح: يستدعي `onSuccess()` لإعادة تحميل البنود في الصفحة

**ربط الـ Dialog بالبانر والـ Onboarding:**
```typescript
// بدلاً من navigate("/")
onClick={() => setShowBOQUploadDialog(true)}
```

```typescript
// في OnboardingModal — تغيير onStartAnalysis ليفتح الـ Dialog
onStartAnalysis={() => {
  handleCloseOnboarding();
  setShowBOQUploadDialog(true); // بدلاً من navigate
}}
```

---

## 4. التحقق من صحة الأزرار

**المراجعة الكاملة:**

| الزر | الموقع | الوضع الحالي | التعديل |
|------|--------|-------------|---------|
| "ابدأ التحليل" في البانر | `ProjectDetailsPage.tsx:873` | `navigate("/")` | فتح `BOQUploadDialog` |
| "ابدأ برفع BOQ الآن" في Modal | `OnboardingModal.tsx:130` | استدعاء `onStartAnalysis` | فتح `BOQUploadDialog` |
| "استكشف المشروع" في Modal | `OnboardingModal.tsx:135` | `onClose()` | يعمل صحيح ✓ |
| زر X في البانر | `ProjectDetailsPage.tsx:880` | `setShowBOQUploadBanner(false)` | يعمل صحيح ✓ |
| إغلاق النافذة (onClose) | `ProjectDetailsPage.tsx:1178` | `setShowOnboarding(false)` | يضاف localStorage |

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|------------|
| `src/components/OnboardingModal.tsx` | تحديث — إضافة `completedSteps` props وتلوين الخطوات |
| `src/pages/ProjectDetailsPage.tsx` | تحديث — localStorage + ربط BOQUploadDialog + تمرير completedSteps |
| `src/components/project-details/BOQUploadDialog.tsx` | **ملف جديد** — Dialog لرفع BOQ مباشرة |

لا تغييرات على قاعدة البيانات أو الـ Edge Functions.

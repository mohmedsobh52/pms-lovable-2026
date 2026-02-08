

# خطة تحسين شاشة طلب عرض السعر (Request Offer Dialog)

## الوضع الحالي

الزر مرتبط بالفعل بالـ Dialog في `ProcurementPage.tsx` (سطر 59-65) ويفتح الشاشة بشكل صحيح.

## التحسينات المطلوبة بناءً على الصورة

سيتم تعديل `RequestOfferDialog.tsx` ليطابق التصميم الجديد:

---

## التصميم الجديد

```text
┌─────────────────────────────────────────────────────────────────┐
│  ✨ Request Offer                                          ✕    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Enter your request in detail to get the best price     │   │
│  │  quotes from suppliers                                   │   │
│  │                                                          │   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │ Write your request here...                    🎤  │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Suggested requests:                                            │
│                                                                 │
│  [Need 10 laptops for development team]                         │
│  [Office furniture for 50 employees]                            │
│  [Construction materials for building project]                  │
│                                                                 │
│                                                                 │
│          [ Cancel ]         [ 📤 Submit Request ]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## التغييرات التقنية

### 1. تبسيط الواجهة

**إزالة:**
- اختيار الشركاء (سيتم الإرسال لجميع الشركاء النشطين)
- حقل الموضوع المنفصل
- حقل الموعد النهائي

**إضافة:**
- صندوق نص واحد بتصميم أنيق
- أيقونة ميكروفون (UI فقط)
- اقتراحات جاهزة كأزرار قابلة للنقر

### 2. الاقتراحات الجاهزة

ستكون ثنائية اللغة:

| English | العربية |
|---------|---------|
| Need 10 laptops for development team | نحتاج 10 أجهزة لابتوب لفريق التطوير |
| Office furniture for 50 employees | أثاث مكتبي لـ 50 موظف |
| Construction materials for building project | مواد بناء لمشروع إنشائي |
| Electrical equipment and supplies | معدات ولوازم كهربائية |
| HVAC systems for commercial building | أنظمة تكييف لمبنى تجاري |

### 3. تحديث الكود

**الملف:** `src/components/procurement/RequestOfferDialog.tsx`

```tsx
// State مبسط
const [request, setRequest] = useState("");
const [isLoading, setIsLoading] = useState(false);

// اقتراحات جاهزة
const suggestions = [
  { en: "Need 10 laptops for development team", ar: "نحتاج 10 أجهزة لابتوب لفريق التطوير" },
  { en: "Office furniture for 50 employees", ar: "أثاث مكتبي لـ 50 موظف" },
  { en: "Construction materials for building project", ar: "مواد بناء لمشروع إنشائي" },
  { en: "Electrical equipment and supplies", ar: "معدات ولوازم كهربائية" },
];

// عند النقر على اقتراح
const handleSuggestionClick = (text: string) => {
  setRequest(text);
};
```

---

## الملف المتأثر

| الملف | التغيير |
|-------|---------|
| `src/components/procurement/RequestOfferDialog.tsx` | تعديل كامل للتصميم |

---

## المميزات الجديدة

- ✅ واجهة بسيطة ونظيفة مطابقة للصورة
- ✅ اقتراحات سريعة بنقرة واحدة
- ✅ دعم كامل للغتين
- ✅ زر إرسال مميز بأيقونة
- ✅ أيقونة ميكروفون (تصميم UI)
- ✅ رسالة توضيحية في الأعلى


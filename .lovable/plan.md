
# تحسين شاشة إدارة المخاطر - الشكل والأداء وتسهيل تحديد المخاطر

## ملخص التحسينات

تحسين شامل لصفحة إدارة المخاطر من حيث الشكل البصري والأداء وتسهيل عملية تحديد وتقييم المخاطر.

---

## 1. تحسينات الشكل البصري

### بطاقات الإحصائيات
- تحويل البطاقات لتصميم gradient مع أيقونات أكبر وأوضح
- إضافة نسبة المخاطر النشطة من الإجمالي
- إضافة بطاقة جديدة "متوسط درجة الخطر" مع مؤشر لوني

### مصفوفة المخاطر (Risk Matrix)
- تحسين التصميم بإضافة أرقام داخل كل خلية حتى لو كانت صفر (عرض "0" بشفافية خفيفة)
- إضافة tooltip عند hover على كل خلية يعرض أسماء المخاطر الموجودة فيها
- تحسين الألوان بتدرج أوضح (أخضر فاتح -> أصفر -> برتقالي -> أحمر -> أحمر غامق)

### الجدول
- إضافة تلوين خلفي للصفوف حسب مستوى الخطر (أحمر فاتح = حرج، برتقالي فاتح = عالي، أصفر فاتح = متوسط، أخضر فاتح = منخفض)
- إضافة أيقونة مستوى الخطر بجانب الدرجة
- إضافة عمود "تاريخ التحديد" و"المسؤول"
- تحسين أزرار الإجراءات بإضافة Tooltip

### حالة الفراغ (Empty State)
- تحسين شاشة "لا توجد مخاطر" بإضافة رسم توضيحي ونصوص إرشادية وزر إضافة سريع

---

## 2. تحسينات الأداء

- استخدام `useMemo` لحسابات الإحصائيات والفلترة
- استخدام `useCallback` للدوال (handleSave, handleDelete, fetchRisks)
- إضافة Skeleton loading بدلاً من spinner بسيط
- تغليف Dialog بـ conditional rendering لمنع Portal leaking

---

## 3. تسهيل تحديد المخاطر

### شريط بحث وفلاتر
- إضافة شريط بحث للبحث بعنوان الخطر أو الوصف
- إضافة فلتر حسب الفئة (تقني/مالي/جدول زمني/...)
- إضافة فلتر حسب الحالة (محدد/مقيّم/قيد المعالجة/...)
- إضافة فلتر حسب مستوى الخطر (حرج/عالي/متوسط/منخفض)

### تحسين نموذج الإضافة
- إضافة **قوالب مخاطر جاهزة** (Risk Templates) حسب الفئة:
  - تقني: "تأخر في التسليم التقني"، "فشل في الاختبارات"
  - مالي: "تجاوز الميزانية"، "تأخر المدفوعات"
  - جدول زمني: "تأخر بداية المشروع"، "تأخر الموردين"
  - إلخ...
- عند اختيار قالب، يملأ العنوان والوصف والفئة والاحتمالية والتأثير تلقائياً
- إضافة **عرض مرئي تفاعلي** لدرجة الخطر في النموذج (Progress bar ملون يتغير مع تغيير الاحتمالية والتأثير)

### ترتيب وعرض
- إضافة خيار ترتيب الجدول حسب (الدرجة / الفئة / الحالة / التاريخ)
- إضافة عداد "X مخاطر نشطة من Y إجمالي"

---

## التفاصيل التقنية

### الملف: `src/components/RiskManagement.tsx`

**التغييرات الرئيسية:**

1. إضافة states جديدة:
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [categoryFilter, setCategoryFilter] = useState("all");
const [statusFilter, setStatusFilter] = useState("all");
const [levelFilter, setLevelFilter] = useState("all");
const [sortBy, setSortBy] = useState("score");
```

2. إضافة قوالب المخاطر الجاهزة:
```typescript
const riskTemplates = [
  { title: "تجاوز الميزانية", titleEn: "Budget Overrun", category: "financial", probability: "medium", impact: "high", description: "..." },
  { title: "تأخر الموردين", titleEn: "Supplier Delay", category: "schedule", probability: "high", impact: "medium", description: "..." },
  // ... المزيد
];
```

3. استخدام `useMemo` للبيانات المفلترة:
```typescript
const filteredRisks = useMemo(() => {
  return risks.filter(r => {
    if (searchQuery && !r.risk_title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (levelFilter !== "all") { /* فلتر المستوى */ }
    return true;
  }).sort((a, b) => { /* ترتيب حسب sortBy */ });
}, [risks, searchQuery, categoryFilter, statusFilter, levelFilter, sortBy]);
```

4. تحسين البطاقات الإحصائية بخلفيات gradient وأيقونات

5. إضافة شريط البحث والفلاتر فوق الجدول

6. تحسين الجدول بتلوين الصفوف + Tooltips + أعمدة إضافية

7. إضافة زر "استخدام قالب" في Dialog الإضافة

8. تحسين عرض درجة الخطر في النموذج بـ Progress bar تفاعلي

9. تغليف Dialog بـ conditional rendering

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/RiskManagement.tsx` | بحث + فلاتر + قوالب + تحسين بصري + أداء |

## لا تغييرات على قاعدة البيانات

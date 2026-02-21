

# تحسين شاشة المستخلصات - الشكل والأداء وسهولة الاستخدام

## ملخص التحسينات

تحسين شامل لصفحتي المستخلصات (القائمة + إنشاء مستخلص جديد) من حيث الشكل البصري والأداء وتسهيل العمل.

---

## 1. تحسينات صفحة قائمة المستخلصات (`ProgressCertificatesPage.tsx`)

### تحسين البطاقات الإحصائية
- إضافة ألوان خلفية متدرجة لكل بطاقة (أخضر للصافي، أزرق للأعمال الحالية، بنفسجي للمعتمدة)
- إضافة أيقونات أكبر مع تأثيرات بصرية
- إضافة نسبة التغيير مقارنة بآخر مستخلص

### تحسين الجدول
- إضافة عمود **اسم المشروع** بجانب اسم المقاول
- تلوين صفوف الجدول حسب الحالة (أخضر فاتح = معتمد، أصفر = مقدم، رمادي = مسودة)
- إضافة **شريط بحث** للبحث في المستخلصات بالرقم أو اسم المقاول
- إضافة **Progress Bar** يعرض نسبة اكتمال الأعمال بالنسبة لقيمة العقد
- تحسين أزرار الإجراءات بإضافة Tooltip يشرح كل زر
- إضافة **فلتر حسب الحالة** (مسودة/مقدم/معتمد/مدفوع) كـ tabs أو أزرار

### تحسين الأداء
- استخدام `useMemo` للبيانات المفلترة والإحصائيات
- إضافة `useCallback` للدوال المتكررة
- إضافة skeleton loading بدلاً من نص "جاري التحميل"

### تحسين Dialog العرض
- إضافة **Progress Bar** للبنود يعرض نسبة الإنجاز من كمية العقد
- تحسين تخطيط الملخص المالي بألوان وأيقونات
- إضافة زر **نسخ** للمستخلص لإنشاء مستخلص جديد بنفس البيانات

---

## 2. تحسينات صفحة إنشاء مستخلص جديد (`NewCertificatePage.tsx`)

### تحسين جدول البنود
- إضافة **Progress Bar مصغر** بجانب كل بند يعرض نسبة الإنجاز (سابق + حالي) / كمية العقد
- تلوين الصف بالأحمر إذا تجاوزت الكمية الإجمالية كمية العقد
- إضافة **زر "ملء الكل"** لملء الكمية المتبقية تلقائياً لجميع البنود
- إضافة **زر "ملء بنسبة %"** يسمح بإدخال نسبة مئوية وتطبيقها على كل البنود
- إضافة عمود **"المتبقي"** يعرض الكمية المتبقية لكل بند
- إضافة بحث/فلتر في جدول البنود

### تحسين الملخص المالي
- عرض الملخص كبطاقات ملونة بدلاً من قائمة نصية
- إضافة **نسبة الإنجاز الكلية** كـ Progress Bar كبير
- إضافة مقارنة بصرية بين الأعمال الحالية والسابقة (Chart صغير)

### تحسين تجربة المستخدم
- إضافة **تحقق ذكي** (validation) قبل الحفظ مع رسائل واضحة
- إضافة **تأكيد قبل الحفظ** يعرض ملخص المستخلص
- إضافة مؤشر تعبئة البنود (X من Y بند تم تعبئته)

---

## التفاصيل التقنية

### الملف: `src/pages/ProgressCertificatesPage.tsx`

**التغييرات:**

1. إضافة state للبحث وفلتر الحالة:
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
```

2. تغليف الحسابات بـ `useMemo`:
```typescript
const filtered = useMemo(() => {
  return certificates.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (filterProjectId && filterProjectId !== "all" && c.project_id !== filterProjectId) return false;
    if (filterContractor && filterContractor !== "all" && c.contractor_name !== filterContractor) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.contractor_name.toLowerCase().includes(q) || 
             String(c.certificate_number).includes(q);
    }
    return true;
  });
}, [certificates, statusFilter, filterProjectId, filterContractor, searchQuery]);
```

3. تحسين بطاقات الإحصائيات بخلفيات ملونة وأيقونات محسنة

4. إضافة شريط بحث + أزرار فلتر الحالة

5. إضافة Tooltip لأزرار الإجراءات

6. إضافة Skeleton loading

7. ربط اسم المشروع بكل مستخلص عبر join محلي مع `projects`

8. إضافة زر "نسخ مستخلص" في القائمة

### الملف: `src/pages/NewCertificatePage.tsx`

**التغييرات:**

1. إضافة أزرار التعبئة السريعة:
```typescript
const fillAllRemaining = () => {
  setFormItems(prev => prev.map(item => {
    const remaining = item.contract_quantity - item.previous_quantity;
    return { ...item, current_quantity: remaining, total_quantity: item.contract_quantity, 
             current_amount: remaining * item.unit_price };
  }));
};

const fillByPercentage = (pct: number) => {
  setFormItems(prev => prev.map(item => {
    const qty = Math.round((item.contract_quantity * pct / 100 - item.previous_quantity) * 100) / 100;
    const safeQty = Math.max(0, Math.min(qty, item.contract_quantity - item.previous_quantity));
    return { ...item, current_quantity: safeQty, total_quantity: item.previous_quantity + safeQty,
             current_amount: safeQty * item.unit_price };
  }));
};
```

2. إضافة عمود "المتبقي" + Progress Bar مصغر لكل بند

3. إضافة بحث في البنود:
```typescript
const [itemSearch, setItemSearch] = useState("");
const displayItems = useMemo(() => 
  formItems.filter(i => !itemSearch || 
    i.description.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.item_number.includes(itemSearch)
  ), [formItems, itemSearch]);
```

4. إضافة تلوين الصفوف (أحمر إذا تجاوز، أخضر إذا مكتمل)

5. إضافة dialog تأكيد قبل الحفظ مع ملخص

6. تحسين الملخص المالي ببطاقات ملونة + Progress Bar للإنجاز الكلي

7. إضافة عداد البنود المعبأة

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/ProgressCertificatesPage.tsx` | بحث + فلتر حالة + تحسين بطاقات + Skeleton + Tooltip + نسخ مستخلص |
| `src/pages/NewCertificatePage.tsx` | ملء سريع + Progress Bars + بحث بنود + تأكيد حفظ + ملخص محسن |

## لا تغييرات على قاعدة البيانات




# تحسين الهوم بيدج - انيميشن + اوصاف + عدادات + موبايل

## ملخص التحسينات

3 محاور رئيسية: تاثيرات حركية احترافية، اوصاف مختصرة وعدادات حية لكل بطاقة، وتحسين تجربة الموبايل.

---

## 1. اضافة وصف مختصر وعداد لكل بطاقة

كل بطاقة ستعرض:
- الاسم العربي والانجليزي (موجود)
- **وصف مختصر** يظهر اسفل الاسم (جديد)
- **عداد** يعرض عدد العناصر النشطة من قاعدة البيانات (جديد)

| القسم | الوصف العربي | الوصف الانجليزي | مصدر العداد |
|-------|-------------|-----------------|-------------|
| المشاريع | ادارة ومتابعة المشاريع | Manage & track projects | `saved_projects` |
| جدول الكميات | بنود الاعمال والكميات | Work items & quantities | `project_items` |
| التسعير | تحليل التكاليف والاسعار | Cost & price analysis | `cost_analysis` |
| العقود | ادارة العقود والضمانات | Contracts & warranties | `contracts` |
| المشتريات | طلبات الشراء والموردين | Procurement & suppliers | `external_partners` |
| مقاولي الباطن | ادارة مقاولي الباطن | Subcontractor management | `subcontractors` |
| المخاطر | تقييم وادارة المخاطر | Risk assessment | `risks` |
| التقارير | التقارير والتحليلات | Reports & analytics | عداد ثابت |
| المستخلصات | الشهادات والمستخلصات | Progress certificates | `progress_certificates` |
| المكتبة | مكتبة الاسعار والمواد | Price & material library | `material_prices` |

---

## 2. تاثيرات حركية احترافية

### انيميشن الدخول (Staggered Entrance)
- البطاقات تظهر واحدة تلو الاخرى بتاخير 50ms بين كل بطاقة
- تاثير fade-in + slide-up عند تحميل الصفحة
- يتم عبر inline style مع `animationDelay` و CSS animation

### تحسين Hover
- تكبير اكبر قليلا (`hover:scale-[1.08]`)
- ظل متوهج ملون (`hover:shadow-[0_0_20px_rgba(color,0.3)]`)
- الايقونة تتحرك لاعلى قليلا عند hover (`group-hover:-translate-y-1`)
- العداد يظهر بتاثير fade عند hover

---

## 3. تحسين تجربة الموبايل

- الشبكة على الموبايل: `grid-cols-2` مع `gap-3` اصغر
- تصغير padding البطاقات على الموبايل: `p-4 md:p-6`
- تصغير الايقونات: `w-10 h-10 md:w-14 md:h-14`
- الوصف يختفي على الموبايل (`hidden sm:block`) لتوفير المساحة
- الفوتر يتحول لعمودي على الموبايل (موجود بالفعل)
- العنوان اصغر على الموبايل: `text-xl md:text-3xl`

---

## الملفات المتاثرة

| الملف | الاجراء |
|-------|---------|
| `src/pages/HomePage.tsx` | اضافة اوصاف + عدادات + انيميشن + تحسين responsive |

---

## التفاصيل التقنية

### جلب العدادات

استخدام `useEffect` + `supabase` لجلب عدد العناصر من الجداول التالية عند تحميل الصفحة:
- `saved_projects` (count)
- `contracts` (count)
- `progress_certificates` (count)
- `subcontractors` (count)
- `risks` (count)
- `external_partners` (count)
- `material_prices` (count)
- `project_items` (count)
- `cost_analysis` (count)

النتائج تخزن في state object واحد ويتم عرضها كـ badge صغير على كل بطاقة.

### بنية البيانات المحدثة

```text
sections = [
  {
    nameAr, nameEn, path, icon, color, iconColor,
    descAr: "ادارة ومتابعة المشاريع",    // جديد
    descEn: "Manage & track projects",     // جديد
    countKey: "saved_projects"              // جديد - مفتاح العداد
  },
  ...
]
```

### CSS Animation للدخول

```text
@keyframes card-enter {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```

يتم تطبيقه عبر inline style:
```text
style={{ animation: 'card-enter 0.4s ease-out forwards', animationDelay: `${index * 50}ms`, opacity: 0 }}
```

### عرض العداد

Badge صغير في الزاوية العلوية للبطاقة:
```text
<span className="absolute top-2 end-2 bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">
  {count}
</span>
```


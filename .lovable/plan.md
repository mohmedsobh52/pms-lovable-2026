
# ترتيب ومعالجة شريط الهيدر

## المشكلة

الشريط العلوي مزدحم بعناصر كثيرة (Dashboard, Projects, Analysis, Library, Fast Extract, Reports, Search, History, Theme, Language, Settings, User) مما يسبب تداخل وقطع على الشاشات المتوسطة.

## الحل

اعادة ترتيب العناصر وتقليل المساحة المستهلكة:

### 1. تجميع الادوات في قائمة واحدة (الجانب الايمن)

بدلا من عرض كل زر منفردا (History + Theme + Language + Settings)، يتم تجميعهم في **DropdownMenu واحد** بايقونة Settings:
- ThemeToggle (داخل القائمة)
- LanguageToggle (داخل القائمة) 
- NavigationHistory (داخل القائمة)
- Settings link (داخل القائمة)

هذا يوفر ~4 ازرار من الشريط.

### 2. تقليل حجم عناصر التنقل الوسطى

- حذف النصوص من Dashboard و Fast Extract و Reports على الشاشات المتوسطة (lg فقط)
- تصغير المسافات بين العناصر (`gap-0.5` بدلا من `gap-1`)

### 3. الترتيب النهائي

```text
[Logo BOQ] | [Dashboard] [Projects▾] [Analysis▾] [Library▾] [⚡] [📊] | [🔍 ⌘K] [⚙ ▾] [👤]
```

حيث `[⚙ ▾]` يفتح قائمة تحتوي: Theme, Language, History, Settings

### 4. تحسين زر البحث

- ابقاء `⌘K` مرئي فقط على `lg` وما فوق
- تصغير padding الزر

---

## الملفات المتاثرة

| الملف | الاجراء |
|-------|---------|
| `src/components/UnifiedHeader.tsx` | اعادة ترتيب العناصر وتجميع الادوات في قائمة واحدة |

---

## التفاصيل التقنية

### القائمة المجمعة الجديدة

تستبدل الازرار المنفردة (NavigationHistorySidebar + ThemeToggle + LanguageToggle + Settings) بـ DropdownMenu واحد:

```text
<DropdownMenu>
  <DropdownMenuTrigger>
    <Settings2 icon />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    - Toggle Theme (Sun/Moon + text)
    - Toggle Language (AR/EN)
    - Separator
    - Navigation History (يفتح Sheet)
    - Settings (Link)
  </DropdownMenuContent>
</DropdownMenu>
```

### التحسينات على التنقل الوسطى

- `gap-0.5` بدلا من `gap-1`
- النصوص تظهر فقط على `xl:inline` بدلا من `lg:inline` للعناصر المزدحمة
- Fast Extract و Reports تبقى بايقوناتها الملونة المميزة

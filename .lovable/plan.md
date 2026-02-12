

# إضافة شريط بحث عن الملفات باسم المورد

## التغيير

إضافة حقل بحث أعلى قائمة "عروض الأسعار المرفوعة" يتيح تصفية العروض حسب اسم المورد.

## التفاصيل التقنية

### الملف: `src/components/QuotationUpload.tsx`

1. إضافة state جديد للبحث:
```
const [searchQuery, setSearchQuery] = useState("");
```

2. إضافة متغير للتصفية:
```
const filteredQuotations = quotations.filter(q =>
  !searchQuery || q.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  q.name?.toLowerCase().includes(searchQuery.toLowerCase())
);
```

3. إضافة شريط بحث بعد عنوان "عروض الأسعار المرفوعة" وقبل القائمة (بعد سطر 1136 تقريبا):
```
<div className="px-6 pb-2">
  <div className="relative">
    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <Input
      placeholder="بحث باسم المورد أو اسم العرض..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pr-9 relative z-[70] pointer-events-auto"
    />
  </div>
</div>
```

4. استبدال `quotations.map` بـ `filteredQuotations.map` في عرض القائمة

5. إضافة `Search` إلى استيرادات `lucide-react`

### ملف واحد يتأثر

| الملف | التعديل |
|-------|---------|
| `src/components/QuotationUpload.tsx` | إضافة state بحث + حقل Input + تصفية القائمة |


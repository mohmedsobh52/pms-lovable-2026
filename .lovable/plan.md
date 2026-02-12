

# إضافة زر "رفع الملف" مرئي في صفحة عروض الأسعار

## المشكلة

منطقة رفع الملفات الحالية تستخدم `<input type="file">` مخفي بـ `opacity-0` يغطي منطقة السحب والإفلات بالكامل. مشكلة CSS في `dialog-custom.css` تمنع النقر على هذا العنصر المخفي.

## الحل

إضافة زر "رفع الملف" مرئي داخل منطقة السحب والإفلات مع استخدام `id` مرتبط بـ `<input>` منفصل بدلاً من overlay مخفي. بالإضافة لإضافة `form-card-safe` على الحاوية الرئيسية.

### التغييرات في `src/components/QuotationUpload.tsx`:

1. **إضافة `form-card-safe`** على `CardContent` (سطر 999) لحماية كل العناصر التفاعلية

2. **تعديل منطقة رفع الملفات** (أسطر 1040-1074):
   - نقل `<input type="file">` ليصبح مخفيا بـ `className="hidden"` مع إضافة `id="quotation-file-upload"`
   - إضافة زر `<Button>` مرئي يستخدم `<label htmlFor="quotation-file-upload">` لتفعيل اختيار الملف
   - الاحتفاظ بمنطقة السحب والإفلات كما هي

**قبل:**
```text
<div className="relative">
  <input type="file" ... className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
  <div className="border-2 border-dashed ...">
    <!-- icons + text -->
  </div>
</div>
```

**بعد:**
```text
<div className="relative">
  <input type="file" id="quotation-file-upload" ... className="hidden" />
  <div className="border-2 border-dashed ...">
    <!-- icons + text -->
    <Button asChild variant="outline" className="mt-3 relative z-[70] pointer-events-auto">
      <label htmlFor="quotation-file-upload" className="cursor-pointer">
        <Upload className="w-4 h-4 mr-2" />
        رفع الملف
      </label>
    </Button>
  </div>
</div>
```

### ملف واحد يتأثر

| الملف | التعديل |
|-------|---------|
| `src/components/QuotationUpload.tsx` | إضافة زر رفع مرئي + `form-card-safe` + تعديل input |

### لماذا سيعمل

1. `<label htmlFor>` يفتح نافذة اختيار الملفات بدون الحاجة لـ JavaScript
2. الزر المرئي بـ `z-[70]` و `pointer-events-auto` يتجاوز تداخل CSS
3. `form-card-safe` يحمي باقي عناصر النموذج (التاريخ، الحقول النصية)

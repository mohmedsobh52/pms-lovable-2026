

# خطة إضافة البيانات الناقصة وتحسينات إضافية لصفحة إنشاء مشروع جديد

## البيانات الناقصة المطلوب إضافتها

بناءً على الصورة المرجعية، الحقول الناقصة هي:
1. **تاريخ البدء** (Start Date) - مع DatePicker
2. **تاريخ الانتهاء المتوقع** (End Date) - مع DatePicker

---

## التغييرات المطلوبة

### `src/pages/NewProjectPage.tsx`

#### 1. إضافة الاستيرادات الجديدة

```tsx
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
```

#### 2. تحديث حالة النموذج (formData)

```tsx
const [formData, setFormData] = useState({
  name: "",
  description: "",
  currency: "SAR",
  projectType: "construction",
  location: "",
  clientName: "",
  estimatedValue: "",
  startDate: undefined as Date | undefined,  // جديد
  endDate: undefined as Date | undefined,    // جديد
});
```

#### 3. إضافة قسم جديد: التواريخ والجدول الزمني

بعد قسم "Classification & Currency" وقبل "Location & Client":

```tsx
{/* Section 3: Dates & Timeline */}
<div className="space-y-4">
  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 border-b pb-2">
    <CalendarIcon className="w-4 h-4" />
    {isArabic ? "التواريخ والجدول الزمني" : "Dates & Timeline"}
  </h3>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Start Date */}
    <div className="space-y-2">
      <Label className="flex items-center gap-1 font-medium">
        <CalendarIcon className="w-4 h-4 text-blue-500" />
        {isArabic ? "تاريخ البدء" : "Start Date"}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-11 relative z-[55] pointer-events-auto",
              !formData.startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="me-2 h-4 w-4" />
            {formData.startDate ? (
              format(formData.startDate, "PPP", { locale: isArabic ? ar : enUS })
            ) : (
              <span>{isArabic ? "اختر تاريخ البدء" : "Pick start date"}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[100]" align="start">
          <Calendar
            mode="single"
            selected={formData.startDate}
            onSelect={(date) => handleInputChange("startDate", date)}
            initialFocus
            className="pointer-events-auto"
            locale={isArabic ? ar : enUS}
          />
        </PopoverContent>
      </Popover>
    </div>
    
    {/* End Date */}
    <div className="space-y-2">
      <Label className="flex items-center gap-1 font-medium">
        <CalendarIcon className="w-4 h-4 text-red-500" />
        {isArabic ? "تاريخ الانتهاء المتوقع" : "Expected End Date"}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-11 relative z-[55] pointer-events-auto",
              !formData.endDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="me-2 h-4 w-4" />
            {formData.endDate ? (
              format(formData.endDate, "PPP", { locale: isArabic ? ar : enUS })
            ) : (
              <span>{isArabic ? "اختر تاريخ الانتهاء" : "Pick end date"}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[100]" align="start">
          <Calendar
            mode="single"
            selected={formData.endDate}
            onSelect={(date) => handleInputChange("endDate", date)}
            disabled={(date) => formData.startDate ? date < formData.startDate : false}
            initialFocus
            className="pointer-events-auto"
            locale={isArabic ? ar : enUS}
          />
        </PopoverContent>
      </Popover>
    </div>
  </div>
</div>
```

#### 4. تحديث دالة handleInputChange

لدعم قيم Date:

```tsx
const handleInputChange = (field: string, value: string | Date | undefined) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

#### 5. تحديث projectData في handleSubmit

إضافة التواريخ إلى بيانات المشروع:

```tsx
const projectData = {
  // ... existing fields
  analysis_data: {
    // ... existing fields
    project_info: {
      type: formData.projectType,
      location: formData.location,
      client_name: formData.clientName,
      description: formData.description,
      estimated_value: formData.estimatedValue ? parseFloat(formData.estimatedValue) : null,
      start_date: formData.startDate?.toISOString() || null,  // جديد
      end_date: formData.endDate?.toISOString() || null,      // جديد
    },
    // ...
  },
};
```

---

## تحسينات إضافية مقترحة

### 1. إضافة مؤشر المدة المتوقعة

عند اختيار تاريخ البدء والانتهاء، يتم عرض المدة المتوقعة بالأيام:

```tsx
{formData.startDate && formData.endDate && (
  <div className="md:col-span-2 p-3 bg-muted/50 rounded-lg flex items-center gap-2 text-sm">
    <Clock className="w-4 h-4 text-primary" />
    <span className="font-medium">
      {isArabic ? "المدة المتوقعة:" : "Expected Duration:"}
    </span>
    <span>
      {Math.ceil((formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24))} 
      {isArabic ? " يوم" : " days"}
    </span>
  </div>
)}
```

### 2. تحسين حقل القيمة التقديرية

إضافة تنسيق الأرقام لعرضها بشكل أفضل:

```tsx
{formData.estimatedValue && (
  <p className="text-xs text-muted-foreground mt-1">
    ≈ {Number(formData.estimatedValue).toLocaleString(isArabic ? 'ar-SA' : 'en-US')} {formData.currency}
  </p>
)}
```

### 3. إضافة حقل حالة المشروع (Project Status)

```tsx
const projectStatuses = [
  { value: "draft", label: { ar: "مسودة", en: "Draft" } },
  { value: "planning", label: { ar: "تخطيط", en: "Planning" } },
  { value: "in_progress", label: { ar: "قيد التنفيذ", en: "In Progress" } },
  { value: "on_hold", label: { ar: "معلق", en: "On Hold" } },
];

// في formData:
status: "draft",

// في النموذج:
<div className="space-y-2">
  <Label className="flex items-center gap-1 font-medium">
    <Flag className="w-4 h-4 text-indigo-500" />
    {isArabic ? "حالة المشروع" : "Project Status"}
  </Label>
  <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
    <SelectTrigger className="relative z-[55] pointer-events-auto h-11">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {projectStatuses.map(s => (
        <SelectItem key={s.value} value={s.value}>
          {isArabic ? s.label.ar : s.label.en}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/NewProjectPage.tsx` | إضافة حقول التاريخ، حالة المشروع، ومؤشر المدة |

---

## ترتيب الأقسام النهائي

1. **المعلومات الأساسية** (Basic Information)
   - اسم المشروع *
   - وصف المشروع

2. **التصنيف والعملة** (Classification & Currency)
   - العملة
   - نوع المشروع

3. **التواريخ والجدول الزمني** (Dates & Timeline) - **جديد**
   - تاريخ البدء
   - تاريخ الانتهاء المتوقع
   - مؤشر المدة المتوقعة

4. **الموقع والعميل** (Location & Client)
   - موقع المشروع
   - اسم العميل
   - حالة المشروع - **جديد**

5. **القيمة المالية** (Financial Value)
   - القيمة التقديرية (مع عرض التنسيق)

---

## النتيجة المتوقعة

| الميزة | الحالة |
|--------|--------|
| تاريخ البدء مع DatePicker | ✅ |
| تاريخ الانتهاء مع DatePicker | ✅ |
| حساب المدة المتوقعة تلقائياً | ✅ |
| حالة المشروع (Draft/Planning/etc) | ✅ |
| تنسيق القيمة التقديرية | ✅ |
| دعم اللغة العربية للتقويم | ✅ |
| حفظ التواريخ في قاعدة البيانات | ✅ |

---

## ملاحظات تقنية

1. **DatePicker z-index**: يستخدم `z-[100]` في PopoverContent لضمان ظهور التقويم فوق جميع العناصر

2. **Locale Support**: يستخدم `ar` و `enUS` من `date-fns/locale` لدعم التقويم بالعربية

3. **Date Validation**: تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ البدء (`disabled` prop)

4. **pointer-events**: جميع عناصر DatePicker محمية بـ `pointer-events-auto` لضمان العمل


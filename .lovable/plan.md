

# إضافة عمود الوصف العربي في جدول الكميات (BOQ Table)

## الهدف

عند وجود بنود تحتوي على `description_ar` (وصف عربي)، يتم إضافة عمود منفصل "الوصف العربي" بجانب عمود "Description" في جدول الكميات داخل تبويب BOQ بصفحة تفاصيل المشروع، كما هو موضح في الصورة المرفقة.

## التعديل المطلوب

### ملف واحد: `src/components/project-details/ProjectBOQTab.tsx`

#### 1. اكتشاف وجود بيانات عربية تلقائياً

إضافة متغير `hasArabicDescriptions` يفحص البنود ويحدد إذا كان أي بند يحتوي على `description_ar` غير فارغ:

```typescript
const hasArabicDescriptions = items.some(item => item.description_ar && item.description_ar.trim() !== '');
```

#### 2. إضافة عمود "الوصف العربي" في رأس الجدول (TableHeader)

بعد عمود "Description" (سطر 268)، يُضاف عمود جديد مشروطاً بوجود بيانات عربية:

```typescript
<TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
{hasArabicDescriptions && (
  <TableHead className="min-w-[250px]">الوصف العربي</TableHead>
)}
```

#### 3. إضافة خلية الوصف العربي في صفوف الجدول (TableBody)

بعد خلية الوصف الإنجليزي (سطر 299)، تُضاف خلية جديدة:

```typescript
<TableCell className="min-w-[350px]...">{item.description || '-'}</TableCell>
{hasArabicDescriptions && (
  <TableCell className="min-w-[250px] max-w-[400px] whitespace-pre-wrap break-words text-sm leading-relaxed" dir="rtl">
    {item.description_ar || '-'}
  </TableCell>
)}
```

#### 4. تحديث colSpan للحالة الفارغة

تحديث `colSpan` في صف "لا توجد بنود" (سطر 280) ليأخذ العمود الإضافي في الحسبان:

```typescript
<TableCell colSpan={hasArabicDescriptions ? 10 : 9} className="text-center py-8">
```

## النتيجة المتوقعة

- عند وجود وصف عربي في أي بند: يظهر عمود "الوصف العربي" بجانب عمود "Description" بنص RTL
- عند عدم وجود وصف عربي: لا تغيير - الجدول يبقى كما هو بدون العمود الإضافي
- العمود يظهر تلقائياً بدون تدخل من المستخدم


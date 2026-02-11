
# إصلاح جذري لزر "New Certificate" 

## التشخيص النهائي

بعد اختبار مباشر في المتصفح:
- الضغط على الزر ينجح (لا أخطاء)
- لكن لا يظهر أي عنصر dialog أو modal في DOM
- لا أخطاء في Console إطلاقاً
- حتى الـ custom modal (div عادي بدون Radix) لم يظهر

هذا يعني أن المشكلة ليست في Radix نفسه، بل في آلية تحديث الـ state أو إعادة الرسم في بيئة المعاينة.

## الحل: استخدام نمط DialogTrigger asChild

بدلاً من التحكم بالحالة يدوياً (`open` prop + `useState`)، سنستخدم نمط `DialogTrigger asChild` حيث يتحكم Radix بفتح وإغلاق النافذة داخلياً بدون أي state خارجي.

## التغييرات المطلوبة

### ملف: `src/pages/ProgressCertificatesPage.tsx`

**1. إزالة state غير ضرورية:**
- إزالة `showCreateDialog` و `setShowCreateDialog` من الاستخدام المباشر لفتح النافذة
- استخدام `DialogTrigger` لفتح النافذة تلقائياً

**2. تغيير بنية نافذة الإنشاء:**

قبل (لا يعمل):
```tsx
<Button onClick={() => setShowCreateDialog(true)}>New Certificate</Button>
...
{showCreateDialog && (
  <div className="fixed inset-0 z-[200]">...</div>
)}
```

بعد (الحل):
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>
      <Plus className="h-4 w-4 mr-1" />
      New Certificate
    </Button>
  </DialogTrigger>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"
    onOpenAutoFocus={(e) => e.preventDefault()}
    onCloseAutoFocus={(e) => e.preventDefault()}>
    <DialogHeader>
      <DialogTitle>Create New Certificate</DialogTitle>
      <DialogDescription className="sr-only">
        Create a new progress certificate
      </DialogDescription>
    </DialogHeader>
    {/* ... محتوى النموذج ... */}
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button onClick={handleCreateCertificate}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**3. إضافة `DialogClose` في الاستيراد:**
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, 
         DialogTrigger, DialogFooter, DialogDescription, DialogClose } 
  from "@/components/ui/dialog";
```

**4. تحديث دالة الحفظ:**
بعد الحفظ الناجح، إغلاق النافذة برمجياً باستخدام `document.querySelector` أو ref للـ close button.

**5. نافذة العرض:**
تبقى كما هي (تعمل بنمط state-controlled) لأنها تُفتح من أزرار متعددة في الجدول.

## الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/pages/ProgressCertificatesPage.tsx` | تغيير نافذة الإنشاء لنمط DialogTrigger + إضافة DialogClose |

## لماذا هذا الحل سيعمل

1. **DialogTrigger asChild** يجعل Radix يتحكم بالفتح/الإغلاق داخلياً بدون الحاجة لـ useState
2. هذا النمط موثق كأفضل ممارسة في ذاكرة المشروع (radix-ui-dialog-trigger-pattern)
3. يتجنب أي مشاكل مع state-sync أو pointer-events أو HMR stale state
4. **onOpenAutoFocus** و **onCloseAutoFocus** مع `preventDefault()` تمنع مشاكل focus-trapping



# خطة إضافة توليد البيانات بالذكاء الاصطناعي لنموذج العقود

## الهدف

إضافة أزرار AI لتوليد المحتوى تلقائياً في خطوة "النطاق والملاحظات" (Step 5) بناءً على:
- نوع العقد (FIDIC Red Book, Yellow Book, Fixed Price, إلخ)
- فئة المقاول (الفئة الأولى، الثانية، متخصص، إلخ)
- عنوان العقد ونوعه

المحتوى سيكون ثنائي اللغة (عربي / إنجليزي) بناءً على لغة الواجهة.

## التصميم المقترح

كل حقل textarea سيحتوي على أيقونتين بجانبه:
```text
Payment Terms                                    [🤖 توليد] [🌐 EN/AR]
┌─────────────────────────────────────────────────────────────────┐
│ Enter payment terms...                                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Scope of Work                                    [🤖 توليد] [🌐 EN/AR]
┌─────────────────────────────────────────────────────────────────┐
│ Enter scope of work...                                           │
│                                                                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Additional Notes                                 [🤖 توليد] [🌐 EN/AR]
┌─────────────────────────────────────────────────────────────────┐
│ Any additional notes...                                          │
└─────────────────────────────────────────────────────────────────┘
```

## الخطة التنفيذية

### 1. إنشاء Edge Function جديدة للذكاء الاصطناعي

**ملف جديد:** `supabase/functions/generate-contract-content/index.ts`

```typescript
// يستقبل:
{
  field: "payment_terms" | "scope_of_work" | "notes",
  contract_type: "fidic_red" | "fixed_price" | "cost_plus" | etc,
  contract_title: string,
  contractor_category: "first" | "second" | "specialist" | etc,
  language: "ar" | "en"
}

// يُرجع:
{
  content: string,  // المحتوى المُولّد
  suggestions: string[]  // اقتراحات إضافية
}
```

**الـ Prompt سيكون متخصصاً:**
- لنوع FIDIC: شروط موحدة حسب الكتاب (أحمر، أصفر، فضي)
- لفئة المقاول: متطلبات تتناسب مع الفئة
- للغة: توليد المحتوى باللغة المطلوبة

### 2. تحديث المكون ContractManagement.tsx

**إضافة States جديدة:**
```typescript
const [generatingField, setGeneratingField] = useState<string | null>(null);
const [aiError, setAiError] = useState<string | null>(null);
```

**إضافة دالة التوليد:**
```typescript
const generateWithAI = async (field: 'payment_terms' | 'scope_of_work' | 'notes') => {
  setGeneratingField(field);
  setAiError(null);
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-contract-content', {
      body: {
        field,
        contract_type: formData.contract_type,
        contract_title: formData.contract_title,
        contractor_category: formData.contractor_category,
        language: isArabic ? 'ar' : 'en'
      }
    });
    
    if (error) throw error;
    
    setFormData(prev => ({
      ...prev,
      [field]: data.content
    }));
    
    toast({
      title: isArabic ? "تم التوليد بنجاح" : "Generated successfully",
      description: isArabic ? "يمكنك تعديل المحتوى حسب الحاجة" : "You can edit the content as needed"
    });
  } catch (err) {
    console.error("AI generation error:", err);
    setAiError(isArabic ? "فشل التوليد" : "Generation failed");
    toast({
      title: isArabic ? "خطأ" : "Error",
      variant: "destructive"
    });
  } finally {
    setGeneratingField(null);
  }
};
```

### 3. تحديث UI للخطوة 5

**إضافة أزرار AI بجانب كل Textarea:**

```tsx
case 5:
  return (
    <div className="space-y-4">
      {/* Payment Terms */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{isArabic ? "شروط الدفع" : "Payment Terms"}</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => generateWithAI('payment_terms')}
              disabled={generatingField !== null}
              className="h-7 gap-1 text-xs text-primary hover:text-primary"
            >
              {generatingField === 'payment_terms' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isArabic ? "توليد AI" : "AI Generate"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toggleLanguage('payment_terms')}
              className="h-7 gap-1 text-xs"
            >
              <Languages className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <Textarea
          value={formData.payment_terms}
          onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
          rows={3}
          placeholder={isArabic ? "أدخل شروط الدفع..." : "Enter payment terms..."}
        />
      </div>

      {/* Scope of Work - نفس النمط */}
      {/* Additional Notes - نفس النمط */}
    </div>
  );
```

### 4. تحديث supabase/config.toml

```toml
[functions.generate-contract-content]
verify_jwt = false
```

## تفاصيل Edge Function

### الـ System Prompt

```typescript
const systemPrompt = `You are a construction contract specialist with expertise in FIDIC contracts and Saudi Arabian construction law.

Based on the contract type and contractor category, generate professional ${field} content.

Contract Type Guidelines:
- FIDIC Red Book: Employer-designed works, monthly progress payments
- FIDIC Yellow Book: Contractor-designed works, milestone payments
- FIDIC Silver Book: EPC/Turnkey, lump sum with limited variations
- Fixed Price: Standard fixed sum contract
- Cost Plus: Reimbursable costs plus fee

Contractor Category Guidelines:
- First Class: Large projects, full capability
- Second Class: Medium projects, some restrictions  
- Third/Fourth: Smaller projects
- Specialist: Specific trade expertise

Output language: ${language === 'ar' ? 'Arabic' : 'English'}
Keep the content concise, professional, and appropriate for the contract type.`;
```

### أمثلة على المحتوى المُولّد

**شروط الدفع (FIDIC Red - عربي):**
```
يتم صرف المستخلصات الشهرية خلال 28 يوماً من تاريخ اعتماد المهندس.
- الدفعة المقدمة: 20% من قيمة العقد
- المحتجز: 10% من كل مستخلص
- إفراج المحتجز: 50% عند الاستلام الابتدائي، 50% بعد فترة الصيانة
```

**نطاق العمل (Fixed Price - إنجليزي):**
```
The Contractor shall execute and complete the following works:
1. Site preparation and earthworks
2. Structural concrete and reinforcement works
3. Finishing works including flooring, painting, and MEP
4. Testing and commissioning
5. Handover documentation and as-built drawings
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/functions/generate-contract-content/index.ts` | **جديد** - Edge Function للتوليد |
| `supabase/config.toml` | إضافة تكوين الـ function الجديدة |
| `src/components/ContractManagement.tsx` | تحديث Step 5 مع أزرار AI |

## مميزات الحل

1. **ثنائي اللغة**: توليد بالعربية أو الإنجليزية حسب إعداد اللغة
2. **ذكي حسب النوع**: محتوى مختلف لكل نوع عقد (FIDIC, Fixed Price, etc)
3. **قابل للتعديل**: المستخدم يمكنه تعديل المحتوى بعد التوليد
4. **زر تبديل اللغة**: إمكانية ترجمة المحتوى الموجود للغة الأخرى
5. **معالجة الأخطاء**: رسائل واضحة عند فشل التوليد

## الاختبار

1. فتح نموذج إضافة عقد جديد
2. الوصول للخطوة 5 (النطاق والملاحظات)
3. الضغط على زر "توليد AI" لكل حقل
4. التحقق من أن المحتوى مناسب لنوع العقد المختار
5. تجربة تبديل اللغة للتحقق من الترجمة


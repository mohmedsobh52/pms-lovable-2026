

# خطة تنفيذ شاشة المعالجة مع البحث الذكي (Request Offer AI Search)

## نظرة عامة

عند الضغط على **Submit Request** أو اختيار اقتراح جاهز، ستظهر شاشة معالجة أنيقة (كما في الصورة المرفقة) بينما يقوم النظام بالبحث عن عروض الأسعار من قواعد البيانات والإنترنت باستخدام الذكاء الاصطناعي.

---

## المكونات الجديدة

### 1. شاشة المعالجة (Processing View)

```text
┌─────────────────────────────────────────────────────────────────┐
│  ✨ Request Offer                                          ✕    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     ┌──────────────────┐                                        │
│     │    [Animated     │      Processing...                     │
│     │     AI Icon]     │                                        │
│     │    ✨ ✨ ✨      │      AI analyzes partner offers from   │
│     └──────────────────┘      databases and web sources,        │
│                               creating a concise summary.        │
│                                                                 │
│     ┌───────────────────────────────────────────────────────┐  │
│     │  Loading...                                      16%  │  │
│     │  ━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  │
│     └───────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## التدفق الوظيفي

```text
┌────────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│  Submit Request    │ ──► │  Processing View     │ ──► │   Results View     │
│  (or Suggestion)   │     │  + AI Search         │     │   (Future Phase)   │
└────────────────────┘     └──────────────────────┘     └────────────────────┘
                                    │
                                    ▼
                           ┌──────────────────────┐
                           │  Edge Function:      │
                           │  search-offers       │
                           │  (Lovable AI)        │
                           └──────────────────────┘
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/procurement/RequestOfferDialog.tsx` | إضافة شاشة المعالجة + استدعاء Edge Function |
| `supabase/functions/search-offers/index.ts` | **جديد** - Edge Function للبحث باستخدام Lovable AI |
| `supabase/config.toml` | إضافة الدالة الجديدة |

---

## التفاصيل التقنية

### 1. تحديث `RequestOfferDialog.tsx`

**State جديدة:**
```tsx
const [step, setStep] = useState<'input' | 'processing' | 'results'>('input');
const [progress, setProgress] = useState(0);
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
```

**شاشة المعالجة:**
- أيقونة متحركة (Sparkles animation)
- نص "Processing..." / "جاري المعالجة..."
- وصف: "AI analyzes partner offers from databases and web sources..."
- شريط تقدم متحرك (0% → 100%)

**منطق البحث:**
```tsx
const handleSubmit = async () => {
  setStep('processing');
  
  // Simulate progress animation
  const progressInterval = setInterval(() => {
    setProgress(p => Math.min(p + 3, 90));
  }, 150);
  
  try {
    const { data } = await supabase.functions.invoke('search-offers', {
      body: { query: request, language: isArabic ? 'ar' : 'en' }
    });
    
    clearInterval(progressInterval);
    setProgress(100);
    
    // Show success toast
    toast.success(isArabic 
      ? "تم البحث بنجاح! تم إرسال الطلب للموردين"
      : "Search complete! Request sent to suppliers");
    
    // Close dialog after success
    setTimeout(() => {
      onOpenChange(false);
      setStep('input');
      setProgress(0);
    }, 1000);
    
  } catch (error) {
    toast.error(isArabic 
      ? "حدث خطأ أثناء البحث"
      : "Error during search");
    setStep('input');
  }
};
```

### 2. Edge Function: `search-offers/index.ts`

**الوظيفة:**
- استقبال نص الطلب (query) واللغة
- استخدام Lovable AI (gemini-3-flash-preview) لتحليل الطلب
- توليد ملخص للموردين المقترحين والأسعار التقديرية

**المدخلات:**
```typescript
interface SearchOffersRequest {
  query: string;      // نص الطلب
  language: 'ar' | 'en';
}
```

**المخرجات:**
```typescript
interface SearchOffersResponse {
  success: boolean;
  summary: string;           // ملخص AI
  estimated_items: Array<{
    name: string;
    estimated_price_min: number;
    estimated_price_max: number;
    currency: string;
    suppliers: string[];
  }>;
  search_sources: string[];  // المصادر المستخدمة
}
```

**Prompt للذكاء الاصطناعي:**
```
You are a procurement specialist for construction projects in Saudi Arabia.
Analyze this request and provide:
1. A breakdown of items needed
2. Estimated price ranges (SAR)
3. Suggested supplier types
4. Market availability notes
```

### 3. تحديث `supabase/config.toml`

```toml
[functions.search-offers]
verify_jwt = false
```

---

## واجهة المستخدم - التفاصيل

### شاشة المعالجة (Processing View)

```tsx
{step === 'processing' && (
  <div className="flex flex-col items-center justify-center py-12 space-y-6">
    {/* Animated Icon Area */}
    <div className="relative w-32 h-32 flex items-center justify-center">
      <div className="absolute inset-0 border-2 border-dashed border-muted-foreground/30 rounded-lg" />
      <div className="flex flex-col items-center gap-2">
        <Sparkles className="w-10 h-10 text-primary animate-pulse" />
        <div className="flex gap-1">
          <Sparkles className="w-4 h-4 text-primary/60 animate-bounce" />
          <Sparkles className="w-4 h-4 text-primary/80 animate-bounce delay-100" />
          <Sparkles className="w-4 h-4 text-primary animate-bounce delay-200" />
        </div>
      </div>
    </div>

    {/* Status Text */}
    <div className="text-center space-y-2">
      <h3 className="text-lg font-semibold text-primary">
        {isArabic ? "جاري المعالجة..." : "Processing..."}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {isArabic 
          ? "يقوم الذكاء الاصطناعي بتحليل عروض الشركاء من قواعد البيانات ومصادر الويب، ويُنشئ ملخصًا موجزًا"
          : "AI analyzes partner offers from databases and web sources, creating a concise summary."}
      </p>
    </div>

    {/* Progress Bar */}
    <div className="w-full max-w-sm space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{isArabic ? "جاري التحميل..." : "Loading..."}</span>
        <span className="text-primary font-medium">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  </div>
)}
```

---

## السلوك المتوقع

1. **المستخدم يكتب طلبًا** أو **يضغط على اقتراح جاهز**
2. **يضغط Submit Request**
3. **تتحول الشاشة** إلى وضع المعالجة:
   - تظهر الأيقونة المتحركة
   - يتحرك شريط التقدم تدريجيًا
   - النص التوضيحي يشرح ما يحدث
4. **بعد اكتمال البحث (2-5 ثوان)**:
   - يظهر toast نجاح
   - تُغلق النافذة تلقائيًا
5. **(مستقبلًا)** يمكن إضافة شاشة نتائج تعرض تفاصيل البحث

---

## معالجة الأخطاء

| الحالة | الرسالة | الإجراء |
|--------|---------|---------|
| 429 Rate Limit | "تجاوز الحد المسموح، حاول لاحقًا" | العودة لشاشة الإدخال |
| 402 Credits | "يرجى شحن الرصيد" | إظهار رسالة خطأ |
| Network Error | "خطأ في الاتصال" | العودة لشاشة الإدخال + زر إعادة المحاولة |

---

## الخطوات التنفيذية

1. **إنشاء Edge Function** `supabase/functions/search-offers/index.ts`
2. **تحديث config.toml** لإضافة الدالة الجديدة
3. **تعديل RequestOfferDialog.tsx**:
   - إضافة states للتحكم بالخطوات
   - إضافة شاشة المعالجة (Processing View)
   - ربط Submit بـ Edge Function
   - معالجة الأخطاء والنجاح

---

## اختبار بعد التنفيذ

1. اذهب لصفحة `/procurement`
2. اضغط على زر **Request Offer**
3. اكتب طلبًا أو اضغط على اقتراح جاهز
4. اضغط **Submit Request**
5. **تحقق من**:
   - ظهور شاشة المعالجة مع الأيقونة المتحركة
   - تحرك شريط التقدم بسلاسة
   - ظهور رسالة النجاح
   - إغلاق النافذة تلقائيًا


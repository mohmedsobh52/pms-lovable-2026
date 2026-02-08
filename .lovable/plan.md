

# خطة تنفيذ شاشة النتائج المفصلة مع حفظ البحث في قاعدة البيانات

## نظرة عامة

بدلاً من إغلاق نافذة طلب عرض السعر مباشرة بعد اكتمال البحث، سيتم:
1. **عرض شاشة نتائج مفصلة** تتضمن جدول الموردين والأسعار والتوصيات
2. **حفظ نتائج البحث** تلقائياً في قاعدة البيانات
3. **عرض البيانات في جدول منظم** مع إمكانية التصدير

---

## هيكل شاشة النتائج

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ✨ Request Offer                                              ✕    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✓ تم تحليل الطلب بنجاح                                      │   │
│  │   ملخص: 10 أجهزة لابتوب لفريق التطوير                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ قائمة الموردين والأسعار ─────────────────────────────────────┐ │
│  │ المادة          │ السعر (ر.س)      │ الموردين المقترحين       │ │
│  │─────────────────┼──────────────────┼─────────────────────────│ │
│  │ MacBook Pro     │ 8,000 - 12,000   │ جرير، الكمبيوتر شوب     │ │
│  │ Dell XPS 15     │ 6,500 - 9,000    │ إكسترا، نون             │ │
│  │ HP EliteBook    │ 5,000 - 7,500    │ جرير، أمازون السعودية   │ │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ التوصيات ─────────────────────────────────────────────────────┐│
│  │ • طلب عروض من 3 موردين على الأقل للمقارنة                     ││
│  │ • التفاوض على خصومات الكميات                                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ ملاحظات السوق ──────────────────────────────────────────────┐  │
│  │ توفر جيد في السوق السعودي مع فترات توريد 3-7 أيام           │  │
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│                              [طلب جديد]  [إغلاق]                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## التدفق الجديد

```text
┌───────────────┐     ┌────────────────┐     ┌─────────────────┐
│  Input View   │ ──► │ Processing     │ ──► │  Results View   │
│               │     │    View        │     │ (جدول + ملخص)   │
└───────────────┘     └────────────────┘     └─────────────────┘
                              │                       │
                              ▼                       ▼
                     ┌────────────────┐      ┌────────────────┐
                     │ Edge Function  │      │    Database    │
                     │ search-offers  │      │ offer_requests │
                     └────────────────┘      └────────────────┘
```

---

## التغييرات المطلوبة

### 1. إنشاء جدول قاعدة البيانات: `offer_requests`

```sql
CREATE TABLE offer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_text TEXT NOT NULL,
  language VARCHAR(5) DEFAULT 'en',
  summary TEXT,
  estimated_items JSONB DEFAULT '[]',
  recommendations TEXT[],
  market_notes TEXT,
  search_sources TEXT[],
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- فهرس للمستخدم
CREATE INDEX idx_offer_requests_user_id ON offer_requests(user_id);

-- RLS
ALTER TABLE offer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own offer requests"
  ON offer_requests FOR ALL
  USING (auth.uid() = user_id);
```

### 2. تحديث `RequestOfferDialog.tsx`

**State جديدة:**
```tsx
interface SearchResult {
  summary: string;
  estimated_items: Array<{
    name: string;
    estimated_price_min: number;
    estimated_price_max: number;
    currency: string;
    suppliers: string[];
  }>;
  recommendations: string[];
  market_notes: string;
  search_sources: string[];
}

const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
```

**شاشة النتائج الجديدة (Results View):**
- بطاقة ملخص بأيقونة ✓ خضراء
- جدول مفصل للمواد والأسعار والموردين
- قسم التوصيات
- قسم ملاحظات السوق
- زرين: "طلب جديد" و "إغلاق"

**تعديل منطق البحث:**
```tsx
const handleSubmitWithQuery = async (query: string) => {
  // ... existing processing logic ...
  
  if (data) {
    setSearchResults(data);
    setStep('results');
    
    // Save to database
    await supabase.from('offer_requests').insert([{
      user_id: user?.id,
      request_text: query,
      language: isArabic ? 'ar' : 'en',
      summary: data.summary,
      estimated_items: data.estimated_items,
      recommendations: data.recommendations,
      market_notes: data.market_notes,
      search_sources: data.search_sources,
    }]);
  }
};
```

### 3. تحديث `search-offers/index.ts`

إضافة حقل `total_estimated_cost` للملخص:
```typescript
return {
  success: true,
  summary: "...",
  estimated_items: [...],
  recommendations: [...],
  market_notes: "...",
  search_sources: [...],
  total_estimated_min: sumOfMins,
  total_estimated_max: sumOfMaxs,
};
```

---

## تصميم الجدول

| العمود | النوع AR | النوع EN |
|--------|----------|----------|
| المادة/المعدة | Item/Material |
| السعر التقديري | Estimated Price |
| الموردين المقترحين | Suggested Suppliers |

**تنسيق السعر:**
```
SAR 8,000 - 12,000
```

**تنسيق الموردين:**
```
جرير، الكمبيوتر شوب
```

---

## ملفات سيتم تعديلها

| الملف | التغيير |
|-------|---------|
| `src/components/procurement/RequestOfferDialog.tsx` | إضافة Results View + جدول + حفظ DB |
| `supabase/functions/search-offers/index.ts` | إضافة حساب المجموع التقديري |
| **Migration** | إنشاء جدول `offer_requests` |

---

## تفاصيل واجهة المستخدم

### بطاقة الملخص (Success Header)
```tsx
<div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
    <CheckCircle className="w-5 h-5" />
    <span className="font-semibold">
      {isArabic ? "تم تحليل الطلب بنجاح" : "Request analyzed successfully"}
    </span>
  </div>
  <p className="text-sm text-muted-foreground mt-1">{results.summary}</p>
</div>
```

### جدول الأسعار
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>{isArabic ? "المادة" : "Item"}</TableHead>
      <TableHead>{isArabic ? "السعر (ر.س)" : "Price (SAR)"}</TableHead>
      <TableHead>{isArabic ? "الموردين" : "Suppliers"}</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {results.estimated_items.map((item, index) => (
      <TableRow key={index}>
        <TableCell className="font-medium">{item.name}</TableCell>
        <TableCell>
          {item.estimated_price_min.toLocaleString()} - {item.estimated_price_max.toLocaleString()}
        </TableCell>
        <TableCell>{item.suppliers.join("، ")}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### التوصيات
```tsx
<div className="space-y-2">
  <h4 className="font-medium flex items-center gap-2">
    <Lightbulb className="w-4 h-4" />
    {isArabic ? "التوصيات" : "Recommendations"}
  </h4>
  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
    {results.recommendations.map((rec, i) => (
      <li key={i}>{rec}</li>
    ))}
  </ul>
</div>
```

---

## السلوك المتوقع بعد التنفيذ

1. المستخدم يكتب طلبًا ويضغط "إرسال الطلب"
2. تظهر شاشة المعالجة مع شريط التقدم
3. بعد اكتمال البحث:
   - تظهر **شاشة النتائج** بدلاً من الإغلاق
   - يُعرض **جدول الموردين والأسعار**
   - تظهر **التوصيات وملاحظات السوق**
   - يتم **حفظ النتائج** في قاعدة البيانات تلقائياً
4. المستخدم يختار:
   - "طلب جديد" → العودة لشاشة الإدخال
   - "إغلاق" → إغلاق النافذة

---

## اختبار بعد التنفيذ

1. اذهب لصفحة `/procurement`
2. افتح "Request Offer"
3. أرسل طلبًا
4. تحقق من:
   - ظهور شاشة النتائج مع الجدول
   - عرض الموردين والأسعار بشكل صحيح
   - ظهور التوصيات
   - عمل زر "طلب جديد"
5. تحقق من حفظ البيانات في جدول `offer_requests`


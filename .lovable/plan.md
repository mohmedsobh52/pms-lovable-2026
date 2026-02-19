
# تحسين شاشة Advanced Analysis: Collapsible Sidebar + Pricing Progress + Table Polish

## الوضع الحالي

بعد قراءة `AnalysisResults.tsx` كاملاً (2612 سطر)، الوضع الحالي هو:

**القائمة الجانبية (السطور 1391-1451):**
- موجودة بعرض ثابت `w-52`
- لا يمكن إخفاؤها أو طيّها
- تعرض فقط عناصر التنقل + مؤشر الحفظ في الأسفل
- لا يوجد مؤشر تقدم التسعير

**جدول البنود (السطور 2113-2369):**
- الأعمدة الحالية: #، Item No.، Item Code، Description، Unit، Qty، AI Rate، Total، Balance، Actions
- الأعمدة موجودة لكن التصميم يمكن تحسينه

**ما يُطلب إضافته:**
1. **Collapsible Sidebar** - زر طيّ القائمة الجانبية لتوسيع المحتوى
2. **مؤشر تقدم التسعير** - بجانب تبويب Items في القائمة الجانبية
3. **تحسين الجدول** - تصميم أكثر وضوحاً وتنظيماً مطابق للصورة

## التغييرات التقنية

### الملف الوحيد: `src/components/AnalysisResults.tsx`

---

### 1. إضافة state لطيّ القائمة الجانبية

**بعد السطر 160** (قائمة الـ state):
```typescript
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
```

---

### 2. حساب مؤشر تقدم التسعير

**بعد `kpiData` useMemo (السطر 855)**، إضافة:
```typescript
// Pricing progress for sidebar badge
const pricingProgress = useMemo(() => {
  const items = (data.items || []).filter(item => !!item.item_number && !deletedItemNumbers.has(item.item_number));
  const pricedItems = items.filter(item => {
    const calcCosts = getItemCalculatedCosts(item.item_number);
    return (calcCosts.aiSuggestedRate || 0) > 0;
  });
  return { priced: pricedItems.length, total: items.length };
}, [data.items, deletedItemNumbers, getItemCalculatedCosts]);
```

---

### 3. تحديث هيكل القائمة الجانبية (السطور 1388-1451)

**الهيكل الجديد للـ sidebar:**

```tsx
{/* ── Sidebar + Content layout ── */}
<div className="flex" style={{ minHeight: '600px' }}>

  {/* ── Left Sidebar ── */}
  <div className={cn(
    "shrink-0 border-r border-border bg-muted/20 flex flex-col transition-all duration-200",
    sidebarCollapsed ? "w-12" : "w-52"
  )} dir="ltr">
    
    {/* Collapse Toggle Button */}
    <div className="flex items-center justify-between p-2 border-b border-border">
      {!sidebarCollapsed && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          {isArabic ? "التحليل" : "Analysis"}
        </p>
      )}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ml-auto"
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>

    {/* Navigation Items */}
    <div className="p-2 flex-1">
      <nav className="space-y-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-all",
                sidebarCollapsed ? "justify-center" : (isArabic ? "flex-row-reverse text-right" : "text-left"),
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={sidebarCollapsed ? (isArabic ? tab.labelAr : tab.label) : undefined}
            >
              {tab.icon}
              {!sidebarCollapsed && (
                <>
                  <span className="truncate flex-1">{isArabic ? tab.labelAr : tab.label}</span>
                  {/* Pricing progress badge - only on "items" tab */}
                  {tab.id === "items" && pricingProgress.total > 0 && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                      pricingProgress.priced === pricingProgress.total
                        ? "bg-green-500/20 text-green-600"
                        : "bg-orange-500/20 text-orange-600"
                    )}>
                      {pricingProgress.priced}/{pricingProgress.total}
                    </span>
                  )}
                </>
              )}
              {/* Collapsed: small dot indicator for Items tab */}
              {sidebarCollapsed && tab.id === "items" && pricingProgress.total > 0 && (
                <span className={cn(
                  "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
                  pricingProgress.priced === pricingProgress.total ? "bg-green-500" : "bg-orange-500"
                )} />
              )}
            </button>
          );
        })}
      </nav>
    </div>

    {/* Bottom status (hidden when collapsed) */}
    {!sidebarCollapsed && (
      <div className="p-3 border-t border-border space-y-2">
        {/* Pricing Progress Bar */}
        {pricingProgress.total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{isArabic ? "التسعير" : "Pricing"}</span>
              <span>{Math.round((pricingProgress.priced / pricingProgress.total) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(pricingProgress.priced / pricingProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        {/* Clock + Cloud sync indicators */}
        {lastSavedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">{lastSavedAt.toLocaleTimeString()}</span>
          </div>
        )}
        {/* ... existing cloud sync code ... */}
      </div>
    )}
  </div>

  {/* ── Main Content Area ── */}
  <div className="flex-1 flex flex-col min-w-0">
    {/* ... existing toolbar + content ... */}
  </div>
</div>
```

---

### 4. تحسين تصميم الجدول

**رأس الجدول (السطور 2114-2182):** تحسينات بسيطة على الألوان والتباعد:
- تحديث row header color إلى `bg-primary/10` بدلاً من `bg-slate-100`
- إضافة خطوط فاصلة أوضح بين المجموعات

**صفوف الجدول (السطور 2208-2341):** تحسينات مرئية:
- تحسين تمييز صفوف المبالغ العالية والصفر
- إضافة progress mini-bar في عمود Qty للبنود المسعّرة
- التأكد أن عمود Total يعرض القيمة بشكل أوضح مع اللون

**الأعمدة الحالية مطابقة للمطلوب:**
```
#  |  Item No.  |  Item Code  |  Description  |  Unit  |  Qty  |  AI Rate  |  Total  |  Balance  |  Actions
```

---

### 5. الإصلاحات الإضافية

- **استيراد أيقونات ChevronLeft/ChevronRight** - إضافتها لـ import السطر 2
- **تأكيد عمل التنقل** - التحقق من الـ `activeTab` state يعمل بشكل صحيح مع القائمة الجديدة

---

## ملخص التغييرات

| الجزء | التغيير |
|-------|---------|
| State (سطر ~160) | `const [sidebarCollapsed, setSidebarCollapsed] = useState(false)` |
| Import (سطر 2) | إضافة `ChevronLeft, ChevronRight` |
| pricingProgress (سطر ~856) | `useMemo` جديد لحساب البنود المسعّرة |
| Sidebar (سطور 1391-1451) | طي/توسيع + مؤشر تقدم + شريط تقدم |
| Table header (سطر ~2115) | تحسين الألوان |
| Table rows (سطر ~2213) | تحسين المرئيات |

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/AnalysisResults.tsx` | جميع التغييرات أعلاه |

لا تغييرات على قاعدة البيانات أو Edge Functions.

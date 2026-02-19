
# إضافة القائمة الجانبية في شاشة Advanced Analysis

## الوضع الحالي

مكوّن `AnalysisResults.tsx` يستخدم **تبويبات أفقية** (horizontal tabs) في أعلى الشاشة للتنقل بين الأقسام:
- Items · WBS · Cost · Brief · Charts · Time Schedule · Schedule Integration

المطلوب: تحويلها إلى **قائمة جانبية عمودية** (vertical sidebar) كما يظهر في الصورة المرفقة مع الإبقاء على المحتوى الرئيسي يملأ بقية المساحة.

## التصميم المقترح

```text
┌─────────────────────────────────────────────────┐
│  KPI Dashboard (أعلى الصفحة - بدون تغيير)       │
├──────────────┬──────────────────────────────────┤
│  القائمة     │                                  │
│  الجانبية   │     المحتوى الرئيسي              │
│              │     (Items / WBS / Cost ...)      │
│  ● Items     │                                  │
│  ○ WBS       │                                  │
│  ○ Cost      │                                  │
│  ○ Brief     │                                  │
│  ○ Charts    │                                  │
│  ○ Schedule  │                                  │
│  ○ Integrat. │                                  │
│              │                                  │
├──────────────┤                                  │
│  أدوات وتصدير│                                  │
│  (أسفل)      │                                  │
└──────────────┴──────────────────────────────────┘
```

## التغييرات التقنية على `AnalysisResults.tsx`

### 1. تغيير هيكل التخطيط (Layout)

**الحالي:** تخطيط عمودي — شريط التبويبات + أزرار التصدير في نفس السطر الأفقي، ثم المحتوى أسفله.

**الجديد:** تخطيط أفقي مقسّم إلى:
- **عمود أيسر (w-48):** القائمة الجانبية العمودية بعناصر التنقل
- **عمود أيمن (flex-1):** المحتوى الرئيسي + شريط الأدوات/التصدير في أعلى المحتوى

### 2. مكوّن القائمة الجانبية

```tsx
{/* Sidebar */}
<div className="w-48 shrink-0 border-r border-border bg-muted/20 min-h-[600px] flex flex-col">
  <div className="p-3 flex-1">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
      {isArabic ? "التحليل" : "Analysis"}
    </p>
    <nav className="space-y-1">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-right",
            activeTab === tab.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {tab.icon}
          <span>{isArabic ? tab.labelAr : tab.label}</span>
        </button>
      ))}
    </nav>
  </div>

  {/* مؤشر آخر حفظ + Synced في أسفل القائمة */}
  <div className="p-3 border-t border-border space-y-2">
    {lastSavedAt && (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {lastSavedAt.toLocaleTimeString()}
      </div>
    )}
    {user && (
      <div className={cn("text-xs flex items-center gap-1", ...)}>
        <Cloud className="w-3 h-3" />
        {isSavingPrices ? "Syncing..." : "Synced"}
      </div>
    )}
  </div>
</div>
```

### 3. تحديث مصفوفة `tabs` لإضافة التسميات العربية

```tsx
const tabs = [
  { id: "items",       label: "Items",                labelAr: "البنود",                icon: <Package className="w-4 h-4" /> },
  { id: "wbs",         label: "WBS",                  labelAr: "هيكل العمل",            icon: <Layers className="w-4 h-4" /> },
  { id: "costs",       label: "Cost",                 labelAr: "التكاليف",              icon: <DollarSign className="w-4 h-4" /> },
  { id: "summary",     label: "Brief",                labelAr: "الملخص",               icon: <BarChart3 className="w-4 h-4" /> },
  { id: "charts",      label: "Charts",               labelAr: "الرسوم البيانية",        icon: <BarChart3 className="w-4 h-4" /> },
  { id: "timeline",    label: "Time Schedule",        labelAr: "الجدول الزمني",         icon: <CalendarDays className="w-4 h-4" /> },
  { id: "integration", label: "Schedule Integration", labelAr: "تكامل الجدول",         icon: <Link2 className="w-4 h-4" /> },
] as const;
```

### 4. نقل شريط الأزرار (Export/Tools) فوق المحتوى

شريط الأزرار (Save Project · Export · Tools · Compare...) سيُنقل إلى أعلى المحتوى الرئيسي داخل العمود الأيمن بدلاً من أن يكون بجانب التبويبات.

## التغيير الكامل للهيكل

**الحالي:**
```tsx
<div className="border-b border-border">
  <div className="flex items-center justify-between p-4">
    <div className="flex gap-2"> {/* tabs */} </div>
    <div className="flex gap-2"> {/* buttons */} </div>
  </div>
</div>
<div className="p-4"> {/* content */} </div>
```

**الجديد:**
```tsx
<div className="flex" style={{ minHeight: '600px' }}>
  {/* Sidebar */}
  <div className="w-48 border-r flex flex-col">
    {/* nav items */}
  </div>

  {/* Main Content Area */}
  <div className="flex-1 flex flex-col">
    {/* Top Toolbar (Buttons) */}
    <div className="border-b p-4 flex gap-2 flex-wrap">
      {/* Save · Export · Tools · Compare... */}
    </div>
    {/* Tab Content */}
    <div className="p-4 flex-1">
      {/* activeTab content */}
    </div>
  </div>
</div>
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/AnalysisResults.tsx` | تحويل التبويبات الأفقية إلى قائمة جانبية عمودية + إعادة ترتيب شريط الأدوات |

لا تغييرات على قاعدة البيانات أو Edge Functions أو أي ملفات أخرى.

## ملاحظات التنفيذ

- الـ `as const` على مصفوفة `tabs` يحتاج تحديثاً لإضافة `labelAr` — يجب إزالة `as const` أو توسيعه.
- عرض القائمة الجانبية `w-48` (192px) مناسب لعرض النصوص مع الأيقونات.
- على الشاشات الصغيرة يمكن الإبقاء على السلوك الحالي (responsive fallback).
- الـ KPI Dashboard في أعلى الشاشة يبقى كما هو خارج هيكل الـ sidebar.

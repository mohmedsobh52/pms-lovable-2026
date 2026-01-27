

# خطة حل مشكلة تفعيل الأزرار والتبويبات في صفحة الإعدادات

## المشكلة

صفحة الإعدادات (`SettingsPage.tsx`) لا تحتوي على class `tabs-navigation-safe` في عنصر `TabsList`، مما يسبب عدم استجابة التبويبات للنقر بشكل صحيح.

---

## الحل

إضافة class `tabs-navigation-safe` إلى `TabsList` في صفحة الإعدادات - نفس الحل المُطبق في الصفحات الأخرى.

---

## التعديل المطلوب

### ملف: `src/pages/SettingsPage.tsx`

**التغيير:**

```tsx
// من:
<TabsList className="grid w-full grid-cols-5">

// إلى:
<TabsList className="grid w-full grid-cols-5 tabs-navigation-safe">
```

---

## شرح تقني

| الخاصية | الوظيفة |
|---------|---------|
| `tabs-navigation-safe` | يُعيّن `z-index: 55` للتبويبات |
| `pointer-events: auto` | يضمن استجابة التبويبات للنقر |
| `position: relative` | يُفعّل z-index |

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/SettingsPage.tsx` | إضافة class للـ TabsList |

---

## المقارنة مع الصفحات الأخرى المُصلحة

| الصفحة | الحالة |
|--------|--------|
| `ContractsPage.tsx` | ✅ مُصلح |
| `SubcontractorsPage.tsx` | ✅ مُصلح |
| `AnalysisToolsPage.tsx` | ✅ مُصلح |
| `TenderSummaryPage.tsx` | ✅ مُصلح |
| `ReportsPage.tsx` | ✅ مُصلح |
| `SettingsPage.tsx` | ❌ يحتاج إصلاح |

---

## النتيجة المتوقعة

بعد التعديل ستعمل جميع التبويبات (Company, AI Model, Tracking, Notifications, About) بشكل طبيعي وتستجيب للنقر فوراً.


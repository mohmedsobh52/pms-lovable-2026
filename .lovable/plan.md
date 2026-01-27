

# خطة إضافة زر الوصول السريع للتقارير

## نظرة عامة

إضافة زر وصول سريع للتقارير في لوحة التحكم (Dashboard) مع تحسين ظهور رابط التقارير في قائمة التنقل الرئيسية.

---

## الوضع الحالي

### ✅ موجود بالفعل:
1. **زر التقارير في Header**: أيقونة التقارير موجودة في `UnifiedHeader.tsx` (سطر 182-191)
2. **رابط التقارير في Mobile Drawer**: رابط "/reports" موجود في `MobileNavDrawer.tsx` (سطر 121-127)

### ❌ غير موجود:
1. زر وصول سريع بارز في لوحة التحكم
2. رابط نصي واضح في قائمة التنقل الرئيسية (Desktop)

---

## التعديلات المطلوبة

### 1. إضافة زر التقارير في Dashboard (MainDashboard.tsx)

إضافة زر بارز في منطقة الإجراءات السريعة (Quick Actions) بجوار أزرار PDF و Excel:

```text
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Header                                             │
│                                                              │
│ [Filter] [Print] [PDF] [Excel] [📊 Reports] [Budget] [↻]    │
│                     ─────────────                            │
│                      زر جديد                                 │
└─────────────────────────────────────────────────────────────┘
```

**التغييرات:**
- إضافة Button جديد مع أيقونة `FileBarChart`
- لون مميز (Primary) للبروز
- نص "التقارير / Reports" مع أيقونة
- استخدام `useNavigate` للانتقال إلى `/reports`

---

### 2. إضافة رابط نصي للتقارير في Header (UnifiedHeader.tsx)

إضافة رابط نصي واضح بجانب Fast Extraction:

```text
┌────────────────────────────────────────────────────────────────┐
│ [Dashboard] [Projects▼] [Analysis▼] [Library▼] [⚡Fast] [📊Reports] │
│                                                    ─────────────     │
│                                                     رابط جديد        │
└────────────────────────────────────────────────────────────────┘
```

**التغييرات:**
- إضافة Link جديد إلى `/reports`
- أيقونة `FileBarChart` مع النص
- لون مميز (أخضر/أزرق) للتمييز
- يظهر على Desktop فقط

---

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `src/components/MainDashboard.tsx` | إضافة زر "التقارير" في منطقة الإجراءات |
| `src/components/UnifiedHeader.tsx` | إضافة رابط "Reports" في قائمة التنقل |

---

## التفاصيل التقنية

### MainDashboard.tsx

```typescript
// إضافة بعد زر Excel (سطر ~707)
<Button 
  variant="default" 
  size="sm" 
  onClick={() => navigate("/reports")}
  className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
>
  <FileBarChart className="w-4 h-4" />
  {isArabic ? "التقارير" : "Reports"}
  <ArrowRight className="w-3 h-3" />
</Button>
```

### UnifiedHeader.tsx

```typescript
// إضافة بعد Fast Extraction (سطر ~160)
<Link to="/reports">
  <Button 
    variant={isActive("/reports") ? "secondary" : "ghost"} 
    size="sm" 
    className="gap-1.5 h-9 px-3 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
  >
    <FileBarChart className="w-4 h-4" />
    <span className="hidden lg:inline">
      {isArabic ? "التقارير" : "Reports"}
    </span>
  </Button>
</Link>
```

---

## النتيجة المتوقعة

```text
✅ زر وصول سريع بارز في Dashboard
✅ رابط نصي واضح في Navigation الرئيسي
✅ تمييز لوني للتقارير (أخضر)
✅ دعم ثنائي اللغة (AR/EN)
✅ Active state عند التواجد في صفحة التقارير
✅ ظهور في Desktop و Mobile
```


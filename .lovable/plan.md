

# خطة: حفظ نتائج تحليل المخططات + إضافة روابط التنقل

## 1. إنشاء جدول قاعدة بيانات `drawing_analyses`

جدول جديد لحفظ نتائج التحليل مرتبط بالمشاريع:

```sql
CREATE TABLE public.drawing_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.project_data(id) ON DELETE CASCADE,
  drawing_type TEXT NOT NULL DEFAULT 'infrastructure',
  file_names TEXT[] DEFAULT '{}',
  drawing_info JSONB DEFAULT '{}',
  results JSONB NOT NULL DEFAULT '[]',
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drawing_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own analyses" ON public.drawing_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own analyses" ON public.drawing_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON public.drawing_analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON public.drawing_analyses FOR DELETE USING (auth.uid() = user_id);
```

## 2. تعديل `src/pages/DrawingAnalysisPage.tsx`

- إضافة **قائمة اختيار مشروع** (Select) لربط التحليل بمشروع موجود أو جديد
- إضافة **زر "حفظ النتائج"** بعد التحليل يحفظ في جدول `drawing_analyses`
- إضافة **قائمة التحليلات المحفوظة** مع إمكانية تحميلها وعرضها
- استخدام `useAuth` للحصول على `user_id`

## 3. إضافة روابط التنقل

### `src/components/MobileNavDrawer.tsx`
إضافة عنصر "تحليل المخططات" ضمن مجموعة "Analysis & Estimating" children

### `src/components/FloatingToolbar.tsx`
إضافة عنصر قائمة جديد لتحليل المخططات

### `src/hooks/useNavigationHistory.tsx`
إضافة `/drawing-analysis` في `routeMap`

### `src/components/home/PhaseActionsGrid.tsx`
إضافة رابط تحليل المخططات في الـ phase المناسب

## 4. الملفات المتأثرة
- `src/pages/DrawingAnalysisPage.tsx` (تعديل رئيسي)
- `src/components/MobileNavDrawer.tsx` (إضافة رابط)
- `src/components/FloatingToolbar.tsx` (إضافة رابط)
- `src/hooks/useNavigationHistory.tsx` (إضافة route info)
- `src/components/home/PhaseActionsGrid.tsx` (إضافة رابط)
- Migration SQL جديد


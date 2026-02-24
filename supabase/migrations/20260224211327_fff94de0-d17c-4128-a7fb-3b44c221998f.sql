
-- Create city_pricing_factors table
CREATE TABLE public.city_pricing_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL UNIQUE,
  city_name_ar TEXT,
  region TEXT NOT NULL,
  factor NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  label TEXT,
  source TEXT DEFAULT 'manual',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.city_pricing_factors ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone can view city pricing factors"
ON public.city_pricing_factors FOR SELECT
USING (true);

-- Authenticated users can manage (since no admin role system broadly available)
CREATE POLICY "Authenticated users can insert city factors"
ON public.city_pricing_factors FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update city factors"
ON public.city_pricing_factors FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete city factors"
ON public.city_pricing_factors FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Seed data from existing CITY_FACTORS constants
INSERT INTO public.city_pricing_factors (city_name, city_name_ar, region, factor, label) VALUES
-- Saudi Arabia
('Riyadh', 'الرياض', 'saudi', 1.00, 'Base'),
('Jeddah', 'جدة', 'saudi', 1.05, '+5%'),
('Dammam', 'الدمام', 'saudi', 1.03, '+3%'),
('Makkah', 'مكة المكرمة', 'saudi', 1.08, '+8%'),
('Madinah', 'المدينة المنورة', 'saudi', 1.04, '+4%'),
('Khobar', 'الخبر', 'saudi', 1.03, '+3%'),
('Tabuk', 'تبوك', 'saudi', 0.95, '-5%'),
('Abha', 'أبها', 'saudi', 0.93, '-7%'),
('Jizan', 'جيزان', 'saudi', 0.90, '-10%'),
('Hail', 'حائل', 'saudi', 0.92, '-8%'),
('Najran', 'نجران', 'saudi', 0.91, '-9%'),
('NEOM', 'نيوم', 'saudi', 1.25, '+25%'),
-- UAE
('Dubai', 'دبي', 'uae', 1.25, '+25%'),
('Abu Dhabi', 'أبو ظبي', 'uae', 1.20, '+20%'),
('Sharjah', 'الشارقة', 'uae', 1.10, '+10%'),
('Ajman', 'عجمان', 'uae', 1.05, '+5%'),
('Ras Al Khaimah', 'رأس الخيمة', 'uae', 1.02, '+2%'),
-- Egypt
('Cairo', 'القاهرة', 'egypt', 0.45, '-55%'),
('Alexandria', 'الإسكندرية', 'egypt', 0.43, '-57%'),
('New Capital', 'العاصمة الإدارية', 'egypt', 0.50, '-50%'),
('Giza', 'الجيزة', 'egypt', 0.44, '-56%'),
-- Kuwait
('Kuwait City', 'مدينة الكويت', 'kuwait', 1.15, '+15%'),
-- Qatar
('Doha', 'الدوحة', 'qatar', 1.20, '+20%'),
-- Bahrain
('Manama', 'المنامة', 'bahrain', 1.08, '+8%'),
-- Oman
('Muscat', 'مسقط', 'oman', 1.05, '+5%'),
-- Jordan
('Amman', 'عمّان', 'jordan', 0.55, '-45%');

-- Create market_price_cache table
CREATE TABLE public.market_price_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_query TEXT NOT NULL,
  city TEXT,
  result_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.market_price_cache ENABLE ROW LEVEL SECURITY;

-- Everyone can read cache
CREATE POLICY "Anyone can view market price cache"
ON public.market_price_cache FOR SELECT
USING (true);

-- Authenticated users can manage cache
CREATE POLICY "Authenticated users can insert cache"
ON public.market_price_cache FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cache"
ON public.market_price_cache FOR DELETE
USING (auth.uid() IS NOT NULL);

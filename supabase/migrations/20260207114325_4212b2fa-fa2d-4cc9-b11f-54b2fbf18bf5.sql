-- Create external_partners table
CREATE TABLE public.external_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  partner_type TEXT DEFAULT 'supplier' CHECK (partner_type IN ('supplier', 'vendor', 'contractor', 'consultant')),
  contract_start_date DATE,
  contract_end_date DATE,
  logo_url TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own partners"
  ON public.external_partners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own partners"
  ON public.external_partners FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own partners"
  ON public.external_partners FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own partners"
  ON public.external_partners FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_external_partners_updated_at
  BEFORE UPDATE ON public.external_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
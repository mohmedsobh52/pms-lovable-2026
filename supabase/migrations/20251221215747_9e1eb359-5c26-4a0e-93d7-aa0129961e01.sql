-- Create price_quotations table for storing uploaded quotations
CREATE TABLE public.price_quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  supplier_name TEXT,
  quotation_date DATE,
  total_amount DECIMAL(15, 2),
  currency TEXT DEFAULT 'ر.س',
  status TEXT DEFAULT 'pending',
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cost_analysis table for detailed cost breakdowns
CREATE TABLE public.cost_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  item_id TEXT,
  item_description TEXT NOT NULL,
  
  -- Direct Costs
  materials_cost DECIMAL(15, 2) DEFAULT 0,
  labor_cost DECIMAL(15, 2) DEFAULT 0,
  equipment_cost DECIMAL(15, 2) DEFAULT 0,
  subcontractor_cost DECIMAL(15, 2) DEFAULT 0,
  
  -- Indirect Costs
  overhead_cost DECIMAL(15, 2) DEFAULT 0,
  admin_cost DECIMAL(15, 2) DEFAULT 0,
  insurance_cost DECIMAL(15, 2) DEFAULT 0,
  contingency_cost DECIMAL(15, 2) DEFAULT 0,
  
  -- Profit & Totals
  profit_margin DECIMAL(5, 2) DEFAULT 10,
  profit_amount DECIMAL(15, 2) DEFAULT 0,
  total_direct_cost DECIMAL(15, 2) DEFAULT 0,
  total_indirect_cost DECIMAL(15, 2) DEFAULT 0,
  total_cost DECIMAL(15, 2) DEFAULT 0,
  unit_price DECIMAL(15, 2) DEFAULT 0,
  
  quantity DECIMAL(15, 3) DEFAULT 1,
  unit TEXT,
  currency TEXT DEFAULT 'ر.س',
  
  ai_provider TEXT,
  ai_analysis JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_quotations
CREATE POLICY "Users can view their own quotations" 
  ON public.price_quotations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quotations" 
  ON public.price_quotations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotations" 
  ON public.price_quotations FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotations" 
  ON public.price_quotations FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for cost_analysis
CREATE POLICY "Users can view their own cost analysis" 
  ON public.cost_analysis FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cost analysis" 
  ON public.cost_analysis FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cost analysis" 
  ON public.cost_analysis FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cost analysis" 
  ON public.cost_analysis FOR DELETE 
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_price_quotations_updated_at
  BEFORE UPDATE ON public.price_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_analysis_updated_at
  BEFORE UPDATE ON public.cost_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for quotation files
INSERT INTO storage.buckets (id, name, public) VALUES ('quotations', 'quotations', false);

-- Storage policies
CREATE POLICY "Users can upload their own quotations"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quotations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own quotations"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quotations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own quotations"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'quotations' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create risks table for risk management
CREATE TABLE public.risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  risk_title TEXT NOT NULL,
  risk_description TEXT,
  category TEXT DEFAULT 'general',
  probability TEXT DEFAULT 'medium',
  impact TEXT DEFAULT 'medium',
  risk_score INTEGER,
  status TEXT DEFAULT 'identified',
  mitigation_strategy TEXT,
  contingency_plan TEXT,
  risk_owner TEXT,
  identified_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  review_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contracts table for contract management
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  contract_title TEXT NOT NULL,
  contractor_name TEXT,
  contract_type TEXT DEFAULT 'fixed_price',
  contract_value NUMERIC,
  currency TEXT DEFAULT 'SAR',
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft',
  payment_terms TEXT,
  scope_of_work TEXT,
  terms_conditions TEXT,
  documents_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cost benefit analysis table
CREATE TABLE public.cost_benefit_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  analysis_name TEXT NOT NULL,
  description TEXT,
  initial_investment NUMERIC DEFAULT 0,
  annual_benefits NUMERIC DEFAULT 0,
  annual_costs NUMERIC DEFAULT 0,
  discount_rate NUMERIC DEFAULT 0.1,
  analysis_period_years INTEGER DEFAULT 5,
  npv NUMERIC,
  bcr NUMERIC,
  irr NUMERIC,
  payback_period NUMERIC,
  assumptions TEXT,
  risks TEXT,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_benefit_analysis ENABLE ROW LEVEL SECURITY;

-- RLS policies for risks
CREATE POLICY "Users can view their own risks" ON public.risks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own risks" ON public.risks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own risks" ON public.risks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own risks" ON public.risks FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for contracts
CREATE POLICY "Users can view their own contracts" ON public.contracts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own contracts" ON public.contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contracts" ON public.contracts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contracts" ON public.contracts FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for cost_benefit_analysis
CREATE POLICY "Users can view their own cost benefit analyses" ON public.cost_benefit_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cost benefit analyses" ON public.cost_benefit_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cost benefit analyses" ON public.cost_benefit_analysis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cost benefit analyses" ON public.cost_benefit_analysis FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cost_benefit_analysis_updated_at BEFORE UPDATE ON public.cost_benefit_analysis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

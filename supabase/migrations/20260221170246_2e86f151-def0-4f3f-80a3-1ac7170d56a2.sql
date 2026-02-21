
-- Create contract_boq_items table
CREATE TABLE public.contract_boq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  project_item_id UUID REFERENCES public.project_items(id) ON DELETE SET NULL,
  item_number TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_boq_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own contract BOQ items"
ON public.contract_boq_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contract BOQ items"
ON public.contract_boq_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contract BOQ items"
ON public.contract_boq_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contract BOQ items"
ON public.contract_boq_items FOR DELETE
USING (auth.uid() = user_id);

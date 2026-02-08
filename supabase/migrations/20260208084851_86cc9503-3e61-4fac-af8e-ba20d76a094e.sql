-- Create offer_requests table for storing price offer requests and results
CREATE TABLE public.offer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_text TEXT NOT NULL,
  language VARCHAR(5) DEFAULT 'en',
  summary TEXT,
  estimated_items JSONB DEFAULT '[]'::jsonb,
  recommendations TEXT[] DEFAULT '{}',
  market_notes TEXT,
  search_sources TEXT[] DEFAULT '{}',
  total_estimated_min NUMERIC,
  total_estimated_max NUMERIC,
  currency TEXT DEFAULT 'SAR',
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for user queries
CREATE INDEX idx_offer_requests_user_id ON public.offer_requests(user_id);
CREATE INDEX idx_offer_requests_created_at ON public.offer_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.offer_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own offer requests"
  ON public.offer_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own offer requests"
  ON public.offer_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own offer requests"
  ON public.offer_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own offer requests"
  ON public.offer_requests FOR DELETE
  USING (auth.uid() = user_id);
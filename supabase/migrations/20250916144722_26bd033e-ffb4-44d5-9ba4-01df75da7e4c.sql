-- Create table for creator call pricing tiers
CREATE TABLE public.creator_call_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_per_block NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_call_pricing ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Creators can manage their own pricing" 
ON public.creator_call_pricing 
FOR ALL 
USING (auth.uid() = creator_id);

CREATE POLICY "Everyone can view active pricing" 
ON public.creator_call_pricing 
FOR SELECT 
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_creator_call_pricing_updated_at
BEFORE UPDATE ON public.creator_call_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
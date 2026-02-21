
-- Create service_categories table
CREATE TABLE public.service_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view service categories"
ON public.service_categories FOR SELECT USING (true);

CREATE POLICY "Admin can manage service categories"
ON public.service_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed from existing services
INSERT INTO public.service_categories (name)
SELECT DISTINCT category FROM public.services WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

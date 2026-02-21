
-- Create thailand_addresses table
CREATE TABLE public.thailand_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  province text NOT NULL,
  district text NOT NULL,
  subdistrict text NOT NULL,
  postal_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for fast lookups
CREATE INDEX idx_thailand_addresses_province ON public.thailand_addresses (province);
CREATE INDEX idx_thailand_addresses_district ON public.thailand_addresses (province, district);
CREATE INDEX idx_thailand_addresses_subdistrict ON public.thailand_addresses (province, district, subdistrict);

-- Enable RLS
ALTER TABLE public.thailand_addresses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (reference data)
CREATE POLICY "Anyone can view thailand addresses"
ON public.thailand_addresses
FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage thailand addresses"
ON public.thailand_addresses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

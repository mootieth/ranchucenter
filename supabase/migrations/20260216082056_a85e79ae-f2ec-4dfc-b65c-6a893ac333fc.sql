
-- Add service_mode to services table
ALTER TABLE public.services ADD COLUMN service_mode text NOT NULL DEFAULT 'onsite';

-- Create service_locations table for in-person service locations
CREATE TABLE public.service_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view service locations"
ON public.service_locations
FOR SELECT
USING (true);

CREATE POLICY "Admin can manage service locations"
ON public.service_locations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

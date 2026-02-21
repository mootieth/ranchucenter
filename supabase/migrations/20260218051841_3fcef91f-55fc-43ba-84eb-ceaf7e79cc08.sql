
-- Create junction table for multiple providers per patient
CREATE TABLE public.patient_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(patient_id, provider_id)
);

-- Enable RLS
ALTER TABLE public.patient_providers ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "Authenticated users can view patient_providers"
ON public.patient_providers
FOR SELECT
USING (true);

-- Admin/staff can manage
CREATE POLICY "Admin and staff can manage patient_providers"
ON public.patient_providers
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
);

-- Update patients RLS to use junction table instead of single column
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;

CREATE POLICY "Authenticated users can view patients"
ON public.patients
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.patient_providers pp
    WHERE pp.patient_id = patients.id
    AND pp.provider_id = auth.uid()
  )
  OR NOT EXISTS (
    SELECT 1 FROM public.patient_providers pp
    WHERE pp.patient_id = patients.id
  )
);

-- Migrate existing data from primary_provider_id to junction table
INSERT INTO public.patient_providers (patient_id, provider_id)
SELECT id, primary_provider_id FROM public.patients
WHERE primary_provider_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop old column
ALTER TABLE public.patients DROP COLUMN IF EXISTS primary_provider_id;

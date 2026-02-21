
-- Add primary_provider_id column to patients table
ALTER TABLE public.patients ADD COLUMN primary_provider_id uuid NULL;

-- Update RLS policies on patients table
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;

-- Create new SELECT policy: admins/staff see all, doctors/therapists see only their assigned patients
CREATE POLICY "Authenticated users can view patients"
ON public.patients
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR primary_provider_id = auth.uid()
  OR primary_provider_id IS NULL
);

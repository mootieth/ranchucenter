
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;

CREATE POLICY "Authenticated users can view patients"
ON public.patients
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR EXISTS (
    SELECT 1 FROM patient_providers pp
    WHERE pp.patient_id = patients.id AND pp.provider_id = auth.uid()
  )
);


-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "Doctors and therapists can manage treatments" ON public.treatments;

-- Create separate policies for INSERT, UPDATE, DELETE that also check patient_providers
CREATE POLICY "Doctors and therapists can insert treatments"
ON public.treatments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'doctor'::app_role)
  OR has_role(auth.uid(), 'therapist'::app_role)
);

CREATE POLICY "Doctors and therapists can update treatments"
ON public.treatments
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'therapist'::app_role))
    AND EXISTS (
      SELECT 1 FROM patient_providers pp
      WHERE pp.patient_id = treatments.patient_id AND pp.provider_id = auth.uid()
    )
  )
);

CREATE POLICY "Doctors and therapists can delete treatments"
ON public.treatments
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'therapist'::app_role))
    AND EXISTS (
      SELECT 1 FROM patient_providers pp
      WHERE pp.patient_id = treatments.patient_id AND pp.provider_id = auth.uid()
    )
  )
);

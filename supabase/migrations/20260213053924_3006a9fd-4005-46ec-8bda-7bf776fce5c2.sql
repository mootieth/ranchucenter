
-- Create a cascade delete function for patients (admin only)
CREATE OR REPLACE FUNCTION public.delete_patient_cascade(_patient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin users can delete patients';
  END IF;

  -- Delete prescription items for prescriptions linked to this patient
  DELETE FROM public.prescription_items
  WHERE prescription_id IN (
    SELECT id FROM public.prescriptions WHERE patient_id = _patient_id
  );

  -- Delete prescriptions
  DELETE FROM public.prescriptions WHERE patient_id = _patient_id;

  -- Delete billing items for billings linked to this patient
  DELETE FROM public.billing_items
  WHERE billing_id IN (
    SELECT id FROM public.billings WHERE patient_id = _patient_id
  );

  -- Delete billings
  DELETE FROM public.billings WHERE patient_id = _patient_id;

  -- Delete treatments
  DELETE FROM public.treatments WHERE patient_id = _patient_id;

  -- Delete appointments
  DELETE FROM public.appointments WHERE patient_id = _patient_id;

  -- Delete patient allergies
  DELETE FROM public.patient_allergies WHERE patient_id = _patient_id;

  -- Delete the patient
  DELETE FROM public.patients WHERE id = _patient_id;
END;
$$;

-- Add DELETE policy for patients (admin only)
CREATE POLICY "Admins can delete patients"
ON public.patients
FOR DELETE
USING (has_role(auth.uid(), 'admin'));


-- Create a security definer function to cascade delete a treatment and all related data
-- Only admin users can call this function
CREATE OR REPLACE FUNCTION public.delete_treatment_cascade(_treatment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin users can delete treatments';
  END IF;

  -- Delete prescription items for prescriptions linked to this treatment
  DELETE FROM public.prescription_items
  WHERE prescription_id IN (
    SELECT id FROM public.prescriptions WHERE treatment_id = _treatment_id
  );

  -- Delete prescriptions linked to this treatment
  DELETE FROM public.prescriptions WHERE treatment_id = _treatment_id;

  -- Delete billing items for billings linked to this treatment
  DELETE FROM public.billing_items
  WHERE billing_id IN (
    SELECT id FROM public.billings WHERE treatment_id = _treatment_id
  );

  -- Delete billings linked to this treatment
  DELETE FROM public.billings WHERE treatment_id = _treatment_id;

  -- Delete the treatment itself
  DELETE FROM public.treatments WHERE id = _treatment_id;
END;
$$;

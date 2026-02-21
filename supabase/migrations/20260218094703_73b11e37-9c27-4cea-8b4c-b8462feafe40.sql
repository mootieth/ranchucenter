
-- Drop existing ALL policy on billings
DROP POLICY IF EXISTS "Staff can manage billings" ON public.billings;

-- Create new policy allowing doctor and therapist to also manage billings
CREATE POLICY "Staff can manage billings" ON public.billings
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'doctor'::app_role)
  OR has_role(auth.uid(), 'therapist'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'doctor'::app_role)
  OR has_role(auth.uid(), 'therapist'::app_role)
);

-- Also update billing_items to include therapist
DROP POLICY IF EXISTS "Staff can manage billing items" ON public.billing_items;

CREATE POLICY "Staff can manage billing items" ON public.billing_items
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'doctor'::app_role)
  OR has_role(auth.uid(), 'therapist'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'doctor'::app_role)
  OR has_role(auth.uid(), 'therapist'::app_role)
);

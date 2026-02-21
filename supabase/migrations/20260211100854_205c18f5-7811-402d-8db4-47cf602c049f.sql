-- Drop the restrictive ALL policy on billing_items
DROP POLICY IF EXISTS "Staff can manage billing items" ON public.billing_items;

-- Create a PERMISSIVE ALL policy instead
CREATE POLICY "Staff can manage billing items"
ON public.billing_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'doctor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'doctor'::app_role));

-- Also fix the SELECT policy to be permissive
DROP POLICY IF EXISTS "Authenticated users can view billing items" ON public.billing_items;

CREATE POLICY "Authenticated users can view billing items"
ON public.billing_items
FOR SELECT
USING (true);
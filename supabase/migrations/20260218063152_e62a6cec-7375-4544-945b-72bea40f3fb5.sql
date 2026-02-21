
-- Create security definer function to check permission without recursion
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id
      AND permission_key = _permission_key
      AND is_allowed = true
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Permission managers can manage permissions" ON public.user_permissions;

-- Recreate using the security definer function
CREATE POLICY "Permission managers can manage permissions"
ON public.user_permissions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_permission(auth.uid(), 'permissions')
);

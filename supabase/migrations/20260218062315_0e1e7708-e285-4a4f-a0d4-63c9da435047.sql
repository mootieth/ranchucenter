
-- Drop existing admin-only manage policy
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_permissions;

-- Create new policy: admin OR users who have 'permissions' permission can manage
CREATE POLICY "Permission managers can manage permissions"
ON public.user_permissions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.permission_key = 'permissions'
      AND up.is_allowed = true
  )
);


-- Create invite tokens table
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  role app_role NOT NULL DEFAULT 'staff',
  created_by uuid,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamp with time zone,
  used_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Admins can manage invite tokens
DO $$ BEGIN
  CREATE POLICY "Admins can manage invite tokens"
  ON public.invite_tokens
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Anyone can read tokens for validation (needed for public registration)
DO $$ BEGIN
  CREATE POLICY "Anyone can validate tokens"
  ON public.invite_tokens
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

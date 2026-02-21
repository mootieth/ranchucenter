
-- Table to store Google OAuth tokens per provider
CREATE TABLE public.provider_google_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamp with time zone NOT NULL,
  google_email text,
  calendar_id text DEFAULT 'primary',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_google_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view their own google tokens"
ON public.provider_google_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Users can manage their own tokens
CREATE POLICY "Users can manage their own google tokens"
ON public.provider_google_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add google_event_id to appointments for sync tracking
ALTER TABLE public.appointments ADD COLUMN google_event_id text;

-- Trigger for updated_at
CREATE TRIGGER update_provider_google_tokens_updated_at
BEFORE UPDATE ON public.provider_google_tokens
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

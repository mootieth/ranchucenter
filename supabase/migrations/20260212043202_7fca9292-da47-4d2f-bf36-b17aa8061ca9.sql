
-- Add user status and resignation fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resignation_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivation_reason text;

-- Add address fields for salary slip
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS house_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS moo text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subdistrict text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code text;


ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

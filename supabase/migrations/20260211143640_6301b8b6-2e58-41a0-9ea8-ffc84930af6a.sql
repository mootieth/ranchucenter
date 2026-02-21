
ALTER TABLE public.medications ADD COLUMN expiry_date date;
CREATE INDEX idx_medications_expiry_date ON public.medications(expiry_date);

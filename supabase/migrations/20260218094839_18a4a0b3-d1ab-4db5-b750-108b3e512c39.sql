
ALTER TABLE public.appointments DROP CONSTRAINT appointments_appointment_type_check;

ALTER TABLE public.appointments ADD CONSTRAINT appointments_appointment_type_check 
CHECK (appointment_type = ANY (ARRAY['consultation'::text, 'therapy'::text, 'follow_up'::text, 'emergency'::text, 'assessment'::text, 'diagnosis'::text]));

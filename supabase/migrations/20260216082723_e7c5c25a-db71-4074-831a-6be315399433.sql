
-- Add location_id to appointments
ALTER TABLE public.appointments ADD COLUMN location_id uuid REFERENCES public.service_locations(id);

-- Add meet_link column to store Google Meet link for online appointments
ALTER TABLE public.appointments ADD COLUMN meet_link TEXT;

-- Add google_meet_event_id to track the Meet calendar event separately from provider calendar event
ALTER TABLE public.appointments ADD COLUMN google_meet_event_id TEXT;
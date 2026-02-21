
-- Table for provider weekly schedules (multiple time slots per day)
CREATE TABLE public.provider_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Index for fast lookups
CREATE INDEX idx_provider_schedules_provider ON public.provider_schedules(provider_id, day_of_week);

-- Enable RLS
ALTER TABLE public.provider_schedules ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view schedules (needed for appointment booking)
CREATE POLICY "Authenticated users can view provider schedules"
  ON public.provider_schedules FOR SELECT
  TO authenticated
  USING (true);

-- Providers can manage their own schedules
CREATE POLICY "Providers can manage their own schedules"
  ON public.provider_schedules FOR ALL
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Admins can manage all schedules
CREATE POLICY "Admins can manage all provider schedules"
  ON public.provider_schedules FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_provider_schedules_updated_at
  BEFORE UPDATE ON public.provider_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

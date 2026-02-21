
-- Create stock movement log table
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  movement_type text NOT NULL, -- 'in' = รับเข้า, 'out' = จ่ายออก, 'adjust' = ปรับปรุง
  quantity integer NOT NULL,
  previous_stock integer NOT NULL DEFAULT 0,
  new_stock integer NOT NULL DEFAULT 0,
  reference_type text, -- 'prescription', 'manual', 'initial'
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view stock movements"
  ON public.stock_movements FOR SELECT
  USING (true);

CREATE POLICY "Admin and doctors can manage stock movements"
  ON public.stock_movements FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'doctor'));

-- Index for fast lookups
CREATE INDEX idx_stock_movements_medication_id ON public.stock_movements(medication_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

-- Create patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hn TEXT NOT NULL UNIQUE, -- Hospital Number
  id_card TEXT UNIQUE, -- Thai ID card
  prefix TEXT, -- คำนำหน้า
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth DATE,
  blood_type TEXT CHECK (blood_type IN ('A', 'B', 'AB', 'O', 'unknown')),
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  occupation TEXT,
  marital_status TEXT,
  photo_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deceased')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medications table (รายการยา)
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  unit TEXT DEFAULT 'เม็ด',
  dosage_form TEXT, -- รูปแบบยา: เม็ด, น้ำ, ฉีด
  strength TEXT, -- ความแรง: 10mg, 20mg
  price DECIMAL(10,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 10,
  instructions TEXT,
  side_effects TEXT,
  contraindications TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patient_allergies table (ประวัติแพ้ยา)
CREATE TABLE public.patient_allergies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL, -- สารที่แพ้
  allergen_type TEXT DEFAULT 'medication' CHECK (allergen_type IN ('medication', 'food', 'environment', 'other')),
  severity TEXT DEFAULT 'mild' CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
  reaction TEXT, -- อาการที่เกิด
  first_occurrence DATE,
  notes TEXT,
  reported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table (นัดหมาย)
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES auth.users(id), -- แพทย์/นักบำบัด
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  appointment_type TEXT DEFAULT 'consultation' CHECK (appointment_type IN ('consultation', 'therapy', 'follow_up', 'emergency')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show')),
  chief_complaint TEXT, -- อาการหลัก
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treatments table (บันทึกการรักษา)
CREATE TABLE public.treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id),
  provider_id UUID REFERENCES auth.users(id),
  treatment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  diagnosis TEXT, -- การวินิจฉัย
  diagnosis_code TEXT, -- ICD-10 code
  symptoms TEXT,
  treatment_plan TEXT, -- แผนการรักษา
  procedures TEXT, -- หัตถการที่ทำ
  clinical_notes TEXT, -- บันทึกทางคลินิก
  follow_up_date DATE,
  follow_up_notes TEXT,
  vital_signs JSONB, -- ความดัน, ชีพจร, อุณหภูมิ etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescriptions table (ใบสั่งยา)
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  treatment_id UUID REFERENCES public.treatments(id),
  provider_id UUID REFERENCES auth.users(id),
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dispensed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescription_items table (รายการยาในใบสั่ง)
CREATE TABLE public.prescription_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications(id),
  medication_name TEXT NOT NULL, -- เก็บชื่อยาไว้กรณียาถูกลบ
  dosage TEXT NOT NULL, -- ขนาดยา: 1 เม็ด
  frequency TEXT NOT NULL, -- ความถี่: วันละ 3 ครั้ง
  duration TEXT, -- ระยะเวลา: 7 วัน
  quantity INTEGER NOT NULL, -- จำนวน
  instructions TEXT, -- คำแนะนำเพิ่มเติม
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create billing table (การเงิน)
CREATE TABLE public.billings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id),
  treatment_id UUID REFERENCES public.treatments(id),
  invoice_number TEXT NOT NULL UNIQUE,
  billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit_card', 'transfer', 'insurance', 'other')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled', 'refunded')),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create billing_items table (รายการค่าใช้จ่าย)
CREATE TABLE public.billing_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billing_id UUID NOT NULL REFERENCES public.billings(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('consultation', 'treatment', 'medication', 'procedure', 'other')),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patients (all authenticated staff can view/manage)
CREATE POLICY "Authenticated users can view patients"
ON public.patients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can insert patients"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Staff can update patients"
ON public.patients FOR UPDATE
TO authenticated
USING (true);

-- RLS Policies for medications
CREATE POLICY "Authenticated users can view medications"
ON public.medications FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin and doctors can manage medications"
ON public.medications FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'doctor'));

-- RLS Policies for patient_allergies
CREATE POLICY "Authenticated users can view allergies"
ON public.patient_allergies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage allergies"
ON public.patient_allergies FOR ALL
TO authenticated
USING (true);

-- RLS Policies for appointments
CREATE POLICY "Authenticated users can view appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage appointments"
ON public.appointments FOR ALL
TO authenticated
USING (true);

-- RLS Policies for treatments (doctors and therapists only)
CREATE POLICY "Authenticated users can view treatments"
ON public.treatments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Doctors and therapists can manage treatments"
ON public.treatments FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'doctor') OR 
  public.has_role(auth.uid(), 'therapist')
);

-- RLS Policies for prescriptions (doctors only)
CREATE POLICY "Authenticated users can view prescriptions"
ON public.prescriptions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Doctors can manage prescriptions"
ON public.prescriptions FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'doctor')
);

-- RLS Policies for prescription_items
CREATE POLICY "Authenticated users can view prescription items"
ON public.prescription_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Doctors can manage prescription items"
ON public.prescription_items FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'doctor')
);

-- RLS Policies for billings
CREATE POLICY "Authenticated users can view billings"
ON public.billings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage billings"
ON public.billings FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- RLS Policies for billing_items
CREATE POLICY "Authenticated users can view billing items"
ON public.billing_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage billing items"
ON public.billing_items FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Create indexes for better performance
CREATE INDEX idx_patients_hn ON public.patients(hn);
CREATE INDEX idx_patients_name ON public.patients(first_name, last_name);
CREATE INDEX idx_patients_phone ON public.patients(phone);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_provider ON public.appointments(provider_id);
CREATE INDEX idx_treatments_patient ON public.treatments(patient_id);
CREATE INDEX idx_treatments_date ON public.treatments(treatment_date);
CREATE INDEX idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX idx_billings_patient ON public.billings(patient_id);
CREATE INDEX idx_billings_date ON public.billings(billing_date);

-- Create updated_at triggers for all tables
CREATE TRIGGER on_patients_updated BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_medications_updated BEFORE UPDATE ON public.medications
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_allergies_updated BEFORE UPDATE ON public.patient_allergies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_appointments_updated BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_treatments_updated BEFORE UPDATE ON public.treatments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_prescriptions_updated BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_billings_updated BEFORE UPDATE ON public.billings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate HN (Hospital Number)
CREATE OR REPLACE FUNCTION public.generate_hn()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_hn TEXT;
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(hn FROM 3) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.patients
  WHERE hn LIKE year_part || '%';
  
  new_hn := year_part || LPAD(seq_num::TEXT, 5, '0');
  
  RETURN new_hn;
END;
$$;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_invoice TEXT;
  date_part TEXT;
  seq_num INTEGER;
BEGIN
  date_part := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.billings
  WHERE invoice_number LIKE date_part || '%';
  
  new_invoice := date_part || LPAD(seq_num::TEXT, 4, '0');
  
  RETURN new_invoice;
END;
$$;
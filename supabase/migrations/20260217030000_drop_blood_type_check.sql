-- Drop blood_type check constraint to allow null/empty values
-- Application-level validation handles valid blood type selection via dropdown
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_blood_type_check;

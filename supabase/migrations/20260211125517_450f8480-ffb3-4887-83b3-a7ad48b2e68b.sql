
-- Add unique constraint to prevent duplicate address entries
ALTER TABLE public.thailand_addresses
ADD CONSTRAINT thailand_addresses_unique_address UNIQUE (province, district, subdistrict);

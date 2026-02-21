import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ThailandAddress {
  id: string;
  province: string;
  district: string;
  subdistrict: string;
  postal_code: string;
}

export const useThailandAddresses = () => {
  return useQuery({
    queryKey: ["thailand-addresses"],
    queryFn: async () => {
      const allData: ThailandAddress[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("thailand_addresses")
          .select("*")
          .order("province")
          .order("district")
          .order("subdistrict")
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allData.push(...(data as ThailandAddress[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return allData;
    },
    staleTime: Infinity, // Reference data, never stale
  });
};

export const useProvinceNames = () => {
  const { data, ...rest } = useThailandAddresses();
  const provinces = data
    ? [...new Set(data.map((a) => a.province))]
    : [];
  return { data: provinces, ...rest };
};

export const useDistrictsByProvince = (province: string) => {
  const { data, ...rest } = useThailandAddresses();
  const districts = data
    ? [...new Set(data.filter((a) => a.province === province).map((a) => a.district))]
    : [];
  return { data: districts, ...rest };
};

export const useSubdistrictsByDistrict = (province: string, district: string) => {
  const { data, ...rest } = useThailandAddresses();
  const subdistricts = data
    ? data
        .filter((a) => a.province === province && a.district === district)
        .map((a) => ({ name: a.subdistrict, postalCode: a.postal_code }))
    : [];
  return { data: subdistricts, ...rest };
};

export const usePostalCode = (province: string, district: string, subdistrict: string) => {
  const { data } = useThailandAddresses();
  if (!data) return "";
  const match = data.find(
    (a) => a.province === province && a.district === district && a.subdistrict === subdistrict
  );
  return match?.postal_code || "";
};

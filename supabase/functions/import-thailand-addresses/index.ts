import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const contentType = req.headers.get("content-type") || "";
    
    let addresses: { province: string; district: string; subdistrict: string; postal_code: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

      console.log(`Parsed ${rows.length} rows from xlsx`);
      if (rows.length > 0) console.log("Sample keys:", Object.keys(rows[0]));

      for (const row of rows) {
        const province = String(row["ProvinceThai"] || "").trim();
        const districtRaw = String(row["DistrictThaiShort"] || "").trim();
        const subdistrictRaw = String(row["TambonThaiShort"] || "").trim();
        const postalCode = String(row["PostCodeMain"] || "").trim();

        if (province && districtRaw && subdistrictRaw && postalCode) {
          addresses.push({
            province,
            district: districtRaw,
            subdistrict: subdistrictRaw,
            postal_code: postalCode,
          });
        }
      }
    } else {
      const body = await req.json();
      addresses = body.addresses || [];
    }

    if (addresses.length === 0) {
      return new Response(JSON.stringify({ error: "No addresses to import" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Importing ${addresses.length} addresses...`);

    let inserted = 0;
    const batchSize = 500;

    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from("thailand_addresses")
        .upsert(batch, { onConflict: "province,district,subdistrict", ignoreDuplicates: true })
        .select("id");

      if (error) {
        console.error(`Batch ${Math.floor(i / batchSize)} error:`, error);
        throw error;
      }
      inserted += data?.length || 0;
      console.log(`Batch ${Math.floor(i / batchSize)}: inserted ${data?.length || 0}`);
    }

    const skipped = addresses.length - inserted;

    return new Response(
      JSON.stringify({ success: true, total: addresses.length, inserted, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are an OCR specialist for Thai national ID cards (บัตรประชาชนไทย). 
Extract the following information from the ID card image and return it as a JSON object.
The card contains both Thai and English text.

Return ONLY a valid JSON object with these fields (use empty string if not found):
{
  "prefix": "คำนำหน้าชื่อ (นาย/นาง/นางสาว/เด็กชาย/เด็กหญิง)",
  "firstName": "ชื่อภาษาไทย",
  "lastName": "นามสกุลภาษาไทย", 
  "cid": "เลขบัตรประชาชน 13 หลัก (ตัวเลขเท่านั้น ไม่มีขีด)",
  "birthDate": "วันเกิดในรูปแบบ YYYY-MM-DD (ค.ศ. เท่านั้น ถ้าในบัตรเป็น พ.ศ. ให้ลบ 543)",
  "gender": "male หรือ female (สังเกตจากคำนำหน้า: นาย=male, นาง/นางสาว=female)",
  "houseNumber": "บ้านเลขที่",
  "moo": "หมู่ที่",
  "street": "ถนน/ซอย",
  "subdistrict": "ตำบล/แขวง (ไม่ต้องมี ต. หรือ แขวง นำหน้า)",
  "district": "อำเภอ/เขต (ไม่ต้องมี อ. หรือ เขต นำหน้า)",
  "province": "จังหวัด (ไม่ต้องมี จ. นำหน้า)",
  "expiryDate": "วันหมดอายุ"
}

IMPORTANT:
- Convert Buddhist Era (พ.ศ.) dates to Common Era (ค.ศ.) by subtracting 543
- Remove all spaces and dashes from the ID number
- For address, parse the Thai address into components
- Do NOT include any markdown formatting, code blocks, or explanation. Return ONLY the JSON object.`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Please extract the information from this Thai national ID card image." },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "ระบบ AI มีการใช้งานมากเกินไป กรุณาลองใหม่ในภายหลัง" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "เครดิต AI หมด กรุณาเติมเครดิต" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle potential markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("ไม่สามารถอ่านข้อมูลจากภาพได้ กรุณาลองถ่ายภาพใหม่ให้ชัดเจน");
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OCR error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      token, email, password, full_name, nickname, phone,
      specialty, license_number, salary,
      id_card, date_of_birth,
      house_number, moo, street, province, district, subdistrict, postal_code,
      photo_base64,
    } = body;

    if (!token || !email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: token, email, password, full_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate invite token
    const { data: invite, error: inviteError } = await adminClient
      .from("invite_tokens")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "ลิงก์เชิญไม่ถูกต้องหรือถูกใช้งานแล้ว" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "ลิงก์เชิญหมดอายุแล้ว" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;

    // Upload photo if provided
    let avatarUrl: string | null = null;
    if (photo_base64) {
      try {
        // Decode base64 to Uint8Array
        const binaryStr = atob(photo_base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const filePath = `${userId}/avatar.jpg`;
        const { error: uploadError } = await adminClient.storage
          .from("staff-photos")
          .upload(filePath, bytes, { contentType: "image/jpeg", upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = adminClient.storage
            .from("staff-photos")
            .getPublicUrl(filePath);
          avatarUrl = publicUrlData.publicUrl;
        } else {
          console.error("Photo upload error:", uploadError);
        }
      } catch (photoErr) {
        console.error("Photo processing error:", photoErr);
      }
    }

    // Update profile with all provided info
    const profileUpdate: Record<string, unknown> = {
      full_name,
      nickname: nickname || null,
      phone: phone || null,
      specialty: specialty || null,
      license_number: license_number || null,
      salary: salary || 0,
      id_card: id_card || null,
      date_of_birth: date_of_birth || null,
      house_number: house_number || null,
      moo: moo || null,
      street: street || null,
      province: province || null,
      district: district || null,
      subdistrict: subdistrict || null,
      postal_code: postal_code || null,
    };

    if (avatarUrl) {
      profileUpdate.avatar_url = avatarUrl;
    }

    await adminClient
      .from("profiles")
      .update(profileUpdate)
      .eq("user_id", userId);

    // Update role if not staff
    if (invite.role && invite.role !== "staff") {
      await adminClient.from("user_roles").delete().eq("user_id", userId).eq("role", "staff");
      await adminClient.from("user_roles").insert({ user_id: userId, role: invite.role });
    }

    // Mark token as used
    await adminClient
      .from("invite_tokens")
      .update({ used_at: new Date().toISOString(), used_by: userId })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

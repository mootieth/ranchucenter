import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");

    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400 });
    }

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth credentials not configured");
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up nonce from DB — state parameter is now just a nonce UUID
    const { data: nonceData, error: nonceError } = await supabase
      .from("oauth_state_nonces")
      .select("*")
      .eq("nonce", stateParam)
      .single();

    if (nonceError || !nonceData) {
      return new Response("Invalid or expired state", { status: 400 });
    }

    // Check nonce expiry
    if (new Date(nonceData.expires_at) < new Date()) {
      await supabase.from("oauth_state_nonces").delete().eq("nonce", stateParam);
      return new Response("OAuth session expired, please try again", { status: 400 });
    }

    // Delete nonce immediately (one-time use)
    await supabase.from("oauth_state_nonces").delete().eq("nonce", stateParam);

    const userToken: string = nonceData.token;
    const origin: string = nonceData.origin || "";
    const targetUserId: string | null = nonceData.target_user_id || null;
    const mode: string | null = nonceData.mode || null;

    // Clinic Meet mode: store under a fixed UUID
    const CLINIC_MEET_USER_ID = "00000000-0000-0000-0000-000000000001";

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange error:", tokenData);
      return new Response(`Token exchange failed: ${JSON.stringify(tokenData)}`, { status: 400 });
    }

    // Get user info from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    // Get caller user from the JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken);

    if (userError || !user) {
      console.error("User verification failed:", userError);
      return new Response("User verification failed", { status: 401 });
    }

    // Determine which user_id to store the token for
    let saveForUserId = user.id;

    if (mode === "clinic") {
      // Clinic mode: store under CLINIC_MEET_USER_ID regardless of who initiated
      // Verify caller is admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1);

      if (!roles || roles.length === 0) {
        return new Response("Admin access required to connect clinic account", { status: 403 });
      }
      saveForUserId = CLINIC_MEET_USER_ID;
    } else if (targetUserId && targetUserId !== user.id) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1);

      if (!roles || roles.length === 0) {
        return new Response("Admin access required to connect for other users", { status: 403 });
      }
      saveForUserId = targetUserId;
    }

    // Store tokens in database
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    const { error: upsertError } = await supabase
      .from("provider_google_tokens")
      .upsert({
        user_id: saveForUserId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        google_email: userInfo.email || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Token storage error:", upsertError);
      return new Response("Failed to store tokens", { status: 500 });
    }

    // Redirect back to app
    const redirectPath = (targetUserId || mode === "clinic") ? "/settings" : "/appointments";
    const redirectUrl = origin
      ? `${origin}${redirectPath}?google_connected=true`
      : `${redirectPath}?google_connected=true`;

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl },
    });
  } catch (error) {
    console.error("Google Calendar callback error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Error: ${message}`, { status: 500 });
  }
});

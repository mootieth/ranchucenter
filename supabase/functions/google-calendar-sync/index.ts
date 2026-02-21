import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fixed UUID for the clinic Google account (ranchucenter@gmail.com) used for Meet
const CLINIC_MEET_USER_ID = "00000000-0000-0000-0000-000000000001";

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    console.error("Token refresh failed:", await response.text());
    return null;
  }

  return await response.json();
}

async function getValidToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokenData, error } = await supabase
    .from("provider_google_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !tokenData) return null;

  const expiresAt = new Date(tokenData.token_expires_at);
  if (expiresAt.getTime() - 5 * 60 * 1000 < Date.now()) {
    const newToken = await refreshAccessToken(tokenData.refresh_token);
    if (!newToken) return null;

    const newExpiresAt = new Date(Date.now() + newToken.expires_in * 1000);
    await supabase
      .from("provider_google_tokens")
      .update({
        access_token: newToken.access_token,
        token_expires_at: newExpiresAt.toISOString(),
      })
      .eq("user_id", userId);

    return newToken.access_token;
  }

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Use getClaims for JWT validation (works with Lovable Cloud signing keys)
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseWithAuth = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabaseWithAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("JWT validation failed:", claimsError);
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: claimsData.claims.sub as string };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { action, appointment_id, appointment, provider_id } = body;

    const targetUserId = provider_id || user.id;

    // ==================== CHECK CONNECTION ====================
    if (action === "check_connection") {
      const { data: tokenInfo } = await supabase
        .from("provider_google_tokens")
        .select("google_email, calendar_id")
        .eq("user_id", user.id)
        .single();

      return new Response(
        JSON.stringify({
          connected: !!tokenInfo,
          email: tokenInfo?.google_email || null,
          calendar_id: tokenInfo?.calendar_id || "primary",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ==================== REFRESH TOKENS (auto-renew all expired tokens) ====================
    if (action === "refresh_tokens") {
      const { data: allTokens } = await supabase
        .from("provider_google_tokens")
        .select("user_id, token_expires_at, refresh_token");

      if (!allTokens || allTokens.length === 0) {
        return new Response(JSON.stringify({ refreshed: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const refreshed: string[] = [];
      const failed: string[] = [];

      for (const token of allTokens) {
        const expiresAt = new Date(token.token_expires_at);
        // Refresh if expiring within 10 minutes
        if (expiresAt.getTime() - 10 * 60 * 1000 < Date.now()) {
          const newToken = await refreshAccessToken(token.refresh_token);
          if (newToken) {
            const newExpiresAt = new Date(Date.now() + newToken.expires_in * 1000);
            await supabase
              .from("provider_google_tokens")
              .update({
                access_token: newToken.access_token,
                token_expires_at: newExpiresAt.toISOString(),
              })
              .eq("user_id", token.user_id);
            refreshed.push(token.user_id);
          } else {
            failed.push(token.user_id);
          }
        }
      }

      return new Response(JSON.stringify({ refreshed, failed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== CHECK CLINIC MEET CONNECTION ====================
    if (action === "check_clinic_meet") {
      const { data: clinicToken } = await supabase
        .from("provider_google_tokens")
        .select("google_email")
        .eq("user_id", CLINIC_MEET_USER_ID)
        .single();

      return new Response(
        JSON.stringify({
          connected: !!clinicToken,
          email: clinicToken?.google_email || null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ==================== FETCH ALL EVENTS ====================
    if (action === "fetch_all_events") {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "staff"]);

      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ error: "Admin or staff access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { start_date, end_date } = body;
      if (!start_date || !end_date) {
        return new Response(JSON.stringify({ error: "start_date and end_date required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: allTokens, error: tokensError } = await supabase
        .from("provider_google_tokens")
        .select("user_id, calendar_id, google_email")
        .neq("user_id", CLINIC_MEET_USER_ID); // Exclude clinic meet account

      if (tokensError || !allTokens || allTokens.length === 0) {
        return new Response(JSON.stringify({ events_by_provider: {} }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const timeMinAll = `${start_date}T00:00:00+07:00`;
      const timeMaxAll = `${end_date}T23:59:59+07:00`;
      const eventsByProvider: Record<string, { email: string; events: any[] }> = {};

      await Promise.all(
        allTokens.map(async (token) => {
          try {
            const providerAccessToken = await getValidToken(supabase, token.user_id);
            if (!providerAccessToken) return;
            const cid = token.calendar_id || "primary";
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cid)}/events?timeMin=${encodeURIComponent(timeMinAll)}&timeMax=${encodeURIComponent(timeMaxAll)}&singleEvents=true&orderBy=startTime`;
            const resp = await fetch(url, { headers: { Authorization: `Bearer ${providerAccessToken}` } });
            if (!resp.ok) return;
            const data = await resp.json();
            eventsByProvider[token.user_id] = {
              email: token.google_email || "",
              events: (data.items || []).map((e: any) => ({
                id: e.id,
                summary: e.summary,
                start: e.start?.dateTime || e.start?.date,
                end: e.end?.dateTime || e.end?.date,
                status: e.status,
              })),
            };
          } catch (err) {
            console.error(`Failed to fetch events for provider ${token.user_id}:`, err);
          }
        }),
      );

      return new Response(JSON.stringify({ events_by_provider: eventsByProvider }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== CREATE/UPDATE MEET (Clinic Account) ====================
    if (action === "create_meet" || action === "update_meet") {
      if (!appointment || !appointment_id) {
        return new Response(JSON.stringify({ error: "appointment and appointment_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const clinicToken = await getValidToken(supabase, CLINIC_MEET_USER_ID);
      if (!clinicToken) {
        return new Response(
          JSON.stringify({
            error: "Clinic Google account not connected. Please connect ranchucenter@gmail.com first.",
            code: "CLINIC_NOT_CONNECTED",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: clinicTokenData } = await supabase
        .from("provider_google_tokens")
        .select("calendar_id")
        .eq("user_id", CLINIC_MEET_USER_ID)
        .single();
      const clinicCalendarId = clinicTokenData?.calendar_id || "primary";
      const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(clinicCalendarId)}`;

      const startDateTime = `${appointment.appointment_date}T${appointment.start_time}:00`;
      const endDateTime = appointment.end_time
        ? `${appointment.appointment_date}T${appointment.end_time}:00`
        : `${appointment.appointment_date}T${addMinutes(appointment.start_time, 60)}:00`;

      const event: any = {
        summary: `นัดหมายออนไลน์: ${appointment.patient_name || "ผู้รับบริการ"}`,
        description: [
          appointment.patient_name ? `ผู้รับบริการ: ${appointment.patient_name}` : "",
          appointment.patient_hn ? `HN: ${appointment.patient_hn}` : "",
          appointment.provider_name ? `ผู้ให้บริการ: ${appointment.provider_name}` : "",
          appointment.service_name ? `บริการ: ${appointment.service_name}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: startDateTime, timeZone: "Asia/Bangkok" },
        end: { dateTime: endDateTime, timeZone: "Asia/Bangkok" },
        guestsCanModify: false,
        guestsCanInviteOthers: true,
        guestsCanSeeOtherGuests: false,
        anyoneCanAddSelf: true,
        conferenceData: {
          createRequest: {
            requestId: `meet-${appointment_id}-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
          parameters: {
            addOnParameters: {
              parameters: {
                access_strategy: "OPEN",
              },
            },
          },
        },
      };

      // Add patient and provider emails as attendees so they can join without host approval
      const attendeeEmails = new Set<string>();
      if (appointment.patient_email) {
        attendeeEmails.add(appointment.patient_email.toLowerCase().trim());
      }
      // Fetch provider email from auth.users using provider_id
      if (provider_id) {
        const { data: providerUser } = await supabaseAuth.auth.admin.getUserById(provider_id);
        if (providerUser?.user?.email) {
          attendeeEmails.add(providerUser.user.email.toLowerCase().trim());
        }
      }
      if (attendeeEmails.size > 0) {
        event.attendees = Array.from(attendeeEmails).map((email) => ({ email }));
      }

      const meetEventId = appointment.google_meet_event_id;
      let response;

      if (action === "update_meet" && meetEventId) {
        // For update, we need to get existing conferenceData first
        const getResp = await fetch(`${calendarUrl}/events/${meetEventId}`, {
          headers: { Authorization: `Bearer ${clinicToken}` },
        });
        if (getResp.ok) {
          const existing = await getResp.json();
          // Keep existing conference data on update
          if (existing.conferenceData) {
            event.conferenceData = existing.conferenceData;
          }
        }

        response = await fetch(`${calendarUrl}/events/${meetEventId}?conferenceDataVersion=1`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${clinicToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
      } else {
        response = await fetch(`${calendarUrl}/events?conferenceDataVersion=1`, {
          method: "POST",
          headers: { Authorization: `Bearer ${clinicToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Calendar Meet API error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "Failed to create Meet", details: errorText }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const eventData = await response.json();
      const meetLink =
        eventData.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri || null;

      // Save meet link and meet event id to appointment
      await supabase
        .from("appointments")
        .update({
          meet_link: meetLink,
          google_meet_event_id: eventData.id,
        })
        .eq("id", appointment_id);

      console.log(`Meet created/updated for appointment ${appointment_id}: ${meetLink}`);

      return new Response(JSON.stringify({ success: true, meet_link: meetLink, meet_event_id: eventData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== DELETE MEET (Clinic Account) ====================
    if (action === "delete_meet") {
      if (!appointment_id) {
        return new Response(JSON.stringify({ error: "appointment_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: apt } = await supabase
        .from("appointments")
        .select("google_meet_event_id")
        .eq("id", appointment_id)
        .single();

      if (apt?.google_meet_event_id) {
        const clinicToken = await getValidToken(supabase, CLINIC_MEET_USER_ID);
        if (clinicToken) {
          const { data: clinicTokenData } = await supabase
            .from("provider_google_tokens")
            .select("calendar_id")
            .eq("user_id", CLINIC_MEET_USER_ID)
            .single();
          const clinicCalendarId = clinicTokenData?.calendar_id || "primary";
          const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(clinicCalendarId)}`;

          const response = await fetch(`${calendarUrl}/events/${apt.google_meet_event_id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${clinicToken}` },
          });

          if (!response.ok && response.status !== 404) {
            console.error("Delete meet event error:", await response.text());
          }
        }

        await supabase
          .from("appointments")
          .update({ meet_link: null, google_meet_event_id: null })
          .eq("id", appointment_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== PROVIDER CALENDAR: CREATE/UPDATE ====================
    const accessToken = await getValidToken(supabase, targetUserId);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Google Calendar not connected", code: "NOT_CONNECTED" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokenData } = await supabase
      .from("provider_google_tokens")
      .select("calendar_id")
      .eq("user_id", targetUserId)
      .single();
    const calendarId = tokenData?.calendar_id || "primary";
    const calendarBaseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`;

    if (action === "create" || action === "update") {
      if (!appointment) {
        return new Response(JSON.stringify({ error: "Appointment data required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const startDateTime = `${appointment.appointment_date}T${appointment.start_time}:00`;
      const endDateTime = appointment.end_time
        ? `${appointment.appointment_date}T${appointment.end_time}:00`
        : `${appointment.appointment_date}T${addMinutes(appointment.start_time, 60)}:00`;

      const event = {
        summary: `นัดหมาย: ${appointment.patient_name || "ผู้ป่วย"}`,
        description: [
          appointment.patient_name ? `ผู้ป่วย: ${appointment.patient_name}` : "",
          appointment.patient_hn ? `HN: ${appointment.patient_hn}` : "",
          appointment.appointment_type ? `ประเภท: ${appointment.appointment_type}` : "",
          appointment.chief_complaint ? `อาการหลัก: ${appointment.chief_complaint}` : "",
          appointment.notes ? `หมายเหตุ: ${appointment.notes}` : "",
          appointment.location_name ? `สถานที่: ${appointment.location_name}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: startDateTime, timeZone: "Asia/Bangkok" },
        end: { dateTime: endDateTime, timeZone: "Asia/Bangkok" },
        location: appointment.location_name || undefined,
        colorId: getColorId(appointment.appointment_type),
      };

      let googleEventId = appointment.google_event_id;
      let response;

      if (action === "update" && googleEventId) {
        response = await fetch(`${calendarBaseUrl}/events/${googleEventId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
      } else {
        response = await fetch(`${calendarBaseUrl}/events`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Calendar API error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "Google Calendar API error", details: errorText }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const eventData = await response.json();

      if (appointment_id && eventData.id) {
        await supabase.from("appointments").update({ google_event_id: eventData.id }).eq("id", appointment_id);
      }

      return new Response(JSON.stringify({ success: true, event_id: eventData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!appointment_id) {
        return new Response(JSON.stringify({ error: "appointment_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: apt } = await supabase
        .from("appointments")
        .select("google_event_id")
        .eq("id", appointment_id)
        .single();

      if (apt?.google_event_id) {
        const response = await fetch(`${calendarBaseUrl}/events/${apt.google_event_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok && response.status !== 404) {
          console.error("Delete event error:", await response.text());
        }

        await supabase.from("appointments").update({ google_event_id: null }).eq("id", appointment_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fetch_events") {
      const { start_date, end_date } = body;
      if (!start_date || !end_date) {
        return new Response(JSON.stringify({ error: "start_date and end_date required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const timeMin = `${start_date}T00:00:00+07:00`;
      const timeMax = `${end_date}T23:59:59+07:00`;

      const response = await fetch(
        `${calendarBaseUrl}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fetch events error:", errorText);
        return new Response(JSON.stringify({ error: "Failed to fetch events" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const events = (data.items || []).map((e: any) => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        status: e.status,
      }));

      return new Response(JSON.stringify({ events }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Google Calendar sync error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;
}

function getColorId(appointmentType: string | null): string {
  switch (appointmentType) {
    case "consultation":
      return "9";
    case "therapy":
      return "3";
    case "follow_up":
      return "10";
    case "emergency":
      return "11";
    default:
      return "9";
  }
}

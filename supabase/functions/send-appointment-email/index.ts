import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailPayload {
  appointment_id: string;
  trigger: "created" | "confirmed" | "updated" | "cancelled";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { appointment_id, trigger } = (await req.json()) as EmailPayload;

    // Fetch appointment with patient and location
    const { data: appointment, error: aptError } = await supabase
      .from("appointments")
      .select(`
        *,
        patients (id, first_name, last_name, email, phone, hn),
        service_locations (name, address)
      `)
      .eq("id", appointment_id)
      .maybeSingle();

    if (aptError || !appointment) {
      throw new Error(`Appointment not found: ${aptError?.message || "no data"}`);
    }

    // Fetch provider profile if exists
    let providerName = "ไม่ระบุ";
    let providerEmail: string | null = null;
    if (appointment.provider_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, user_id")
        .eq("user_id", appointment.provider_id)
        .maybeSingle();
      if (profile) {
        providerName = profile.full_name;
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
        providerEmail = authUser?.user?.email || null;
      }
    }

    const patient = appointment.patients;
    const location = appointment.service_locations;
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : "ไม่ระบุ";
    const patientEmail = patient?.email;

    const triggerLabels: Record<string, string> = {
      created: "นัดหมายใหม่",
      confirmed: "ยืนยันนัดหมาย",
      updated: "เปลี่ยนแปลงนัดหมาย",
      cancelled: "ยกเลิกนัดหมาย",
    };
    const triggerLabel = triggerLabels[trigger] || "แจ้งเตือนนัดหมาย";
    const headerColor = trigger === "cancelled" ? "#ef4444, #dc2626" : "#6366f1, #8b5cf6";
    const headerEmoji = trigger === "cancelled" ? "❌" : trigger === "updated" ? "🔄" : "📋";
    const appointmentDate = appointment.appointment_date;
    const startTime = appointment.start_time?.substring(0, 5) || "";
    const endTime = appointment.end_time?.substring(0, 5) || "";
    const timeRange = endTime ? `${startTime} - ${endTime}` : startTime;
    const locationName = location?.name || "ไม่ระบุ";
    const appointmentType = appointment.appointment_type || "ไม่ระบุ";

    const meetLink = appointment.meet_link;

    // Build HTML email body - includeChiefComplaint controls whether อาการ is shown
    const buildHtmlBody = (includeChiefComplaint: boolean) => `<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"></head>
<body>
  <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, ${headerColor}); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">${headerEmoji} ${triggerLabel}</h1>
      <p style="margin: 5px 0 0; opacity: 0.9;">Ranchu Center - คลินิกสุขภาพจิต</p>
    </div>
    <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
      ${trigger === "cancelled" ? '<p style="color: #ef4444; font-weight: 600; margin: 0 0 16px;">นัดหมายนี้ถูกยกเลิกแล้ว</p>' : ""}
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">ผู้รับบริการ:</td><td style="padding: 8px 0; font-weight: 600;">${patientName} (HN: ${patient?.hn || "-"})</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">วันที่:</td><td style="padding: 8px 0; font-weight: 600;">${appointmentDate}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">เวลา:</td><td style="padding: 8px 0; font-weight: 600;">${timeRange}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">ประเภท:</td><td style="padding: 8px 0; font-weight: 600;">${appointmentType}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">ผู้ให้บริการ:</td><td style="padding: 8px 0; font-weight: 600;">${providerName}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">สถานที่:</td><td style="padding: 8px 0; font-weight: 600;">${locationName}</td></tr>
        ${meetLink && trigger !== "cancelled" ? `<tr><td style="padding: 8px 0; color: #64748b;">🎥 Google Meet:</td><td style="padding: 8px 0;"><a href="${meetLink}" style="color: #6366f1; font-weight: 600; text-decoration: underline;">${meetLink}</a></td></tr>` : ""}
        ${includeChiefComplaint && appointment.chief_complaint ? `<tr><td style="padding: 8px 0; color: #64748b;">อาการ:</td><td style="padding: 8px 0;">${appointment.chief_complaint}</td></tr>` : ""}
      </table>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        อีเมลนี้ส่งอัตโนมัติจากระบบ Ranchu Center กรุณาอย่าตอบกลับ
      </p>
    </div>
  </div>
</body>
</html>`;

    if (!patientEmail && !providerEmail) {
      console.log("No email recipients found for appointment:", appointment_id);
      return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailSubject = `[Ranchu Center] ${triggerLabel} - ${patientName} (${appointmentDate} ${startTime})`;

    // Create Nodemailer transporter with Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const sentTo: string[] = [];

    // Send to patient (WITHOUT chief_complaint/อาการ)
    if (patientEmail) {
      await transporter.sendMail({
        from: `"Ranchu Center" <${GMAIL_USER}>`,
        to: patientEmail,
        subject: emailSubject,
        html: buildHtmlBody(false),
        encoding: "base64",
        textEncoding: "base64",
      });
      sentTo.push(patientEmail);
    }

    // Send to provider (WITH chief_complaint/อาการ)
    if (providerEmail) {
      await transporter.sendMail({
        from: `"Ranchu Center" <${GMAIL_USER}>`,
        to: providerEmail,
        subject: emailSubject,
        html: buildHtmlBody(true),
        encoding: "base64",
        textEncoding: "base64",
      });
      sentTo.push(providerEmail);
    }

    console.log(`Email sent for appointment ${appointment_id} to: ${sentTo.join(", ")}`);

    return new Response(JSON.stringify({ success: true, recipients: sentTo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

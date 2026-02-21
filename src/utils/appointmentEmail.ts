import { supabase } from "@/integrations/supabase/client";

export const sendAppointmentEmail = async (
  appointmentId: string,
  trigger: "created" | "confirmed" | "updated" | "cancelled"
) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-appointment-email", {
      body: { appointment_id: appointmentId, trigger },
    });
    if (error) {
      console.error("Failed to send appointment email:", error);
    } else {
      console.log("Appointment email sent:", data);
    }
  } catch (err) {
    console.error("Error invoking send-appointment-email:", err);
  }
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "missing_email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all admin user IDs
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminsError) throw adminsError;
    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert a notification for each admin
    const notifications = admins.map((a) => ({
      admin_user_id: a.user_id,
      type: "new_user",
      title: "مستخدم جديد",
      message: `تم تسجيل مستخدم جديد: ${email}`,
      metadata: { email },
    }));

    const { error: insertError } = await supabaseAdmin
      .from("admin_notifications")
      .insert(notifications);

    if (insertError) throw insertError;

    // Log activity
    await supabaseAdmin.from("admin_activity_log").insert({
      actor_id: admins[0].user_id, // system action attributed to first admin
      actor_email: "system",
      action: "new_user",
      target_type: "user",
      target_id: email,
      details: { email, registered_at: new Date().toISOString() },
    });

    // Send email to each admin via Resend (fire-and-forget)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const adminEmails: string[] = [];
      for (const a of admins) {
        try {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(a.user_id);
          if (userData?.user?.email) adminEmails.push(userData.user.email);
        } catch (_) { /* skip */ }
      }

      if (adminEmails.length > 0) {
        const now = new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });
        const htmlBody = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 22px;">🔔 إشعار مستخدم جديد</h1>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #334155; margin-bottom: 16px;">تم تسجيل مستخدم جديد في النظام:</p>
              <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 4px 0; color: #475569;"><strong>البريد الإلكتروني:</strong> ${email}</p>
                <p style="margin: 4px 0; color: #475569;"><strong>وقت التسجيل:</strong> ${now}</p>
              </div>
              <p style="font-size: 13px; color: #94a3b8; text-align: center;">هذا إشعار تلقائي من نظام إدارة المشاريع</p>
            </div>
          </div>`;

        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "PMS Notifications <onboarding@resend.dev>",
              to: adminEmails,
              subject: `مستخدم جديد: ${email}`,
              html: htmlBody,
            }),
          });
        } catch (emailErr) {
          console.error("Resend email error (non-blocking):", emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified: admins.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-admin-new-user error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

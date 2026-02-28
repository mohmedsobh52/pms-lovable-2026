import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Optional: check if called by authenticated admin (manual trigger)
    const authHeader = req.headers.get("Authorization");
    let callerUserId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await userClient.auth.getClaims(token);
      if (claimsData?.claims?.sub) {
        callerUserId = claimsData.claims.sub as string;
        // Verify admin
        const { data: roleData } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", callerUserId)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleData) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Gather stats for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    const [activityRes, projectsRes, contractsRes] = await Promise.all([
      adminClient.from("admin_activity_log").select("*").gte("created_at", sevenDaysAgoISO).order("created_at", { ascending: false }),
      adminClient.from("saved_projects").select("id, project_name, created_at").gte("created_at", sevenDaysAgoISO),
      adminClient.from("contracts").select("id, contract_title, created_at").gte("created_at", sevenDaysAgoISO),
    ]);

    const activities = activityRes.data || [];
    const newProjects = projectsRes.data || [];
    const newContracts = contractsRes.data || [];

    const newUsers = activities.filter((a: any) => a.action === "new_user").length;
    const roleChanges = activities.filter((a: any) => a.action === "role_change").length;

    // Get admin emails
    const { data: adminRoles } = await adminClient.from("user_roles").select("user_id").eq("role", "admin");
    const adminEmails: string[] = [];
    if (adminRoles) {
      for (const r of adminRoles) {
        const { data: userData } = await adminClient.auth.admin.getUserById(r.user_id);
        if (userData?.user?.email) adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "no_admins" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build HTML email
    const now = new Date();
    const weekStart = new Date(sevenDaysAgo).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const weekEnd = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const recentEventsHtml = activities.slice(0, 10).map((a: any) => {
      const time = new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${time}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${a.actor_email || "-"}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${a.action}</td></tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html dir="ltr"><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:linear-gradient(135deg,#10b981,#3b82f6);padding:30px 20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">📊 Weekly System Report</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">${weekStart} – ${weekEnd}</p>
  </div>
  <div style="padding:24px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;padding:16px;background:#f0fdf4;border-radius:8px;width:25%;">
          <div style="font-size:28px;font-weight:bold;color:#10b981;">${newUsers}</div>
          <div style="font-size:12px;color:#666;margin-top:4px;">New Users</div>
        </td>
        <td style="width:8px;"></td>
        <td style="text-align:center;padding:16px;background:#eff6ff;border-radius:8px;width:25%;">
          <div style="font-size:28px;font-weight:bold;color:#3b82f6;">${newProjects.length}</div>
          <div style="font-size:12px;color:#666;margin-top:4px;">Projects</div>
        </td>
        <td style="width:8px;"></td>
        <td style="text-align:center;padding:16px;background:#fef3c7;border-radius:8px;width:25%;">
          <div style="font-size:28px;font-weight:bold;color:#f59e0b;">${newContracts.length}</div>
          <div style="font-size:12px;color:#666;margin-top:4px;">Contracts</div>
        </td>
        <td style="width:8px;"></td>
        <td style="text-align:center;padding:16px;background:#fce4ec;border-radius:8px;width:25%;">
          <div style="font-size:28px;font-weight:bold;color:#e91e63;">${activities.length}</div>
          <div style="font-size:12px;color:#666;margin-top:4px;">Activities</div>
        </td>
      </tr>
    </table>
    ${activities.length > 0 ? `
    <h3 style="font-size:15px;margin:0 0 12px;color:#333;">Recent Events</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#f9fafb;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;">Time</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;">User</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;">Action</th></tr></thead>
      <tbody>${recentEventsHtml}</tbody>
    </table>` : ""}
  </div>
  <div style="text-align:center;padding:16px;background:#f9fafb;font-size:11px;color:#999;">
    PMS Admin System · Auto-generated report
  </div>
</div></body></html>`;

    // Send email via Resend
    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, error: "no_resend_key", preview: html }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "PMS Reports <onboarding@resend.dev>",
        to: adminEmails,
        subject: `📊 Weekly Report: ${weekStart} – ${weekEnd}`,
        html,
      }),
    });

    const emailResult = await emailRes.json();

    // Log the activity
    if (callerUserId) {
      await adminClient.from("admin_activity_log").insert({
        actor_id: callerUserId,
        actor_email: adminEmails[0],
        action: "weekly_report_sent",
        target_type: "system",
        details: { recipients: adminEmails.length, new_users: newUsers, projects: newProjects.length },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      recipients: adminEmails.length,
      stats: { newUsers, newProjects: newProjects.length, newContracts: newContracts.length, totalActivities: activities.length },
      emailResult,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Weekly report error:", err);
    return new Response(JSON.stringify({ error: "internal_error", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

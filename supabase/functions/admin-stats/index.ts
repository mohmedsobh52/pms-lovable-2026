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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "not_authenticated", message: "No authentication token provided" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "not_authenticated", message: "Invalid or expired session" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "unauthorized", message: "You do not have admin privileges" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch stats + activity data in parallel
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    const [
      projectsRes,
      contractsRes,
      quotationsRes,
      templatesRes,
      activityRes,
    ] = await Promise.all([
      adminClient.from("saved_projects").select("id, project_name, created_at, items_count, user_id"),
      adminClient.from("contracts").select("id", { count: "exact", head: true }),
      adminClient.from("price_quotations").select("id", { count: "exact", head: true }),
      adminClient.from("boq_templates").select("id", { count: "exact", head: true }),
      adminClient.from("admin_activity_log")
        .select("action, created_at")
        .gte("created_at", thirtyDaysAgoISO)
        .order("created_at", { ascending: true }),
    ]);

    const projects = projectsRes.data || [];
    const uniqueUsers = new Set(projects.map((p: any) => p.user_id)).size;

    const recentProjects = projects.filter(
      (p: any) => new Date(p.created_at) > thirtyDaysAgo
    ).length;

    const latestProjects = [...projects]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((p: any) => ({
        id: p.id,
        name: p.project_name,
        created_at: p.created_at,
        items_count: p.items_count || 0,
      }));

    // Aggregate daily activity
    const activityLogs = activityRes.data || [];
    const dailyMap: Record<string, Record<string, number>> = {};
    const activitySummary: Record<string, number> = { new_user: 0, role_change: 0, role_removed: 0, total: 0 };

    for (const log of activityLogs) {
      const date = (log.created_at as string).slice(0, 10);
      if (!dailyMap[date]) dailyMap[date] = { new_user: 0, role_change: 0, role_removed: 0, total: 0 };
      const action = log.action as string;
      dailyMap[date][action] = (dailyMap[date][action] || 0) + 1;
      dailyMap[date].total += 1;
      activitySummary[action] = (activitySummary[action] || 0) + 1;
      activitySummary.total += 1;
    }

    const dailyActivity = Object.entries(dailyMap)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return new Response(
      JSON.stringify({
        totalUsers: uniqueUsers,
        totalProjects: projects.length,
        recentProjects,
        totalContracts: contractsRes.count || 0,
        totalQuotations: quotationsRes.count || 0,
        totalTemplates: templatesRes.count || 0,
        latestProjects,
        dailyActivity,
        activitySummary,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Admin stats error:", err);
    return new Response(JSON.stringify({ error: "internal_error", message: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

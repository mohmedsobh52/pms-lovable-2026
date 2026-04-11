import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { project_id, plan_name } = await req.json();
    if (!project_id) throw new Error("project_id is required");

    // Fetch project items (BOQ)
    const { data: items } = await supabase
      .from("project_items")
      .select("*")
      .eq("project_id", project_id)
      .order("item_number");

    // Fetch project info
    const { data: project } = await supabase
      .from("saved_projects")
      .select("name, description, total_value, items_count")
      .eq("id", project_id)
      .single();

    // Fetch attachments
    const { data: attachments } = await supabase
      .from("attachment_folders")
      .select("name, name_ar")
      .eq("project_id", project_id);

    const boqSummary = (items || []).slice(0, 100).map((i: any) => ({
      item_number: i.item_number,
      description: i.description || i.description_ar,
      quantity: i.quantity,
      unit: i.unit,
      unit_price: i.unit_price,
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `أنت مهندس تخطيط مشاريع محترف. بناءً على بنود جدول الكميات التالية لمشروع "${project?.name || ''}"، قم بإنشاء خطة تنفيذ شاملة.

بنود المشروع:
${JSON.stringify(boqSummary, null, 2)}

${attachments?.length ? `المرفقات المتاحة: ${attachments.map((a: any) => a.name_ar || a.name).join(', ')}` : ''}

المطلوب: إنشاء خطة تنفيذ تتضمن مراحل رئيسية ومهام فرعية مع تقدير الموارد والتكاليف والمدة الزمنية.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert construction project planner. Generate execution plans in JSON format. Always respond with valid JSON only, no markdown.`,
          },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_execution_plan",
            description: "Create a structured execution plan with phases and tasks",
            parameters: {
              type: "object",
              properties: {
                phases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      phase_name: { type: "string", description: "اسم المرحلة بالعربية" },
                      phase_name_en: { type: "string" },
                      description: { type: "string" },
                      duration_days: { type: "number" },
                      budget_percentage: { type: "number", description: "نسبة من إجمالي الميزانية" },
                      tasks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            task_name: { type: "string", description: "اسم المهمة بالعربية" },
                            task_name_en: { type: "string" },
                            description: { type: "string" },
                            duration_days: { type: "number" },
                            labor_cost_percentage: { type: "number" },
                            equipment_cost_percentage: { type: "number" },
                            material_cost_percentage: { type: "number" },
                          },
                          required: ["task_name", "duration_days"],
                        },
                      },
                    },
                    required: ["phase_name", "duration_days", "tasks"],
                  },
                },
              },
              required: ["phases"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_execution_plan" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const planData = JSON.parse(toolCall.function.arguments);
    const totalValue = project?.total_value || 0;

    // Create the plan
    const { data: plan, error: planError } = await supabase
      .from("execution_plans")
      .insert({
        user_id: user.id,
        project_id,
        plan_name: plan_name || `خطة تنفيذ - ${project?.name || 'مشروع'}`,
        description: `خطة تنفيذ مولدة بالذكاء الاصطناعي لمشروع ${project?.name || ''}`,
        total_budget: totalValue,
        status: "draft",
        ai_generated: true,
      })
      .select()
      .single();

    if (planError) throw planError;

    // Create phases and tasks
    let currentStartDay = 0;
    const today = new Date();

    for (let i = 0; i < planData.phases.length; i++) {
      const phase = planData.phases[i];
      const phaseStart = new Date(today);
      phaseStart.setDate(phaseStart.getDate() + currentStartDay);
      const phaseEnd = new Date(phaseStart);
      phaseEnd.setDate(phaseEnd.getDate() + (phase.duration_days || 30));

      const phaseBudget = totalValue * ((phase.budget_percentage || (100 / planData.phases.length)) / 100);

      const { data: createdPhase, error: phaseError } = await supabase
        .from("execution_phases")
        .insert({
          plan_id: plan.id,
          user_id: user.id,
          phase_name: phase.phase_name,
          phase_name_en: phase.phase_name_en || "",
          description: phase.description || "",
          start_date: phaseStart.toISOString().split("T")[0],
          end_date: phaseEnd.toISOString().split("T")[0],
          budget: phaseBudget,
          sort_order: i,
          status: "pending",
        })
        .select()
        .single();

      if (phaseError) throw phaseError;

      // Create tasks
      let taskStartDay = 0;
      for (let j = 0; j < (phase.tasks || []).length; j++) {
        const task = phase.tasks[j];
        const taskStart = new Date(phaseStart);
        taskStart.setDate(taskStart.getDate() + taskStartDay);
        const taskEnd = new Date(taskStart);
        taskEnd.setDate(taskEnd.getDate() + (task.duration_days || 7));

        const taskBudget = phaseBudget / (phase.tasks.length || 1);

        await supabase.from("execution_tasks").insert({
          phase_id: createdPhase.id,
          user_id: user.id,
          task_name: task.task_name,
          task_name_en: task.task_name_en || "",
          description: task.description || "",
          start_date: taskStart.toISOString().split("T")[0],
          end_date: taskEnd.toISOString().split("T")[0],
          duration_days: task.duration_days || 7,
          labor_cost: taskBudget * ((task.labor_cost_percentage || 30) / 100),
          equipment_cost: taskBudget * ((task.equipment_cost_percentage || 25) / 100),
          material_cost: taskBudget * ((task.material_cost_percentage || 45) / 100),
          total_cost: taskBudget,
          status: "pending",
          sort_order: j,
        });

        taskStartDay += task.duration_days || 7;
      }

      currentStartDay += phase.duration_days || 30;
    }

    return new Response(JSON.stringify({ success: true, plan_id: plan.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

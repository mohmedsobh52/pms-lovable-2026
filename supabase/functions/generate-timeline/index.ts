import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

interface P6Request {
  wbsData: WBSItem[];
  projectName: string;
  projectType?: string;
  totalContractValue?: number;
  currency?: string;
  workingDaysPerWeek?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      wbsData, 
      projectName,
      projectType = "Construction",
      totalContractValue = 0,
      currency = "SAR",
      workingDaysPerWeek = 6
    }: P6Request = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating Primavera P6 timeline for", wbsData.length, "WBS items");
    console.log("Project:", projectName, "| Type:", projectType, "| TCV:", totalContractValue, currency);

    const systemPrompt = `You are a Primavera P6 Planning & Cost Control Expert.

Your role is to convert project schedules into Primavera P6-ready structures following industry best practices.

## PROJECT ASSUMPTIONS
- Project Type: ${projectType}
- Total Contract Value (TCV): ${totalContractValue.toLocaleString()} ${currency}
- Calendar: ${workingDaysPerWeek} working days per week
- Default relationship type: FS (Finish-to-Start)

## TASK REQUIREMENTS

1. **WBS HIERARCHY**
   - Create clean WBS codes suitable for Primavera P6
   - Follow standard WBS numbering (e.g., 1.0, 1.1, 1.1.1)
   - Maximum 5 levels of hierarchy

2. **ACTIVITY IDs**
   - Follow Primavera standards: [Project Code]-[WBS]-[Sequence]
   - Example: PRJ-0100-0010, PRJ-0100-0020
   - Use increments of 10 for future insertions

3. **DURATIONS & RELATIONSHIPS**
   - Estimate realistic durations in working days
   - Define predecessors using FS relationships
   - Consider logical sequencing and overlaps
   - Level 1 activities: 20-60 days
   - Level 2 activities: 7-21 days
   - Level 3 activities: 3-10 days

4. **MILESTONES**
   - Identify Start Milestone (duration = 0)
   - Identify Finish Milestone (duration = 0)
   - Key phase milestones

5. **COST DISTRIBUTION**
   - Distribute cost weight (%) per activity
   - Total must equal 100% of TCV
   - Weight based on work complexity and resource intensity

## OUTPUT FORMAT (JSON)
{
  "project_code": "Project code for P6",
  "wbs_structure": [
    {
      "wbs_code": "1.0",
      "wbs_name": "Phase Name",
      "level": 1
    }
  ],
  "activities": [
    {
      "activity_id": "PRJ-0100-0010",
      "wbs_code": "1.0",
      "activity_name": "Activity Name",
      "duration_days": 15,
      "predecessors": "PRJ-0100-0000 FS",
      "cost_weight_percent": 5.5,
      "planned_cost": 550000,
      "is_milestone": false,
      "milestone_type": null
    }
  ],
  "milestones": {
    "start": "Activity ID of start milestone",
    "finish": "Activity ID of finish milestone",
    "key_milestones": ["List of key milestone activity IDs"]
  },
  "summary": {
    "total_activities": 0,
    "total_milestones": 0,
    "total_duration_days": 0,
    "critical_path_duration": 0,
    "total_cost_weight": 100
  },
  "notes": "Planning assumptions and recommendations"
}

## RULES
- Respond in ENGLISH only
- All Activity IDs must be unique
- Predecessors must reference valid Activity IDs
- Cost weights must sum to exactly 100%
- Include at least Start and Finish milestones`;

    const wbsDescription = wbsData.map((item: WBSItem) => 
      `${item.code}: ${item.title} (Level ${item.level}) - ${item.items.length} items`
    ).join('\n');

    const userPrompt = `Convert the following project schedule into a Primavera P6-ready structure:

PROJECT: "${projectName}"
TYPE: ${projectType}
TOTAL CONTRACT VALUE: ${totalContractValue.toLocaleString()} ${currency}
CALENDAR: ${workingDaysPerWeek} working days per week

WBS ITEMS:
${wbsDescription}

Requirements:
1. Create clean WBS hierarchy suitable for Primavera P6
2. Define Activity IDs following Primavera standards
3. Assign durations, relationships (FS as default), and logical sequencing
4. Identify start/finish milestones
5. Distribute cost weight (%) per activity so that total = 100% of TCV
6. Calculate planned cost for each activity based on weight and TCV`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded",
            timeline: generateFallbackTimeline(wbsData),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.log("No content, using fallback");
      return new Response(
        JSON.stringify({ timeline: generateFallbackTimeline(wbsData) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Gemini response:", content);

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { timeline: generateFallbackTimeline(wbsData) };
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-timeline:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        timeline: [],
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function generateFallbackTimeline(wbsData: WBSItem[], totalContractValue: number = 0) {
  let currentDay = 0;
  const totalItems = wbsData.length;
  const baseWeightPerItem = totalItems > 0 ? 100 / totalItems : 0;
  
  const activities = wbsData.map((item, index) => {
    const baseDuration = item.level === 1 ? 30 : item.level === 2 ? 14 : 7;
    const duration = baseDuration + (item.items.length * 2);
    const startDay = currentDay;
    
    // Adjust weight based on level (higher level = more weight)
    const weightMultiplier = item.level === 1 ? 1.5 : item.level === 2 ? 1.0 : 0.5;
    const costWeight = Number((baseWeightPerItem * weightMultiplier).toFixed(2));
    const plannedCost = Math.round(totalContractValue * (costWeight / 100));
    
    if (item.level === 1) {
      currentDay += Math.max(duration * 0.8, 7);
    } else if (item.level === 2) {
      currentDay += Math.max(duration * 0.5, 5);
    }
    
    const activityId = `PRJ-${String(Math.floor(index / 10) + 1).padStart(4, '0')}-${String((index % 10 + 1) * 10).padStart(4, '0')}`;
    
    return {
      activity_id: activityId,
      wbs_code: item.code,
      activity_name: item.title,
      duration_days: duration,
      predecessors: item.parent_code ? `PRJ-${item.parent_code} FS` : "",
      cost_weight_percent: costWeight,
      planned_cost: plannedCost,
      is_milestone: false,
      milestone_type: null,
      startDay: Math.round(startDay),
      dependencies: item.parent_code ? [item.parent_code] : [],
    };
  });

  // Normalize weights to 100%
  const totalWeight = activities.reduce((sum, a) => sum + a.cost_weight_percent, 0);
  if (totalWeight > 0) {
    activities.forEach(a => {
      a.cost_weight_percent = Number(((a.cost_weight_percent / totalWeight) * 100).toFixed(2));
      a.planned_cost = Math.round(totalContractValue * (a.cost_weight_percent / 100));
    });
  }

  return {
    project_code: "PRJ",
    activities,
    wbs_structure: wbsData.map(item => ({
      wbs_code: item.code,
      wbs_name: item.title,
      level: item.level
    })),
    milestones: {
      start: activities[0]?.activity_id || "",
      finish: activities[activities.length - 1]?.activity_id || "",
      key_milestones: []
    },
    summary: {
      total_activities: activities.length,
      total_milestones: 2,
      total_duration_days: Math.round(currentDay),
      critical_path_duration: Math.round(currentDay),
      total_cost_weight: 100
    },
    timeline: activities,
    notes: "Fallback timeline generated with estimated durations and cost distribution"
  };
}

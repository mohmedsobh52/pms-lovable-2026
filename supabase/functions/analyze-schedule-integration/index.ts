import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

interface ScheduleIntegrationItem {
  schedule_activity: string;
  activity_code: string;
  linked_boq_items: string[];
  linked_descriptions: string[];
  total_quantity: number;
  total_cost: number;
  coverage_status: "Fully Linked" | "Partially Linked" | "Not Linked";
  coverage_percent: number;
  notes: string;
}

interface MisalignmentRisk {
  risk_type: "scope_gap" | "cost_concentration" | "timeline_imbalance" | "unlinked_cost" | "orphan_boq";
  severity: "low" | "medium" | "high";
  description: string;
  affected_items: string[];
  recommendation: string;
}

interface CostConcentration {
  activity: string;
  cost: number;
  percentage: number;
  risk_level: "normal" | "elevated" | "high";
}

interface ScheduleIntegrationResult {
  integration_summary: {
    total_schedule_activities: number;
    fully_linked_activities: number;
    partially_linked_activities: number;
    not_linked_activities: number;
    total_boq_items: number;
    linked_boq_items: number;
    orphan_boq_items: number;
    total_boq_cost: number;
    linked_cost: number;
    unlinked_cost: number;
    integration_score: number;
  };
  schedule_integration: ScheduleIntegrationItem[];
  orphan_boq_items: {
    item_number: string;
    description: string;
    quantity: number;
    cost: number;
    suggested_activity: string;
  }[];
  cost_concentration: CostConcentration[];
  misalignment_risks: MisalignmentRisk[];
  recommendations: string[];
}

// Tool definition for structured output
const scheduleIntegrationTool = {
  type: "function",
  function: {
    name: "submit_schedule_integration",
    description: "Submit the BOQ-Schedule integration analysis result",
    parameters: {
      type: "object",
      properties: {
        schedule_integration: {
          type: "array",
          items: {
            type: "object",
            properties: {
              schedule_activity: { type: "string" },
              activity_code: { type: "string" },
              linked_boq_items: { type: "array", items: { type: "string" } },
              linked_descriptions: { type: "array", items: { type: "string" } },
              total_quantity: { type: "number" },
              total_cost: { type: "number" },
              coverage_status: { type: "string", enum: ["Fully Linked", "Partially Linked", "Not Linked"] },
              coverage_percent: { type: "number" },
              notes: { type: "string" }
            },
            required: ["schedule_activity", "activity_code", "linked_boq_items", "total_quantity", "total_cost", "coverage_status", "coverage_percent"]
          }
        },
        orphan_boq_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item_number: { type: "string" },
              description: { type: "string" },
              quantity: { type: "number" },
              cost: { type: "number" },
              suggested_activity: { type: "string" }
            },
            required: ["item_number", "description", "quantity", "cost", "suggested_activity"]
          }
        },
        cost_concentration: {
          type: "array",
          items: {
            type: "object",
            properties: {
              activity: { type: "string" },
              cost: { type: "number" },
              percentage: { type: "number" },
              risk_level: { type: "string", enum: ["normal", "elevated", "high"] }
            },
            required: ["activity", "cost", "percentage", "risk_level"]
          }
        },
        misalignment_risks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              risk_type: { type: "string", enum: ["scope_gap", "cost_concentration", "timeline_imbalance", "unlinked_cost", "orphan_boq"] },
              severity: { type: "string", enum: ["low", "medium", "high"] },
              description: { type: "string" },
              affected_items: { type: "array", items: { type: "string" } },
              recommendation: { type: "string" }
            },
            required: ["risk_type", "severity", "description", "affected_items", "recommendation"]
          }
        },
        recommendations: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["schedule_integration", "orphan_boq_items", "cost_concentration", "misalignment_risks", "recommendations"]
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { boq_items, wbs_data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!boq_items || !Array.isArray(boq_items) || boq_items.length === 0) {
      return new Response(
        JSON.stringify({ error: "BOQ items are required for schedule integration analysis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting BOQ-Schedule integration analysis...`);
    console.log(`BOQ Items: ${boq_items.length}, WBS Items: ${wbs_data?.length || 0}`);

    const totalBOQCost = boq_items.reduce((sum: number, item: BOQItem) => sum + (item.total_price || 0), 0);

    const systemPrompt = `You are a Project Controls Expert specializing in BOQ-Schedule integration analysis.

## YOUR ROLE
Analyze the relationship between BOQ (Bill of Quantities) items and project schedule activities. Map BOQ items to activities, identify gaps, and highlight misalignment risks.

## INPUT DATA
- Total BOQ Items: ${boq_items.length}
- Total BOQ Cost: ${totalBOQCost.toLocaleString()}
- WBS Structure Available: ${wbs_data ? 'Yes' : 'No'}

## ANALYSIS REQUIREMENTS

### 1. Schedule Integration Mapping
For each logical construction activity:
- Map relevant BOQ items to the activity
- Calculate total quantity and cost for the activity
- Determine coverage status:
  - "Fully Linked": All expected scope items are mapped
  - "Partially Linked": Some items mapped, but gaps exist
  - "Not Linked": No BOQ items associated

### 2. Orphan BOQ Items
Identify BOQ items that cannot be clearly mapped to any schedule activity:
- List each orphan item with its cost
- Suggest the most appropriate activity for linking

### 3. Cost Concentration Analysis
Identify activities with disproportionate cost allocation:
- "normal": < 15% of total cost
- "elevated": 15-25% of total cost
- "high": > 25% of total cost

### 4. Misalignment Risks
Identify risks between scope, cost, and time:
- scope_gap: Missing BOQ items for expected scope
- cost_concentration: High cost in single activity
- timeline_imbalance: Cost distribution doesn't match logical sequencing
- unlinked_cost: Significant cost not mapped to schedule
- orphan_boq: BOQ items without clear activity linkage

### 5. Recommendations
Provide actionable recommendations to improve integration.

## STANDARD CONSTRUCTION ACTIVITIES
Use these standard activity categories for mapping:
1. Site Preparation & Mobilization
2. Earthworks & Excavation
3. Foundations & Substructure
4. Structural Concrete Works
5. Structural Steel Works
6. Masonry & Blockwork
7. Roofing & Waterproofing
8. MEP - Plumbing & Drainage
9. MEP - Electrical & Low Current
10. MEP - HVAC & Mechanical
11. Doors, Windows & Glazing
12. Interior Finishes (Flooring, Walls, Ceilings)
13. External Works & Landscaping
14. Preliminaries & General Requirements`;

    const userPrompt = `Analyze the following BOQ items and create a comprehensive schedule integration analysis:

## BOQ ITEMS
${JSON.stringify(boq_items.slice(0, 100), null, 2)}
${boq_items.length > 100 ? `\n... and ${boq_items.length - 100} more items` : ''}

${wbs_data ? `## WBS STRUCTURE
${JSON.stringify(wbs_data, null, 2)}` : ''}

Provide the complete schedule integration analysis using the submit_schedule_integration function.`;

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
          { role: "user", content: userPrompt }
        ],
        tools: [scheduleIntegrationTool],
        tool_choice: { type: "function", function: { name: "submit_schedule_integration" } },
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response received");

    let analysisResult: any;

    if (aiResponse.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = aiResponse.choices[0].message.tool_calls[0].function.arguments;
      analysisResult = typeof args === "string" ? JSON.parse(args) : args;
    } else if (aiResponse.choices?.[0]?.message?.content) {
      // Fallback parsing
      const content = aiResponse.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      }
    }

    if (!analysisResult) {
      throw new Error("Failed to parse AI response");
    }

    // Calculate integration summary
    const scheduleIntegration = analysisResult.schedule_integration || [];
    const orphanItems = analysisResult.orphan_boq_items || [];
    
    const fullyLinked = scheduleIntegration.filter((a: any) => a.coverage_status === "Fully Linked").length;
    const partiallyLinked = scheduleIntegration.filter((a: any) => a.coverage_status === "Partially Linked").length;
    const notLinked = scheduleIntegration.filter((a: any) => a.coverage_status === "Not Linked").length;
    
    const linkedCost = scheduleIntegration.reduce((sum: number, a: any) => sum + (a.total_cost || 0), 0);
    const linkedBOQItems = scheduleIntegration.reduce((sum: number, a: any) => sum + (a.linked_boq_items?.length || 0), 0);
    
    const integrationScore = Math.round(
      ((fullyLinked * 100 + partiallyLinked * 50) / Math.max(scheduleIntegration.length, 1)) +
      ((linkedCost / Math.max(totalBOQCost, 1)) * 50)
    ) / 2;

    const result: ScheduleIntegrationResult = {
      integration_summary: {
        total_schedule_activities: scheduleIntegration.length,
        fully_linked_activities: fullyLinked,
        partially_linked_activities: partiallyLinked,
        not_linked_activities: notLinked,
        total_boq_items: boq_items.length,
        linked_boq_items: linkedBOQItems,
        orphan_boq_items: orphanItems.length,
        total_boq_cost: totalBOQCost,
        linked_cost: linkedCost,
        unlinked_cost: totalBOQCost - linkedCost,
        integration_score: Math.min(100, Math.max(0, integrationScore))
      },
      schedule_integration: scheduleIntegration,
      orphan_boq_items: orphanItems,
      cost_concentration: analysisResult.cost_concentration || [],
      misalignment_risks: analysisResult.misalignment_risks || [],
      recommendations: analysisResult.recommendations || []
    };

    console.log("Schedule integration analysis complete");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in schedule integration analysis:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: "Failed to complete schedule integration analysis"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

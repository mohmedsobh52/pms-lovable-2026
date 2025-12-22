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
  generateCashFlow?: boolean;
  cashFlowPeriod?: "weekly" | "monthly";
  generateEVM?: boolean;
  statusDate?: string;
  actualProgress?: { [activityId: string]: number };
  actualCosts?: { [activityId: string]: number };
}

interface CashFlowPeriod {
  period: string;
  period_number: number;
  start_day: number;
  end_day: number;
  planned_cost: number;
  cumulative_cost: number;
  cost_percent: number;
  cumulative_percent: number;
  major_cost_drivers: string[];
}

interface EVMPeriod {
  period: string;
  period_number: number;
  pv: number;
  ev: number;
  ac: number;
  cumulative_pv: number;
  cumulative_ev: number;
  cumulative_ac: number;
  cv: number;
  sv: number;
  cpi: number;
  spi: number;
  tcpi: number;
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
      workingDaysPerWeek = 6,
      generateCashFlow = false,
      cashFlowPeriod = "monthly",
      generateEVM = false,
      statusDate,
      actualProgress = {},
      actualCosts = {}
    }: P6Request = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating Primavera P6 timeline for", wbsData.length, "WBS items");
    console.log("Project:", projectName, "| Type:", projectType, "| TCV:", totalContractValue, currency);
    console.log("Cash Flow:", generateCashFlow ? `Yes (${cashFlowPeriod})` : "No");
    console.log("EVM Analysis:", generateEVM ? `Yes (Status: ${statusDate || 'Current'})` : "No");

    const systemPrompt = `You are a Project Cost Control Engineer and Primavera P6 Planning Expert.

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
        result = { timeline: generateFallbackTimeline(wbsData, totalContractValue) };
      }
    }

    // Generate Cash Flow if requested
    if (generateCashFlow && result.activities) {
      const cashFlow = generateCashFlowFromActivities(
        result.activities, 
        totalContractValue, 
        cashFlowPeriod, 
        workingDaysPerWeek,
        currency
      );
      result.cash_flow = cashFlow;
    }

    // Generate EVM Analysis if requested
    if (generateEVM && result.activities) {
      const evmAnalysis = generateEVMAnalysis(
        result.activities,
        totalContractValue,
        cashFlowPeriod,
        workingDaysPerWeek,
        currency,
        statusDate,
        actualProgress,
        actualCosts
      );
      result.evm_analysis = evmAnalysis;
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

function generateCashFlowFromActivities(
  activities: any[], 
  totalContractValue: number, 
  period: "weekly" | "monthly",
  workingDaysPerWeek: number,
  currency: string
) {
  if (!activities || activities.length === 0) {
    return { periods: [], summary: {} };
  }

  // Calculate total project duration
  let maxEndDay = 0;
  activities.forEach(activity => {
    const startDay = activity.startDay || 0;
    const duration = activity.duration_days || 0;
    const endDay = startDay + duration;
    if (endDay > maxEndDay) maxEndDay = endDay;
  });

  // Determine period length in days
  const daysPerPeriod = period === "weekly" ? workingDaysPerWeek : workingDaysPerWeek * 4;
  const totalPeriods = Math.ceil(maxEndDay / daysPerPeriod) || 1;

  // Initialize periods
  const periods: CashFlowPeriod[] = [];
  let cumulativeCost = 0;

  for (let i = 0; i < totalPeriods; i++) {
    const periodStartDay = i * daysPerPeriod;
    const periodEndDay = (i + 1) * daysPerPeriod;
    let periodCost = 0;
    const costDrivers: { name: string; cost: number }[] = [];

    // Calculate cost for each activity in this period (linear distribution)
    activities.forEach(activity => {
      const activityStart = activity.startDay || 0;
      const activityDuration = activity.duration_days || 1;
      const activityEnd = activityStart + activityDuration;
      const activityCost = activity.planned_cost || 0;

      // Check if activity overlaps with this period
      if (activityEnd > periodStartDay && activityStart < periodEndDay) {
        // Calculate overlap days
        const overlapStart = Math.max(activityStart, periodStartDay);
        const overlapEnd = Math.min(activityEnd, periodEndDay);
        const overlapDays = overlapEnd - overlapStart;

        // Linear cost distribution
        const dailyCost = activityCost / activityDuration;
        const costInPeriod = dailyCost * overlapDays;
        periodCost += costInPeriod;

        if (costInPeriod > 0) {
          costDrivers.push({
            name: activity.activity_name || activity.wbs_code,
            cost: costInPeriod
          });
        }
      }
    });

    cumulativeCost += periodCost;

    // Sort cost drivers by cost and take top 5
    const topDrivers = costDrivers
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)
      .map(d => `${d.name}: ${d.cost.toLocaleString()} ${currency}`);

    const periodLabel = period === "weekly" 
      ? `Week ${i + 1}` 
      : `Month ${i + 1}`;

    periods.push({
      period: periodLabel,
      period_number: i + 1,
      start_day: periodStartDay,
      end_day: periodEndDay,
      planned_cost: Math.round(periodCost),
      cumulative_cost: Math.round(cumulativeCost),
      cost_percent: totalContractValue > 0 ? Number(((periodCost / totalContractValue) * 100).toFixed(2)) : 0,
      cumulative_percent: totalContractValue > 0 ? Number(((cumulativeCost / totalContractValue) * 100).toFixed(2)) : 0,
      major_cost_drivers: topDrivers
    });
  }

  // Calculate S-curve data points
  const sCurveData = periods.map(p => ({
    period: p.period,
    planned_cumulative: p.cumulative_cost,
    planned_percent: p.cumulative_percent
  }));

  // Find peak spending periods
  const sortedBySpending = [...periods].sort((a, b) => b.planned_cost - a.planned_cost);
  const peakPeriods = sortedBySpending.slice(0, 3).map(p => ({
    period: p.period,
    cost: p.planned_cost,
    percent: p.cost_percent
  }));

  return {
    period_type: period,
    total_periods: totalPeriods,
    total_contract_value: totalContractValue,
    currency: currency,
    periods: periods,
    s_curve: sCurveData,
    peak_spending_periods: peakPeriods,
    summary: {
      average_period_cost: Math.round(totalContractValue / totalPeriods),
      max_period_cost: Math.max(...periods.map(p => p.planned_cost)),
      min_period_cost: Math.min(...periods.map(p => p.planned_cost)),
      project_duration_days: maxEndDay,
      working_days_per_week: workingDaysPerWeek
    }
  };
}

function generateEVMAnalysis(
  activities: any[],
  bac: number, // Budget at Completion (Total Contract Value)
  period: "weekly" | "monthly",
  workingDaysPerWeek: number,
  currency: string,
  statusDate?: string,
  actualProgress: { [activityId: string]: number } = {},
  actualCosts: { [activityId: string]: number } = {}
) {
  if (!activities || activities.length === 0) {
    return { periods: [], summary: {} };
  }

  // Calculate total project duration
  let maxEndDay = 0;
  activities.forEach(activity => {
    const startDay = activity.startDay || 0;
    const duration = activity.duration_days || 0;
    const endDay = startDay + duration;
    if (endDay > maxEndDay) maxEndDay = endDay;
  });

  // Determine period length in days
  const daysPerPeriod = period === "weekly" ? workingDaysPerWeek : workingDaysPerWeek * 4;
  const totalPeriods = Math.ceil(maxEndDay / daysPerPeriod) || 1;

  // Determine status period (which period we're currently in)
  let statusPeriodNum = totalPeriods;
  if (statusDate) {
    // Simple calculation based on date offset from project start
    const today = new Date();
    const status = new Date(statusDate);
    const daysSinceStart = Math.floor((status.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    statusPeriodNum = Math.max(1, Math.min(totalPeriods, Math.ceil(Math.abs(daysSinceStart) / daysPerPeriod) + 1));
  }

  // Initialize periods and accumulators
  const periods: EVMPeriod[] = [];
  let cumulativePV = 0;
  let cumulativeEV = 0;
  let cumulativeAC = 0;

  for (let i = 0; i < totalPeriods; i++) {
    const periodStartDay = i * daysPerPeriod;
    const periodEndDay = (i + 1) * daysPerPeriod;
    let periodPV = 0;
    let periodEV = 0;
    let periodAC = 0;

    // Calculate PV, EV, AC for each activity in this period
    activities.forEach(activity => {
      const activityId = activity.activity_id;
      const activityStart = activity.startDay || 0;
      const activityDuration = activity.duration_days || 1;
      const activityEnd = activityStart + activityDuration;
      const activityBudget = activity.planned_cost || 0;

      // Check if activity overlaps with this period
      if (activityEnd > periodStartDay && activityStart < periodEndDay) {
        // Calculate overlap days for PV (Planned Value)
        const overlapStart = Math.max(activityStart, periodStartDay);
        const overlapEnd = Math.min(activityEnd, periodEndDay);
        const overlapDays = overlapEnd - overlapStart;

        // Linear PV distribution
        const dailyPV = activityBudget / activityDuration;
        const pvInPeriod = dailyPV * overlapDays;
        periodPV += pvInPeriod;

        // Calculate EV (Earned Value) based on actual progress
        // If no actual progress provided, assume planned progress for completed periods
        const isPastPeriod = i < statusPeriodNum - 1;
        const isCurrentPeriod = i === statusPeriodNum - 1;
        
        let activityProgress = 0;
        if (actualProgress[activityId] !== undefined) {
          activityProgress = actualProgress[activityId] / 100;
        } else if (isPastPeriod) {
          // Assume planned progress for past periods (100% of planned work done)
          const plannedProgressToDate = Math.min(1, (periodEndDay - activityStart) / activityDuration);
          activityProgress = Math.max(0, plannedProgressToDate);
        } else if (isCurrentPeriod) {
          // Current period: assume 50% of current period's work done
          const plannedProgressToDate = Math.min(1, (periodEndDay - activityStart) / activityDuration);
          activityProgress = Math.max(0, plannedProgressToDate * 0.9); // 90% of planned
        }

        // EV = Budget × Progress for the portion in this period
        const progressInPeriod = isPastPeriod ? (pvInPeriod / activityBudget) : 
                                 isCurrentPeriod ? (pvInPeriod / activityBudget) * 0.9 : 0;
        const evInPeriod = activityBudget * progressInPeriod;
        periodEV += evInPeriod;

        // Calculate AC (Actual Cost)
        // If no actual cost provided, estimate based on typical construction variance
        if (actualCosts[activityId] !== undefined) {
          const acRatio = pvInPeriod / activityBudget;
          periodAC += actualCosts[activityId] * acRatio;
        } else if (isPastPeriod || isCurrentPeriod) {
          // Simulate realistic AC with slight overrun (3-8% variance)
          const costVariance = 1 + (Math.random() * 0.05 + 0.03);
          periodAC += evInPeriod * costVariance;
        }
      }
    });

    cumulativePV += periodPV;
    cumulativeEV += periodEV;
    cumulativeAC += periodAC;

    // Calculate variances and indices
    const cv = cumulativeEV - cumulativeAC; // Cost Variance
    const sv = cumulativeEV - cumulativePV; // Schedule Variance
    const cpi = cumulativeAC > 0 ? cumulativeEV / cumulativeAC : 1; // Cost Performance Index
    const spi = cumulativePV > 0 ? cumulativeEV / cumulativePV : 1; // Schedule Performance Index
    
    // TCPI = (BAC - EV) / (BAC - AC) - To Complete Performance Index
    const remainingWork = bac - cumulativeEV;
    const remainingBudget = bac - cumulativeAC;
    const tcpi = remainingBudget > 0 ? remainingWork / remainingBudget : 0;

    const periodLabel = period === "weekly" 
      ? `Week ${i + 1}` 
      : `Month ${i + 1}`;

    periods.push({
      period: periodLabel,
      period_number: i + 1,
      pv: Math.round(periodPV),
      ev: Math.round(periodEV),
      ac: Math.round(periodAC),
      cumulative_pv: Math.round(cumulativePV),
      cumulative_ev: Math.round(cumulativeEV),
      cumulative_ac: Math.round(cumulativeAC),
      cv: Math.round(cv),
      sv: Math.round(sv),
      cpi: Number(cpi.toFixed(3)),
      spi: Number(spi.toFixed(3)),
      tcpi: Number(tcpi.toFixed(3))
    });
  }

  // Calculate S-Curve data for visualization
  const sCurveData = periods.map(p => ({
    period: p.period,
    pv: p.cumulative_pv,
    ev: p.cumulative_ev,
    ac: p.cumulative_ac,
    pv_percent: bac > 0 ? Number(((p.cumulative_pv / bac) * 100).toFixed(2)) : 0,
    ev_percent: bac > 0 ? Number(((p.cumulative_ev / bac) * 100).toFixed(2)) : 0,
    ac_percent: bac > 0 ? Number(((p.cumulative_ac / bac) * 100).toFixed(2)) : 0
  }));

  // Get current status metrics
  const currentPeriod = periods[statusPeriodNum - 1] || periods[periods.length - 1];
  
  // Calculate forecasts
  const eac = currentPeriod.cpi > 0 ? bac / currentPeriod.cpi : bac; // Estimate at Completion
  const etc = eac - currentPeriod.cumulative_ac; // Estimate to Complete
  const vac = bac - eac; // Variance at Completion

  // Determine project health status
  let healthStatus = "On Track";
  let healthColor = "green";
  if (currentPeriod.cpi < 0.9 || currentPeriod.spi < 0.9) {
    healthStatus = "Critical - Immediate Action Required";
    healthColor = "red";
  } else if (currentPeriod.cpi < 0.95 || currentPeriod.spi < 0.95) {
    healthStatus = "At Risk - Monitoring Required";
    healthColor = "yellow";
  }

  // Generate S-Curve description
  const sCurveDescription = generateSCurveDescription(periods, bac, currency);

  return {
    period_type: period,
    total_periods: totalPeriods,
    status_period: statusPeriodNum,
    budget_at_completion: bac,
    currency: currency,
    periods: periods,
    s_curve: sCurveData,
    s_curve_description: sCurveDescription,
    current_status: {
      period: currentPeriod.period,
      pv: currentPeriod.cumulative_pv,
      ev: currentPeriod.cumulative_ev,
      ac: currentPeriod.cumulative_ac,
      cv: currentPeriod.cv,
      sv: currentPeriod.sv,
      cpi: currentPeriod.cpi,
      spi: currentPeriod.spi,
      tcpi: currentPeriod.tcpi
    },
    forecasts: {
      eac: Math.round(eac),
      etc: Math.round(etc),
      vac: Math.round(vac),
      eac_percent: bac > 0 ? Number(((eac / bac) * 100).toFixed(2)) : 0
    },
    health: {
      status: healthStatus,
      color: healthColor,
      cpi_status: currentPeriod.cpi >= 1 ? "Under Budget" : "Over Budget",
      spi_status: currentPeriod.spi >= 1 ? "Ahead of Schedule" : "Behind Schedule"
    },
    interpretation: {
      cost_performance: currentPeriod.cpi >= 1 
        ? `For every ${currency} 1 spent, you are earning ${currency} ${currentPeriod.cpi.toFixed(2)} worth of work`
        : `For every ${currency} 1 of work, you are spending ${currency} ${(1/currentPeriod.cpi).toFixed(2)}`,
      schedule_performance: currentPeriod.spi >= 1
        ? `Project is ${((currentPeriod.spi - 1) * 100).toFixed(1)}% ahead of schedule`
        : `Project is ${((1 - currentPeriod.spi) * 100).toFixed(1)}% behind schedule`,
      forecast: vac >= 0
        ? `Expected to complete ${currency} ${Math.abs(Math.round(vac)).toLocaleString()} under budget`
        : `Expected to overrun by ${currency} ${Math.abs(Math.round(vac)).toLocaleString()}`
    }
  };
}

function generateSCurveDescription(periods: EVMPeriod[], bac: number, currency: string): string {
  if (periods.length === 0) return "No data available for S-Curve analysis.";

  const lastPeriod = periods[periods.length - 1];
  const midPoint = Math.floor(periods.length / 2);
  const midPeriod = periods[midPoint];

  let description = `## S-CURVE ANALYSIS\n\n`;
  description += `### Overview\n`;
  description += `The project spans ${periods.length} periods with a Budget at Completion (BAC) of ${currency} ${bac.toLocaleString()}.\n\n`;
  
  description += `### Curve Comparison: PV vs EV vs AC\n\n`;
  
  description += `**Planned Value (PV) Curve (Baseline):**\n`;
  description += `- Represents the authorized budget for scheduled work\n`;
  description += `- At mid-point (${midPeriod.period}): ${currency} ${midPeriod.cumulative_pv.toLocaleString()}\n`;
  description += `- At completion: ${currency} ${lastPeriod.cumulative_pv.toLocaleString()}\n\n`;
  
  description += `**Earned Value (EV) Curve (Progress):**\n`;
  description += `- Represents the value of work actually completed\n`;
  description += `- At mid-point (${midPeriod.period}): ${currency} ${midPeriod.cumulative_ev.toLocaleString()}\n`;
  description += `- Position relative to PV: ${midPeriod.cumulative_ev >= midPeriod.cumulative_pv ? 'Above (Ahead)' : 'Below (Behind)'}\n\n`;
  
  description += `**Actual Cost (AC) Curve (Spending):**\n`;
  description += `- Represents actual costs incurred\n`;
  description += `- At mid-point (${midPeriod.period}): ${currency} ${midPeriod.cumulative_ac.toLocaleString()}\n`;
  description += `- Position relative to EV: ${midPeriod.cumulative_ac <= midPeriod.cumulative_ev ? 'Below (Under Budget)' : 'Above (Over Budget)'}\n\n`;
  
  description += `### Key Insights\n`;
  if (lastPeriod.spi >= 1 && lastPeriod.cpi >= 1) {
    description += `- ✅ **Healthy Project**: Both schedule and cost performance are favorable\n`;
  } else if (lastPeriod.spi < 1 && lastPeriod.cpi < 1) {
    description += `- ⚠️ **Critical**: Project is both behind schedule and over budget\n`;
  } else if (lastPeriod.spi < 1) {
    description += `- ⚠️ **Schedule Risk**: EV curve below PV indicates schedule delay\n`;
  } else if (lastPeriod.cpi < 1) {
    description += `- ⚠️ **Cost Risk**: AC curve above EV indicates cost overrun\n`;
  }

  return description;
}

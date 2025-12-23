import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Link2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Target,
  AlertCircle,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  notes?: string;
}

interface MisalignmentRisk {
  risk_type: string;
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

interface OrphanBOQItem {
  item_number: string;
  description: string;
  quantity: number;
  cost: number;
  suggested_activity: string;
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
  orphan_boq_items: OrphanBOQItem[];
  cost_concentration: CostConcentration[];
  misalignment_risks: MisalignmentRisk[];
  recommendations: string[];
}

interface ScheduleIntegrationProps {
  items: BOQItem[];
  wbsData?: WBSItem[];
  currency?: string;
}

export function ScheduleIntegration({ items, wbsData, currency = "SAR" }: ScheduleIntegrationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScheduleIntegrationResult | null>(null);
  const [activeSection, setActiveSection] = useState<"integration" | "orphans" | "concentration" | "risks">("integration");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedRows(newSet);
  };

  const analyzeIntegration = async () => {
    if (!items || items.length === 0) {
      toast.error("No BOQ items available for analysis");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-schedule-integration", {
        body: { 
          boq_items: items,
          wbs_data: wbsData
        }
      });

      if (error) throw error;
      
      setResult(data);
      toast.success("Schedule integration analysis complete");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze schedule integration");
    } finally {
      setIsLoading(false);
    }
  };

  const getCoverageIcon = (status: string) => {
    switch (status) {
      case "Fully Linked":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "Partially Linked":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "Not Linked":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getCoverageColor = (status: string) => {
    switch (status) {
      case "Fully Linked":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Partially Linked":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Not Linked":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "";
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return "text-red-500";
      case "elevated":
        return "text-yellow-500";
      default:
        return "text-green-500";
    }
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Link2 className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">BOQ-Schedule Integration Analysis</h3>
          <p className="text-muted-foreground max-w-md">
            Analyze how BOQ items map to schedule activities, identify gaps, and highlight misalignment risks between scope, cost, and time.
          </p>
        </div>
        <Button 
          onClick={analyzeIntegration} 
          disabled={isLoading}
          size="lg"
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing Integration...
            </>
          ) : (
            <>
              <Link2 className="w-5 h-5" />
              Analyze Schedule Integration
            </>
          )}
        </Button>
      </div>
    );
  }

  const { integration_summary } = result;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Integration Score</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-primary">{integration_summary.integration_score}%</span>
          </div>
          <Progress value={integration_summary.integration_score} className="mt-2 h-2" />
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Fully Linked</span>
          </div>
          <span className="text-3xl font-bold text-green-600">{integration_summary.fully_linked_activities}</span>
          <span className="text-sm text-muted-foreground ml-2">of {integration_summary.total_schedule_activities} activities</span>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Orphan BOQ Items</span>
          </div>
          <span className="text-3xl font-bold text-yellow-600">{integration_summary.orphan_boq_items}</span>
          <span className="text-sm text-muted-foreground ml-2">items not linked</span>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-red-500" />
            <span className="text-sm text-muted-foreground">Unlinked Cost</span>
          </div>
          <span className="text-2xl font-bold text-red-600">{integration_summary.unlinked_cost.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground ml-2">{currency}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "integration", label: "Schedule Integration", icon: <Link2 className="w-4 h-4" /> },
          { id: "orphans", label: `Orphan Items (${result.orphan_boq_items.length})`, icon: <AlertCircle className="w-4 h-4" /> },
          { id: "concentration", label: "Cost Concentration", icon: <TrendingUp className="w-4 h-4" /> },
          { id: "risks", label: `Risks (${result.misalignment_risks.length})`, icon: <AlertTriangle className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeSection === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={analyzeIntegration} disabled={isLoading} className="ml-auto gap-2">
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Schedule Integration Table */}
      {activeSection === "integration" && (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12"></TableHead>
                <TableHead>Schedule Activity</TableHead>
                <TableHead>Linked BOQ Items</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Cost ({currency})</TableHead>
                <TableHead>Coverage Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.schedule_integration.map((item, idx) => (
                <>
                  <TableRow 
                    key={idx} 
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => toggleRow(idx)}
                  >
                    <TableCell>
                      {expandedRows.has(idx) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded mr-2">
                          {item.activity_code}
                        </span>
                        <span className="font-medium">{item.schedule_activity}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.linked_boq_items.length} items</TableCell>
                    <TableCell className="text-right font-mono">
                      {item.total_quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {item.total_cost.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCoverageIcon(item.coverage_status)}
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          getCoverageColor(item.coverage_status)
                        )}>
                          {item.coverage_status}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(idx) && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/20 p-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Linked BOQ Items:</h4>
                            <div className="flex flex-wrap gap-2">
                              {item.linked_boq_items.map((boqItem, i) => (
                                <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono">
                                  {boqItem}
                                </span>
                              ))}
                            </div>
                          </div>
                          {item.linked_descriptions && item.linked_descriptions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Descriptions:</h4>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {item.linked_descriptions.slice(0, 5).map((desc, i) => (
                                  <li key={i}>• {desc}</li>
                                ))}
                                {item.linked_descriptions.length > 5 && (
                                  <li className="text-primary">... and {item.linked_descriptions.length - 5} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                          {item.notes && (
                            <div>
                              <h4 className="text-sm font-medium mb-1">Notes:</h4>
                              <p className="text-sm text-muted-foreground">{item.notes}</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Orphan BOQ Items */}
      {activeSection === "orphans" && (
        <div className="border rounded-xl overflow-hidden">
          {result.orphan_boq_items.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium">All BOQ items are linked!</p>
              <p className="text-muted-foreground">No orphan items found in the analysis.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Item Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Cost ({currency})</TableHead>
                  <TableHead>Suggested Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.orphan_boq_items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{item.item_number}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{item.cost.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs">
                        {item.suggested_activity}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Cost Concentration */}
      {activeSection === "concentration" && (
        <div className="space-y-4">
          {result.cost_concentration.map((item, idx) => (
            <div key={idx} className="p-4 border rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.activity}</span>
                <span className={cn("font-bold", getRiskLevelColor(item.risk_level))}>
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={item.percentage} 
                className={cn(
                  "h-3",
                  item.risk_level === "high" && "[&>div]:bg-red-500",
                  item.risk_level === "elevated" && "[&>div]:bg-yellow-500",
                  item.risk_level === "normal" && "[&>div]:bg-green-500"
                )}
              />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>Cost: {item.cost.toLocaleString()} {currency}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                  item.risk_level === "high" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                  item.risk_level === "elevated" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                  item.risk_level === "normal" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                )}>
                  {item.risk_level} concentration
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Misalignment Risks */}
      {activeSection === "risks" && (
        <div className="space-y-4">
          {result.misalignment_risks.length === 0 ? (
            <div className="p-8 text-center border rounded-xl">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium">No Misalignment Risks Detected</p>
              <p className="text-muted-foreground">The BOQ and schedule are well aligned.</p>
            </div>
          ) : (
            result.misalignment_risks.map((risk, idx) => (
              <div key={idx} className="p-4 border rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn(
                      "w-5 h-5",
                      risk.severity === "high" && "text-red-500",
                      risk.severity === "medium" && "text-yellow-500",
                      risk.severity === "low" && "text-blue-500"
                    )} />
                    <span className="font-medium capitalize">{risk.risk_type.replace(/_/g, " ")}</span>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium capitalize",
                    getSeverityColor(risk.severity)
                  )}>
                    {risk.severity} severity
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{risk.description}</p>
                {risk.affected_items.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {risk.affected_items.map((item, i) => (
                      <span key={i} className="px-2 py-1 bg-muted rounded text-xs font-mono">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
                  <Lightbulb className="w-4 h-4 text-primary mt-0.5" />
                  <span className="text-sm">{risk.recommendation}</span>
                </div>
              </div>
            ))
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="mt-6 p-4 border rounded-xl bg-gradient-to-br from-primary/5 to-transparent">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                      {idx + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

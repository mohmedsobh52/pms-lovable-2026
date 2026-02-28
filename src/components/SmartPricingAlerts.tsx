import { useState, useMemo } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, ShieldAlert, AlertCircle, Ruler, ChevronDown, ChevronUp, Wrench, EyeOff, CheckCircle2, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/hooks/useLanguage";
import { REFERENCE_PRICES, ReferencePrice } from "@/lib/reference-prices";
import { cn } from "@/lib/utils";

interface BOQItem {
  item_number: string;
  description: string;
  description_ar?: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface CalculatedCosts {
  calculatedUnitPrice: number;
  aiSuggestedRate?: number;
}

type AlertType = "statistical" | "reference_range" | "unpriced_critical" | "unit_mismatch" | "ai_deviation";
type AlertSeverity = "critical" | "warning" | "info";

interface SmartAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  itemNumber: string;
  description: string;
  currentPrice: number;
  expectedPrice: number;
  deviationPercent: number;
  recommendation: string;
  recommendedPrice: number;
}

interface SmartPricingAlertsProps {
  items: BOQItem[];
  getItemCalculatedCosts: (itemId: string) => CalculatedCosts;
  onApplyFix?: (itemNumber: string, newPrice: number) => void;
  onDismiss?: () => void;
}

function findReferenceMatch(description: string, unit: string): ReferencePrice | null {
  const desc = description.toLowerCase();
  for (const ref of REFERENCE_PRICES) {
    const keywordMatch = ref.keywords.some(kw => desc.includes(kw.toLowerCase()));
    const arMatch = ref.keywordsAr.some(kw => desc.includes(kw));
    if (keywordMatch || arMatch) return ref;
  }
  return null;
}

function computeStdDev(values: number[]): { mean: number; stdDev: number } {
  if (values.length < 2) return { mean: values[0] || 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

const UNIT_PRICE_SANITY: Record<string, { min: number; max: number }> = {
  m3: { min: 5, max: 5000 },
  m2: { min: 2, max: 2000 },
  m: { min: 1, max: 1000 },
  ton: { min: 500, max: 20000 },
  kg: { min: 1, max: 200 },
  no: { min: 5, max: 500000 },
};

export function SmartPricingAlerts({ items, getItemCalculatedCosts, onApplyFix, onDismiss }: SmartPricingAlertsProps) {
  const { isArabic } = useLanguage();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<AlertSeverity>>(new Set(["critical"]));

  const alerts = useMemo((): SmartAlert[] => {
    if (!items || items.length === 0) return [];
    const result: SmartAlert[] = [];
    const pricedItems = items.filter(i => (i.unit_price || 0) > 0);

    // Group items by category for statistical analysis
    const categoryGroups: Record<string, { prices: number[]; items: BOQItem[] }> = {};
    pricedItems.forEach(item => {
      const cat = item.category || "general";
      if (!categoryGroups[cat]) categoryGroups[cat] = { prices: [], items: [] };
      categoryGroups[cat].prices.push(item.unit_price || 0);
      categoryGroups[cat].items.push(item);
    });

    // 1. Statistical outlier detection per category
    Object.entries(categoryGroups).forEach(([cat, group]) => {
      if (group.prices.length < 3) return;
      const { mean, stdDev } = computeStdDev(group.prices);
      if (stdDev === 0) return;

      group.items.forEach(item => {
        const price = item.unit_price || 0;
        const zScore = Math.abs(price - mean) / stdDev;
        if (zScore > 2) {
          result.push({
            id: `stat_${item.item_number}`,
            type: "statistical",
            severity: "critical",
            itemNumber: item.item_number,
            description: (item.description || "").substring(0, 60),
            currentPrice: price,
            expectedPrice: mean,
            deviationPercent: ((price - mean) / mean) * 100,
            recommendation: isArabic
              ? `السعر يبعد ${zScore.toFixed(1)} انحراف معياري عن المتوسط`
              : `Price is ${zScore.toFixed(1)} std deviations from mean`,
            recommendedPrice: mean,
          });
        }
      });
    });

    // 2. Reference range check
    pricedItems.forEach(item => {
      const ref = findReferenceMatch(item.description, item.unit);
      if (!ref) return;
      const price = item.unit_price || 0;
      if (price < ref.minPrice * 0.8 || price > ref.maxPrice * 1.2) {
        result.push({
          id: `ref_${item.item_number}`,
          type: "reference_range",
          severity: "warning",
          itemNumber: item.item_number,
          description: (item.description || "").substring(0, 60),
          currentPrice: price,
          expectedPrice: ref.avgPrice,
          deviationPercent: ((price - ref.avgPrice) / ref.avgPrice) * 100,
          recommendation: isArabic
            ? `النطاق المرجعي: ${ref.minPrice} - ${ref.maxPrice}`
            : `Reference range: ${ref.minPrice} - ${ref.maxPrice}`,
          recommendedPrice: ref.avgPrice,
        });
      }
    });

    // 3. Unpriced critical items
    const totalValue = items.reduce((s, i) => s + (i.total_price || (i.unit_price || 0) * (i.quantity || 0)), 0);
    items.forEach(item => {
      if ((item.unit_price || 0) > 0) return;
      const itemValue = (item.quantity || 0);
      // Flag if quantity > 100 or category seems important
      if (itemValue > 100 || (item.category && ["concrete", "electrical", "hvac", "plumbing"].includes(item.category.toLowerCase()))) {
        result.push({
          id: `unpriced_${item.item_number}`,
          type: "unpriced_critical",
          severity: "info",
          itemNumber: item.item_number,
          description: (item.description || "").substring(0, 60),
          currentPrice: 0,
          expectedPrice: 0,
          deviationPercent: 100,
          recommendation: isArabic ? "بند حرج بدون تسعير" : "Critical item without pricing",
          recommendedPrice: 0,
        });
      }
    });

    // 4. Unit-price sanity check
    pricedItems.forEach(item => {
      const unit = (item.unit || "").toLowerCase().trim();
      const sanity = UNIT_PRICE_SANITY[unit];
      if (!sanity) return;
      const price = item.unit_price || 0;
      if (price < sanity.min * 0.5 || price > sanity.max * 2) {
        result.push({
          id: `unit_${item.item_number}`,
          type: "unit_mismatch",
          severity: "warning",
          itemNumber: item.item_number,
          description: (item.description || "").substring(0, 60),
          currentPrice: price,
          expectedPrice: (sanity.min + sanity.max) / 2,
          deviationPercent: 0,
          recommendation: isArabic
            ? `سعر غير منطقي للوحدة ${unit}`
            : `Unrealistic price for unit ${unit}`,
          recommendedPrice: (sanity.min + sanity.max) / 2,
        });
      }
    });

    // 5. AI deviation check
    pricedItems.forEach(item => {
      const calc = getItemCalculatedCosts(item.item_number);
      const aiRate = calc.aiSuggestedRate || 0;
      if (aiRate === 0) return;
      const price = item.unit_price || 0;
      const deviation = ((price - aiRate) / aiRate) * 100;
      if (Math.abs(deviation) > 40) {
        // Avoid duplicate with statistical
        if (result.some(r => r.id === `stat_${item.item_number}`)) return;
        result.push({
          id: `ai_${item.item_number}`,
          type: "ai_deviation",
          severity: "critical",
          itemNumber: item.item_number,
          description: (item.description || "").substring(0, 60),
          currentPrice: price,
          expectedPrice: aiRate,
          deviationPercent: deviation,
          recommendation: isArabic
            ? `فارق ${Math.abs(deviation).toFixed(0)}% عن سعر AI`
            : `${Math.abs(deviation).toFixed(0)}% deviation from AI price`,
          recommendedPrice: aiRate,
        });
      }
    });

    return result;
  }, [items, getItemCalculatedCosts, isArabic]);

  const activeAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  if (activeAlerts.length === 0) return null;

  const criticalAlerts = activeAlerts.filter(a => a.severity === "critical");
  const warningAlerts = activeAlerts.filter(a => a.severity === "warning");
  const infoAlerts = activeAlerts.filter(a => a.severity === "info");

  const toggleGroup = (s: AlertSeverity) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const handleFixAll = () => {
    if (!onApplyFix) return;
    activeAlerts.forEach(alert => {
      if (alert.recommendedPrice > 0) {
        onApplyFix(alert.itemNumber, alert.recommendedPrice);
      }
    });
  };

  const handleDismissAll = () => {
    setDismissedIds(new Set(alerts.map(a => a.id)));
  };

  const severityConfig = {
    critical: {
      label: isArabic ? "حرج" : "Critical",
      icon: ShieldAlert,
      color: "text-destructive",
      bg: "bg-destructive/10 border-destructive/30",
    },
    warning: {
      label: isArabic ? "تحذير" : "Warning",
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-500/10 border-orange-500/30",
    },
    info: {
      label: isArabic ? "معلومات" : "Info",
      icon: AlertCircle,
      color: "text-yellow-600",
      bg: "bg-yellow-500/10 border-yellow-500/30",
    },
  };

  const renderGroup = (groupAlerts: SmartAlert[], severity: AlertSeverity) => {
    if (groupAlerts.length === 0) return null;
    const config = severityConfig[severity];
    const Icon = config.icon;

    return (
      <Collapsible
        key={severity}
        open={openGroups.has(severity)}
        onOpenChange={() => toggleGroup(severity)}
      >
        <CollapsibleTrigger className={cn(
          "flex items-center justify-between w-full px-3 py-2 rounded-md border text-sm font-medium transition-colors",
          config.bg, config.color
        )}>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span>{config.label}</span>
            <Badge variant="outline" className={cn("text-xs", config.color)}>
              {groupAlerts.length}
            </Badge>
          </div>
          {openGroups.has(severity) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1.5">
          {groupAlerts.slice(0, 10).map(alert => (
            <div key={alert.id} className="flex items-start justify-between gap-2 px-3 py-2 rounded bg-muted/50 text-xs">
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] shrink-0">{alert.itemNumber}</Badge>
                  <span className="truncate text-muted-foreground">{alert.description}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>
                    {isArabic ? "الحالي:" : "Current:"}{" "}
                    <span className={cn("font-medium", alert.deviationPercent > 0 ? "text-destructive" : "text-orange-600")}>
                      {alert.currentPrice.toLocaleString()}
                    </span>
                  </span>
                  {alert.expectedPrice > 0 && (
                    <span>
                      {isArabic ? "المتوقع:" : "Expected:"}{" "}
                      <span className="font-medium text-foreground">{alert.expectedPrice.toLocaleString()}</span>
                    </span>
                  )}
                  {alert.deviationPercent !== 0 && (
                    <Badge variant="outline" className={cn(
                      "text-[10px]",
                      Math.abs(alert.deviationPercent) > 50 ? "text-destructive border-destructive/30" : "text-orange-600 border-orange-500/30"
                    )}>
                      {alert.deviationPercent > 0 ? "+" : ""}{alert.deviationPercent.toFixed(0)}%
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground italic">{alert.recommendation}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onApplyFix && alert.recommendedPrice > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title={isArabic ? "إصلاح" : "Fix"}
                    onClick={() => {
                      onApplyFix(alert.itemNumber, alert.recommendedPrice);
                      setDismissedIds(prev => new Set([...prev, alert.id]));
                    }}
                  >
                    <Wrench className="w-3 h-3 text-primary" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title={isArabic ? "تجاهل" : "Dismiss"}
                  onClick={() => setDismissedIds(prev => new Set([...prev, alert.id]))}
                >
                  <EyeOff className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
          {groupAlerts.length > 10 && (
            <p className="text-xs text-muted-foreground px-3">
              +{groupAlerts.length - 10} {isArabic ? "تنبيهات أخرى" : "more alerts"}
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Alert className="relative border-primary/30 bg-primary/5">
      {onDismiss && (
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={onDismiss}>
          <X className="w-4 h-4" />
        </Button>
      )}
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2 flex-wrap">
        {isArabic
          ? `تنبيهات ذكية: ${activeAlerts.length} تنبيه`
          : `Smart Alerts: ${activeAlerts.length} alerts`}
        {criticalAlerts.length > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            {criticalAlerts.length} {isArabic ? "حرج" : "critical"}
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-3">
        {renderGroup(criticalAlerts, "critical")}
        {renderGroup(warningAlerts, "warning")}
        {renderGroup(infoAlerts, "info")}

        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          {onApplyFix && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleFixAll}>
              <CheckCircle2 className="w-3 h-3" />
              {isArabic ? "إصلاح الكل" : "Fix All"}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleDismissAll}>
            <EyeOff className="w-3 h-3" />
            {isArabic ? "تجاهل الكل" : "Dismiss All"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

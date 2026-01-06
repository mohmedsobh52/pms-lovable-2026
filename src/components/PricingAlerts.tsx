import { useMemo, useEffect } from "react";
import { AlertTriangle, XCircle, TrendingUp, TrendingDown, X, Bell } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { getBalanceSettings } from "@/hooks/useBalanceSettings";
import { cn } from "@/lib/utils";

interface BOQItem {
  item_number: string;
  description: string;
  unit_price?: number;
}

interface CalculatedCosts {
  calculatedUnitPrice: number;
  aiSuggestedRate?: number;
}

interface PricingAlertsProps {
  items: BOQItem[];
  getItemCalculatedCosts: (itemId: string) => CalculatedCosts;
  onDismiss?: () => void;
  showToasts?: boolean;
}

interface HighVarianceItem {
  itemNumber: string;
  description: string;
  variance: number;
  direction: "high" | "low";
}

export function PricingAlerts({
  items,
  getItemCalculatedCosts,
  onDismiss,
  showToasts = true,
}: PricingAlertsProps) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const settings = getBalanceSettings();

  const highVarianceItems = useMemo((): HighVarianceItem[] => {
    if (!settings.showAlerts) return [];

    const alerts: HighVarianceItem[] = [];

    items.forEach(item => {
      const calcCosts = getItemCalculatedCosts(item.item_number);
      const originalPrice = item.unit_price || 0;
      const referencePrice = calcCosts.aiSuggestedRate || calcCosts.calculatedUnitPrice || 0;

      if (originalPrice === 0 || referencePrice === 0) return;

      const variance = ((originalPrice - referencePrice) / referencePrice) * 100;

      if (Math.abs(variance) >= settings.highVarianceThreshold) {
        alerts.push({
          itemNumber: item.item_number,
          description: item.description.substring(0, 50) + (item.description.length > 50 ? "..." : ""),
          variance,
          direction: variance > 0 ? "high" : "low",
        });
      }
    });

    return alerts.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [items, getItemCalculatedCosts, settings]);

  // Show toast notifications for new high variance items
  useEffect(() => {
    if (showToasts && settings.alertOnHighVariance && highVarianceItems.length > 0) {
      const topItems = highVarianceItems.slice(0, 3);
      
      toast({
        title: isArabic 
          ? `⚠️ تنبيه: ${highVarianceItems.length} بنود بفارق كبير`
          : `⚠️ Alert: ${highVarianceItems.length} items with high variance`,
        description: topItems.map(item => 
          `${item.itemNumber}: ${item.variance > 0 ? "+" : ""}${item.variance.toFixed(1)}%`
        ).join(" | "),
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [highVarianceItems.length]); // Only trigger when count changes

  if (!settings.showAlerts || highVarianceItems.length === 0) {
    return null;
  }

  const highItems = highVarianceItems.filter(i => i.direction === "high");
  const lowItems = highVarianceItems.filter(i => i.direction === "low");

  return (
    <Alert variant="destructive" className="relative border-destructive/50 bg-destructive/5">
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={onDismiss}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
      
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <Bell className="w-4 h-4" />
        {isArabic 
          ? `تنبيه التسعير: ${highVarianceItems.length} بنود بفارق كبير`
          : `Pricing Alert: ${highVarianceItems.length} items with high variance`}
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-3">
        {/* High prices */}
        {highItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
              <TrendingUp className="w-4 h-4" />
              {isArabic ? "أسعار مرتفعة جداً:" : "Prices too high:"}
            </div>
            <div className="flex flex-wrap gap-2">
              {highItems.slice(0, 5).map((item, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/30 text-xs"
                >
                  {item.itemNumber}: +{item.variance.toFixed(0)}%
                </Badge>
              ))}
              {highItems.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{highItems.length - 5} {isArabic ? "آخرين" : "more"}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Low prices */}
        {lowItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-orange-600 font-medium text-sm">
              <TrendingDown className="w-4 h-4" />
              {isArabic ? "أسعار منخفضة جداً:" : "Prices too low:"}
            </div>
            <div className="flex flex-wrap gap-2">
              {lowItems.slice(0, 5).map((item, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline"
                  className="bg-orange-500/10 text-orange-600 border-orange-500/30 text-xs"
                >
                  {item.itemNumber}: {item.variance.toFixed(0)}%
                </Badge>
              ))}
              {lowItems.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{lowItems.length - 5} {isArabic ? "آخرين" : "more"}
                </Badge>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          {isArabic 
            ? `العتبة الحالية: ±${settings.highVarianceThreshold}% - يمكنك تعديلها من الإعدادات`
            : `Current threshold: ±${settings.highVarianceThreshold}% - Adjust in settings`}
        </p>
      </AlertDescription>
    </Alert>
  );
}

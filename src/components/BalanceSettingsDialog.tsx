import { useState } from "react";
import { Settings2, RotateCcw, Bell, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { useBalanceSettings, BalanceSettings } from "@/hooks/useBalanceSettings";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function BalanceSettingsDialog() {
  const { isArabic } = useLanguage();
  const { settings, updateSettings, resetSettings } = useBalanceSettings();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<BalanceSettings>(settings);

  const handleOpen = (open: boolean) => {
    if (open) {
      setLocalSettings(settings);
    }
    setIsOpen(open);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    toast({
      title: isArabic ? "تم حفظ الإعدادات" : "Settings Saved",
      description: isArabic 
        ? "تم تحديث إعدادات التوازن بنجاح"
        : "Balance settings updated successfully",
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    resetSettings();
    setLocalSettings({
      balancedThreshold: 5,
      slightThreshold: 15,
      showAlerts: true,
      alertOnHighVariance: true,
      highVarianceThreshold: 20,
    });
    toast({
      title: isArabic ? "تم إعادة الضبط" : "Settings Reset",
      description: isArabic 
        ? "تم إعادة الإعدادات للقيم الافتراضية"
        : "Settings restored to defaults",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            {isArabic ? "إعدادات التوازن" : "Balance Settings"}
          </DialogTitle>
          <DialogDescription>
            {isArabic 
              ? "تخصيص عتبات التوازن والتنبيهات"
              : "Customize balance thresholds and alerts"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Balanced Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                {isArabic ? "عتبة التوازن" : "Balanced Threshold"}
              </Label>
              <span className="text-sm font-medium text-success">
                ±{localSettings.balancedThreshold}%
              </span>
            </div>
            <Slider
              value={[localSettings.balancedThreshold]}
              onValueChange={([value]) => setLocalSettings(s => ({ ...s, balancedThreshold: value }))}
              min={1}
              max={20}
              step={1}
              className="[&_[role=slider]]:bg-success"
            />
            <p className="text-xs text-muted-foreground">
              {isArabic 
                ? "الأسعار ضمن هذا النطاق تُعتبر متوازنة"
                : "Prices within this range are considered balanced"}
            </p>
          </div>

          {/* Slight Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                {isArabic ? "عتبة الفرق البسيط" : "Slight Variance Threshold"}
              </Label>
              <span className="text-sm font-medium text-warning">
                ±{localSettings.slightThreshold}%
              </span>
            </div>
            <Slider
              value={[localSettings.slightThreshold]}
              onValueChange={([value]) => setLocalSettings(s => ({ ...s, slightThreshold: value }))}
              min={localSettings.balancedThreshold + 1}
              max={50}
              step={1}
              className="[&_[role=slider]]:bg-warning"
            />
            <p className="text-xs text-muted-foreground">
              {isArabic 
                ? "الفارق أكبر من هذا يُعتبر كبيراً"
                : "Variance above this is considered high"}
            </p>
          </div>

          {/* High Variance Alert Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                {isArabic ? "عتبة التنبيه" : "Alert Threshold"}
              </Label>
              <span className="text-sm font-medium text-destructive">
                ±{localSettings.highVarianceThreshold}%
              </span>
            </div>
            <Slider
              value={[localSettings.highVarianceThreshold]}
              onValueChange={([value]) => setLocalSettings(s => ({ ...s, highVarianceThreshold: value }))}
              min={localSettings.slightThreshold + 1}
              max={100}
              step={5}
              className="[&_[role=slider]]:bg-destructive"
            />
            <p className="text-xs text-muted-foreground">
              {isArabic 
                ? "إظهار تنبيه عند تجاوز هذا الفارق"
                : "Show alert when variance exceeds this"}
            </p>
          </div>

          {/* Alert Settings */}
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  {isArabic ? "إظهار التنبيهات" : "Show Alerts"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isArabic 
                    ? "عرض إشعارات للفروقات الكبيرة"
                    : "Display notifications for high variances"}
                </p>
              </div>
              <Switch
                checked={localSettings.showAlerts}
                onCheckedChange={(checked) => setLocalSettings(s => ({ ...s, showAlerts: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>
                  {isArabic ? "تنبيه الفوارق الكبيرة" : "High Variance Alerts"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isArabic 
                    ? "تنبيه فوري عند وجود بنود بفارق كبير"
                    : "Immediate alert for items with high variance"}
                </p>
              </div>
              <Switch
                checked={localSettings.alertOnHighVariance}
                onCheckedChange={(checked) => setLocalSettings(s => ({ ...s, alertOnHighVariance: checked }))}
                disabled={!localSettings.showAlerts}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium">{isArabic ? "المعاينة:" : "Preview:"}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={cn("px-2 py-1 rounded", "bg-success/20 text-success")}>
                0-{localSettings.balancedThreshold}% = {isArabic ? "متوازن" : "Balanced"}
              </span>
              <span className={cn("px-2 py-1 rounded", "bg-warning/20 text-warning")}>
                {localSettings.balancedThreshold}-{localSettings.slightThreshold}% = {isArabic ? "فرق بسيط" : "Slight"}
              </span>
              <span className={cn("px-2 py-1 rounded", "bg-destructive/20 text-destructive")}>
                {">"}{localSettings.slightThreshold}% = {isArabic ? "فرق كبير" : "High"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            {isArabic ? "إعادة ضبط" : "Reset"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave}>
              {isArabic ? "حفظ" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

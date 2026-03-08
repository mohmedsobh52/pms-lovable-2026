import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Route, Calculator, Download, Info } from "lucide-react";

const ROAD_LAYERS = [
  {
    id: "subbase",
    nameAr: "طبقة ما تحت الأساس (Sub-base)",
    nameEn: "Sub-base Layer",
    defaultThickness: 20,
    density: 2.1,
    ratePerTon: 35,
    ratePerCm: 4.5,
    color: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    id: "base",
    nameAr: "طبقة الأساس (Base Course)",
    nameEn: "Base Course",
    defaultThickness: 15,
    density: 2.2,
    ratePerTon: 45,
    ratePerCm: 6.5,
    color: "bg-orange-100 dark:bg-orange-900/30",
  },
  {
    id: "binder",
    nameAr: "طبقة الرابط (Binder Course)",
    nameEn: "Binder Course",
    defaultThickness: 7,
    density: 2.35,
    ratePerTon: 280,
    ratePerCm: 42,
    color: "bg-stone-200 dark:bg-stone-800/50",
  },
  {
    id: "wearing",
    nameAr: "طبقة السطح (Wearing Course)",
    nameEn: "Wearing Course",
    defaultThickness: 5,
    density: 2.4,
    ratePerTon: 320,
    ratePerCm: 52,
    color: "bg-foreground/10",
  },
];

const ADDITIONAL_ITEMS = [
  { id: "prime", nameAr: "رش تأسيسي (Prime Coat)", nameEn: "Prime Coat", rate: 3.5, unit: "m²" },
  { id: "tack", nameAr: "رش لاصق (Tack Coat)", nameEn: "Tack Coat", rate: 2.8, unit: "m²" },
  { id: "curb", nameAr: "بردورات خرسانية", nameEn: "Concrete Curbs", rate: 85, unit: "m" },
  { id: "marking", nameAr: "خطوط طريق عاكسة", nameEn: "Road Marking", rate: 12, unit: "m" },
];

export function RoadLayersPricing() {
  const { isArabic } = useLanguage();
  const [roadLength, setRoadLength] = useState(500);
  const [roadWidth, setRoadWidth] = useState(7);
  const [thicknesses, setThicknesses] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    ROAD_LAYERS.forEach(l => { init[l.id] = l.defaultThickness; });
    return init;
  });
  const [enabledLayers, setEnabledLayers] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    ROAD_LAYERS.forEach(l => { init[l.id] = true; });
    return init;
  });
  const [extras, setExtras] = useState<Record<string, boolean>>({ prime: true, tack: true, curb: false, marking: false });

  const area = roadLength * roadWidth;

  const result = useMemo(() => {
    const layers = ROAD_LAYERS.map(layer => {
      if (!enabledLayers[layer.id]) return { ...layer, thickness: 0, volume: 0, weight: 0, cost: 0 };
      const thickness = thicknesses[layer.id] || layer.defaultThickness;
      const volumeM3 = area * (thickness / 100);
      const weight = volumeM3 * layer.density;
      const cost = area * (thickness / layer.defaultThickness) * layer.ratePerCm * layer.defaultThickness / layer.defaultThickness;
      const actualCost = weight * layer.ratePerTon;
      return { ...layer, thickness, volume: volumeM3, weight, cost: actualCost };
    });

    const layersCost = layers.reduce((s, l) => s + l.cost, 0);

    const extrasCost = ADDITIONAL_ITEMS.reduce((sum, item) => {
      if (!extras[item.id]) return sum;
      const qty = item.unit === "m²" ? area : roadLength * 2;
      return sum + qty * item.rate;
    }, 0);

    const total = layersCost + extrasCost;
    const ratePerSqm = area > 0 ? total / area : 0;
    const ratePerLm = roadLength > 0 ? total / roadLength : 0;

    return { layers, layersCost, extrasCost, total, ratePerSqm, ratePerLm };
  }, [roadLength, roadWidth, thicknesses, enabledLayers, extras, area]);

  const formatNum = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {/* Dimensions */}
      <Card className="border-primary/20">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">{isArabic ? "طول الطريق (م)" : "Road Length (m)"}</Label>
              <Input type="number" value={roadLength} onChange={e => setRoadLength(+e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">{isArabic ? "عرض الطريق (م)" : "Road Width (m)"}</Label>
              <Input type="number" value={roadWidth} onChange={e => setRoadWidth(+e.target.value)} className="mt-1" />
            </div>
            <div className="flex items-end">
              <Badge variant="secondary" className="mb-1">{isArabic ? "المساحة:" : "Area:"} {formatNum(area)} م²</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ROAD_LAYERS.map(layer => (
          <Card key={layer.id} className={`${layer.color} border-primary/10`}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{isArabic ? layer.nameAr : layer.nameEn}</span>
                <Switch
                  checked={enabledLayers[layer.id]}
                  onCheckedChange={v => setEnabledLayers(p => ({ ...p, [layer.id]: v }))}
                />
              </div>
              {enabledLayers[layer.id] && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label className="text-xs">{isArabic ? "السمك (سم)" : "Thickness (cm)"}</Label>
                      <Input
                        type="number"
                        value={thicknesses[layer.id]}
                        onChange={e => setThicknesses(p => ({ ...p, [layer.id]: +e.target.value }))}
                        className="mt-1 h-8"
                      />
                    </div>
                    <div className="flex flex-col justify-end text-muted-foreground">
                      <span>⍴ {layer.density} t/m³</span>
                      <span>{layer.ratePerTon} SAR/ton</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs border-t border-border/50 pt-2">
                    <span>{isArabic ? "الوزن:" : "Weight:"} {formatNum(result.layers.find(l => l.id === layer.id)?.weight || 0)} ton</span>
                    <span className="font-bold text-primary">{formatNum(result.layers.find(l => l.id === layer.id)?.cost || 0)} SAR</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Extras */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            {isArabic ? "أعمال إضافية" : "Additional Works"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ADDITIONAL_ITEMS.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <Switch
                  checked={extras[item.id] || false}
                  onCheckedChange={v => setExtras(p => ({ ...p, [item.id]: v }))}
                />
                <div className="text-xs">
                  <div>{isArabic ? item.nameAr : item.nameEn}</div>
                  <div className="text-muted-foreground">{item.rate} SAR/{item.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">{isArabic ? "تكلفة الطبقات" : "Layers Cost"}</div>
              <div className="text-lg font-bold">{formatNum(result.layersCost)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{isArabic ? "أعمال إضافية" : "Extras"}</div>
              <div className="text-lg font-bold">{formatNum(result.extrasCost)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{isArabic ? "الإجمالي" : "Total"}</div>
              <div className="text-lg font-bold text-primary">{formatNum(result.total)} SAR</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{isArabic ? "معدل م²" : "Rate/m²"}</div>
              <div className="text-lg font-bold">{formatNum(result.ratePerSqm)}</div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full mt-3 border-primary/30 text-primary">
            <Download className="h-4 w-4 mr-1" />
            {isArabic ? "تصدير التفاصيل" : "Export Details"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

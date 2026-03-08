import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Shovel, Calculator, Download, Layers } from "lucide-react";

const DEPTH_TIERS = [
  { id: "0-2", labelAr: "≤ 2 متر", labelEn: "≤ 2m", baseRate: 18, backfillRate: 12 },
  { id: "2-4", labelAr: "2 - 4 متر", labelEn: "2 - 4m", baseRate: 35, backfillRate: 18 },
  { id: "4-6", labelAr: "4 - 6 متر", labelEn: "4 - 6m", baseRate: 65, backfillRate: 28 },
];

const SOIL_FACTORS = [
  { id: "normal", labelAr: "تربة عادية", labelEn: "Normal Soil", factor: 1.0 },
  { id: "rocky", labelAr: "تربة صخرية", labelEn: "Rocky Soil", factor: 1.8 },
  { id: "sandy", labelAr: "تربة رملية", labelEn: "Sandy Soil", factor: 0.85 },
  { id: "clay", labelAr: "تربة طينية", labelEn: "Clay Soil", factor: 1.15 },
  { id: "waterlogged", labelAr: "تربة مشبعة بالمياه", labelEn: "Waterlogged", factor: 1.5 },
];

const SHORING_RATES: Record<string, number> = {
  "0-2": 0,
  "2-4": 25,
  "4-6": 55,
};

const DEWATERING_RATES: Record<string, number> = {
  "0-2": 0,
  "2-4": 8,
  "4-6": 18,
};

export function InfraDepthPricing() {
  const { isArabic } = useLanguage();
  const [length, setLength] = useState(100);
  const [width, setWidth] = useState(1.5);
  const [depthTier, setDepthTier] = useState("0-2");
  const [soilType, setSoilType] = useState("normal");
  const [includeShoring, setIncludeShoring] = useState(false);
  const [includeDewatering, setIncludeDewatering] = useState(false);
  const [includeBackfill, setIncludeBackfill] = useState(true);

  const result = useMemo(() => {
    const tier = DEPTH_TIERS.find(t => t.id === depthTier)!;
    const soil = SOIL_FACTORS.find(s => s.id === soilType)!;
    const depthValue = depthTier === "0-2" ? 2 : depthTier === "2-4" ? 4 : 6;
    const volume = length * width * depthValue;

    const excavationCost = volume * tier.baseRate * soil.factor;
    const backfillCost = includeBackfill ? volume * 0.7 * tier.backfillRate : 0;
    const shoringCost = includeShoring ? length * 2 * depthValue * SHORING_RATES[depthTier] : 0;
    const dewateringCost = includeDewatering ? length * DEWATERING_RATES[depthTier] * 30 : 0;
    const total = excavationCost + backfillCost + shoringCost + dewateringCost;
    const unitRate = length > 0 ? total / length : 0;

    return { volume, excavationCost, backfillCost, shoringCost, dewateringCost, total, unitRate };
  }, [length, width, depthTier, soilType, includeShoring, includeDewatering, includeBackfill]);

  const formatNum = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Card */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shovel className="h-5 w-5 text-primary" />
              {isArabic ? "بيانات الحفر" : "Excavation Data"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isArabic ? "الطول (م)" : "Length (m)"}</Label>
                <Input type="number" value={length} onChange={e => setLength(+e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{isArabic ? "العرض (م)" : "Width (m)"}</Label>
                <Input type="number" value={width} onChange={e => setWidth(+e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs">{isArabic ? "شريحة العمق" : "Depth Tier"}</Label>
              <Select value={depthTier} onValueChange={setDepthTier}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPTH_TIERS.map(t => (
                    <SelectItem key={t.id} value={t.id}>{isArabic ? t.labelAr : t.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">{isArabic ? "نوع التربة" : "Soil Type"}</Label>
              <Select value={soilType} onValueChange={setSoilType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOIL_FACTORS.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {isArabic ? s.labelAr : s.labelEn} (×{s.factor})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge
                variant={includeBackfill ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setIncludeBackfill(!includeBackfill)}
              >
                {isArabic ? "ردم" : "Backfill"}
              </Badge>
              <Badge
                variant={includeShoring ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setIncludeShoring(!includeShoring)}
              >
                {isArabic ? "سند جوانب" : "Shoring"}
              </Badge>
              <Badge
                variant={includeDewatering ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setIncludeDewatering(!includeDewatering)}
              >
                {isArabic ? "نزح مياه" : "Dewatering"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5 text-primary" />
              {isArabic ? "نتائج التسعير" : "Pricing Results"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="h-4 w-4" />
              {isArabic ? "الحجم الكلي:" : "Total Volume:"} <span className="font-bold text-foreground">{formatNum(result.volume)} م³</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>{isArabic ? "تكلفة الحفر" : "Excavation"}</span>
                <span className="font-semibold">{formatNum(result.excavationCost)} SAR</span>
              </div>
              {includeBackfill && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>{isArabic ? "تكلفة الردم" : "Backfill"}</span>
                  <span className="font-semibold">{formatNum(result.backfillCost)} SAR</span>
                </div>
              )}
              {includeShoring && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>{isArabic ? "سند الجوانب" : "Shoring"}</span>
                  <span className="font-semibold">{formatNum(result.shoringCost)} SAR</span>
                </div>
              )}
              {includeDewatering && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>{isArabic ? "نزح المياه" : "Dewatering"}</span>
                  <span className="font-semibold">{formatNum(result.dewateringCost)} SAR</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-primary/30">
              <div className="flex justify-between text-base font-bold text-primary">
                <span>{isArabic ? "الإجمالي" : "Total"}</span>
                <span>{formatNum(result.total)} SAR</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{isArabic ? "معدل المتر الطولي" : "Rate per L.M."}</span>
                <span>{formatNum(result.unitRate)} SAR/m</span>
              </div>
            </div>

            <Button size="sm" variant="outline" className="w-full mt-2 border-primary/30 text-primary">
              <Download className="h-4 w-4 mr-1" />
              {isArabic ? "تصدير النتائج" : "Export Results"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Reference Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{isArabic ? "جدول الأسعار المرجعية (SAR 2025)" : "Reference Rates (SAR 2025)"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-2 px-2">{isArabic ? "العمق" : "Depth"}</th>
                  <th className="text-start py-2 px-2">{isArabic ? "حفر (م³)" : "Exc. (m³)"}</th>
                  <th className="text-start py-2 px-2">{isArabic ? "ردم (م³)" : "Backfill (m³)"}</th>
                  <th className="text-start py-2 px-2">{isArabic ? "سند (م²)" : "Shoring (m²)"}</th>
                  <th className="text-start py-2 px-2">{isArabic ? "نزح (م.ط/شهر)" : "Dewtr. (LM/mo)"}</th>
                </tr>
              </thead>
              <tbody>
                {DEPTH_TIERS.map(t => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-1.5 px-2 font-medium">{isArabic ? t.labelAr : t.labelEn}</td>
                    <td className="py-1.5 px-2">{t.baseRate}</td>
                    <td className="py-1.5 px-2">{t.backfillRate}</td>
                    <td className="py-1.5 px-2">{SHORING_RATES[t.id]}</td>
                    <td className="py-1.5 px-2">{DEWATERING_RATES[t.id]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

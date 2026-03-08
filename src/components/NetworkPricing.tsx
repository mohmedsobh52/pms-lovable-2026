import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { Droplets, PipetteIcon, Calculator, Download, Waves } from "lucide-react";

const PIPE_TYPES = {
  water: [
    { id: "hdpe-110", nameAr: "HDPE Ø110", nameEn: "HDPE Ø110mm", rate: 45, unit: "m" },
    { id: "hdpe-160", nameAr: "HDPE Ø160", nameEn: "HDPE Ø160mm", rate: 72, unit: "m" },
    { id: "hdpe-200", nameAr: "HDPE Ø200", nameEn: "HDPE Ø200mm", rate: 105, unit: "m" },
    { id: "hdpe-315", nameAr: "HDPE Ø315", nameEn: "HDPE Ø315mm", rate: 180, unit: "m" },
    { id: "di-150", nameAr: "DI Ø150", nameEn: "DI Ø150mm", rate: 220, unit: "m" },
    { id: "di-200", nameAr: "DI Ø200", nameEn: "DI Ø200mm", rate: 310, unit: "m" },
  ],
  sewer: [
    { id: "upvc-200", nameAr: "uPVC Ø200", nameEn: "uPVC Ø200mm", rate: 55, unit: "m" },
    { id: "upvc-315", nameAr: "uPVC Ø315", nameEn: "uPVC Ø315mm", rate: 95, unit: "m" },
    { id: "upvc-400", nameAr: "uPVC Ø400", nameEn: "uPVC Ø400mm", rate: 145, unit: "m" },
    { id: "grp-600", nameAr: "GRP Ø600", nameEn: "GRP Ø600mm", rate: 350, unit: "m" },
    { id: "grp-800", nameAr: "GRP Ø800", nameEn: "GRP Ø800mm", rate: 520, unit: "m" },
  ],
};

const MANHOLE_TYPES = [
  { id: "precast-1m", nameAr: "غرفة جاهزة 1م", nameEn: "Precast MH 1m", rate: 3500 },
  { id: "precast-1.5m", nameAr: "غرفة جاهزة 1.5م", nameEn: "Precast MH 1.5m", rate: 5500 },
  { id: "precast-2m", nameAr: "غرفة جاهزة 2م", nameEn: "Precast MH 2m", rate: 8500 },
  { id: "insitu-custom", nameAr: "غرفة صب موقعي", nameEn: "In-situ MH", rate: 12000 },
];

const RESTORATION_ITEMS = [
  { id: "asphalt", nameAr: "إعادة أسفلت", nameEn: "Asphalt Restoration", rate: 85, unit: "m²" },
  { id: "interlock", nameAr: "إعادة إنترلوك", nameEn: "Interlock Restoration", rate: 65, unit: "m²" },
  { id: "concrete", nameAr: "إعادة خرسانة", nameEn: "Concrete Restoration", rate: 120, unit: "m²" },
];

export function NetworkPricing() {
  const { isArabic } = useLanguage();
  const [networkType, setNetworkType] = useState<"water" | "sewer">("water");
  const [pipeType, setPipeType] = useState("hdpe-160");
  const [pipeLength, setPipeLength] = useState(300);
  const [trenchDepth, setTrenchDepth] = useState(1.5);
  const [manholeType, setManholeType] = useState("precast-1m");
  const [manholeCount, setManholeCount] = useState(6);
  const [includeExcavation, setIncludeExcavation] = useState(true);
  const [includeRestoration, setIncludeRestoration] = useState(true);
  const [restorationType, setRestorationType] = useState("asphalt");
  const [trenchWidth, setTrenchWidth] = useState(1.2);
  const [includeFittings, setIncludeFittings] = useState(true);
  const [includeThrust, setIncludeThrust] = useState(networkType === "water");

  const pipes = networkType === "water" ? PIPE_TYPES.water : PIPE_TYPES.sewer;

  const result = useMemo(() => {
    const pipe = pipes.find(p => p.id === pipeType) || pipes[0];
    const manhole = MANHOLE_TYPES.find(m => m.id === manholeType)!;
    const restoration = RESTORATION_ITEMS.find(r => r.id === restorationType)!;

    const pipeCost = pipeLength * pipe.rate;
    const fittingsCost = includeFittings ? pipeCost * 0.15 : 0;
    const manholeCost = manholeCount * manhole.rate;

    const excVolume = pipeLength * trenchWidth * trenchDepth;
    const excavationRate = trenchDepth <= 2 ? 18 : trenchDepth <= 4 ? 35 : 65;
    const excavationCost = includeExcavation ? excVolume * excavationRate : 0;
    const backfillCost = includeExcavation ? excVolume * 0.7 * 12 : 0;

    const restorationArea = pipeLength * (trenchWidth + 0.5);
    const restorationCost = includeRestoration ? restorationArea * restoration.rate : 0;

    const thrustCost = includeThrust ? Math.ceil(pipeLength / 50) * 1200 : 0;

    const total = pipeCost + fittingsCost + manholeCost + excavationCost + backfillCost + restorationCost + thrustCost;
    const ratePerLm = pipeLength > 0 ? total / pipeLength : 0;

    return {
      pipeCost, fittingsCost, manholeCost, excavationCost, backfillCost,
      restorationCost, thrustCost, total, ratePerLm, excVolume, restorationArea
    };
  }, [pipes, pipeType, pipeLength, trenchDepth, manholeType, manholeCount, includeExcavation, includeRestoration, restorationType, trenchWidth, includeFittings, includeThrust]);

  const formatNum = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {/* Network Type Tabs */}
      <Tabs value={networkType} onValueChange={v => { setNetworkType(v as "water" | "sewer"); setPipeType(v === "water" ? "hdpe-160" : "upvc-200"); }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="water" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            {isArabic ? "شبكة مياه" : "Water Network"}
          </TabsTrigger>
          <TabsTrigger value="sewer" className="flex items-center gap-2">
            <Waves className="h-4 w-4" />
            {isArabic ? "شبكة صرف" : "Sewer Network"}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inputs */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PipetteIcon className="h-5 w-5 text-primary" />
              {isArabic ? "بيانات الشبكة" : "Network Data"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">{isArabic ? "نوع وقطر الأنبوب" : "Pipe Type & Diameter"}</Label>
              <Select value={pipeType} onValueChange={setPipeType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pipes.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {isArabic ? p.nameAr : p.nameEn} — {p.rate} SAR/m
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isArabic ? "الطول (م)" : "Length (m)"}</Label>
                <Input type="number" value={pipeLength} onChange={e => setPipeLength(+e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{isArabic ? "عمق الخندق (م)" : "Trench Depth (m)"}</Label>
                <Input type="number" value={trenchDepth} onChange={e => setTrenchDepth(+e.target.value)} className="mt-1" step={0.1} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isArabic ? "عرض الخندق (م)" : "Trench Width (m)"}</Label>
                <Input type="number" value={trenchWidth} onChange={e => setTrenchWidth(+e.target.value)} className="mt-1" step={0.1} />
              </div>
              <div>
                <Label className="text-xs">{isArabic ? "عدد الغرف" : "Manholes"}</Label>
                <Input type="number" value={manholeCount} onChange={e => setManholeCount(+e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs">{isArabic ? "نوع الغرفة" : "Manhole Type"}</Label>
              <Select value={manholeType} onValueChange={setManholeType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MANHOLE_TYPES.map(m => (
                    <SelectItem key={m.id} value={m.id}>{isArabic ? m.nameAr : m.nameEn} — {m.rate.toLocaleString()} SAR</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={includeExcavation} onCheckedChange={setIncludeExcavation} />
                <span className="text-xs">{isArabic ? "حفر وردم" : "Excavation"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={includeFittings} onCheckedChange={setIncludeFittings} />
                <span className="text-xs">{isArabic ? "قطع وتركيبات" : "Fittings"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={includeThrust} onCheckedChange={setIncludeThrust} />
                <span className="text-xs">{isArabic ? "كتل دفع" : "Thrust Blocks"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={includeRestoration} onCheckedChange={setIncludeRestoration} />
                <span className="text-xs">{isArabic ? "إعادة السطح" : "Restoration"}</span>
              </div>
            </div>

            {includeRestoration && (
              <div>
                <Label className="text-xs">{isArabic ? "نوع إعادة السطح" : "Restoration Type"}</Label>
                <Select value={restorationType} onValueChange={setRestorationType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESTORATION_ITEMS.map(r => (
                      <SelectItem key={r.id} value={r.id}>{isArabic ? r.nameAr : r.nameEn} — {r.rate} SAR/{r.unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5 text-primary" />
              {isArabic ? "تفاصيل التكلفة" : "Cost Breakdown"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={isArabic ? "تكلفة الأنابيب" : "Pipes"} value={result.pipeCost} />
            {includeFittings && <Row label={isArabic ? "قطع وتركيبات (15%)" : "Fittings (15%)"} value={result.fittingsCost} />}
            <Row label={isArabic ? "غرف التفتيش" : "Manholes"} value={result.manholeCost} />
            {includeExcavation && (
              <>
                <Row label={isArabic ? "حفر الخنادق" : "Trench Excavation"} value={result.excavationCost} />
                <Row label={isArabic ? "ردم وتسوية" : "Backfill"} value={result.backfillCost} />
              </>
            )}
            {includeRestoration && <Row label={isArabic ? "إعادة السطح" : "Restoration"} value={result.restorationCost} />}
            {includeThrust && <Row label={isArabic ? "كتل دفع" : "Thrust Blocks"} value={result.thrustCost} />}

            <div className="pt-3 border-t border-primary/30 space-y-1">
              <div className="flex justify-between text-base font-bold text-primary">
                <span>{isArabic ? "الإجمالي" : "Total"}</span>
                <span>{formatNum(result.total)} SAR</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{isArabic ? "معدل المتر الطولي" : "Rate per L.M."}</span>
                <span className="font-semibold">{formatNum(result.ratePerLm)} SAR/m</span>
              </div>
            </div>

            <Button size="sm" variant="outline" className="w-full mt-3 border-primary/30 text-primary">
              <Download className="h-4 w-4 mr-1" />
              {isArabic ? "تصدير التفاصيل" : "Export Details"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-1 border-b border-border/50">
      <span>{label}</span>
      <span className="font-semibold">{value.toLocaleString("en-US", { maximumFractionDigits: 2 })} SAR</span>
    </div>
  );
}

import { useState, memo } from "react";
import { ROAD_STRUCTURES } from "./constants";

interface AsphaltPanelProps {
  xStats: any;
  T: any;
  D: boolean;
}

const AsphaltPanel = memo(({ xStats, T, D }: AsphaltPanelProps) => {
  const asp = xStats?.asphaltSummary;
  const [expanded, setExpanded] = useState(false);
  if (!asp || (!asp.totalTons && !asp.totalArea)) return null;

  const costPerM2 = asp.totalArea > 0 ? (asp.totalCost / asp.totalArea).toFixed(0) : 0;

  return (
    <div className={`rounded-xl p-3 border-2 ${D ? "bg-gradient-to-br from-[#0a0a0c] to-[#18181b] border-zinc-700/50" : "bg-gradient-to-br from-slate-50 to-gray-50 border-slate-300"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛣️</span>
          <div>
            <div className="text-[11px] font-black text-foreground">حسابات الأسفلت والرصف</div>
            <div className="text-[8.5px] text-muted-foreground">{asp.roadType ? (ROAD_STRUCTURES as any)[asp.roadType]?.name : "رصف عام"} · {asp.totalThickMM || 0}mm إجمالي</div>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-[8px] px-2 py-0.5 border border-slate-400 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-600/10">
          {expanded ? "▲ طيّ" : "▼ تفاصيل"}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {[
          ["📐 المساحة", `${(asp.totalArea || 0).toFixed(0)} م²`, "#2563eb"],
          ["⚖️ أسفلت", `${(asp.totalTons || 0).toFixed(1)} طن`, "#1e293b"],
          ["🪨 أساس مجروش", `${(asp.totalAggM3 || 0).toFixed(0)} م³`, "#92400e"],
          ["💧 رش أسفلتي", `${(asp.totalSprayLtr || 0).toFixed(0)} لتر`, "#7c3aed"],
          ["💰 سعر/م²", `${costPerM2} SAR`, "#ca8a04"],
          ["🏷️ الإجمالي", `${((asp.totalCost || 0) / 1000).toFixed(0)}ك SAR`, "#16a34a"],
        ].map(([l, v, c]) => (
          <div key={l as string} className={`rounded-lg p-2 border ${D ? "bg-black/50 border-white/5" : "bg-white border-gray-100"}`}>
            <div className="text-[7.5px] text-muted-foreground">{l}</div>
            <div className="text-xs font-extrabold" style={{ color: c as string }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Layer section visualization */}
      {asp.layers && asp.layers.length > 0 && (() => {
        const totalMM = asp.layers.reduce((s: number, l: any) => s + (l.thickMM || 0), 0) || 1;
        return (
          <div className="mb-2">
            <div className="text-[8px] text-muted-foreground mb-1">مقطع الطبقات (نسبي):</div>
            <div className="flex flex-col gap-0.5">
              {[...asp.layers].reverse().filter((l: any) => l.thickMM > 1).map((l: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="rounded-sm flex-1" style={{ height: Math.max(6, l.thickMM / totalMM * 50), background: l.color, minWidth: 60 }} />
                  <div className="text-[7.5px] text-muted-foreground whitespace-nowrap">
                    {l.thickMM}mm — {l.ar.split(" ")[0]} — {l.type === "AC" ? `${l.tons}t` : l.type === "Agg" ? `${l.vol_m3}م³` : `${l.ltrs || 0}L`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Expanded table */}
      {expanded && (
        <div className="border-t border-border pt-2">
          <div className="text-[8.5px] font-bold mb-1.5 text-foreground">📊 جدول الطبقات الكامل</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[7.5px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className={D ? "bg-zinc-900" : "bg-slate-50"}>
                  {["الطبقة", "السماكة", "المساحة م²", "الحجم/الوزن", "التكلفة SAR"].map(h => (
                    <th key={h} className="px-1.5 py-1 text-center font-bold border-b border-border text-foreground/70">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asp.layers.filter((l: any) => l.thickMM > 1).map((l: any, i: number) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-1.5 py-1">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm" style={{ background: l.color }} />
                        <span className="text-foreground/80">{l.ar}</span>
                      </div>
                    </td>
                    <td className="px-1.5 py-1 text-center text-foreground/70">{l.thickMM}mm</td>
                    <td className="px-1.5 py-1 text-center text-foreground/70">{l.area_m2?.toFixed(0)}</td>
                    <td className="px-1.5 py-1 text-center font-bold text-foreground/80">
                      {l.type === "AC" ? `${l.tons} طن` : l.type === "Agg" ? `${l.vol_m3} م³` : `${l.ltrs || 0} لتر`}
                    </td>
                    <td className="px-1.5 py-1 text-center font-bold text-blue-600">{((l.cost_sar || 0) / 1000).toFixed(1)}ك</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

AsphaltPanel.displayName = "AsphaltPanel";
export default AsphaltPanel;

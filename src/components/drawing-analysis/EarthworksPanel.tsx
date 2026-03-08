import { useState, memo } from "react";
import { trenchWidth, calcTrenchEarthworks } from "./helpers";

interface EarthworksPanelProps {
  xStats: any;
  T: any;
  D: boolean;
}

const EarthworksPanel = memo(({ xStats, T, D }: EarthworksPanelProps) => {
  const ew = xStats?.earthworksSummary;
  const [expanded, setExpanded] = useState(false);
  if (!ew || ew.excav_total < 1) return null;

  const alerts = xStats?.earthworkAlerts || [];
  const pipes = xStats?.pipeNetwork || [];

  return (
    <div className={`rounded-xl p-3 border-2 ${D ? "bg-gradient-to-br from-[#1a0800] to-[#2d1400] border-orange-700/30" : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">⛏️</span>
          <div>
            <div className="text-[11px] text-orange-600 font-black">حسابات الحفر والردم</div>
            <div className="text-[8.5px] text-muted-foreground">محسوب تلقائياً · {pipes.length} خط أنابيب</div>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-[8px] px-2 py-0.5 border border-orange-600 text-orange-600 rounded hover:bg-orange-600/10">
          {expanded ? "▲ طيّ" : "▼ تفاصيل"}
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {alerts.slice(0, 3).map((a: string, i: number) => (
            <div key={i} className={`rounded-md px-2 py-1 text-[8.5px] border ${D ? "bg-orange-950 border-orange-700 text-orange-400" : "bg-orange-50 border-orange-300 text-orange-700"}`}>{a}</div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {[
          ["⛏️ حفر تربة", `${(ew.excav_soil || 0).toFixed(0)} م³`, "#dc2626"],
          ["🪨 حفر صخر", `${(ew.excav_rock || 0).toFixed(0)} م³`, "#6b7280"],
          ["🔄 ردم مدموك", `${(ew.backfill || 0).toFixed(0)} م³`, "#16a34a"],
          ["🚛 تخلص/نقل", `${(ew.disposal || 0).toFixed(0)} م³`, "#64748b"],
          ["🏖️ فرشة رملية", `${(ew.sandBed || 0).toFixed(0)} م³`, "#ca8a04"],
          ["🔷 تكلفة", `${((ew.cost_total || 0) / 1000).toFixed(0)}ك SAR`, "#2563eb"],
        ].map(([l, v, c]) => (
          <div key={l as string} className={`rounded-lg p-2 border ${D ? "bg-[#1a0808] border-white/5" : "bg-white border-gray-100"}`}>
            <div className="text-[7.5px] text-muted-foreground">{l}</div>
            <div className="text-xs font-extrabold" style={{ color: c as string }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Composition bar */}
      {(ew.excav_total || 0) > 0 && (
        <div className="h-[7px] rounded overflow-hidden flex mb-1.5">
          <div style={{ flex: ew.excav_soil || 0, background: "#dc2626" }} />
          <div style={{ flex: ew.excav_rock || 0, background: "#6b7280" }} />
        </div>
      )}

      {/* Expanded details by pipe diameter */}
      {expanded && pipes.filter((p: any) => p.totalLength > 0).length > 0 && (
        <div className="border-t border-border pt-2">
          <div className="text-[8.5px] text-orange-600 font-bold mb-1.5">📋 تفصيل حسب القطر</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[7.5px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className={D ? "bg-[#2a1000]" : "bg-orange-50"}>
                  {["القطر", "الطول م.ط", "العمق م", "عرض خندق", "حفر م³", "ردم م³", "تخلص م³", "SAR"].map(h => (
                    <th key={h} className="px-1.5 py-1 text-center text-orange-600 font-bold border-b border-orange-200 dark:border-orange-900">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pipes.filter((p: any) => p.totalLength > 0).map((p: any, i: number) => {
                  const avgD = p.maxDepth > 0 ? (+(p.minDepth + p.maxDepth) / 2).toFixed(1) : "2.0";
                  const tw = trenchWidth(p.dia, +avgD);
                  const ew2 = calcTrenchEarthworks({ lengthM: p.totalLength, diaMM: p.dia, depthM: +avgD });
                  return (
                    <tr key={i} className="border-b border-border">
                      <td className="px-1.5 py-1 font-bold" style={{ color: p.color }}>Ø{p.dia}</td>
                      <td className="px-1.5 py-1 text-center text-foreground/70">{p.totalLength.toFixed(0)}</td>
                      <td className="px-1.5 py-1 text-center text-foreground/70">{avgD}</td>
                      <td className="px-1.5 py-1 text-center text-muted-foreground">{tw}</td>
                      <td className="px-1.5 py-1 text-center text-red-600 font-bold">{ew2.excav_total_m3}</td>
                      <td className="px-1.5 py-1 text-center text-green-600 font-bold">{ew2.backfill_m3}</td>
                      <td className="px-1.5 py-1 text-center text-muted-foreground">{ew2.disposal_m3}</td>
                      <td className="px-1.5 py-1 text-center text-blue-600 font-bold">{((ew2.cost?.total_sar || 0) / 1000).toFixed(0)}ك</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

EarthworksPanel.displayName = "EarthworksPanel";
export default EarthworksPanel;

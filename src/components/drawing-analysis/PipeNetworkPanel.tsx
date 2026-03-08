import { useState, memo } from "react";

interface PipeNetworkPanelProps {
  xStats: any;
  T: any;
  D: boolean;
}

const PipeNetworkPanel = memo(({ xStats, T, D }: PipeNetworkPanelProps) => {
  const pipes = xStats?.pipeNetwork || [];
  const [expanded, setExpanded] = useState(false);
  if (!pipes.length) return null;

  const totalLength = pipes.reduce((s: number, p: any) => s + (p.totalLength || 0), 0);
  const byMat: Record<string, number> = pipes.reduce((acc: any, p: any) => { acc[p.mat] = (acc[p.mat] || 0) + (p.totalLength || 0); return acc; }, {});

  return (
    <div className={`rounded-xl p-3 border-2 ${D ? "bg-gradient-to-br from-[#0c0a1a] to-[#140f2a] border-purple-800/40" : "bg-gradient-to-br from-purple-50 to-violet-50 border-violet-300"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔵</span>
          <div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 font-black">شبكة الأنابيب المستخرجة</div>
            <div className="text-[8.5px] text-muted-foreground">{pipes.length} مواصفة · إجمالي {totalLength.toFixed(0)} م.ط</div>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-[8px] px-2 py-0.5 border border-purple-600 text-purple-600 rounded hover:bg-purple-600/10">
          {expanded ? "▲ طيّ" : "▼ تفاصيل"}
        </button>
      </div>

      {/* Color bar by material */}
      <div className="h-2 rounded overflow-hidden flex mb-2">
        {Object.entries(byMat).map(([mat, len]) => {
          const pipe = pipes.find((p: any) => p.mat === mat);
          return <div key={mat} style={{ flex: len as number, background: pipe?.color || "#6b7280" }} title={mat} />;
        })}
      </div>

      {/* Pipe cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-1.5">
        {pipes.map((p: any, i: number) => (
          <div key={i} className={`rounded-lg p-2 border ${D ? "bg-[#1a1535] border-white/10" : "bg-white border-gray-200"}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-xs font-black" style={{ color: p.color }}>Ø{p.dia}mm</span>
            </div>
            <div className="text-[8.5px] font-bold text-foreground/80">{p.mat}</div>
            <div className="text-[7.5px] text-muted-foreground">{p.cls || "—"} · {p.type}</div>
            {p.totalLength > 0 && <div className="text-[9px] font-bold text-amber-600 mt-0.5">{p.totalLength.toFixed(1)} م.ط</div>}
          </div>
        ))}
      </div>

      {expanded && (
        <div className={`mt-2 rounded-lg p-2 border ${D ? "bg-[#0a0818] border-purple-900" : "bg-purple-50 border-violet-200"}`}>
          <div className="text-[9px] text-purple-600 font-bold mb-1.5">📊 توزيع حسب المادة</div>
          {Object.entries(byMat).map(([mat, len]) => {
            const pipe = pipes.find((p: any) => p.mat === mat);
            const pct = totalLength > 0 ? ((len as number) / totalLength * 100).toFixed(1) : "0";
            return (
              <div key={mat} className="mb-1">
                <div className="flex justify-between text-[8.5px] mb-0.5">
                  <span style={{ color: pipe?.color }}>{mat}</span>
                  <span className="font-bold text-foreground/70">{(len as number).toFixed(0)} م.ط ({pct}%)</span>
                </div>
                <div className={`h-1 rounded overflow-hidden ${D ? "bg-slate-800" : "bg-slate-200"}`}>
                  <div className="h-full rounded" style={{ width: `${pct}%`, background: pipe?.color || "#7c3aed" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

PipeNetworkPanel.displayName = "PipeNetworkPanel";
export default PipeNetworkPanel;

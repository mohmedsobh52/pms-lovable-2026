import { memo, useState } from "react";
import type { ThemeColors } from "./theme";

export interface Suggestion {
  id: string;
  icon: string;
  type: "performance" | "accuracy";
  text: string;
  actionLabel: string;
  action: () => void;
  priority: number;
}

interface SmartSuggestionsProps {
  suggestions: Suggestion[];
  T: ThemeColors;
  D: boolean;
  context: "config" | "analysis";
}

const SmartSuggestions = memo(function SmartSuggestions({ suggestions, T, D }: SmartSuggestionsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = suggestions.filter(s => !dismissed.has(s.id)).sort((a, b) => a.priority - b.priority).slice(0, 5);
  if (!visible.length) return null;

  const perfSugs = visible.filter(s => s.type === "performance");
  const accSugs = visible.filter(s => s.type === "accuracy");

  const renderGroup = (title: string, icon: string, color: string, borderColor: string, bgGrad: string, items: Suggestion[]) => {
    if (!items.length) return null;
    return (
      <div style={{
        background: bgGrad,
        border: `1px solid ${borderColor}`,
        borderRadius: 11,
        padding: "10px 14px",
        marginBottom: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 10, color, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <span>{icon}</span> {title}
          </div>
          <span style={{ fontSize: 8, color: T.t3, background: D ? "#ffffff10" : "#00000008", padding: "1px 7px", borderRadius: 8 }}>{items.length} اقتراح</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(s => (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: D ? "#ffffff06" : "#ffffff80",
              border: `1px solid ${D ? "#ffffff10" : "#00000010"}`,
              borderRadius: 9, padding: "7px 10px",
              transition: "all .15s",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: T.t1, lineHeight: 1.6 }}>{s.text}</div>
              </div>
              <button
                onClick={s.action}
                style={{
                  background: `linear-gradient(135deg,${color}20,${color}10)`,
                  border: `1px solid ${color}40`,
                  color, padding: "4px 10px", borderRadius: 7,
                  cursor: "pointer", fontSize: 9, fontWeight: 700,
                  fontFamily: "inherit", whiteSpace: "nowrap",
                  transition: "all .15s",
                }}
                onMouseOver={e => (e.currentTarget.style.background = `${color}25`)}
                onMouseOut={e => (e.currentTarget.style.background = `linear-gradient(135deg,${color}20,${color}10)`)}
              >
                {s.actionLabel}
              </button>
              <button
                onClick={() => setDismissed(prev => { const n = new Set(prev); n.add(s.id); return n; })}
                style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 10, padding: "2px", opacity: 0.5 }}
                title="إخفاء"
              >✕</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderGroup(
        "اقتراحات تحسين الأداء", "⚡",
        D ? "#F3570C" : "#F3570C",
        D ? "#854d0e40" : "#FFE8DB",
        D ? "linear-gradient(135deg,#1a0e02,#201204)" : "linear-gradient(135deg,#FFF5F0,#FFE8DB)",
        perfSugs
      )}
      {renderGroup(
        "اقتراحات رفع الدقة", "🎯",
        D ? "#34d399" : "#15803d",
        D ? "#065f4640" : "#bbf7d0",
        D ? "linear-gradient(135deg,#0a1f14,#0d2810)" : "linear-gradient(135deg,#f0fdf4,#dcfce7)",
        accSugs
      )}
    </>
  );
});

export default SmartSuggestions;

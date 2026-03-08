import { memo, useState, useEffect } from "react";
import { densityColor, densityLabel, fmtN } from "./constants";
import type { ThemeColors } from "./theme";

interface PdfNavProps {
  sess: any;
  T: ThemeColors;
  selPages: (sess: any) => number[];
  setPdfSess: (fn: (prev: any) => any) => void;
  loadThumbs: (doc: any, pages: number[]) => void;
  openPreview: (p: number) => void;
}

const PdfNav = memo(function PdfNav({ sess, T, selPages, setPdfSess, loadThumbs, openPreview }: PdfNavProps) {
  const [scroll, setScroll] = useState(0);
  const TH = 88, VIS = 20;
  const sp = selPages(sess);
  const spSet = new Set(sp);
  const viewStart = Math.floor(scroll / TH);
  const viewEnd = Math.min(viewStart + VIS, sess.numPages);
  const visPgs = Array.from({ length: viewEnd - viewStart }, (_, i) => viewStart + i + 1);

  useEffect(() => {
    const miss = visPgs.filter((p: number) => !sess.thumbsLoaded.has(p));
    if (miss.length) loadThumbs(sess.doc, miss);
  }, [scroll]);

  const toggle = (p: number) => setPdfSess((prev: any) => {
    const cur = new Set(prev.selPages); cur.has(p) ? cur.delete(p) : cur.add(p);
    return { ...prev, selPages: [...cur].sort((a: number, b: number) => a - b), mode: "custom" };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "4px 7px", borderBottom: `1px solid ${T.bd}`, display: "flex", gap: 5, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: T.gold, fontWeight: 700 }}>{fmtN(sess.numPages)}ص</span>
        <span style={{ fontSize: 9, color: T.t3 }}>✓{sp.length}</span>
        <span style={{ fontSize: 9, color: T.grn }}>÷{Math.ceil(sp.length / (sess.chunkSize || 20))}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "3px" }}
        onScroll={(e: any) => {
          const sc = e.target.scrollTop; setScroll(sc);
          const ns = Math.floor(sc / TH);
          const ahead = Array.from({ length: 40 }, (_, i) => ns + i + 1).filter(p => p >= 1 && p <= sess.numPages && !sess.thumbsLoaded.has(p));
          if (ahead.length) loadThumbs(sess.doc, ahead);
        }}>
        <div style={{ height: sess.numPages * TH, position: "relative" }}>
          {visPgs.map((p: number) => {
            const dens = sess.densities?.[p] ?? -1;
            const dc = dens >= 0 ? densityColor(dens) : T.bd;
            return (
              <div key={p} style={{ position: "absolute", top: (p - 1) * TH, left: 0, right: 0, padding: "2px" }}>
                <div style={{
                  borderRadius: 7, border: `2px solid ${spSet.has(p) ? T.gold : dc}`, overflow: "hidden",
                  background: T.bg2, cursor: "pointer", transition: "border .15s", display: "flex", gap: 4, alignItems: "center", padding: "3px 4px",
                  boxShadow: spSet.has(p) ? `0 0 6px ${T.gold}30` : "none"
                }} onClick={() => toggle(p)}>
                  {sess.thumbs[p]
                    ? <img src={sess.thumbs[p]} style={{ width: 42, height: 56, objectFit: "contain", borderRadius: 3, flexShrink: 0 }} onDoubleClick={(e: any) => { e.stopPropagation(); openPreview(p); }} />
                    : <div style={{ width: 42, height: 56, background: T.bg3, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: T.t3 }}>⏳</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: spSet.has(p) ? T.gold : T.t2, fontWeight: 700 }}>ص{p}</div>
                    {dens >= 0 && <div style={{ fontSize: 7, color: dc }}>{densityLabel(dens)}</div>}
                    {spSet.has(p) && <div style={{ fontSize: 7, color: T.gold, fontWeight: 700 }}>✓</div>}
                    <div onClick={(e: any) => { e.stopPropagation(); openPreview(p); }} style={{ fontSize: 8, cursor: "pointer", marginTop: 1, opacity: .6 }} title="معاينة">🔍</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default PdfNav;

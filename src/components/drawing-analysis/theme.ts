// Brand colors theme for Drawing Analysis
// Primary: #F3570C | Foreground: #161616 | Secondary: #605F5F | Border: #A0A09F | Background: #FBFAFA

export function getTheme(darkMode: boolean) {
  const D = darkMode;
  return {
    bg: D ? "#161616" : "#FBFAFA",
    bg2: D ? "#1e1e1e" : "#ffffff",
    bg3: D ? "#2a2a2a" : "#f5f5f4",
    bd: D ? "#3a3a3a" : "#A0A09F",
    t1: D ? "#FBFAFA" : "#161616",
    t2: D ? "#A0A09F" : "#3a3a3a",
    t3: D ? "#605F5F" : "#605F5F",
    gold: "#F3570C",
    goldL: "#FF6B1A",
    grn: D ? "#34d399" : "#15803d",
    msgUser: D
      ? "linear-gradient(135deg,#1e1e1e,#2a2a2a)"
      : "linear-gradient(135deg,#FFF5F0,#FFE8DB)",
    msgAi: D
      ? "linear-gradient(135deg,#1a0e02,#201204)"
      : "linear-gradient(135deg,#FFF5F0,#FFE8DB)",
    msgFast: D
      ? "linear-gradient(135deg,#1a0e02,#251506)"
      : "linear-gradient(135deg,#FFF5F0,#FFECD6)",
    msgMerge: D
      ? "linear-gradient(135deg,#1a0e02,#201204)"
      : "linear-gradient(135deg,#FFF5F0,#FFE8DB)",
    msgHybrid: D
      ? "linear-gradient(135deg,#1a0e02,#201508)"
      : "linear-gradient(135deg,#FFF5F0,#FFE8DB)",
    card: D ? "#1e1e1e" : "#ffffff",
    bar: D ? "#161616" : "#f5f5f4",
    shadow: D ? "0 1px 3px #00000060" : "0 1px 4px #0001",
  };
}

export type ThemeColors = ReturnType<typeof getTheme>;

export function buildCss(T: ThemeColors, D: boolean): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;600;700;900&display=swap');
    .alimtyaz-root *{box-sizing:border-box}
    .alimtyaz-root ::-webkit-scrollbar{width:5px;height:5px}
    .alimtyaz-root ::-webkit-scrollbar-track{background:${T.bg3}}
    .alimtyaz-root ::-webkit-scrollbar-thumb{background:${T.gold}55;border-radius:4px}
    .alimtyaz-root .card{background:${T.card};border:1px solid ${T.bd};border-radius:12px;box-shadow:${T.shadow}}
    .alimtyaz-root .g{color:${T.gold};font-weight:700}
    .alimtyaz-root .bg-btn{background:linear-gradient(135deg,${T.gold},${T.goldL});color:#fff;font-weight:800;border:none;padding:9px 20px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:13px;transition:all .2s;box-shadow:0 2px 10px ${T.gold}30}
    .alimtyaz-root .bg-btn:hover{transform:translateY(-1px);box-shadow:0 5px 18px ${T.gold}50}
    .alimtyaz-root .bg-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
    .alimtyaz-root .bo{background:${T.bg3};color:${T.t2};border:1px solid ${T.bd};padding:6px 13px;border-radius:9px;cursor:pointer;font-family:inherit;font-size:11px;transition:all .18s}
    .alimtyaz-root .bo:hover{background:${T.bg2};border-color:${T.t3};color:${T.t1}}
    .alimtyaz-root .fe-btn{background:linear-gradient(135deg,${T.gold},${T.goldL});color:#fff;border:1px solid ${T.goldL};padding:9px 18px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:800;transition:all .2s;box-shadow:0 2px 8px ${T.gold}30}
    .alimtyaz-root .fe-btn:hover{filter:brightness(1.12);box-shadow:0 4px 14px ${T.gold}40}
    .alimtyaz-root .fe-btn:disabled{opacity:.4;cursor:not-allowed}
    .alimtyaz-root .chip{background:${T.bg3};border:1px solid ${T.bd};color:${T.t2};padding:4px 10px;border-radius:14px;cursor:pointer;font-size:10px;transition:all .18s;display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
    .alimtyaz-root .chip:hover{border-color:${T.t3};color:${T.t1}}
    .alimtyaz-root .chip.on{background:${D ? "#2a1a08" : "#FFF5F0"};border-color:${T.gold};color:${T.gold};font-weight:700}
    .alimtyaz-root .fchip{background:${D ? "#2a1a0810" : "#FFF5F0"};border:1px solid ${D ? T.gold + "30" : T.gold + "40"};color:${T.gold};padding:4px 10px;border-radius:14px;cursor:pointer;font-size:10px;transition:all .18s;display:inline-flex;align-items:center;gap:3px}
    .alimtyaz-root .fchip.on{background:${D ? "#2a1a08" : "#FFE8DB"};border-color:${T.gold};color:${T.gold};font-weight:700}
    .alimtyaz-root .inp{background:${T.bg3};border:1px solid ${T.bd};color:${T.t1};padding:10px 14px;border-radius:10px;font-family:inherit;font-size:13px;width:100%;resize:none;outline:none;transition:border .2s;line-height:1.8}
    .alimtyaz-root .inp:focus{border-color:${T.gold};box-shadow:0 0 0 3px ${T.gold}18}
    .alimtyaz-root .sinp{background:${T.bg3};border:1px solid ${T.bd};color:${T.t1};padding:5px 10px;border-radius:8px;font-family:inherit;font-size:11px;outline:none;width:150px}
    .alimtyaz-root .sel{background:${T.bg3};border:1px solid ${T.bd};color:${T.t1};padding:8px 11px;border-radius:9px;font-family:inherit;font-size:12px;width:100%;outline:none}
    .alimtyaz-root .drop{border:2px dashed ${T.bd};border-radius:12px;padding:12px;text-align:center;transition:all .2s;cursor:pointer}
    .alimtyaz-root .drop:hover,.alimtyaz-root .drop.on{border-color:${T.gold};background:${T.gold}10}
    .alimtyaz-root .db{background:${T.bg3};border:1px solid ${T.bd};color:${T.t2};padding:9px;border-radius:9px;cursor:pointer;font-family:inherit;font-size:10px;transition:all .18s;text-align:center}
    .alimtyaz-root .db.on{background:${D ? "#2a1a08" : "#FFF5F0"};border-color:${T.gold};color:${T.gold};font-weight:700}
    .alimtyaz-root .mu{background:${T.msgUser};border-radius:14px 14px 4px 14px;padding:12px 16px;margin:4px 0;max-width:86%;border:1px solid ${T.bd}}
    .alimtyaz-root .ma{background:${T.msgAi};border-radius:14px 14px 14px 4px;padding:14px 18px;margin:4px 0;width:100%;border:1px solid ${D ? T.gold + "30" : T.gold + "40"};border-right:3px solid ${T.gold}}
    .alimtyaz-root .mf{background:${T.msgFast};border-radius:14px 14px 14px 4px;padding:14px 18px;margin:4px 0;width:100%;border:1px solid ${D ? T.gold + "40" : T.gold + "30"};border-right:3px solid ${T.goldL}}
    .alimtyaz-root .mh{background:${T.msgHybrid};border-radius:14px 14px 14px 4px;padding:14px 18px;margin:4px 0;width:100%;border:1px solid ${D ? T.gold + "30" : T.gold + "25"};border-right:3px solid ${T.gold}}
    .alimtyaz-root .mm{background:${T.msgMerge};border-radius:16px;padding:16px 20px;margin:6px 0;width:100%;border:2px solid ${D ? "#854d0e" : "#F3570C60"};border-right:4px solid ${T.gold};box-shadow:0 3px 16px ${T.gold}15}
    .alimtyaz-root .ma .p,.alimtyaz-root .mf .p,.alimtyaz-root .mh .p,.alimtyaz-root .mm .p{margin:5px 0;line-height:1.9;font-size:13px;color:${T.t1}}
    .alimtyaz-root .ma .h1,.alimtyaz-root .mf .h1,.alimtyaz-root .mh .h1,.alimtyaz-root .mm .h1{color:${T.gold};font-size:15px;font-weight:900;margin:13px 0 5px;border-bottom:2px solid ${T.gold}25;padding-bottom:4px}
    .alimtyaz-root .ma .h2,.alimtyaz-root .mf .h2,.alimtyaz-root .mh .h2,.alimtyaz-root .mm .h2{color:${T.gold};font-size:13px;font-weight:700;margin:10px 0 4px}
    .alimtyaz-root .ma .h3,.alimtyaz-root .mf .h3,.alimtyaz-root .mh .h3,.alimtyaz-root .mm .h3{color:${T.goldL};font-size:12px;font-weight:700;margin:8px 0 3px}
    .alimtyaz-root .ma .b,.alimtyaz-root .mf .b,.alimtyaz-root .mh .b,.alimtyaz-root .mm .b{color:${T.gold};font-weight:700}
    .alimtyaz-root .ma .code,.alimtyaz-root .mf .code,.alimtyaz-root .mh .code,.alimtyaz-root .mm .code{background:${T.bg3};color:${T.gold};padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid ${T.bd}}
    .alimtyaz-root .ma .li,.alimtyaz-root .mf .li,.alimtyaz-root .mh .li,.alimtyaz-root .mm .li{margin:3px 0;padding-right:8px;color:${T.t1};font-size:12.5px}
    .alimtyaz-root .tw{overflow-x:auto;margin:8px 0;border-radius:8px;border:1px solid ${T.bd}}
    .alimtyaz-root table{border-collapse:collapse;width:100%;min-width:360px;font-size:11.5px}
    .alimtyaz-root th{background:${D ? "#2a1a08" : "#FFF5F0"};color:${T.gold};padding:7px 11px;text-align:right;border:1px solid ${T.bd};white-space:nowrap;font-weight:700}
    .alimtyaz-root td{padding:6px 11px;text-align:right;border:1px solid ${T.bd};line-height:1.5;color:${T.t1}}
    .alimtyaz-root tr:nth-child(even){background:${T.bg3}}
    .alimtyaz-root .bk{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap;margin:1px}
    .alimtyaz-root .ok{background:#dcfce7;color:#15803d}.alimtyaz-root .wn{background:#fef9c3;color:#854d0e}
    .alimtyaz-root .ck{background:#FFF5F0;color:#F3570C}.alimtyaz-root .lo{background:#dcfce7;color:#15803d}
    .alimtyaz-root .me{background:#fef3c7;color:#92400e}.alimtyaz-root .hi{background:#fee2e2;color:#b91c1c}
    .alimtyaz-root .cr{background:#fff1f2;color:#be123c;border:1px solid #fecdd3}
    .alimtyaz-root .inf{background:#FFF5F0;color:#F3570C;border:1px solid #FFE8DB}
    .alimtyaz-root .prt{background:#FFF5F0;color:#F3570C;border:1px solid #FFE8DB}
    .alimtyaz-root .nav-i{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:9px;cursor:pointer;transition:all .18s;font-size:12px;color:${T.t2};border:1px solid transparent;margin-bottom:3px;white-space:nowrap;position:relative}
    .alimtyaz-root .nav-i:hover{background:${T.bg3};color:${T.t1}}
    .alimtyaz-root .nav-i.act{background:${D ? "#2a1a08" : "#FFF5F0"};border-color:${T.gold}40;color:${T.gold};font-weight:700}
    .alimtyaz-root .nav-i.act::before{content:'';position:absolute;right:0;top:20%;height:60%;width:3px;background:${T.gold};border-radius:2px}
    .alimtyaz-root .prog{height:6px;background:${T.bg3};border-radius:4px;overflow:hidden}
    .alimtyaz-root .prog-f{height:100%;border-radius:4px;transition:width .4s}
    .alimtyaz-root mark.hl{background:${T.gold}40;border-radius:3px;padding:0 2px;color:${T.gold}}
    @keyframes alim-spin{to{transform:rotate(360deg)}}
    @keyframes alim-pulse{0%,100%{opacity:.25;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}
    @keyframes alim-fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes alim-grow{0%{width:2%}75%{width:90%}100%{width:95%}}
    @keyframes alim-glow{0%,100%{box-shadow:none}50%{box-shadow:0 0 22px ${T.gold}30}}
    .alimtyaz-root .fi{animation:alim-fi .25s ease forwards}
    .alimtyaz-root .glow{animation:alim-glow 3s ease infinite}
  `;
}

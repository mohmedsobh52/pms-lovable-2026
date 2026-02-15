interface BackgroundImageProps {
  activePhase?: number;
}

const phaseColors: Record<number, string> = {
  1: "186 100% 50%",
  2: "217 91% 60%",
  3: "142 71% 45%",
  4: "25 95% 53%",
  5: "262 83% 58%",
  6: "350 89% 60%",
};

const BackgroundImage = ({ activePhase = 1 }: BackgroundImageProps) => {
  const currentPhaseColor = phaseColors[activePhase] || phaseColors[1];

  return (
    <>
      {/* Deep Multi-tone Gradient */}
      <div className="fixed inset-0 -z-50 bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-950" />
      
      {/* Aurora Blob - Phase Responsive */}
      <div
        className="fixed -z-45 w-[600px] h-[500px] rounded-full blur-[150px] transition-colors duration-[2000ms]"
        style={{
          left: '35%',
          top: '20%',
          backgroundColor: `hsl(${currentPhaseColor} / 0.08)`,
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Blueprint Grid */}
      <div 
        className="fixed inset-0 -z-40 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(147,197,253,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147,197,253,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Vignette Effect */}
      <div 
        className="fixed inset-0 -z-35 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, hsl(222 47% 8% / 0.6) 100%)'
        }}
      />
      
      {/* Light/Dark Mode Overlay */}
      <div className="fixed inset-0 -z-10 bg-background/75 dark:bg-background/70 pointer-events-none" />
    </>
  );
};

export default BackgroundImage;

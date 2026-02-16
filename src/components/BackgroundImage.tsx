interface BackgroundImageProps {
  activePhase?: number;
}

const BackgroundImage = ({ activePhase = 1 }: BackgroundImageProps) => {
  return (
    <>
      {/* Circuit Board Background Image */}
      <div
        className="fixed inset-0 -z-50"
        style={{
          backgroundImage: 'url(/images/pms-dashboard-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Dark Overlay for readability */}
      <div className="fixed inset-0 -z-40 bg-black/55 dark:bg-black/65" />

      {/* Light/Dark Mode Overlay */}
      <div className="fixed inset-0 -z-10 bg-background/40 dark:bg-background/35 pointer-events-none" />
    </>
  );
};

export default BackgroundImage;

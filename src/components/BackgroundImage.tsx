const BackgroundImage = () => {
  return (
    <>
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 -z-50 interactive-bg" />

      {/* Dot Grid Pattern */}
      <div className="fixed inset-0 -z-40 dot-grid" />

      {/* Light/Dark Mode Overlay */}
      <div className="fixed inset-0 -z-10 bg-background/80 dark:bg-background/60 pointer-events-none" />
    </>
  );
};

export default BackgroundImage;

import { forwardRef } from "react";
import pmsLogo from "@/assets/pms-logo.png";

interface PMSLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const sizeMap = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16"
};

export const PMSLogo = forwardRef<HTMLDivElement, PMSLogoProps>(
  ({ className = "", size = "md", showText = false }, ref) => {
    return (
      <div ref={ref} className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeMap[size]} rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10`}>
          <img 
            src={pmsLogo} 
            alt="PMS Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        {showText && (
          <span className="font-display font-bold gradient-text text-lg">PMS</span>
        )}
      </div>
    );
  }
);

PMSLogo.displayName = "PMSLogo";

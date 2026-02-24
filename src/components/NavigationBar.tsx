import { useLocation } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Breadcrumbs } from "./Breadcrumbs";

interface NavigationBarProps {
  showBreadcrumbs?: boolean;
  className?: string;
}

export function NavigationBar({ showBreadcrumbs = true, className = "" }: NavigationBarProps) {
  const location = useLocation();
  const { isArabic } = useLanguage();
  
  const isHomePage = location.pathname === "/" || location.pathname === "/dashboard";
  if (isHomePage) return null;

  return (
    <div className={`flex items-center gap-2 mb-4 flex-wrap navigation-bar-safe ${className}`} dir={isArabic ? "rtl" : "ltr"}>
      {showBreadcrumbs && (
        <div className="flex-1">
          <Breadcrumbs />
        </div>
      )}
    </div>
  );
}

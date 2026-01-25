import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface BackToHomeButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  showOnHome?: boolean;
  className?: string;
}

export function BackToHomeButton({ 
  variant = "outline", 
  size = "sm",
  showOnHome = false,
  className = ""
}: BackToHomeButtonProps) {
  const location = useLocation();
  const { isArabic } = useLanguage();
  
  // لا تظهر في الصفحة الرئيسية
  const isHomePage = location.pathname === "/" || location.pathname === "/dashboard";
  if (isHomePage && !showOnHome) return null;
  
  return (
    <Link to="/">
      <Button variant={variant} size={size} className={`gap-2 ${className}`}>
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">
          {isArabic ? "الرئيسية" : "Home"}
        </span>
      </Button>
    </Link>
  );
}

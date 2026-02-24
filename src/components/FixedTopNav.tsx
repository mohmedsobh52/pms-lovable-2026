import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export function FixedTopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isArabic } = useLanguage();

  const isHomePage = location.pathname === "/" || location.pathname === "/dashboard";
  if (isHomePage) return null;

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div
      className={`fixed top-4 z-50 flex items-center gap-1 bg-background/80 backdrop-blur-md border border-border/60 rounded-full shadow-lg px-1 py-1 ${
        isArabic ? "right-4" : "left-4"
      }`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className="h-8 w-8 rounded-full hover:bg-primary/10"
        title={isArabic ? "رجوع" : "Back"}
      >
        {isArabic ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ArrowLeft className="h-4 w-4" />
        )}
      </Button>

      <div className="w-px h-5 bg-border/60" />

      <Button
        variant="ghost"
        size="icon"
        asChild
        className="h-8 w-8 rounded-full hover:bg-primary/10"
        title={isArabic ? "الرئيسية" : "Home"}
      >
        <Link to="/">
          <Home className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

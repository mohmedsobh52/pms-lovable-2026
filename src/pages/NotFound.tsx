import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Home, Search, FileText, FolderOpen, Settings, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const suggestedPages = [
  { href: "/", labelEn: "Home", labelAr: "الرئيسية", icon: Home },
  { href: "/projects", labelEn: "Projects", labelAr: "المشاريع", icon: FolderOpen },
  { href: "/contracts", labelEn: "Contracts", labelAr: "العقود", icon: FileText },
  { href: "/settings", labelEn: "Settings", labelAr: "الإعدادات", icon: Settings },
];

const NotFound = () => {
  const location = useLocation();
  const { isArabic } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="text-center max-w-md w-full space-y-6">
        {/* Animated icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center animate-pulse">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>

        <div>
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {isArabic ? "الصفحة غير موجودة" : "Page not found"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            {isArabic
              ? `المسار "${location.pathname}" غير متاح`
              : `The path "${location.pathname}" doesn't exist`}
          </p>
        </div>

        {/* Suggested pages */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {isArabic ? "صفحات مقترحة:" : "Suggested pages:"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {suggestedPages.map((page) => {
              const Icon = page.icon;
              return (
                <Link key={page.href} to={page.href}>
                  <Button variant="outline" className="w-full gap-2 justify-start">
                    <Icon className="w-4 h-4" />
                    {isArabic ? page.labelAr : page.labelEn}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>

        <Link to="/">
          <Button className="w-full gap-2 mt-4">
            <Home className="w-4 h-4" />
            {isArabic ? "العودة للرئيسية" : "Return to Home"}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

import { Calendar, Bell, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { ProjectCalendar } from "@/components/ProjectCalendar";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import { useMemo } from "react";

export default function CalendarPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const suggestions = useMemo((): SmartSuggestion[] => {
    if (!user) return [];
    return [
      { id: 'contracts', icon: <FileText className="h-4 w-4" />, text: isArabic ? 'أضف مواعيد العقود لعرضها في التقويم' : 'Add contract dates to display on calendar', action: () => navigate('/contracts'), actionLabel: isArabic ? 'العقود' : 'Contracts' },
      { id: 'alerts', icon: <Bell className="h-4 w-4" />, text: isArabic ? 'فعّل التنبيهات لتذكيرك بالمواعيد القادمة' : 'Enable alerts for upcoming deadlines', action: () => navigate('/settings'), actionLabel: isArabic ? 'الإعدادات' : 'Settings' },
    ];
  }, [user, isArabic, navigate]);

  return (
    <PageLayout>
      <PageHeader
        icon={Calendar}
        title={isArabic ? "التقويم" : "Calendar"}
        subtitle={isArabic ? "مواعيد المشاريع والعقود" : "Project & Contract Dates"}
      />

      {user ? (
        <>
          <SmartSuggestionsBanner suggestions={suggestions} />
          <ProjectCalendar />
        </>
      ) : (
        <Card className="max-w-md mx-auto border-dashed">
          <CardContent className="p-8 text-center space-y-4">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              {isArabic ? "يرجى تسجيل الدخول" : "Please Sign In"}
            </h3>
            <p className="text-muted-foreground">
              {isArabic 
                ? "سجل دخولك لعرض تقويم المشاريع والمواعيد"
                : "Sign in to view your project calendar and deadlines"
              }
            </p>
            <Link to="/auth">
              <Button>{isArabic ? "تسجيل الدخول" : "Sign In"}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}

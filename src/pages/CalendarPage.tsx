import { Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { ProjectCalendar } from "@/components/ProjectCalendar";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function CalendarPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <PageHeader
        icon={Calendar}
        title={isArabic ? "التقويم" : "Calendar"}
        subtitle={isArabic ? "مواعيد المشاريع والعقود" : "Project & Contract Dates"}
      />

      {user ? (
        <ProjectCalendar />
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

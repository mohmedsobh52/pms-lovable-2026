import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { AdminNotificationsBell } from "@/components/AdminNotificationsBell";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Users, FolderOpen, FileText, TrendingUp, 
  ShieldAlert, ArrowLeft, BarChart3, Clock, Shield
} from "lucide-react";
import { toast } from "sonner";

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  recentProjects: number;
  totalContracts: number;
  totalQuotations: number;
  totalTemplates: number;
  recentActivity: { date: string; count: number }[];
  latestProjects: { id: string; name: string; created_at: string; items_count: number }[];
}

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAdminStats();
  }, [user]);

  const fetchAdminStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-stats");
      if (error) throw error;
      if (data?.error === "not_authenticated") {
        toast.error(isArabic ? "الجلسة منتهية، يرجى تسجيل الدخول مرة أخرى" : "Session expired, please log in again");
        navigate("/auth");
        return;
      }
      if (data?.error === "unauthorized") {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      setStats(data);
    } catch (err: any) {
      console.error("Admin stats error:", err);
      toast.error(isArabic ? "خطأ في جلب الإحصائيات" : "Error fetching stats");
    } finally {
      setLoading(false);
    }
  };

  const [settingUpAdmin, setSettingUpAdmin] = useState(false);

  const handleSetupAdmin = async () => {
    try {
      setSettingUpAdmin(true);
      const { data, error } = await supabase.functions.invoke("setup-admin");
      if (error) throw error;
      if (data?.success) {
        toast.success(isArabic ? "تم تعيينك كمشرف رئيسي بنجاح!" : "You are now the system admin!");
        fetchAdminStats();
      } else if (data?.error === "admin_exists") {
        toast.info(isArabic ? "يوجد مشرف بالفعل في النظام" : "An admin already exists");
        fetchAdminStats();
      } else {
        toast.error(data?.error || "Error");
      }
    } catch (err) {
      console.error(err);
      toast.error(isArabic ? "خطأ في تعيين المشرف" : "Error setting up admin");
    } finally {
      setSettingUpAdmin(false);
    }
  };

  if (!loading && !authorized) {
    return (
      <div className="min-h-screen bg-background">
        <UnifiedHeader />
        <div className="container mx-auto px-4 py-20 text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {isArabic ? "غير مصرح" : "Unauthorized"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isArabic ? "ليس لديك صلاحية للوصول لهذه الصفحة. إذا كنت أول مستخدم، يمكنك تعيين نفسك كمشرف." : "You don't have permission. If you're the first user, you can set yourself as admin."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isArabic ? "العودة للرئيسية" : "Back to Home"}
            </Button>
            <Button onClick={handleSetupAdmin} disabled={settingUpAdmin} variant="default">
              <Shield className="w-4 h-4 mr-2" />
              {settingUpAdmin
                ? (isArabic ? "جاري التعيين..." : "Setting up...")
                : (isArabic ? "تعيين كمشرف أول" : "Set as First Admin")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statCards = stats ? [
    { label: isArabic ? "المستخدمين" : "Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { label: isArabic ? "المشاريع" : "Projects", value: stats.totalProjects, icon: FolderOpen, color: "text-emerald-500" },
    { label: isArabic ? "نشط (30 يوم)" : "Active (30d)", value: stats.recentProjects, icon: TrendingUp, color: "text-orange-500" },
    { label: isArabic ? "العقود" : "Contracts", value: stats.totalContracts, icon: FileText, color: "text-purple-500" },
    { label: isArabic ? "عروض الأسعار" : "Quotations", value: stats.totalQuotations, icon: BarChart3, color: "text-pink-500" },
    { label: isArabic ? "القوالب" : "Templates", value: stats.totalTemplates, icon: FileText, color: "text-teal-500" },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <PageHeader
            icon={ShieldAlert}
            title={isArabic ? "لوحة التحكم الإدارية" : "Admin Dashboard"}
            subtitle={isArabic ? "إحصائيات استخدام النظام" : "System usage statistics"}
          />
          <AdminNotificationsBell />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((card, i) => (
              <Card key={i} className="border-border/50 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                    <span className="text-xs text-muted-foreground">{card.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Button onClick={() => navigate("/admin/users")} variant="outline" className="gap-2">
            <Users className="w-4 h-4" />
            {isArabic ? "إدارة المستخدمين والصلاحيات" : "User & Role Management"}
          </Button>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-primary" />
              {isArabic ? "آخر المشاريع المنشأة" : "Latest Projects"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stats?.latestProjects && stats.latestProjects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>{isArabic ? "اسم المشروع" : "Project Name"}</th>
                      <th>{isArabic ? "عدد البنود" : "Items"}</th>
                      <th>{isArabic ? "تاريخ الإنشاء" : "Created"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.latestProjects.map((p) => (
                      <tr key={p.id}>
                        <td className="font-medium">{p.name}</td>
                        <td>{p.items_count}</td>
                        <td className="text-muted-foreground text-sm">
                          {new Date(p.created_at).toLocaleDateString(isArabic ? "ar-SA" : "en-US")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isArabic ? "لا توجد مشاريع" : "No projects found"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

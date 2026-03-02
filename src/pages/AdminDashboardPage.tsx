import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { AdminNotificationsBell } from "@/components/AdminNotificationsBell";
import { PageHeader } from "@/components/PageHeader";
import { PageTipsBox } from "@/components/PageTipsBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users, FolderOpen, FileText, TrendingUp,
  ShieldAlert, ArrowLeft, BarChart3, Clock, Shield, Send, CalendarClock, Loader2,
  Mail, ListOrdered
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  recentProjects: number;
  totalContracts: number;
  totalQuotations: number;
  totalTemplates: number;
  latestProjects: { id: string; name: string; created_at: string; items_count: number }[];
  dailyActivity?: { date: string; new_user: number; role_change: number; role_removed: number; total: number }[];
  activitySummary?: { new_user: number; role_change: number; role_removed: number; total: number };
}

const CHART_COLORS = ["#10b981", "#3b82f6", "#f97316"];

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [lastReportResult, setLastReportResult] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminExists, setAdminExists] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    fetchAdminStats();
  }, [user]);

  const fetchAdminStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-stats");
      if (error) throw error;
      if (data?.error === "not_authenticated") {
        toast.error(isArabic ? "الجلسة منتهية" : "Session expired");
        navigate("/auth"); return;
      }
      if (data?.error === "unauthorized") { 
        setAuthorized(false);
        // Check admin status for better UX
        checkAdminStatus();
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

  const checkAdminStatus = async () => {
    try {
      setCheckingAdmin(true);
      const { data } = await supabase.functions.invoke("setup-admin");
      if (data?.error === "admin_exists") {
        setAdminExists(true);
        setAdminEmail(data.admin_email || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingAdmin(false);
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
        toast.info(isArabic ? "يوجد مشرف بالفعل" : "An admin already exists");
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
        <div className="container mx-auto px-4 py-16 max-w-lg text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">{isArabic ? "غير مصرح" : "Unauthorized"}</h1>
          
          {adminExists ? (
            <div className="mt-6 space-y-4">
              <div className="bg-muted/50 rounded-lg p-5 text-start space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0 mt-0.5">1</div>
                  <p className="text-sm">{isArabic ? "هذه الصفحة مخصصة للمشرفين فقط." : "This page is for administrators only."}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0 mt-0.5">2</div>
                  <div className="text-sm">
                    <p>{isArabic ? "تواصل مع المشرف الحالي:" : "Contact the current admin:"}</p>
                    {adminEmail && (
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-primary">{adminEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0 mt-0.5">3</div>
                  <p className="text-sm">{isArabic ? "اطلب منه منحك صلاحية من صفحة إدارة الصلاحيات." : "Ask them to grant you access from the User Management page."}</p>
                </div>
              </div>
              <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                {isArabic ? "العودة للرئيسية" : "Back to Home"}
              </Button>
            </div>
          ) : checkingAdmin ? (
            <div className="mt-6">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <p className="text-muted-foreground">
                {isArabic ? "لا يوجد مشرف في النظام بعد. يمكنك تعيين نفسك كمشرف أول." : "No admin exists yet. You can set yourself as the first admin."}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => navigate("/")} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {isArabic ? "العودة للرئيسية" : "Back to Home"}
                </Button>
                <Button onClick={handleSetupAdmin} disabled={settingUpAdmin}>
                  <Shield className="w-4 h-4 mr-2" />
                  {settingUpAdmin ? (isArabic ? "جاري التعيين..." : "Setting up...") : (isArabic ? "تعيين كمشرف أول" : "Set as First Admin")}
                </Button>
              </div>
            </div>
          )}
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

  const pieData = stats?.activitySummary ? [
    { name: isArabic ? "تسجيل جديد" : "New Users", value: stats.activitySummary.new_user },
    { name: isArabic ? "تغيير صلاحية" : "Role Changes", value: stats.activitySummary.role_change },
    { name: isArabic ? "إزالة صلاحية" : "Role Removed", value: stats.activitySummary.role_removed },
  ].filter(d => d.value > 0) : [];

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

        <PageTipsBox />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16" /></CardContent>
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
        <div className="mb-8 flex items-center gap-3 flex-wrap">
          <Button onClick={() => navigate("/admin/users")} variant="outline" className="gap-2">
            <Users className="w-4 h-4" />
            {isArabic ? "إدارة المستخدمين والصلاحيات" : "User & Role Management"}
          </Button>
          <Button onClick={() => navigate("/admin/activity")} variant="outline" className="gap-2">
            <Clock className="w-4 h-4" />
            {isArabic ? "سجل النشاطات" : "Activity Log"}
          </Button>
        </div>

        {/* Charts Section */}
        {!loading && stats?.dailyActivity && stats.dailyActivity.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Area Chart */}
            <Card className="border-border/50 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  {isArabic ? "النشاط اليومي (آخر 30 يوم)" : "Daily Activity (Last 30 Days)"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(l) => new Date(l).toLocaleDateString(isArabic ? "ar-SA" : "en-US")}
                    />
                    <Area type="monotone" dataKey="new_user" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.4} name={isArabic ? "مستخدم جديد" : "New User"} />
                    <Area type="monotone" dataKey="role_change" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} name={isArabic ? "تغيير صلاحية" : "Role Change"} />
                    <Area type="monotone" dataKey="role_removed" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.4} name={isArabic ? "إزالة صلاحية" : "Role Removed"} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  {isArabic ? "توزيع النشاطات" : "Activity Distribution"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">{isArabic ? "لا توجد بيانات" : "No data"}</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scheduled Reports */}
        <Card className="border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="w-5 h-5 text-primary" />
              {isArabic ? "التقارير المجدولة" : "Scheduled Reports"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm text-muted-foreground mb-1">
                  {isArabic ? "تقرير أسبوعي يُرسل تلقائياً كل أحد الساعة 8 صباحاً للمشرفين" : "Weekly report auto-sent every Sunday at 8 AM to all admins"}
                </p>
                {lastReportResult && (
                  <p className="text-xs text-emerald-600">{lastReportResult}</p>
                )}
              </div>
              <Button
                onClick={async () => {
                  setSendingReport(true);
                  setLastReportResult(null);
                  try {
                    const { data, error } = await supabase.functions.invoke("send-admin-weekly-report");
                    if (error) throw error;
                    if (data?.success) {
                      const msg = isArabic
                        ? `✅ تم إرسال التقرير إلى ${data.recipients} مشرف`
                        : `✅ Report sent to ${data.recipients} admin(s)`;
                      toast.success(msg);
                      setLastReportResult(msg);
                    } else {
                      toast.error(data?.error || "Failed");
                    }
                  } catch (err: any) {
                    toast.error(err.message || "Error");
                  } finally {
                    setSendingReport(false);
                  }
                }}
                disabled={sendingReport}
                className="gap-2"
              >
                {sendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isArabic ? "إرسال تقرير الآن" : "Send Report Now"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Latest Projects */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-primary" />
              {isArabic ? "آخر المشاريع المنشأة" : "Latest Projects"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
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
                        <td className="text-muted-foreground text-sm">{new Date(p.created_at).toLocaleDateString(isArabic ? "ar-SA" : "en-US")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">{isArabic ? "لا توجد مشاريع" : "No projects found"}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

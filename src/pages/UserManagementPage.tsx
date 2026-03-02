import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { AdminNotificationsBell } from "@/components/AdminNotificationsBell";
import { PageHeader } from "@/components/PageHeader";
import { PageTipsBox } from "@/components/PageTipsBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, ShieldAlert, ArrowLeft, Shield, UserCheck, Search, RefreshCw, Mail, Loader2,
  Lightbulb, UserPlus, ShieldCheck, Share2, ArrowRight, UsersRound,
} from "lucide-react";
import { toast } from "sonner";

interface UserRecord {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: string;
  has_role_record: boolean;
}

interface UserStats {
  total: number;
  admins: number;
  moderators: number;
  regular: number;
}

const UserManagementPage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminExists, setAdminExists] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ userId: string; email: string; newRole: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("manage-users", { body: { action: "list_users" } });
      if (error) throw error;
      if (data?.error === "not_authenticated") {
        toast.error(isArabic ? "الجلسة منتهية، يرجى تسجيل الدخول مرة أخرى" : "Session expired, please log in again");
        navigate("/auth");
        return;
      }
      if (data?.error === "unauthorized") {
        setAuthorized(false);
        checkAdminStatus();
        return;
      }
      setAuthorized(true);
      setUsers(data.users || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error("Fetch users error:", err);
      toast.error(isArabic ? "خطأ في جلب المستخدمين" : "Error fetching users");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

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

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    fetchUsers();
  }, [user, fetchUsers, navigate]);

  const handleRoleChange = (userId: string, email: string, newRole: string) => {
    if (userId === user?.id && newRole !== "admin") {
      toast.error(isArabic ? "لا يمكنك تغيير دورك الخاص" : "Cannot change your own role");
      return;
    }
    setPendingAction({ userId, email, newRole });
    setConfirmOpen(true);
  };

  const confirmRoleChange = async () => {
    if (!pendingAction) return;
    try {
      const { error } = await supabase.functions.invoke("manage-users", {
        method: "POST",
        body: { action: "set_role", user_id: pendingAction.userId, role: pendingAction.newRole },
      });
      if (error) throw error;
      toast.success(isArabic ? "تم تحديث الدور بنجاح" : "Role updated successfully");
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(isArabic ? "خطأ في تحديث الدور" : "Error updating role");
    } finally {
      setConfirmOpen(false);
      setPendingAction(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (searchQuery) {
      return u.email.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const getRoleBadge = (role: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      admin: { label: isArabic ? "مشرف" : "Admin", variant: "destructive" },
      moderator: { label: isArabic ? "مشرف مساعد" : "Moderator", variant: "default" },
      user: { label: isArabic ? "مستخدم" : "User", variant: "secondary" },
    };
    const c = config[role] || config.user;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const [settingUpAdmin, setSettingUpAdmin] = useState(false);

  const handleSetupAdmin = async () => {
    try {
      setSettingUpAdmin(true);
      const { data, error } = await supabase.functions.invoke("setup-admin");
      if (error) throw error;
      if (data?.success) {
        toast.success(isArabic ? "تم تعيينك كمشرف رئيسي بنجاح!" : "You are now the system admin!");
        fetchUsers();
      } else if (data?.error === "admin_exists") {
        toast.info(isArabic ? "يوجد مشرف بالفعل في النظام" : "An admin already exists");
        fetchUsers();
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

  // Unauthorized view
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

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <PageHeader
            icon={Users}
            title={isArabic ? "إدارة المستخدمين والصلاحيات" : "User & Role Management"}
            subtitle={isArabic ? "إدارة أدوار وصلاحيات المستخدمين" : "Manage user roles and permissions"}
          />
          <AdminNotificationsBell />
        </div>

        <PageTipsBox />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>
            ))
          ) : stats ? (
            <>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">{isArabic ? "الإجمالي" : "Total"}</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-muted-foreground">{isArabic ? "مشرفون" : "Admins"}</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.admins}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-muted-foreground">{isArabic ? "مشرفون مساعدون" : "Moderators"}</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.moderators}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">{isArabic ? "مستخدمون" : "Users"}</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.regular}</p>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* Smart Suggestions */}
        {stats && (() => {
          const suggestions: { icon: any; textAr: string; textEn: string; color: string; bg: string; action: () => void }[] = [];
          if (stats.moderators === 0) suggestions.push({
            icon: ShieldCheck, textAr: "عيّن مشرفين مساعدين لتوزيع المهام", textEn: "Assign moderators to distribute tasks", color: "text-orange-500", bg: "bg-orange-500/10", action: () => {}
          });
          if (stats.regular === 0 && stats.total > 0) suggestions.push({
            icon: UserPlus, textAr: "ادعُ مستخدمين جدد للانضمام للنظام", textEn: "Invite new users to join the system", color: "text-blue-500", bg: "bg-blue-500/10", action: () => {}
          });
          if (stats.total <= 1) suggestions.push({
            icon: Share2, textAr: "شارك رابط التسجيل مع فريقك لتوسيع النظام", textEn: "Share signup link with your team", color: "text-emerald-500", bg: "bg-emerald-500/10", action: () => { navigator.clipboard.writeText(window.location.origin + "/auth"); toast.success(isArabic ? "تم نسخ رابط التسجيل" : "Signup link copied"); }
          });
          if (stats.admins > 1) suggestions.push({
            icon: Shield, textAr: "تأكد من مراجعة صلاحيات المشرفين بانتظام", textEn: "Review admin privileges regularly", color: "text-red-500", bg: "bg-red-500/10", action: () => {}
          });
          if (stats.total > 5 && stats.moderators === 0) suggestions.push({
            icon: UsersRound, textAr: "مع تزايد المستخدمين، خصص مشرفين مساعدين", textEn: "With growing users, assign moderators", color: "text-purple-500", bg: "bg-purple-500/10", action: () => {}
          });

          if (suggestions.length === 0) return null;

          return (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  {isArabic ? "اقتراحات وتوصيات" : "Suggestions & Recommendations"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background/80 border border-border/50 hover:shadow-sm transition-shadow">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${s.bg} shrink-0`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <p className="flex-1 text-sm font-medium">{isArabic ? s.textAr : s.textEn}</p>
                    <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={s.action}>
                      {isArabic ? "تنفيذ" : "Action"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })()}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isArabic ? "بحث بالبريد الإلكتروني..." : "Search by email..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "جميع الأدوار" : "All Roles"}</SelectItem>
              <SelectItem value="admin">{isArabic ? "مشرف" : "Admin"}</SelectItem>
              <SelectItem value="moderator">{isArabic ? "مشرف مساعد" : "Moderator"}</SelectItem>
              <SelectItem value="user">{isArabic ? "مستخدم" : "User"}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Users Table */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {isArabic ? `المستخدمون (${filteredUsers.length})` : `Users (${filteredUsers.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {isArabic ? "لا يوجد مستخدمون" : "No users found"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-start p-3 font-medium text-muted-foreground">{isArabic ? "البريد الإلكتروني" : "Email"}</th>
                      <th className="text-start p-3 font-medium text-muted-foreground">{isArabic ? "الدور" : "Role"}</th>
                      <th className="text-start p-3 font-medium text-muted-foreground">{isArabic ? "تاريخ الانضمام" : "Joined"}</th>
                      <th className="text-start p-3 font-medium text-muted-foreground">{isArabic ? "آخر دخول" : "Last Sign In"}</th>
                      <th className="text-start p-3 font-medium text-muted-foreground">{isArabic ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{u.email}</td>
                        <td className="p-3">{getRoleBadge(u.role)}</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString(isArabic ? "ar-SA" : "en-US")}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {u.last_sign_in_at
                            ? new Date(u.last_sign_in_at).toLocaleDateString(isArabic ? "ar-SA" : "en-US")
                            : (isArabic ? "لم يسجل دخول" : "Never")}
                        </td>
                        <td className="p-3">
                          <Select
                            value={u.role}
                            onValueChange={(val) => handleRoleChange(u.id, u.email, val)}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">{isArabic ? "مشرف" : "Admin"}</SelectItem>
                              <SelectItem value="moderator">{isArabic ? "مشرف مساعد" : "Moderator"}</SelectItem>
                              <SelectItem value="user">{isArabic ? "مستخدم" : "User"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirm Dialog */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{isArabic ? "تأكيد تغيير الدور" : "Confirm Role Change"}</AlertDialogTitle>
              <AlertDialogDescription>
                {isArabic
                  ? `هل تريد تغيير دور "${pendingAction?.email}" إلى "${pendingAction?.newRole === "admin" ? "مشرف" : pendingAction?.newRole === "moderator" ? "مشرف مساعد" : "مستخدم"}"؟`
                  : `Change role of "${pendingAction?.email}" to "${pendingAction?.newRole}"?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRoleChange}>
                {isArabic ? "تأكيد" : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default UserManagementPage;

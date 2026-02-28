import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { AdminNotificationsBell } from "@/components/AdminNotificationsBell";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity, UserPlus, ShieldCheck, ShieldOff, ArrowLeft,
  ChevronLeft, ChevronRight, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface ActivityEntry {
  id: string;
  actor_id: string;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_META: Record<string, { icon: typeof Activity; label_ar: string; label_en: string; color: string }> = {
  new_user: { icon: UserPlus, label_ar: "تسجيل مستخدم جديد", label_en: "New user registered", color: "bg-emerald-500/10 text-emerald-600" },
  role_change: { icon: ShieldCheck, label_ar: "تغيير صلاحية", label_en: "Role changed", color: "bg-blue-500/10 text-blue-600" },
  role_removed: { icon: ShieldOff, label_ar: "إزالة صلاحية", label_en: "Role removed", color: "bg-orange-500/10 text-orange-600" },
};

const PAGE_SIZE = 20;

const ActivityLogPage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("admin_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

      if (filter !== "all") {
        query = query.eq("action", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEntries((data as ActivityEntry[]) || []);
      setHasMore((data?.length || 0) > PAGE_SIZE);
    } catch (err: any) {
      console.error(err);
      toast.error(isArabic ? "خطأ في جلب السجل" : "Error fetching logs");
    } finally {
      setLoading(false);
    }
  }, [user, filter, page, isArabic]);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    fetchLogs();
  }, [user, fetchLogs]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("activity-log-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "admin_activity_log",
      }, (payload) => {
        if (page === 0) {
          setEntries((prev) => [payload.new as ActivityEntry, ...prev.slice(0, PAGE_SIZE - 1)]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, page]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(isArabic ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getActionMeta = (action: string) =>
    ACTION_META[action] || { icon: Activity, label_ar: action, label_en: action, color: "bg-muted text-muted-foreground" };

  const getDetails = (entry: ActivityEntry) => {
    if (entry.action === "new_user") {
      return entry.details?.email || entry.target_id || "";
    }
    if (entry.action === "role_change") {
      return `${entry.details?.target_email || entry.target_id} → ${entry.details?.new_role || ""}`;
    }
    if (entry.action === "role_removed") {
      return entry.details?.target_email || entry.target_id || "";
    }
    return JSON.stringify(entry.details || {});
  };

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <PageHeader
              icon={Activity}
              title={isArabic ? "سجل النشاطات" : "Activity Log"}
              subtitle={isArabic ? "تتبع جميع العمليات الإدارية" : "Track all admin operations"}
            />
          </div>
          <div className="flex items-center gap-2">
            <AdminNotificationsBell />
            <Button variant="outline" size="icon" onClick={fetchLogs}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={isArabic ? "كل الإجراءات" : "All actions"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل الإجراءات" : "All actions"}</SelectItem>
              <SelectItem value="new_user">{isArabic ? "تسجيل جديد" : "New registration"}</SelectItem>
              <SelectItem value="role_change">{isArabic ? "تغيير صلاحية" : "Role change"}</SelectItem>
              <SelectItem value="role_removed">{isArabic ? "إزالة صلاحية" : "Role removed"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {isArabic ? "سجل العمليات" : "Operations Log"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : entries.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                {isArabic ? "لا توجد عمليات مسجلة" : "No activity records"}
              </p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => {
                  const meta = getActionMeta(entry.action);
                  const Icon = meta.icon;
                  return (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className={`p-2 rounded-full ${meta.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {isArabic ? meta.label_ar : meta.label_en}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {entry.actor_email && entry.actor_email !== "system"
                              ? entry.actor_email
                              : (isArabic ? "النظام" : "System")}
                          </span>
                        </div>
                        <p className="text-sm mt-1 text-foreground/80 truncate">
                          {getDetails(entry)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(entry.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {!loading && (entries.length > 0 || page > 0) && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronRight className="w-4 h-4" />
                  {isArabic ? "السابق" : "Previous"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {isArabic ? `صفحة ${page + 1}` : `Page ${page + 1}`}
                </span>
                <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
                  {isArabic ? "التالي" : "Next"}
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityLogPage;

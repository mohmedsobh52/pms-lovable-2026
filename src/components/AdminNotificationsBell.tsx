import { useState, useEffect, useCallback } from "react";
import { Bell, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export const AdminNotificationsBell = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { isSupported, isEnabled, requestPermission, showNotification } = usePushNotifications();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    setPushEnabled(isEnabled);
  }, [isEnabled]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("admin_notifications")
      .select("*")
      .eq("admin_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data as unknown as AdminNotification[]);
      setUnreadCount((data as unknown as AdminNotification[]).filter((n) => !n.read).length);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("admin-notifs-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
          filter: `admin_user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as unknown as AdminNotification;
          setNotifications((prev) => [n, ...prev].slice(0, 20));
          setUnreadCount((c) => c + 1);
          toast.info(n.title, { description: n.message });

          // Browser push notification
          if (pushEnabled) {
            showNotification({
              title: n.title,
              body: n.message,
              tag: `admin-${n.type}`,
              data: n.metadata,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, pushEnabled, showNotification]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("admin_notifications")
      .update({ read: true })
      .eq("admin_user_id", user.id)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleTogglePush = async () => {
    if (!pushEnabled) {
      const granted = await requestPermission();
      setPushEnabled(granted);
    } else {
      setPushEnabled(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return isArabic ? "الآن" : "Just now";
    if (diff < 60) return isArabic ? `منذ ${diff} دقيقة` : `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return isArabic ? `منذ ${hours} ساعة` : `${hours}h ago`;
    return d.toLocaleDateString(isArabic ? "ar-SA" : "en-US");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm">
            {isArabic ? "الإشعارات" : "Notifications"}
          </h4>
          <div className="flex items-center gap-2">
            {isSupported && (
              <div className="flex items-center gap-1.5" title={isArabic ? "إشعارات المتصفح" : "Browser Notifications"}>
                <BellRing className="w-3.5 h-3.5 text-muted-foreground" />
                <Switch checked={pushEnabled} onCheckedChange={handleTogglePush} className="scale-75" />
              </div>
            )}
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                {isArabic ? "تحديد الكل كمقروء" : "Mark all read"}
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              {isArabic ? "لا توجد إشعارات" : "No notifications"}
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 border-b border-border/50 text-sm ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{n.message}</p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {formatTime(n.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

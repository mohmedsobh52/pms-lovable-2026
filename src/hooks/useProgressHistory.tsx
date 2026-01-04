import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ProgressRecord {
  id: string;
  project_id: string | null;
  record_date: string;
  actual_progress: number;
  actual_spent_percentage: number;
  actual_cost: number;
  planned_progress: number;
  spi: number | null;
  cpi: number | null;
  notes: string | null;
  created_at: string;
}

interface SaveProgressParams {
  projectId?: string;
  actualProgress: number;
  actualSpentPercentage: number;
  actualCost: number;
  plannedProgress: number;
  spi?: number;
  cpi?: number;
  notes?: string;
  recordDate?: Date;
}

interface EVMAlertSettings {
  notifications_enabled: boolean;
  email: string;
  spi_warning_threshold: number;
  spi_critical_threshold: number;
  cpi_warning_threshold: number;
  cpi_critical_threshold: number;
  vac_warning_percentage: number;
  vac_critical_percentage: number;
}

export function useProgressHistory(projectId?: string) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [history, setHistory] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch progress history
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("project_progress_history")
        .select("*")
        .eq("user_id", user.id)
        .order("record_date", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error("Error fetching progress history:", error);
      toast({
        title: "Error",
        description: "Failed to load progress history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, projectId, toast]);

  // Check EVM thresholds and send alert
  const checkEVMThresholdsAndAlert = useCallback(async (
    spi: number | undefined,
    cpi: number | undefined,
    projectName?: string
  ) => {
    if (!user || (!spi && !cpi)) return;

    try {
      // Fetch user's EVM alert settings
      const { data: settings, error: settingsError } = await supabase
        .from("evm_alert_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error("Error fetching alert settings:", settingsError);
        return;
      }

      if (!settings || !settings.notifications_enabled) {
        return; // Notifications disabled or no settings
      }

      const alertSettings = settings as EVMAlertSettings;

      // Determine alert level
      let alertLevel: 'warning' | 'critical' | null = null;
      const violations: string[] = [];

      if (spi !== undefined) {
        if (spi < alertSettings.spi_critical_threshold) {
          alertLevel = 'critical';
          violations.push(`SPI (${spi.toFixed(2)}) below critical threshold (${alertSettings.spi_critical_threshold})`);
        } else if (spi < alertSettings.spi_warning_threshold) {
          alertLevel = alertLevel === 'critical' ? 'critical' : 'warning';
          violations.push(`SPI (${spi.toFixed(2)}) below warning threshold (${alertSettings.spi_warning_threshold})`);
        }
      }

      if (cpi !== undefined) {
        if (cpi < alertSettings.cpi_critical_threshold) {
          alertLevel = 'critical';
          violations.push(`CPI (${cpi.toFixed(2)}) below critical threshold (${alertSettings.cpi_critical_threshold})`);
        } else if (cpi < alertSettings.cpi_warning_threshold) {
          alertLevel = alertLevel === 'critical' ? 'critical' : 'warning';
          violations.push(`CPI (${cpi.toFixed(2)}) below warning threshold (${alertSettings.cpi_warning_threshold})`);
        }
      }

      if (alertLevel && violations.length > 0) {
        // Send alert via edge function
        const { error: alertError } = await supabase.functions.invoke('send-evm-alert', {
          body: {
            email: alertSettings.email,
            alertLevel,
            projectName: projectName || 'Unknown Project',
            spi,
            cpi,
            thresholds: {
              spiWarning: alertSettings.spi_warning_threshold,
              spiCritical: alertSettings.spi_critical_threshold,
              cpiWarning: alertSettings.cpi_warning_threshold,
              cpiCritical: alertSettings.cpi_critical_threshold,
            },
            violations,
          },
        });

        if (alertError) {
          console.error("Error sending EVM alert:", alertError);
        } else {
          toast({
            title: alertLevel === 'critical' ? "تنبيه حرج" : "تحذير",
            description: `تم إرسال تنبيه EVM إلى ${alertSettings.email}`,
            variant: alertLevel === 'critical' ? "destructive" : "default",
          });
        }
      }
    } catch (error) {
      console.error("Error checking EVM thresholds:", error);
    }
  }, [user, toast]);

  // Save progress record
  const saveProgress = useCallback(async (params: SaveProgressParams, projectName?: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save progress",
        variant: "destructive",
      });
      return null;
    }

    setSaving(true);
    try {
      const recordDate = params.recordDate || new Date();
      const dateStr = recordDate.toISOString().split('T')[0];

      // Upsert - insert or update if same date exists
      const { data, error } = await supabase
        .from("project_progress_history")
        .upsert({
          user_id: user.id,
          project_id: params.projectId || projectId || null,
          record_date: dateStr,
          actual_progress: params.actualProgress,
          actual_spent_percentage: params.actualSpentPercentage,
          actual_cost: params.actualCost,
          planned_progress: params.plannedProgress,
          spi: params.spi || null,
          cpi: params.cpi || null,
          notes: params.notes || null,
        }, {
          onConflict: 'project_id,record_date',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم حفظ التقدم بنجاح",
      });

      // Check EVM thresholds and send alert if needed
      await checkEVMThresholdsAndAlert(params.spi, params.cpi, projectName);

      // Refresh history
      fetchHistory();
      return data;
    } catch (error: any) {
      console.error("Error saving progress:", error);
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
      return null;
    } finally {
      setSaving(false);
    }
  }, [user, projectId, toast, fetchHistory, checkEVMThresholdsAndAlert]);

  // Delete a progress record
  const deleteRecord = useCallback(async (recordId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("project_progress_history")
        .delete()
        .eq("id", recordId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف السجل بنجاح",
      });

      fetchHistory();
      return true;
    } catch (error: any) {
      console.error("Error deleting record:", error);
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast, fetchHistory]);

  // Get latest progress for a project
  const getLatestProgress = useCallback(() => {
    if (history.length === 0) return null;
    return history[0];
  }, [history]);

  // Load history on mount
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, fetchHistory]);

  return {
    history,
    loading,
    saving,
    saveProgress,
    deleteRecord,
    fetchHistory,
    getLatestProgress,
  };
}

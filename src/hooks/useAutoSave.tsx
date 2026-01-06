import { useEffect, useRef, useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

const AUTO_SAVE_KEY = "boq_auto_save_data";
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export interface AutoSaveData {
  analysisData: any;
  wbsData?: any;
  fileName?: string;
  itemCosts?: Record<string, any>;
  lastSaved: string;
}

export function useAutoSave(
  analysisData: any,
  wbsData?: any,
  fileName?: string,
  itemCosts?: Record<string, any>
) {
  const { toast } = useToast();
  const { isArabic } = useLanguage();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const previousDataRef = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if data has changed
  const checkForChanges = useCallback(() => {
    const currentData = JSON.stringify({ analysisData, wbsData, itemCosts });
    if (currentData !== previousDataRef.current) {
      setHasUnsavedChanges(true);
      return true;
    }
    return false;
  }, [analysisData, wbsData, itemCosts]);

  // Save data to localStorage
  const saveData = useCallback(() => {
    if (!analysisData) return;

    try {
      const saveData: AutoSaveData = {
        analysisData,
        wbsData,
        fileName,
        itemCosts,
        lastSaved: new Date().toISOString(),
      };

      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(saveData));
      previousDataRef.current = JSON.stringify({ analysisData, wbsData, itemCosts });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // Show subtle notification
      toast({
        title: isArabic ? "تم الحفظ تلقائياً" : "Auto-saved",
        description: isArabic 
          ? `تم حفظ التغييرات في ${new Date().toLocaleTimeString("ar-EG")}`
          : `Changes saved at ${new Date().toLocaleTimeString()}`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Auto-save error:", error);
    }
  }, [analysisData, wbsData, fileName, itemCosts, toast, isArabic]);

  // Load saved data
  const loadSavedData = useCallback((): AutoSaveData | null => {
    try {
      const stored = localStorage.getItem(AUTO_SAVE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error loading auto-saved data:", error);
    }
    return null;
  }, []);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    setHasUnsavedChanges(false);
  }, []);

  // Manual save trigger
  const triggerSave = useCallback(() => {
    if (checkForChanges()) {
      saveData();
    }
  }, [checkForChanges, saveData]);

  // Auto-save on interval
  useEffect(() => {
    if (!analysisData) return;

    saveTimeoutRef.current = setInterval(() => {
      if (checkForChanges()) {
        saveData();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (saveTimeoutRef.current) {
        clearInterval(saveTimeoutRef.current);
      }
    };
  }, [analysisData, checkForChanges, saveData]);

  // Save on component unmount
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges) {
        saveData();
      }
    };
  }, [hasUnsavedChanges, saveData]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        saveData();
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, saveData]);

  return {
    lastSaved,
    hasUnsavedChanges,
    triggerSave,
    loadSavedData,
    clearSavedData,
  };
}

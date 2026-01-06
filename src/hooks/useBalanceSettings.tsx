import { useState, useEffect, useCallback } from "react";

const BALANCE_SETTINGS_KEY = "boq_balance_settings";

export interface BalanceSettings {
  balancedThreshold: number; // Default 5%
  slightThreshold: number;   // Default 15%
  showAlerts: boolean;
  alertOnHighVariance: boolean;
  highVarianceThreshold: number; // Default 20%
}

const DEFAULT_SETTINGS: BalanceSettings = {
  balancedThreshold: 5,
  slightThreshold: 15,
  showAlerts: true,
  alertOnHighVariance: true,
  highVarianceThreshold: 20,
};

export function useBalanceSettings() {
  const [settings, setSettings] = useState<BalanceSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BALANCE_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error("Error loading balance settings:", error);
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<BalanceSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(BALANCE_SETTINGS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Error saving balance settings:", error);
      }
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(BALANCE_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}

// Export function to get settings for use in utility functions
export function getBalanceSettings(): BalanceSettings {
  try {
    const stored = localStorage.getItem(BALANCE_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error loading balance settings:", error);
  }
  return DEFAULT_SETTINGS;
}

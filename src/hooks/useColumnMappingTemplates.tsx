import { useState, useEffect, useCallback } from 'react';

export interface ColumnMappingTemplate {
  id: string;
  name: string;
  mapping: Record<string, number>;
  headerRowIndex: number;
  createdAt: string;
  usageCount: number;
}

const STORAGE_KEY = 'excel_column_mapping_templates';
const MAX_TEMPLATES = 20;

export function useColumnMappingTemplates() {
  const [templates, setTemplates] = useState<ColumnMappingTemplate[]>([]);

  // Load templates from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTemplates(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Failed to load column mapping templates:', error);
      setTemplates([]);
    }
  }, []);

  // Save templates to localStorage
  const saveToStorage = useCallback((newTemplates: ColumnMappingTemplate[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
    } catch (error) {
      console.error('Failed to save column mapping templates:', error);
    }
  }, []);

  // Add a new template
  const addTemplate = useCallback((
    name: string,
    mapping: Record<string, number>,
    headerRowIndex: number
  ): ColumnMappingTemplate => {
    const newTemplate: ColumnMappingTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name,
      mapping,
      headerRowIndex,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    setTemplates(prev => {
      // Remove oldest if exceeding limit
      let updated = [...prev, newTemplate];
      if (updated.length > MAX_TEMPLATES) {
        updated = updated.slice(-MAX_TEMPLATES);
      }
      saveToStorage(updated);
      return updated;
    });

    return newTemplate;
  }, [saveToStorage]);

  // Delete a template
  const deleteTemplate = useCallback((templateId: string) => {
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== templateId);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // Update template usage count
  const incrementUsage = useCallback((templateId: string) => {
    setTemplates(prev => {
      const updated = prev.map(t => 
        t.id === templateId 
          ? { ...t, usageCount: t.usageCount + 1 }
          : t
      );
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // Find best matching template based on header similarity
  const findMatchingTemplate = useCallback((
    headers: string[]
  ): ColumnMappingTemplate | null => {
    if (templates.length === 0 || headers.length === 0) return null;

    // For now, return the most recently used template
    // In future, could implement header matching logic
    const sorted = [...templates].sort((a, b) => b.usageCount - a.usageCount);
    return sorted[0] || null;
  }, [templates]);

  // Export templates as JSON
  const exportTemplates = useCallback((): string => {
    return JSON.stringify(templates, null, 2);
  }, [templates]);

  // Import templates from JSON
  const importTemplates = useCallback((jsonString: string): boolean => {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) return false;
      
      // Validate and merge
      const validTemplates = imported.filter(t => 
        t.id && t.name && t.mapping && typeof t.headerRowIndex === 'number'
      );
      
      setTemplates(prev => {
        const merged = [...prev];
        validTemplates.forEach(newT => {
          if (!merged.find(t => t.id === newT.id)) {
            merged.push(newT);
          }
        });
        const final = merged.slice(-MAX_TEMPLATES);
        saveToStorage(final);
        return final;
      });
      
      return true;
    } catch (error) {
      console.error('Failed to import templates:', error);
      return false;
    }
  }, [saveToStorage]);

  return {
    templates,
    addTemplate,
    deleteTemplate,
    incrementUsage,
    findMatchingTemplate,
    exportTemplates,
    importTemplates,
  };
}

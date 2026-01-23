import { useState, useEffect, useCallback } from 'react';

export interface ColumnMappingTemplate {
  id: string;
  name: string;
  mapping: Record<string, number>;
  headerRowIndex: number;
  createdAt: string;
  usageCount: number;
  // Store header signatures for smart matching
  headerSignature?: string[];
}

const STORAGE_KEY = 'excel_column_mapping_templates';
const MAX_TEMPLATES = 20;

// Normalize header text for matching
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic diacritics
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');
}

// Calculate similarity score between two header arrays
function calculateHeaderSimilarity(headers1: string[], headers2: string[]): number {
  if (!headers1.length || !headers2.length) return 0;
  
  const normalized1 = headers1.map(normalizeHeader);
  const normalized2 = headers2.map(normalizeHeader);
  
  let matches = 0;
  for (const h1 of normalized1) {
    if (!h1) continue;
    for (const h2 of normalized2) {
      if (!h2) continue;
      // Exact match or substring match
      if (h1 === h2 || h1.includes(h2) || h2.includes(h1)) {
        matches++;
        break;
      }
    }
  }
  
  // Score based on match ratio
  const maxLen = Math.max(headers1.length, headers2.length);
  return (matches / maxLen) * 100;
}

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
    headerRowIndex: number,
    headerSignature?: string[]
  ): ColumnMappingTemplate => {
    const newTemplate: ColumnMappingTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name,
      mapping,
      headerRowIndex,
      headerSignature,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    setTemplates(prev => {
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
  ): { template: ColumnMappingTemplate; score: number } | null => {
    if (templates.length === 0 || headers.length === 0) return null;

    let bestMatch: { template: ColumnMappingTemplate; score: number } | null = null;

    for (const template of templates) {
      if (!template.headerSignature || template.headerSignature.length === 0) continue;
      
      const score = calculateHeaderSimilarity(headers, template.headerSignature);
      
      if (score > 50 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { template, score };
      }
    }

    // If no header-based match, return most used template with lower confidence
    if (!bestMatch && templates.length > 0) {
      const sorted = [...templates].sort((a, b) => b.usageCount - a.usageCount);
      if (sorted[0].usageCount > 0) {
        return { template: sorted[0], score: 20 }; // Low confidence score
      }
    }

    return bestMatch;
  }, [templates]);

  // Export templates as JSON string
  const exportTemplates = useCallback((): string => {
    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      templates: templates.map(t => ({
        name: t.name,
        mapping: t.mapping,
        headerRowIndex: t.headerRowIndex,
        headerSignature: t.headerSignature,
      })),
    }, null, 2);
  }, [templates]);

  // Export templates as downloadable file
  const downloadTemplatesFile = useCallback(() => {
    const jsonString = exportTemplates();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `column_mapping_templates_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportTemplates]);

  // Import templates from JSON string
  const importTemplates = useCallback((jsonString: string): { success: boolean; count: number; error?: string } => {
    try {
      const data = JSON.parse(jsonString);
      
      // Handle both old format (array) and new format (object with templates)
      const importedTemplates = Array.isArray(data) 
        ? data 
        : (data.templates || []);
      
      if (!Array.isArray(importedTemplates)) {
        return { success: false, count: 0, error: 'Invalid format' };
      }
      
      // Validate and transform
      const validTemplates: ColumnMappingTemplate[] = importedTemplates
        .filter(t => t.name && t.mapping && typeof t.headerRowIndex === 'number')
        .map(t => ({
          id: `template_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: t.name,
          mapping: t.mapping,
          headerRowIndex: t.headerRowIndex,
          headerSignature: t.headerSignature || [],
          createdAt: new Date().toISOString(),
          usageCount: 0,
        }));
      
      if (validTemplates.length === 0) {
        return { success: false, count: 0, error: 'No valid templates found' };
      }
      
      setTemplates(prev => {
        // Merge, avoiding duplicates by name
        const merged = [...prev];
        for (const newT of validTemplates) {
          if (!merged.find(t => t.name === newT.name)) {
            merged.push(newT);
          }
        }
        const final = merged.slice(-MAX_TEMPLATES);
        saveToStorage(final);
        return final;
      });
      
      return { success: true, count: validTemplates.length };
    } catch (error) {
      console.error('Failed to import templates:', error);
      return { success: false, count: 0, error: 'Invalid JSON' };
    }
  }, [saveToStorage]);

  // Import from file
  const importFromFile = useCallback((file: File): Promise<{ success: boolean; count: number; error?: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          resolve(importTemplates(content));
        } else {
          resolve({ success: false, count: 0, error: 'Empty file' });
        }
      };
      reader.onerror = () => {
        resolve({ success: false, count: 0, error: 'Failed to read file' });
      };
      reader.readAsText(file);
    });
  }, [importTemplates]);

  // Clear all templates
  const clearAllTemplates = useCallback(() => {
    setTemplates([]);
    saveToStorage([]);
  }, [saveToStorage]);

  return {
    templates,
    addTemplate,
    deleteTemplate,
    incrementUsage,
    findMatchingTemplate,
    exportTemplates,
    downloadTemplatesFile,
    importTemplates,
    importFromFile,
    clearAllTemplates,
  };
}

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "boq_saved_projects";
const MAX_PROJECTS = 10;

export interface LocalProject {
  id: string;
  name: string;
  fileName?: string;
  savedAt: string;
  analysisData: any;
  wbsData?: any;
}

export function useLocalProjects() {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const { toast } = useToast();

  // Load projects from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProjects(parsed);
      }
    } catch (error) {
      console.error("Error loading projects from localStorage:", error);
    }
  }, []);

  // Save projects to localStorage
  const saveToStorage = useCallback((updatedProjects: LocalProject[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects));
      setProjects(updatedProjects);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
      toast({
        title: "خطأ في الحفظ / Save Error",
        description: "تعذر حفظ المشروع في المتصفح / Could not save project to browser",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Check if project name exists
  const checkNameExists = useCallback((name: string): boolean => {
    return projects.some(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
  }, [projects]);

  // Save a new project
  const saveProject = useCallback((
    name: string,
    analysisData: any,
    wbsData?: any,
    fileName?: string
  ): LocalProject | null => {
    const trimmedName = name.trim();
    
    // Check for duplicate name
    if (checkNameExists(trimmedName)) {
      toast({
        title: "اسم مكرر / Duplicate Name",
        description: "يوجد مشروع بنفس الاسم، يرجى اختيار اسم آخر / A project with this name already exists",
        variant: "destructive",
      });
      return null;
    }

    const newProject: LocalProject = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: trimmedName,
      fileName,
      savedAt: new Date().toISOString(),
      analysisData,
      wbsData,
    };

    let updatedProjects = [newProject, ...projects];
    
    // Remove oldest projects if over limit
    if (updatedProjects.length > MAX_PROJECTS) {
      const removed = updatedProjects.splice(MAX_PROJECTS);
      if (removed.length > 0) {
        toast({
          title: "تم حذف المشاريع القديمة / Old projects deleted",
          description: `تم حذف ${removed.length} مشروع قديم تلقائياً / ${removed.length} old project(s) auto-deleted`,
        });
      }
    }

    saveToStorage(updatedProjects);
    
    toast({
      title: "تم الحفظ بنجاح / Saved Successfully",
      description: `تم حفظ المشروع "${trimmedName}" / Project "${trimmedName}" saved`,
    });

    return newProject;
  }, [projects, saveToStorage, toast, checkNameExists]);

  // Delete a project
  const deleteProject = useCallback((projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    saveToStorage(updatedProjects);
    
    toast({
      title: "تم الحذف / Deleted",
      description: "تم حذف المشروع بنجاح / Project deleted successfully",
    });
  }, [projects, saveToStorage, toast]);

  // Load a project
  const loadProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      toast({
        title: "تم التحميل / Loaded",
        description: `تم تحميل المشروع "${project.name}" / Project "${project.name}" loaded`,
      });
    }
    return project;
  }, [projects, toast]);

  return {
    projects,
    saveProject,
    deleteProject,
    loadProject,
    checkNameExists,
    projectCount: projects.length,
    maxProjects: MAX_PROJECTS,
  };
}

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import {
  FolderOpen, Trash2, Loader2, Calendar, FileText, Search,
  ArrowLeft, Eye, Edit, DollarSign, Package, Filter, X,
  SortAsc, SortDesc, Download, Settings2, FileUp, Plus, BarChart3, Paperclip, Sparkles, Upload,
  TrendingUp, AlertTriangle, ExternalLink, FileSpreadsheet, History, Check, Pencil, Copy, Star,
  CheckCircle2, Clock, CircleDashed, Heart
} from "lucide-react";
import { useFavoriteProjects } from "@/hooks/useFavoriteProjects";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttachmentsTab } from "@/components/projects/AttachmentsTab";
import { ReportsTab } from "@/components/projects/ReportsTab";
import { BOQAnalyzerPanel } from "@/components/BOQAnalyzerPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// === Helper functions for safe total value display ===
function sanitizeItemPrice(item: any): { quantity: number; unitPrice: number; totalPrice: number } {
  const qty = parseFloat(item.quantity) || 0;
  const up = parseFloat(item.unit_price) || 0;
  const tp = parseFloat(item.total_price) || 0;
  
  // إذا كان سعر الوحدة غير معقول (أكبر من 10 مليون)، اعتبره فاسداً
  const safeUp = (up > 0 && up < 1e7) ? up : 0;
  const computed = qty * safeUp;
  const safeTp = (tp > 0 && tp < 1e12) ? tp : 0;
  
  return {
    quantity: qty,
    unitPrice: safeUp,
    totalPrice: computed > 0 ? computed : safeTp,
  };
}

function getSafeProjectTotal(project: ProjectData | null | undefined): number {
  if (!project) return 0;
  const storedTotal = project.total_value || 0;
  if (storedTotal > 0 && storedTotal < 1e12) return storedTotal;
  
  const items = project.analysis_data?.items || [];
  if (items.length === 0) return 0;
  
  let total = 0;
  for (const item of items) {
    const safe = sanitizeItemPrice(item);
    total += safe.totalPrice;
  }
  return total;
}

function formatLargeNumber(value: number, currency?: string): string {
  const suffix = currency ? ` ${currency}` : '';
  if (!Number.isFinite(value) || value < 0) return `—${suffix}`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

function computeSafeTotalFromItems(items: ProjectItem[]): number {
  return items.reduce((sum, item) => {
    const safe = sanitizeItemPrice(item);
    return sum + safe.totalPrice;
  }, 0);
}

interface ProjectData {
  id: string;
  name: string;
  file_name: string | null;
  analysis_data: any;
  wbs_data: any;
  total_value: number | null;
  items_count: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectItem {
  id: string;
  item_number: string;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  category: string | null;
}

export default function SavedProjectsPage() {
  const { favorites, toggleFavorite, isFavorite } = useFavoriteProjects();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { isArabic, t } = useLanguage();
  const { toast } = useToast();
  
  // New project state from navigation
  const newProjectState = location.state as { newProjectId?: string; newProjectName?: string } | null;
  const [showNewProjectBanner, setShowNewProjectBanner] = useState(!!newProjectState?.newProjectId);
  
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pricingFilter, setPricingFilter] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  
  // Inline editing state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop state
  const [draggedFile, setDraggedFile] = useState<File | null>(null);
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);

  // Bulk selection state
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Tab state - check URL for initial tab and mode
  const urlTab = searchParams.get("tab");
  const urlMode = searchParams.get("mode");
  const initialTab = urlTab === "reports" ? "reports" :
                     urlTab === "attachments" ? "attachments" :
                     urlTab === "analyze" ? "analyze" : "projects";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [extractionMode, setExtractionMode] = useState(urlMode === "extraction");

  // Clear navigation state after reading it
  useEffect(() => {
    if (newProjectState?.newProjectId) {
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    const mode = searchParams.get("mode");
    if (tab === "reports") {
      setActiveTab("reports");
    } else if (tab === "attachments") {
      setActiveTab("attachments");
      if (mode === "extraction") {
        setExtractionMode(true);
      }
    } else if (tab === "analyze") {
      setActiveTab("analyze");
    } else {
      setActiveTab("projects");
    }
  }, [searchParams]);

  const fetchProjects = async (skipCache = false) => {
    if (!user) return;

    // Check sessionStorage cache (3 min)
    if (!skipCache) {
      try {
        const cached = sessionStorage.getItem(`pms_projects_${user.id}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 3 * 60 * 1000) {
            setProjects(data);
            setIsLoading(false);
            return;
          }
        }
      } catch {}
    }
    
    setIsLoading(true);
    try {
      // Fetch from both tables in parallel
      const [savedProjectsRes, projectDataRes] = await Promise.all([
        supabase
          .from("saved_projects")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("project_data")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      ]);

      const savedProjects = savedProjectsRes.data || [];
      const projectDataList = projectDataRes.data || [];

      // Merge projects - use Map to avoid duplicates
      const projectMap = new Map<string, ProjectData>();

      // Add saved_projects first (prioritize)
      savedProjects.forEach((p: any) => {
        const analysisData = p.analysis_data as any;
        projectMap.set(p.id, {
          id: p.id,
          name: p.name,
          file_name: p.file_name,
          analysis_data: p.analysis_data,
          wbs_data: p.wbs_data,
          items_count: analysisData?.items?.length || analysisData?.summary?.total_items || 0,
          total_value: (() => {
            const summaryTotal = analysisData?.summary?.total_value || 0;
            if (summaryTotal > 0 && summaryTotal < 1e12) return summaryTotal;
            return (analysisData?.items || []).reduce((sum: number, item: any) => {
              const safe = sanitizeItemPrice(item);
              return sum + safe.totalPrice;
            }, 0);
          })(),
          currency: analysisData?.summary?.currency || 'SAR',
          created_at: p.created_at,
          updated_at: p.updated_at,
        });
      });

      // Add project_data if not already in map
      projectDataList.forEach((p: any) => {
        if (!projectMap.has(p.id)) {
          const rawTotal = p.total_value || 0;
          const items = p.analysis_data?.items || [];
          // إذا كانت القيمة فاسدة، أعد الحساب مع تنظيف الأسعار
          let safeTotal = rawTotal;
          if (rawTotal >= 1e12 || rawTotal < 0) {
            safeTotal = items.reduce((sum: number, item: any) => sum + sanitizeItemPrice(item).totalPrice, 0);
          }
          projectMap.set(p.id, {
            id: p.id,
            name: p.name,
            file_name: p.file_name,
            analysis_data: p.analysis_data,
            wbs_data: p.wbs_data,
            items_count: p.items_count || 0,
            total_value: safeTotal,
            currency: p.currency || 'SAR',
            created_at: p.created_at,
            updated_at: p.updated_at,
            _rawDbTotal: rawTotal, // حفظ القيمة الأصلية للمقارنة
          } as any);
        }
      });

      // Convert map to array and sort by created_at
      const allProjects = Array.from(projectMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setProjects(allProjects);

      // Cache to sessionStorage
      try {
        sessionStorage.setItem(`pms_projects_${user.id}`, JSON.stringify({ data: allProjects, timestamp: Date.now() }));
      } catch {}

      // تصحيح القيم الفاسدة في قاعدة البيانات (مرة واحدة)
      (async () => {
        for (const project of allProjects) {
          const summaryTotal = project.analysis_data?.summary?.total_value;
          const rawDbTotal = (project as any)._rawDbTotal ?? project.total_value;
          
          // تحقق من أي مصدر فاسد
          const isCorrupted = 
            (summaryTotal !== undefined && summaryTotal !== null && (summaryTotal >= 1e12 || summaryTotal < 0)) ||
            (rawDbTotal !== undefined && rawDbTotal !== null && (rawDbTotal >= 1e12 || rawDbTotal < 0));
          
          if (isCorrupted) {
            const correctedTotal = project.total_value; // المحسوبة بأمان
            // تنظيف أسعار البنود الفاسدة أيضاً
            const cleanedItems = (project.analysis_data?.items || []).map((item: any) => {
              const safe = sanitizeItemPrice(item);
              return { ...item, unit_price: safe.unitPrice, total_price: safe.totalPrice };
            });
            
            const updatedAnalysis = {
              ...project.analysis_data,
              items: cleanedItems,
              summary: {
                ...(project.analysis_data?.summary || {}),
                total_value: correctedTotal,
              },
            };
            
            // تحديث saved_projects
            await supabase
              .from('saved_projects')
              .update({ analysis_data: updatedAnalysis, updated_at: new Date().toISOString() })
              .eq('id', project.id);
            
            // تحديث project_data أيضاً
            await supabase
              .from('project_data')
              .update({ analysis_data: updatedAnalysis, total_value: correctedTotal, updated_at: new Date().toISOString() })
              .eq('id', project.id);
            
            console.log(`[DataRepair] Fixed corrupted project "${project.name}" (id: ${project.id}), rawTotal: ${rawDbTotal}, corrected: ${correctedTotal}`);
          }
        }
      })();
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast({
        title: isArabic ? "خطأ في تحميل المشاريع" : "Error loading projects",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      // Delete project items first (if any)
      await supabase.from("project_items").delete().eq("project_id", id);
      
      // Delete from project_data
      await supabase.from("project_data").delete().eq("id", id);
      
      // Delete from saved_projects
      await supabase.from("saved_projects").delete().eq("id", id);
      
      toast({
        title: isArabic ? "تم حذف المشروع" : "Project deleted",
      });
      fetchProjects();
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في حذف المشروع" : "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = async (project: ProjectData) => {
    setSelectedProject(project);
    setIsLoadingItems(true);
    
    try {
      const { data, error } = await supabase
        .from("project_items")
        .select("*")
        .eq("project_id", project.id)
        .order("item_number");

      if (error) throw error;
      setProjectItems(data || []);
    } catch (error: any) {
      console.error("Error fetching project items:", error);
      toast({
        title: isArabic ? "خطأ في تحميل البنود" : "Error loading items",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Global drag-and-drop handlers for the projects tab
  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.items.length > 0) setIsGlobalDragOver(true);
  }, []);

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsGlobalDragOver(false);
    }
  }, []);

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const isValid = file.name.endsWith('.pdf') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      if (isValid) {
        setDraggedFile(file);
        setActiveTab("analyze");
      }
    }
  }, []);

  // Helper to get pricing percentage
  const getPricingPct = useCallback((project: ProjectData) => {
    const totalCount = project.items_count || 0;
    if (totalCount === 0) return 0;
    const pricedCount = (project.analysis_data?.items || [])
      .filter((item: any) => (item.unit_price || 0) > 0 || (item.total_price || 0) > 0).length;
    return Math.round((pricedCount / totalCount) * 100);
  }, []);

  // Stats computed from all projects
  const projectStats = useMemo(() => {
    const totalValue = projects.reduce((sum, p) => sum + getSafeProjectTotal(p), 0);
    const totalItems = projects.reduce((sum, p) => sum + (p.items_count || 0), 0);
    const completedPricing = projects.filter(p => getPricingPct(p) === 100).length;
    return { totalValue, totalItems, completedPricing };
  }, [projects, getPricingPct]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.file_name?.toLowerCase().includes(query)
      );
    }

    // Pricing filter
    if (pricingFilter === "completed") {
      result = result.filter(p => getPricingPct(p) === 100);
    } else if (pricingFilter === "in_progress") {
      result = result.filter(p => { const pct = getPricingPct(p); return pct > 0 && pct < 100; });
    } else if (pricingFilter === "no_pricing") {
      result = result.filter(p => getPricingPct(p) === 0);
    } else if (pricingFilter === "favorites") {
      result = result.filter(p => isFavorite(p.id));
    }
    
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "total_value":
          aVal = a.total_value || 0;
          bVal = b.total_value || 0;
          break;
        case "items_count":
          aVal = a.items_count || 0;
          bVal = b.items_count || 0;
          break;
        case "created_at":
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
      }
      
      if (typeof aVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

    // Sort favorites to top
    result.sort((a, b) => {
      const aFav = isFavorite(a.id) ? 0 : 1;
      const bFav = isFavorite(b.id) ? 0 : 1;
      return aFav - bFav;
    });
    
    return result;
  }, [projects, searchQuery, sortField, sortDirection, pricingFilter, getPricingPct]);

  // Inline edit handlers
  const handleStartEdit = (project: ProjectData) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setEditingName("");
  };

  const handleSaveEdit = async (projectId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast({ title: isArabic ? "الاسم مطلوب" : "Name is required", variant: "destructive" });
      return;
    }

    setIsSavingEdit(true);
    try {
      // Check duplicates excluding current project
      const [{ data: s1 }, { data: s2 }] = await Promise.all([
        supabase.from("saved_projects").select("id").eq("user_id", user!.id).ilike("name", trimmed).neq("id", projectId).limit(1),
        supabase.from("project_data").select("id").eq("user_id", user!.id).ilike("name", trimmed).neq("id", projectId).limit(1),
      ]);

      if ((s1 && s1.length > 0) || (s2 && s2.length > 0)) {
        toast({ title: isArabic ? "هذا الاسم مستخدم بالفعل" : "This name is already taken", variant: "destructive" });
        setIsSavingEdit(false);
        return;
      }

      // Update both tables in parallel
      await Promise.all([
        supabase.from("saved_projects").update({ name: trimmed, updated_at: new Date().toISOString() }).eq("id", projectId),
        supabase.from("project_data").update({ name: trimmed, updated_at: new Date().toISOString() }).eq("id", projectId),
      ]);

      // Update locally
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: trimmed } : p));
      setEditingProjectId(null);
      setEditingName("");
      toast({ title: isArabic ? "تم تحديث الاسم" : "Name updated" });
    } catch (err: any) {
      toast({ title: isArabic ? "خطأ في التحديث" : "Update error", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Excel export handler
  const handleExportToExcel = async (project: ProjectData) => {
    try {
      toast({ title: isArabic ? "جارٍ التصدير..." : "Exporting..." });

      // Fetch project items
      const { data: items } = await supabase
        .from("project_items")
        .select("*")
        .eq("project_id", project.id)
        .order("item_number");

      // Fallback to analysis_data items
      const exportItems = (items && items.length > 0)
        ? items.map((item: any, idx: number) => ({
            [isArabic ? "م" : "#"]: idx + 1,
            [isArabic ? "رقم البند" : "Item No"]: item.item_number || '',
            [isArabic ? "الوصف" : "Description"]: item.description || '',
            [isArabic ? "الوحدة" : "Unit"]: item.unit || '',
            [isArabic ? "الكمية" : "Qty"]: item.quantity || 0,
            [isArabic ? "سعر الوحدة" : "Unit Price"]: item.unit_price || 0,
            [isArabic ? "الإجمالي" : "Total"]: item.total_price || ((item.quantity || 0) * (item.unit_price || 0)),
            [isArabic ? "الفئة" : "Category"]: item.category || '',
          }))
        : (project.analysis_data?.items || []).map((item: any, idx: number) => ({
            [isArabic ? "م" : "#"]: idx + 1,
            [isArabic ? "رقم البند" : "Item No"]: item.item_number || item.رقم_البند || '',
            [isArabic ? "الوصف" : "Description"]: item.description || item.الوصف || '',
            [isArabic ? "الوحدة" : "Unit"]: item.unit || item.الوحدة || '',
            [isArabic ? "الكمية" : "Qty"]: item.quantity || item.الكمية || 0,
            [isArabic ? "سعر الوحدة" : "Unit Price"]: item.unit_price || item.سعر_الوحدة || 0,
            [isArabic ? "الإجمالي" : "Total"]: item.total_price || item.الإجمالي || 0,
            [isArabic ? "الفئة" : "Category"]: item.category || item.الفئة || '',
          }));

      if (exportItems.length === 0) {
        toast({ title: isArabic ? "لا توجد بنود للتصدير" : "No items to export", variant: "destructive" });
        return;
      }

      const { createWorkbook, addJsonSheet, downloadWorkbook } = await import("@/lib/exceljs-utils");
      const wb = createWorkbook();
      const ws = addJsonSheet(wb, exportItems, isArabic ? "بنود المشروع" : "Project Items");

      // Add total row
      const totalKey = isArabic ? "الإجمالي" : "Total";
      const total = exportItems.reduce((sum: number, item: any) => sum + (Number(item[totalKey]) || 0), 0);
      const totalRow: any = {};
      const keys = Object.keys(exportItems[0]);
      keys.forEach(k => totalRow[k] = '');
      totalRow[keys[0]] = '';
      totalRow[isArabic ? "الوصف" : "Description"] = isArabic ? "الإجمالي الكلي" : "Grand Total";
      totalRow[totalKey] = total;

      const lastRowNum = ws.rowCount + 1;
      const vals = keys.map(k => totalRow[k]);
      const addedRow = ws.addRow(vals);
      addedRow.font = { bold: true };

      await downloadWorkbook(wb, `${project.name}.xlsx`);
      toast({ title: isArabic ? "تم التصدير بنجاح" : "Exported successfully" });
    } catch (err: any) {
      toast({ title: isArabic ? "خطأ في التصدير" : "Export error", description: err.message, variant: "destructive" });
    }
  };
  const handleLoadProject = (project: ProjectData) => {
    navigate(`/projects/${project.id}`);
  };

  // Toggle selection of a single project
  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedProjectIds.size === filteredProjects.length) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(filteredProjects.map(p => p.id)));
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedProjectIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedProjectIds);
      for (const id of ids) {
        await supabase.from("project_items").delete().eq("project_id", id);
        await supabase.from("project_data").delete().eq("id", id);
        await supabase.from("saved_projects").delete().eq("id", id);
      }
      toast({
        title: isArabic
          ? `تم حذف ${ids.length} مشروع بنجاح`
          : `${ids.length} projects deleted successfully`,
      });
      setSelectedProjectIds(new Set());
      setShowBulkDeleteConfirm(false);
      fetchProjects();
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في الحذف الجماعي" : "Bulk delete error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Clone project handler
  const handleCloneProject = async (project: ProjectData) => {
    setIsCloning(true);
    try {
      const suffix = isArabic ? " - نسخة" : " - Copy";
      let newName = project.name + suffix;
      const existingNames = projects.map(p => p.name);
      let counter = 1;
      while (existingNames.includes(newName)) {
        counter++;
        newName = project.name + suffix + ` ${counter}`;
      }

      const newProjectId = crypto.randomUUID();
      const now = new Date().toISOString();

      await supabase.from("project_data").insert({
        id: newProjectId,
        name: newName,
        file_name: project.file_name,
        analysis_data: project.analysis_data,
        wbs_data: project.wbs_data,
        total_value: project.total_value,
        items_count: project.items_count,
        currency: project.currency,
        user_id: user!.id,
        created_at: now,
        updated_at: now,
      });

      await supabase.from("saved_projects").insert({
        id: newProjectId,
        name: newName,
        file_name: project.file_name,
        analysis_data: project.analysis_data,
        wbs_data: project.wbs_data,
        user_id: user!.id,
        created_at: now,
        updated_at: now,
      });

      const { data: originalItems } = await supabase
        .from("project_items")
        .select("*")
        .eq("project_id", project.id);

      if (originalItems && originalItems.length > 0) {
        const idMapping = new Map<string, string>();
        const clonedItems = originalItems.map((item: any) => {
          const newItemId = crypto.randomUUID();
          idMapping.set(item.id, newItemId);
          const { id, created_at, ...rest } = item;
          return { ...rest, id: newItemId, project_id: newProjectId };
        });

        for (let i = 0; i < clonedItems.length; i += 50) {
          await supabase.from("project_items").insert(clonedItems.slice(i, i + 50));
        }

        const originalItemIds = originalItems.map((item: any) => item.id);
        const { data: originalCosts } = await supabase
          .from("item_costs")
          .select("*")
          .in("project_item_id", originalItemIds);

        if (originalCosts && originalCosts.length > 0) {
          const clonedCosts = originalCosts
            .filter((cost: any) => idMapping.has(cost.project_item_id))
            .map((cost: any) => {
              const { id, created_at, ...rest } = cost;
              return { ...rest, id: crypto.randomUUID(), project_item_id: idMapping.get(cost.project_item_id)! };
            });

          for (let i = 0; i < clonedCosts.length; i += 50) {
            await supabase.from("item_costs").insert(clonedCosts.slice(i, i + 50));
          }
        }
      }

      toast({
        title: isArabic ? "تم نسخ المشروع بنجاح" : "Project cloned successfully",
        description: newName,
      });
      fetchProjects();
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في نسخ المشروع" : "Clone error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCloning(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {isArabic ? "يجب تسجيل الدخول لعرض المشاريع المحفوظة" : "Please login to view saved projects"}
          </p>
          <Button onClick={() => navigate('/auth')}>
            {isArabic ? "تسجيل الدخول" : "Sign In"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <PageHeader
        icon={FolderOpen}
        title={isArabic ? "المشاريع" : "Projects"}
        subtitle={isArabic ? "إدارة المشاريع وتحليل ملفات BOQ" : "Manage projects and analyze BOQ files"}
        stats={[
          { value: projects.length, label: isArabic ? "المشاريع" : "Projects" },
          { value: `${projects.reduce((sum, p) => sum + (p.total_value || 0), 0).toLocaleString()}`, label: isArabic ? "القيمة الإجمالية" : "Total Value", type: 'gold' as const },
          { value: projects.reduce((sum, p) => sum + (p.items_count || 0), 0), label: isArabic ? "البنود" : "Items" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10">
                <Settings2 className="h-4 w-4" />
              </Button>
            </Link>
            <UserMenu />
          </div>
        }
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-4 p-1 h-auto tabs-navigation-safe bg-muted/50 backdrop-blur-sm">
              <TabsTrigger
                value="projects"
                className="gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? "المشاريع" : "Projects"}</span>
                {projects.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary/10 text-primary">
                    {projects.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="analyze"
                className={cn(
                  "gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50",
                  showNewProjectBanner && "ring-2 ring-primary/50 animate-pulse"
                )}
              >
                <Sparkles className={cn("w-4 h-4", showNewProjectBanner && "text-primary animate-bounce")} />
                <span className="hidden sm:inline">{isArabic ? "تحليل BOQ" : "Analyze BOQ"}</span>
                {showNewProjectBanner && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? "التقارير" : "Reports"}</span>
              </TabsTrigger>
              <TabsTrigger
                value="attachments"
                className="gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50"
              >
                <Paperclip className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? "المرفقات" : "Attachments"}</span>
              </TabsTrigger>
            </TabsList>

            {activeTab === "projects" && (
              <div className="flex gap-2">
                <Button onClick={() => navigate("/projects/new")} className="gap-2 shadow-sm">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{isArabic ? "مشروع جديد" : "New Project"}</span>
                </Button>
              </div>
            )}
          </div>
          
          {/* Projects Tab */}
          <TabsContent
            value="projects"
            className="space-y-6 relative"
            onDragOver={handleGlobalDragOver}
            onDragLeave={handleGlobalDragLeave}
            onDrop={handleGlobalDrop}
          >
            {/* Drag Overlay */}
            {isGlobalDragOver && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-xl backdrop-blur-sm pointer-events-none">
                <div className="text-center">
                  <Upload className="w-16 h-16 mx-auto mb-3 text-primary" />
                  <p className="text-xl font-semibold text-primary">
                    {isArabic ? "أفلت الملف لبدء التحليل" : "Drop file to start analysis"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">PDF, Excel</p>
                </div>
              </div>
            )}

            {/* Quick Upload & Analyze Section */}
            <div className="glass-card p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg">
                        {isArabic ? "رفع وتحليل BOQ جديد" : "Upload & Analyze New BOQ"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isArabic ? "حلل ملفات PDF أو Excel أو Word لاستخراج بنود جدول الكميات تلقائياً" : "Analyze PDF, Excel, or Word files to extract BOQ items automatically"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setActiveTab("analyze")} className="gap-2 btn-gradient shadow-md hover:shadow-lg transition-all">
                    <Sparkles className="w-4 h-4" />
                    {isArabic ? "ابدأ التحليل" : "Start Analysis"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="glass-card p-4">
              <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={isArabic ? "بحث في المشاريع..." : "Search projects..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={isArabic ? "ترتيب حسب" : "Sort by"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">{isArabic ? "تاريخ الإنشاء" : "Date Created"}</SelectItem>
                  <SelectItem value="name">{isArabic ? "الاسم" : "Name"}</SelectItem>
                  <SelectItem value="total_value">{isArabic ? "القيمة" : "Value"}</SelectItem>
                  <SelectItem value="items_count">{isArabic ? "عدد البنود" : "Items Count"}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              >
                {sortDirection === "asc" ? (
                  <SortAsc className="w-4 h-4" />
                ) : (
                  <SortDesc className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span>{filteredProjects.length} {isArabic ? "مشروع" : "projects"}</span>
            {searchQuery && (
              <Badge variant="outline" className="gap-1">
                {isArabic ? "بحث" : "Search"}: {searchQuery}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Summary Bar */}
        {projects.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass-card p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FolderOpen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "المشاريع" : "Projects"}</p>
                <p className="font-bold text-lg">{projects.length}</p>
              </div>
            </div>
            <div className="glass-card p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي القيمة" : "Total Value"}</p>
                <p className="font-bold text-sm">{formatLargeNumber(projectStats.totalValue)}</p>
              </div>
            </div>
            <div className="glass-card p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي البنود" : "Total Items"}</p>
                <p className="font-bold text-lg">{projectStats.totalItems.toLocaleString()}</p>
              </div>
            </div>
            <div className="glass-card p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "مكتمل التسعير" : "Fully Priced"}</p>
                <p className="font-bold text-lg">{projectStats.completedPricing}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: isArabic ? "الكل" : "All", icon: Filter },
            { key: "completed", label: isArabic ? "مكتمل" : "Complete", icon: CheckCircle2 },
            { key: "in_progress", label: isArabic ? "قيد التسعير" : "In Progress", icon: Clock },
            { key: "no_pricing", label: isArabic ? "بدون تسعير" : "No Pricing", icon: CircleDashed },
            { key: "favorites", label: isArabic ? "المفضلة" : "Favorites", icon: Star },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setPricingFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                pricingFilter === f.key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border"
              )}
            >
              <f.icon className="w-3 h-3" />
              {f.label}
              {f.key === "all" && <span className="opacity-70">({projects.length})</span>}
              {f.key === "completed" && <span className="opacity-70">({projectStats.completedPricing})</span>}
              {f.key === "favorites" && <span className="opacity-70">({favorites.size})</span>}
            </button>
          ))}
        </div>

        {/* Bulk Actions Bar */}
        {selectedProjectIds.size > 0 && (
          <div className="glass-card p-3 flex items-center justify-between gap-3 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedProjectIds.size === filteredProjects.length && filteredProjects.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedProjectIds.size} {isArabic ? "محدد" : "selected"}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProjectIds(new Set())}>
                <X className="w-4 h-4 mr-1" />
                {isArabic ? "إلغاء التحديد" : "Deselect"}
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              {isArabic ? `حذف المحدد (${selectedProjectIds.size})` : `Delete Selected (${selectedProjectIds.size})`}
            </Button>
          </div>
        )}

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
          <AlertDialogContent dir={isArabic ? 'rtl' : 'ltr'}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isArabic ? "حذف المشاريع المحددة" : "Delete Selected Projects"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isArabic
                  ? `هل أنت متأكد من حذف ${selectedProjectIds.size} مشروع؟ لا يمكن التراجع عن هذا الإجراء.`
                  : `Are you sure you want to delete ${selectedProjectIds.size} projects? This action cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel disabled={isBulkDeleting}>
                {isArabic ? "إلغاء" : "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground"
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isArabic ? "حذف" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Projects Grid */}
        <TooltipProvider delayDuration={300}>
        {isLoading ? (
          /* Skeleton Loading */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
                <Skeleton className="h-3 w-1/2" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-3 w-1/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Enhanced Empty State */
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <FolderOpen className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">
              {isArabic ? "لا توجد مشاريع" : "No projects found"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery 
                ? (isArabic ? "لا توجد نتائج للبحث" : "No results match your search")
                : (isArabic ? "ابدأ رحلتك بثلاث خطوات بسيطة" : "Get started in three simple steps")
              }
            </p>
            {!searchQuery && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
                  {[
                    { icon: Upload, label: isArabic ? "١. ارفع الملف" : "1. Upload File", desc: isArabic ? "PDF أو Excel" : "PDF or Excel" },
                    { icon: Sparkles, label: isArabic ? "٢. حلل تلقائياً" : "2. Auto Analyze", desc: isArabic ? "استخراج البنود" : "Extract items" },
                    { icon: DollarSign, label: isArabic ? "٣. سعّر البنود" : "3. Price Items", desc: isArabic ? "تسعير ذكي" : "Smart pricing" },
                  ].map((step, i) => (
                    <div key={i} className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-primary" />
                      </div>
                      <p className="font-semibold text-sm">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  ))}
                </div>
                <Button onClick={() => setActiveTab("analyze")} size="lg" className="gap-2 btn-gradient shadow-lg animate-pulse">
                  <Sparkles className="w-5 h-5" />
                  {isArabic ? "ابدأ الآن" : "Get Started"}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project, index) => {
              const pricingPct = getPricingPct(project);
              const totalCount = project.items_count || 0;
              const pricedCount = (project.analysis_data?.items || [])
                .filter((item: any) => (item.unit_price || 0) > 0 || (item.total_price || 0) > 0).length;
              return (
              <div
                key={project.id}
                className={cn(
                  "glass-card overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group relative",
                  selectedProjectIds.has(project.id) && "border-primary/40 bg-primary/5"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Color-coded top bar */}
                <div className={cn(
                  "h-1 w-full",
                  pricingPct === 100 ? "bg-green-500" : pricingPct >= 30 ? "bg-primary" : pricingPct > 0 ? "bg-orange-400" : "bg-muted-foreground/20"
                )} />

                <div className="p-5">
                {/* Selection Checkbox */}
                <div className="absolute top-4 left-3 z-10 flex items-center gap-1">
                  <Checkbox
                    checked={selectedProjectIds.has(project.id)}
                    onCheckedChange={() => toggleProjectSelection(project.id)}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(project.id); }}
                    className="p-0.5 rounded hover:bg-muted transition-colors"
                  >
                    <Star className={cn("w-4 h-4 transition-all", isFavorite(project.id) ? "fill-yellow-400 text-yellow-400 scale-110" : "text-muted-foreground")} />
                  </button>
                </div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4 pl-7">
                  <div className="flex-1 min-w-0">
                    {editingProjectId === project.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          ref={editInputRef}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(project.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="h-8 text-sm"
                          disabled={isSavingEdit}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-green-600" onClick={() => handleSaveEdit(project.id)} disabled={isSavingEdit}>
                          {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCancelEdit} disabled={isSavingEdit}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group/name">
                        <h3 className="font-display font-semibold truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        <button
                          onClick={() => handleStartEdit(project)}
                          className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                        >
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                    {project.file_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                        <FileText className="w-3 h-3 shrink-0" />
                        {project.file_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                      <Package className="w-3 h-3" />
                      {isArabic ? "البنود" : "Items"}
                    </div>
                    <p className="font-semibold">{project.items_count || 0}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-1">
                      <DollarSign className="w-3 h-3" />
                      {isArabic ? "القيمة" : "Value"}
                    </div>
                    <p className="font-semibold text-primary text-sm">
                      {formatLargeNumber(getSafeProjectTotal(project), project.currency || 'SAR')}
                    </p>
                    {(project.total_value || 0) > 1e10 && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] mt-1">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {isArabic ? "تم التصحيح" : "Corrected"}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Pricing Progress Bar */}
                {totalCount > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
                      <span>{isArabic ? "التسعير" : "Pricing"}</span>
                      <span className={cn(
                        "font-semibold",
                        pricingPct === 100 ? "text-green-600" : pricingPct > 50 ? "text-primary" : "text-orange-500"
                      )}>
                        {pricedCount}/{totalCount} ({pricingPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500 ease-out",
                          pricingPct === 100 ? "bg-green-500" : pricingPct > 50 ? "bg-primary" : "bg-orange-400"
                        )}
                        style={{ width: `${pricingPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                  <Calendar className="w-3 h-3" />
                  {new Date(project.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>

                {/* Actions with Tooltips */}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleLoadProject(project)}
                    className="flex-1 gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {isArabic ? "تحميل" : "Load"}
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(project)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isArabic ? "عرض التفاصيل" : "View Details"}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleExportToExcel(project)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isArabic ? "تصدير Excel" : "Export Excel"}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleCloneProject(project)} disabled={isCloning}>
                        {isCloning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isArabic ? "نسخ المشروع" : "Clone Project"}</TooltipContent>
                  </Tooltip>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir={isArabic ? 'rtl' : 'ltr'}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {isArabic ? "حذف المشروع" : "Delete Project"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {isArabic 
                            ? `هل أنت متأكد من حذف "${project.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                            : `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(project.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          {isArabic ? "حذف" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
        </TooltipProvider>
          </TabsContent>

          {/* Analyze BOQ Tab */}
          <TabsContent value="analyze" className="space-y-4">
            {/* New Project Banner */}
            {showNewProjectBanner && newProjectState?.newProjectName && (
              <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/15 mt-0.5">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">
                        {isArabic ? "🎉 تم إنشاء المشروع بنجاح!" : "🎉 Project Created Successfully!"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isArabic 
                          ? `المشروع "${newProjectState.newProjectName}" جاهز. ارفع ملف BOQ الآن لبدء التحليل والتسعير.`
                          : `Project "${newProjectState.newProjectName}" is ready. Upload your BOQ file now to start analysis and pricing.`}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                          <Upload className="w-3 h-3 mr-1" />
                          {isArabic ? "PDF أو Excel" : "PDF or Excel"}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {isArabic ? "تحليل ذكي" : "AI Analysis"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setShowNewProjectBanner(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <BOQAnalyzerPanel
              key={draggedFile?.name ?? "default"}
              initialFile={draggedFile ?? undefined}
              onProjectSaved={(projectId) => {
                setDraggedFile(null);
                setShowNewProjectBanner(false);
                fetchProjects();
                setActiveTab("projects");
              }}
              embedded={true}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ReportsTab isArabic={isArabic} />
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments">
            <AttachmentsTab initialExtractionMode={extractionMode} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              {selectedProject?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedProject && <div className="overflow-y-auto max-h-[60vh]">
            {isLoadingItems ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-blue-500" />
                      <p className="text-xs text-muted-foreground">{isArabic ? "البنود" : "Items"}</p>
                    </div>
                    <p className="font-semibold text-lg">{projectItems.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      <p className="text-xs text-muted-foreground">{isArabic ? "القيمة الإجمالية" : "Total Value"}</p>
                    </div>
                    <p className="font-semibold text-lg text-emerald-600">
                      {formatLargeNumber(
                        projectItems.length > 0 
                          ? (computeSafeTotalFromItems(projectItems) || getSafeProjectTotal(selectedProject))
                          : getSafeProjectTotal(selectedProject),
                        selectedProject?.currency || 'SAR'
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <p className="text-xs text-muted-foreground">{isArabic ? "تاريخ الإنشاء" : "Created"}</p>
                    </div>
                    <p className="font-semibold">
                      {selectedProject && new Date(selectedProject.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">{isArabic ? "الكود" : "Code"}</th>
                        <th className="px-3 py-2 text-left">{isArabic ? "الوصف" : "Description"}</th>
                        <th className="px-3 py-2 text-center">{isArabic ? "الوحدة" : "Unit"}</th>
                        <th className="px-3 py-2 text-center">{isArabic ? "الكمية" : "Qty"}</th>
                        <th className="px-3 py-2 text-right">{isArabic ? "سعر الوحدة" : "Unit Price"}</th>
                        <th className="px-3 py-2 text-right">{isArabic ? "الإجمالي" : "Total"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {projectItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-muted/50">
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono text-xs">{item.item_number}</td>
                          <td className="px-3 py-2 max-w-xs truncate">{item.description}</td>
                          <td className="px-3 py-2 text-center">{item.unit}</td>
                          <td className="px-3 py-2 text-center">{item.quantity?.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{item.unit_price?.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-medium">{item.total_price?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Smart Suggestions */}
                {projectItems.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {isArabic ? "اقتراحات ذكية" : "Smart Suggestions"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {/* Open for editing */}
                      {projectItems.some(item => !item.unit_price || item.unit_price === 0) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-xs"
                          onClick={() => {
                            setSelectedProject(null);
                            navigate(`/projects/${selectedProject?.id}`);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                          {isArabic ? "فتح للتسعير" : "Open for Pricing"}
                          <Badge variant="secondary" className="text-[10px] px-1">
                            {projectItems.filter(i => !i.unit_price || i.unit_price === 0).length} {isArabic ? "بدون سعر" : "unpriced"}
                          </Badge>
                        </Button>
                      )}
                      {/* Export to Excel */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs"
                        onClick={() => {
                          if (selectedProject) handleExportToExcel(selectedProject);
                        }}
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        {isArabic ? "تصدير إلى Excel" : "Export to Excel"}
                      </Button>
                      {/* Historical comparison */}
                      {projectItems.length >= 5 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-xs"
                          onClick={() => {
                            setSelectedProject(null);
                            navigate('/historical-pricing');
                          }}
                        >
                          <History className="w-3 h-3" />
                          {isArabic ? "مقارنة تاريخية" : "Historical Compare"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

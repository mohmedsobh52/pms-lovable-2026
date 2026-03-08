import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import {
  FolderOpen, Trash2, Loader2, Calendar, FileText, Search,
  Eye, Edit, DollarSign, Package, Filter, X,
  SortAsc, SortDesc, Settings2, FileUp, Plus, BarChart3, Paperclip, Sparkles, Upload,
  CheckCircle2, Clock, CircleDashed, Star
} from "lucide-react";
import { SmartSuggestionsBanner, type SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import { useFavoriteProjects } from "@/hooks/useFavoriteProjects";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttachmentsTab } from "@/components/projects/AttachmentsTab";
import { ReportsTab } from "@/components/projects/ReportsTab";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";

import { ProjectData, ProjectItem, sanitizeItemPrice, getSafeProjectTotal, formatLargeNumber, computeSafeTotalFromItems } from "@/lib/project-utils";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectQuickView } from "@/components/projects/ProjectQuickView";

// Lazy load heavy tab components
const BOQAnalyzerPanel = lazy(() => import("@/components/BOQAnalyzerPanel").then(m => ({ default: m.BOQAnalyzerPanel })));
const RecycleBin = lazy(() => import("@/components/RecycleBin").then(m => ({ default: m.RecycleBin })));

export default function SavedProjectsPage() {
  const { favorites, toggleFavorite, isFavorite } = useFavoriteProjects();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { isArabic, t } = useLanguage();
  const { toast } = useToast();
  
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
  
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [draggedFile, setDraggedFile] = useState<File | null>(null);
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);

  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [selectedDemoProject, setSelectedDemoProject] = useState<any>(null);
  
  const urlTab = searchParams.get("tab");
  const urlMode = searchParams.get("mode");
  const initialTab = urlTab === "reports" ? "reports" :
                     urlTab === "attachments" ? "attachments" :
                     urlTab === "analyze" ? "analyze" : "projects";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [extractionMode, setExtractionMode] = useState(urlMode === "extraction");

  useEffect(() => {
    if (newProjectState?.newProjectId) {
      window.history.replaceState({}, document.title);
    }
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const mode = searchParams.get("mode");
    if (tab === "reports") setActiveTab("reports");
    else if (tab === "attachments") {
      setActiveTab("attachments");
      if (mode === "extraction") setExtractionMode(true);
    } else if (tab === "analyze") setActiveTab("analyze");
    else setActiveTab("projects");
  }, [searchParams]);

  const fetchProjects = async (skipCache = false) => {
    if (!user) return;

    if (!skipCache) {
      try {
        const cached = sessionStorage.getItem(`pms_projects_${user.id}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 3 * 60 * 1000) {
            setProjects(data);
            setIsLoading(false);
            // Don't return — continue to fetch fresh data in background (stale-while-revalidate)
          }
        }
      } catch {}
    }
    
    setIsLoading(true);
    try {
      const [savedProjectsRes, projectDataRes] = await Promise.all([
        supabase.from("saved_projects").select("*").eq("user_id", user.id)
          .or("is_deleted.eq.false,is_deleted.is.null").order("updated_at", { ascending: false }),
        supabase.from("project_data").select("*").eq("user_id", user.id)
          .or("is_deleted.eq.false,is_deleted.is.null").order("created_at", { ascending: false })
      ]);

      const savedProjects = savedProjectsRes.data || [];
      const projectDataList = projectDataRes.data || [];
      const projectMap = new Map<string, ProjectData>();

      savedProjects.forEach((p: any) => {
        const analysisData = p.analysis_data as any;
        projectMap.set(p.id, {
          id: p.id, name: p.name, file_name: p.file_name, analysis_data: p.analysis_data, wbs_data: p.wbs_data,
          items_count: analysisData?.items?.length || analysisData?.summary?.total_items || 0,
          total_value: (() => {
            const summaryTotal = analysisData?.summary?.total_value || 0;
            if (summaryTotal > 0 && summaryTotal < 1e12) return summaryTotal;
            return (analysisData?.items || []).reduce((sum: number, item: any) => sum + sanitizeItemPrice(item).totalPrice, 0);
          })(),
          currency: analysisData?.summary?.currency || 'SAR',
          created_at: p.created_at, updated_at: p.updated_at,
        });
      });

      projectDataList.forEach((p: any) => {
        if (!projectMap.has(p.id)) {
          const rawTotal = p.total_value || 0;
          const items = p.analysis_data?.items || [];
          let safeTotal = rawTotal;
          if (rawTotal >= 1e12 || rawTotal < 0) {
            safeTotal = items.reduce((sum: number, item: any) => sum + sanitizeItemPrice(item).totalPrice, 0);
          }
          projectMap.set(p.id, {
            id: p.id, name: p.name, file_name: p.file_name, analysis_data: p.analysis_data, wbs_data: p.wbs_data,
            items_count: p.items_count || 0, total_value: safeTotal, currency: p.currency || 'SAR',
            created_at: p.created_at, updated_at: p.updated_at,
          });
        }
      });

      const allProjects = Array.from(projectMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setProjects(allProjects);
      try { sessionStorage.setItem(`pms_projects_${user.id}`, JSON.stringify({ data: allProjects, timestamp: Date.now() })); } catch {}
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast({ title: isArabic ? "خطأ في تحميل المشاريع" : "Error loading projects", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (user) fetchProjects(!!newProjectState?.newProjectId); }, [user]);

  const handleDelete = async (id: string) => {
    try {
      const now = new Date().toISOString();
      await Promise.all([
        supabase.from("saved_projects").update({ is_deleted: true, deleted_at: now }).eq("id", id),
        supabase.from("project_data").update({ is_deleted: true, deleted_at: now }).eq("id", id),
      ]);
      if (user) sessionStorage.removeItem(`pms_projects_${user.id}`);
      toast({ title: isArabic ? "تم نقل المشروع إلى سلة المحذوفات" : "Project moved to recycle bin", description: isArabic ? "يمكنك استعادته خلال 30 يوم" : "You can restore it within 30 days" });
      fetchProjects(true);
    } catch (error: any) {
      toast({ title: isArabic ? "خطأ في حذف المشروع" : "Error deleting project", description: error.message, variant: "destructive" });
    }
  };

  const handleViewDetails = async (project: ProjectData) => {
    setSelectedProject(project);
    setIsLoadingItems(true);
    try {
      const { data, error } = await supabase.from("project_items").select("*").eq("project_id", project.id).order("item_number");
      if (error) throw error;
      setProjectItems(data || []);
    } catch (error: any) {
      toast({ title: isArabic ? "خطأ في تحميل البنود" : "Error loading items", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleGlobalDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer.items.length > 0) setIsGlobalDragOver(true); }, []);
  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsGlobalDragOver(false); }, []);
  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsGlobalDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.pdf') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setDraggedFile(file); setActiveTab("analyze");
      }
    }
  }, []);

  const getPricingPct = useCallback((project: ProjectData) => {
    const totalCount = project.items_count || 0;
    if (totalCount === 0) return 0;
    const pricedCount = (project.analysis_data?.items || [])
      .filter((item: any) => (item.unit_price || 0) > 0 || (item.total_price || 0) > 0).length;
    return Math.round((pricedCount / totalCount) * 100);
  }, []);

  const projectStats = useMemo(() => {
    const totalValue = projects.reduce((sum, p) => sum + getSafeProjectTotal(p), 0);
    const totalItems = projects.reduce((sum, p) => sum + (p.items_count || 0), 0);
    const completedPricing = projects.filter(p => getPricingPct(p) === 100).length;
    return { totalValue, totalItems, completedPricing };
  }, [projects, getPricingPct]);

  const filteredProjects = useMemo(() => {
    let result = [...projects];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(query) || p.file_name?.toLowerCase().includes(query));
    }
    if (pricingFilter === "completed") result = result.filter(p => getPricingPct(p) === 100);
    else if (pricingFilter === "in_progress") result = result.filter(p => { const pct = getPricingPct(p); return pct > 0 && pct < 100; });
    else if (pricingFilter === "no_pricing") result = result.filter(p => getPricingPct(p) === 0);
    else if (pricingFilter === "favorites") result = result.filter(p => isFavorite(p.id));
    
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "name": aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        case "total_value": aVal = a.total_value || 0; bVal = b.total_value || 0; break;
        case "items_count": aVal = a.items_count || 0; bVal = b.items_count || 0; break;
        default: aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); break;
      }
      if (typeof aVal === "string") return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    result.sort((a, b) => (isFavorite(a.id) ? 0 : 1) - (isFavorite(b.id) ? 0 : 1));
    return result;
  }, [projects, searchQuery, sortField, sortDirection, pricingFilter, getPricingPct]);

  const handleStartEdit = (project: ProjectData) => { setEditingProjectId(project.id); setEditingName(project.name); };
  const handleCancelEdit = () => { setEditingProjectId(null); setEditingName(""); };

  const handleSaveEdit = async (projectId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) { toast({ title: isArabic ? "الاسم مطلوب" : "Name is required", variant: "destructive" }); return; }
    setIsSavingEdit(true);
    try {
      const [{ data: s1 }, { data: s2 }] = await Promise.all([
        supabase.from("saved_projects").select("id").eq("user_id", user!.id).ilike("name", trimmed).neq("id", projectId).limit(1),
        supabase.from("project_data").select("id").eq("user_id", user!.id).ilike("name", trimmed).neq("id", projectId).limit(1),
      ]);
      if ((s1 && s1.length > 0) || (s2 && s2.length > 0)) {
        toast({ title: isArabic ? "هذا الاسم مستخدم بالفعل" : "This name is already taken", variant: "destructive" });
        setIsSavingEdit(false); return;
      }
      await Promise.all([
        supabase.from("saved_projects").update({ name: trimmed, updated_at: new Date().toISOString() }).eq("id", projectId),
        supabase.from("project_data").update({ name: trimmed, updated_at: new Date().toISOString() }).eq("id", projectId),
      ]);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: trimmed } : p));
      setEditingProjectId(null); setEditingName("");
      toast({ title: isArabic ? "تم تحديث الاسم" : "Name updated" });
    } catch (err: any) {
      toast({ title: isArabic ? "خطأ في التحديث" : "Update error", description: err.message, variant: "destructive" });
    } finally { setIsSavingEdit(false); }
  };

  const handleExportToExcel = async (project: ProjectData) => {
    try {
      toast({ title: isArabic ? "جارٍ التصدير..." : "Exporting..." });
      const { data: items } = await supabase.from("project_items").select("*").eq("project_id", project.id).order("item_number");
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
      if (exportItems.length === 0) { toast({ title: isArabic ? "لا توجد بنود للتصدير" : "No items to export", variant: "destructive" }); return; }
      const { createWorkbook, addJsonSheet, downloadWorkbook } = await import("@/lib/exceljs-utils");
      const wb = createWorkbook();
      const ws = addJsonSheet(wb, exportItems, isArabic ? "بنود المشروع" : "Project Items");
      const totalKey = isArabic ? "الإجمالي" : "Total";
      const total = exportItems.reduce((sum: number, item: any) => sum + (Number(item[totalKey]) || 0), 0);
      const totalRow: any = {};
      const keys = Object.keys(exportItems[0]);
      keys.forEach(k => totalRow[k] = '');
      totalRow[isArabic ? "الوصف" : "Description"] = isArabic ? "الإجمالي الكلي" : "Grand Total";
      totalRow[totalKey] = total;
      const vals = keys.map(k => totalRow[k]);
      const addedRow = ws.addRow(vals);
      addedRow.font = { bold: true };
      await downloadWorkbook(wb, `${project.name}.xlsx`);
      toast({ title: isArabic ? "تم التصدير بنجاح" : "Exported successfully" });
    } catch (err: any) {
      toast({ title: isArabic ? "خطأ في التصدير" : "Export error", description: err.message, variant: "destructive" });
    }
  };

  const handleLoadProject = (project: ProjectData) => { navigate(`/projects/${project.id}`); };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds(prev => { const next = new Set(prev); if (next.has(projectId)) next.delete(projectId); else next.add(projectId); return next; });
  };

  const toggleSelectAll = () => {
    if (selectedProjectIds.size === filteredProjects.length) setSelectedProjectIds(new Set());
    else setSelectedProjectIds(new Set(filteredProjects.map(p => p.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedProjectIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedProjectIds);
      const now = new Date().toISOString();
      for (const id of ids) {
        await Promise.all([
          supabase.from("saved_projects").update({ is_deleted: true, deleted_at: now }).eq("id", id),
          supabase.from("project_data").update({ is_deleted: true, deleted_at: now }).eq("id", id),
        ]);
      }
      if (user) sessionStorage.removeItem(`pms_projects_${user.id}`);
      toast({ title: isArabic ? `تم نقل ${ids.length} مشروع إلى سلة المحذوفات` : `${ids.length} projects moved to recycle bin` });
      setSelectedProjectIds(new Set()); setShowBulkDeleteConfirm(false); fetchProjects(true);
    } catch (error: any) {
      toast({ title: isArabic ? "خطأ في الحذف الجماعي" : "Bulk delete error", description: error.message, variant: "destructive" });
    } finally { setIsBulkDeleting(false); }
  };

  const handleCloneProject = async (project: ProjectData) => {
    setIsCloning(true);
    try {
      const suffix = isArabic ? " - نسخة" : " - Copy";
      let newName = project.name + suffix;
      const existingNames = projects.map(p => p.name);
      let counter = 1;
      while (existingNames.includes(newName)) { counter++; newName = project.name + suffix + ` ${counter}`; }
      const newProjectId = crypto.randomUUID();
      const now = new Date().toISOString();
      await supabase.from("project_data").insert({ id: newProjectId, name: newName, file_name: project.file_name, analysis_data: project.analysis_data, wbs_data: project.wbs_data, total_value: project.total_value, items_count: project.items_count, currency: project.currency, user_id: user!.id, created_at: now, updated_at: now });
      await supabase.from("saved_projects").insert({ id: newProjectId, name: newName, file_name: project.file_name, analysis_data: project.analysis_data, wbs_data: project.wbs_data, user_id: user!.id, created_at: now, updated_at: now });
      const { data: originalItems } = await supabase.from("project_items").select("*").eq("project_id", project.id);
      if (originalItems && originalItems.length > 0) {
        const idMapping = new Map<string, string>();
        const clonedItems = originalItems.map((item: any) => { const newItemId = crypto.randomUUID(); idMapping.set(item.id, newItemId); const { id, created_at, ...rest } = item; return { ...rest, id: newItemId, project_id: newProjectId }; });
        for (let i = 0; i < clonedItems.length; i += 50) await supabase.from("project_items").insert(clonedItems.slice(i, i + 50));
        const originalItemIds = originalItems.map((item: any) => item.id);
        const { data: originalCosts } = await supabase.from("item_costs").select("*").in("project_item_id", originalItemIds);
        if (originalCosts && originalCosts.length > 0) {
          const clonedCosts = originalCosts.filter((cost: any) => idMapping.has(cost.project_item_id)).map((cost: any) => { const { id, created_at, ...rest } = cost; return { ...rest, id: crypto.randomUUID(), project_item_id: idMapping.get(cost.project_item_id)! }; });
          for (let i = 0; i < clonedCosts.length; i += 50) await supabase.from("item_costs").insert(clonedCosts.slice(i, i + 50));
        }
      }
      toast({ title: isArabic ? "تم نسخ المشروع بنجاح" : "Project cloned successfully", description: newName });
      fetchProjects();
    } catch (error: any) {
      toast({ title: isArabic ? "خطأ في نسخ المشروع" : "Clone error", description: error.message, variant: "destructive" });
    } finally { setIsCloning(false); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Demo projects for guest mode
  const DEMO_PROJECTS = [
    {
      id: "demo-1", name: isArabic ? "مبنى سكني - الرياض" : "Residential Building - Riyadh",
      items_count: 120, total_value: 2500000, currency: "SAR", created_at: "2026-01-15", pricing_pct: 75,
      categories: isArabic ? ["أعمال خرسانية", "أعمال تشطيبات", "أعمال كهربائية"] : ["Concrete Works", "Finishing Works", "Electrical Works"],
      demo_items: [
        { item_number: "1.1", description: isArabic ? "أعمال الحفر والردم" : "Excavation & Backfill", unit: "m³", quantity: 850, unit_price: 45, total_price: 38250 },
        { item_number: "1.2", description: isArabic ? "خرسانة مسلحة للأساسات" : "Reinforced Concrete - Foundations", unit: "m³", quantity: 320, unit_price: 1200, total_price: 384000 },
        { item_number: "2.1", description: isArabic ? "بلوك خرساني 20 سم" : "Concrete Block 20cm", unit: "m²", quantity: 2400, unit_price: 85, total_price: 204000 },
        { item_number: "3.1", description: isArabic ? "بلاط سيراميك أرضيات" : "Floor Ceramic Tiles", unit: "m²", quantity: 1200, unit_price: 120, total_price: 144000 },
        { item_number: "4.1", description: isArabic ? "توريد وتركيب كابلات كهرباء" : "Supply & Install Electrical Cables", unit: "m.l", quantity: 3500, unit_price: 25, total_price: 87500 },
      ],
    },
    {
      id: "demo-2", name: isArabic ? "مدرسة حكومية - جدة" : "Government School - Jeddah",
      items_count: 85, total_value: 1800000, currency: "SAR", created_at: "2026-02-01", pricing_pct: 60,
      categories: isArabic ? ["أعمال إنشائية", "أعمال ميكانيكية", "تشطيبات"] : ["Structural Works", "Mechanical Works", "Finishes"],
      demo_items: [
        { item_number: "1.1", description: isArabic ? "خرسانة مسلحة للأعمدة" : "RC Columns", unit: "m³", quantity: 180, unit_price: 1350, total_price: 243000 },
        { item_number: "1.2", description: isArabic ? "خرسانة مسلحة للبلاطات" : "RC Slabs", unit: "m³", quantity: 450, unit_price: 1100, total_price: 495000 },
        { item_number: "2.1", description: isArabic ? "تكييف مركزي" : "Central AC System", unit: "TR", quantity: 120, unit_price: 2500, total_price: 300000 },
        { item_number: "3.1", description: isArabic ? "دهانات داخلية" : "Interior Paint", unit: "m²", quantity: 5000, unit_price: 35, total_price: 175000 },
      ],
    },
    {
      id: "demo-3", name: isArabic ? "مستودع صناعي - الدمام" : "Industrial Warehouse - Dammam",
      items_count: 65, total_value: 950000, currency: "SAR", created_at: "2026-02-10", pricing_pct: 90,
      categories: isArabic ? ["هيكل معدني", "أعمال مدنية", "أنظمة إطفاء"] : ["Steel Structure", "Civil Works", "Fire Systems"],
      demo_items: [
        { item_number: "1.1", description: isArabic ? "هيكل معدني رئيسي" : "Main Steel Structure", unit: "ton", quantity: 85, unit_price: 5500, total_price: 467500 },
        { item_number: "1.2", description: isArabic ? "ألواح ساندوتش بانل" : "Sandwich Panels", unit: "m²", quantity: 1800, unit_price: 95, total_price: 171000 },
        { item_number: "2.1", description: isArabic ? "أرضيات خرسانية صناعية" : "Industrial Concrete Floor", unit: "m²", quantity: 2000, unit_price: 75, total_price: 150000 },
      ],
    },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
          <div className="container mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-primary" />
              <span className="font-medium">{isArabic ? "أنت تتصفح كزائر" : "You're browsing as a guest"}</span>
              <span className="text-muted-foreground">{isArabic ? "— سجل دخولك لحفظ مشاريعك" : "— Sign in to save your projects"}</span>
            </div>
            <Button size="sm" onClick={() => navigate('/auth')} className="gap-1.5">
              {isArabic ? "تسجيل الدخول" : "Sign In"}
            </Button>
          </div>
        </div>

        <PageHeader
          icon={FolderOpen}
          title={isArabic ? "المشاريع" : "Projects"}
          subtitle={isArabic ? "استعرض مشاريع تجريبية وتعرف على النظام" : "Explore demo projects and learn the system"}
          stats={[{ value: DEMO_PROJECTS.length, label: isArabic ? "مشاريع تجريبية" : "Demo Projects" }]}
          actions={<div className="flex items-center gap-2"><LanguageToggle /><ThemeToggle /></div>}
        />

        <main className="container mx-auto px-4 py-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEMO_PROJECTS.map((demo) => (
              <div key={demo.id} className="glass-card p-5 cursor-pointer hover:shadow-lg transition-all" onClick={() => setSelectedDemoProject(demo)}>
                <h3 className="font-semibold mb-2">{demo.name}</h3>
                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div className="flex items-center gap-1"><Package className="w-3 h-3" />{demo.items_count} {isArabic ? "بند" : "items"}</div>
                  <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatLargeNumber(demo.total_value)}</div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", demo.pricing_pct === 100 ? "bg-green-500" : "bg-primary")} style={{ width: `${demo.pricing_pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{demo.pricing_pct}% {isArabic ? "مسعّر" : "priced"}</p>
              </div>
            ))}
          </div>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{isArabic ? "سجل دخولك للوصول لكل الميزات" : "Sign in to access all features"}</p>
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2 btn-gradient shadow-lg">
              <Plus className="w-5 h-5" />{isArabic ? "إنشاء حساب مجاني" : "Create Free Account"}
            </Button>
          </div>
        </main>

        <Dialog open={!!selectedDemoProject} onOpenChange={(open) => !open && setSelectedDemoProject(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />{selectedDemoProject?.name}
                <Badge variant="outline" className="text-xs">{isArabic ? "عرض فقط" : "Read-only"}</Badge>
              </DialogTitle>
            </DialogHeader>
            {selectedDemoProject && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold text-primary">{selectedDemoProject.items_count}</p>
                    <p className="text-xs text-muted-foreground">{isArabic ? "بند" : "Items"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold text-primary">{formatLargeNumber(selectedDemoProject.total_value)}</p>
                    <p className="text-xs text-muted-foreground">{selectedDemoProject.currency}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold text-primary">{selectedDemoProject.pricing_pct}%</p>
                    <p className="text-xs text-muted-foreground">{isArabic ? "مسعّر" : "Priced"}</p>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-start font-medium">#</th>
                        <th className="px-3 py-2 text-start font-medium">{isArabic ? "الوصف" : "Description"}</th>
                        <th className="px-3 py-2 text-center font-medium">{isArabic ? "الوحدة" : "Unit"}</th>
                        <th className="px-3 py-2 text-center font-medium">{isArabic ? "الكمية" : "Qty"}</th>
                        <th className="px-3 py-2 text-end font-medium">{isArabic ? "السعر" : "Price"}</th>
                        <th className="px-3 py-2 text-end font-medium">{isArabic ? "الإجمالي" : "Total"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedDemoProject.demo_items.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="px-3 py-2 text-muted-foreground">{item.item_number}</td>
                          <td className="px-3 py-2 font-medium">{item.description}</td>
                          <td className="px-3 py-2 text-center">{item.unit}</td>
                          <td className="px-3 py-2 text-center">{item.quantity.toLocaleString()}</td>
                          <td className="px-3 py-2 text-end">{item.unit_price.toLocaleString()}</td>
                          <td className="px-3 py-2 text-end font-semibold">{item.total_price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pt-2 text-center">
                  <Button onClick={() => { setSelectedDemoProject(null); navigate('/auth'); }} className="gap-2">
                    <Plus className="w-4 h-4" />{isArabic ? "سجل دخولك لإنشاء مشروعك" : "Sign in to create your project"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
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
            <LanguageToggle /><ThemeToggle />
            <Link to="/settings"><Button variant="ghost" size="icon" className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10"><Settings2 className="h-4 w-4" /></Button></Link>
            <UserMenu />
          </div>
        }
      />

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-5 p-1 h-auto tabs-navigation-safe bg-muted/50 backdrop-blur-sm">
              <TabsTrigger value="projects" className="gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50">
                <FolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? "المشاريع" : "Projects"}</span>
                {projects.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary/10 text-primary">{projects.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="analyze" className={cn("gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50", showNewProjectBanner && "ring-2 ring-primary/50 animate-pulse")}>
                <Sparkles className={cn("w-4 h-4", showNewProjectBanner && "text-primary animate-bounce")} />
                <span className="hidden sm:inline">{isArabic ? "تحليل BOQ" : "Analyze BOQ"}</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50">
                <BarChart3 className="w-4 h-4" /><span className="hidden sm:inline">{isArabic ? "التقارير" : "Reports"}</span>
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50">
                <Paperclip className="w-4 h-4" /><span className="hidden sm:inline">{isArabic ? "المرفقات" : "Attachments"}</span>
              </TabsTrigger>
              <TabsTrigger value="recycle-bin" className="gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50">
                <Trash2 className="w-4 h-4" /><span className="hidden sm:inline">{isArabic ? "المحذوفات" : "Recycle Bin"}</span>
              </TabsTrigger>
            </TabsList>
            {activeTab === "projects" && (
              <div className="flex gap-2">
                <Button onClick={() => navigate("/projects/new")} className="gap-2 shadow-sm">
                  <Plus className="w-4 h-4" /><span className="hidden sm:inline">{isArabic ? "مشروع جديد" : "New Project"}</span>
                </Button>
              </div>
            )}
          </div>
          
          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6 relative" onDragOver={handleGlobalDragOver} onDragLeave={handleGlobalDragLeave} onDrop={handleGlobalDrop}>
            {isGlobalDragOver && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-xl backdrop-blur-sm pointer-events-none">
                <div className="text-center">
                  <Upload className="w-16 h-16 mx-auto mb-3 text-primary" />
                  <p className="text-xl font-semibold text-primary">{isArabic ? "أفلت الملف لبدء التحليل" : "Drop file to start analysis"}</p>
                  <p className="text-sm text-muted-foreground mt-1">PDF, Excel</p>
                </div>
              </div>
            )}

            {/* Smart Suggestions */}
            {projects.length > 0 && (
              <SmartSuggestionsBanner suggestions={(() => {
                const s: SmartSuggestion[] = [];
                const unpriced = projects.filter(p => !p.total_value || p.total_value === 0).length;
                if (unpriced > 0) s.push({ id: 'unpriced', icon: <DollarSign className="h-4 w-4" />, text: isArabic ? `${unpriced} مشاريع بدون تسعير — سعّرها الآن` : `${unpriced} unpriced projects — price them now`, action: () => {}, actionLabel: isArabic ? 'تسعير' : 'Price' });
                if (projects.length > 3) s.push({ id: 'reports', icon: <BarChart3 className="h-4 w-4" />, text: isArabic ? 'قارن مشاريعك في تقرير شامل' : 'Compare your projects in a comprehensive report', action: () => setActiveTab('reports'), actionLabel: isArabic ? 'التقارير' : 'Reports' });
                return s.slice(0, 2);
              })()} />
            )}

            {/* Quick Upload Section */}
            <div className="glass-card p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileUp className="w-5 h-5 text-primary" /></div>
                    <div>
                      <h3 className="font-display font-semibold text-lg">{isArabic ? "رفع وتحليل BOQ جديد" : "Upload & Analyze New BOQ"}</h3>
                      <p className="text-sm text-muted-foreground">{isArabic ? "حلل ملفات PDF أو Excel أو Word لاستخراج بنود جدول الكميات تلقائياً" : "Analyze PDF, Excel, or Word files to extract BOQ items automatically"}</p>
                    </div>
                  </div>
                </div>
                <Button onClick={() => setActiveTab("analyze")} className="gap-2 btn-gradient shadow-md hover:shadow-lg transition-all">
                  <Sparkles className="w-4 h-4" />{isArabic ? "ابدأ التحليل" : "Start Analysis"}
                </Button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="glass-card p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="text" placeholder={isArabic ? "بحث في المشاريع..." : "Search projects..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sortField} onValueChange={setSortField}>
                    <SelectTrigger className="w-40"><SelectValue placeholder={isArabic ? "ترتيب حسب" : "Sort by"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">{isArabic ? "تاريخ الإنشاء" : "Date Created"}</SelectItem>
                      <SelectItem value="name">{isArabic ? "الاسم" : "Name"}</SelectItem>
                      <SelectItem value="total_value">{isArabic ? "القيمة" : "Value"}</SelectItem>
                      <SelectItem value="items_count">{isArabic ? "عدد البنود" : "Items Count"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}>
                    {sortDirection === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span>{filteredProjects.length} {isArabic ? "مشروع" : "projects"}</span>
                {searchQuery && <Badge variant="outline" className="gap-1">{isArabic ? "بحث" : "Search"}: {searchQuery}</Badge>}
              </div>
            </div>

            {/* Stats */}
            {projects.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-card p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><FolderOpen className="w-4 h-4 text-primary" /></div>
                  <div><p className="text-xs text-muted-foreground">{isArabic ? "المشاريع" : "Projects"}</p><p className="font-bold text-lg">{projects.length}</p></div>
                </div>
                <div className="glass-card p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
                  <div><p className="text-xs text-muted-foreground">{isArabic ? "إجمالي القيمة" : "Total Value"}</p><p className="font-bold text-sm">{formatLargeNumber(projectStats.totalValue)}</p></div>
                </div>
                <div className="glass-card p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
                  <div><p className="text-xs text-muted-foreground">{isArabic ? "إجمالي البنود" : "Total Items"}</p><p className="font-bold text-lg">{projectStats.totalItems.toLocaleString()}</p></div>
                </div>
                <div className="glass-card p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
                  <div><p className="text-xs text-muted-foreground">{isArabic ? "مكتمل التسعير" : "Fully Priced"}</p><p className="font-bold text-lg">{projectStats.completedPricing}</p></div>
                </div>
              </div>
            )}

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: isArabic ? "الكل" : "All", icon: Filter },
                { key: "completed", label: isArabic ? "مكتمل" : "Complete", icon: CheckCircle2 },
                { key: "in_progress", label: isArabic ? "قيد التسعير" : "In Progress", icon: Clock },
                { key: "no_pricing", label: isArabic ? "بدون تسعير" : "No Pricing", icon: CircleDashed },
                { key: "favorites", label: isArabic ? "المفضلة" : "Favorites", icon: Star },
              ].map(f => (
                <button key={f.key} onClick={() => setPricingFilter(f.key)}
                  className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                    pricingFilter === f.key ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background border-border hover:bg-muted"
                  )}>
                  <f.icon className="w-3 h-3" />{f.label}
                  {f.key === "all" && <span className="opacity-70">({projects.length})</span>}
                  {f.key === "completed" && <span className="opacity-70">({projectStats.completedPricing})</span>}
                  {f.key === "favorites" && <span className="opacity-70">({favorites.size})</span>}
                </button>
              ))}
            </div>

            {/* Bulk Actions */}
            {selectedProjectIds.size > 0 && (
              <div className="glass-card p-3 flex items-center justify-between gap-3 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3">
                  <Checkbox checked={selectedProjectIds.size === filteredProjects.length && filteredProjects.length > 0} onCheckedChange={toggleSelectAll} />
                  <span className="text-sm font-medium">{selectedProjectIds.size} {isArabic ? "محدد" : "selected"}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProjectIds(new Set())}><X className="w-4 h-4 mr-1" />{isArabic ? "إلغاء التحديد" : "Deselect"}</Button>
                </div>
                <Button variant="destructive" size="sm" className="gap-2" onClick={() => setShowBulkDeleteConfirm(true)}>
                  <Trash2 className="w-4 h-4" />{isArabic ? `حذف المحدد (${selectedProjectIds.size})` : `Delete Selected (${selectedProjectIds.size})`}
                </Button>
              </div>
            )}

            <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
              <AlertDialogContent dir={isArabic ? 'rtl' : 'ltr'}>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isArabic ? "نقل المشاريع المحددة لسلة المحذوفات" : "Move Selected to Recycle Bin"}</AlertDialogTitle>
                  <AlertDialogDescription>{isArabic ? `سيتم نقل ${selectedProjectIds.size} مشروع إلى سلة المحذوفات. يمكنك استعادتها خلال 30 يوم.` : `${selectedProjectIds.size} projects will be moved to the recycle bin. You can restore them within 30 days.`}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel disabled={isBulkDeleting}>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground" disabled={isBulkDeleting}>
                    {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{isArabic ? "حذف" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Projects Grid */}
            <TooltipProvider delayDuration={300}>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="glass-card p-5 space-y-4">
                      <div className="flex items-center gap-3"><Skeleton className="h-4 w-4 rounded" /><Skeleton className="h-5 w-3/4" /></div>
                      <Skeleton className="h-3 w-1/2" />
                      <div className="grid grid-cols-2 gap-3"><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-16 rounded-lg" /></div>
                      <Skeleton className="h-1.5 w-full rounded-full" /><Skeleton className="h-3 w-1/3" />
                      <div className="flex gap-2"><Skeleton className="h-8 flex-1 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div>
                    </div>
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"><FolderOpen className="w-10 h-10 text-primary" /></div>
                  <h3 className="font-display text-xl font-bold mb-2">
                    {searchQuery ? (isArabic ? "لا توجد نتائج" : "No results found") : (isArabic ? "مرحباً! لا توجد مشاريع بعد" : "Welcome! No projects yet")}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {searchQuery ? (isArabic ? "جرّب كلمات بحث مختلفة" : "Try different search terms") : (isArabic ? "ابدأ رحلتك بإنشاء مشروع جديد أو رفع ملف BOQ لتحليله تلقائياً" : "Start by creating a new project or uploading a BOQ file for automatic analysis")}
                  </p>
                  {!searchQuery && (
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button onClick={() => navigate('/projects/new')} size="lg" className="gap-2 btn-gradient shadow-lg"><Plus className="w-5 h-5" />{isArabic ? "إنشاء مشروع جديد" : "Create New Project"}</Button>
                      <Button onClick={() => setActiveTab("analyze")} size="lg" variant="outline" className="gap-2"><Upload className="w-5 h-5" />{isArabic ? "رفع وتحليل BOQ" : "Upload & Analyze BOQ"}</Button>
                    </div>
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
                      <ProjectCard
                        key={project.id}
                        project={project}
                        index={index}
                        isArabic={isArabic}
                        isSelected={selectedProjectIds.has(project.id)}
                        isFavorite={isFavorite(project.id)}
                        isCloning={isCloning}
                        editingProjectId={editingProjectId}
                        editingName={editingName}
                        isSavingEdit={isSavingEdit}
                        pricingPct={pricingPct}
                        pricedCount={pricedCount}
                        totalCount={totalCount}
                        onToggleSelection={toggleProjectSelection}
                        onToggleFavorite={toggleFavorite}
                        onStartEdit={handleStartEdit}
                        onCancelEdit={handleCancelEdit}
                        onSaveEdit={handleSaveEdit}
                        onEditingNameChange={setEditingName}
                        onViewDetails={handleViewDetails}
                        onExportExcel={handleExportToExcel}
                        onClone={handleCloneProject}
                        onDelete={handleDelete}
                        onLoad={handleLoadProject}
                      />
                    );
                  })}
                </div>
              )}
            </TooltipProvider>
          </TabsContent>

          {/* Analyze BOQ Tab */}
          <TabsContent value="analyze" className="space-y-4">
            {showNewProjectBanner && newProjectState?.newProjectName && (
              <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-5">
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/15 mt-0.5"><Sparkles className="w-5 h-5 text-primary" /></div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{isArabic ? "🎉 تم إنشاء المشروع بنجاح!" : "🎉 Project Created Successfully!"}</h3>
                      <p className="text-sm text-muted-foreground">{isArabic ? `المشروع "${newProjectState.newProjectName}" جاهز. ارفع ملف BOQ الآن لبدء التحليل والتسعير.` : `Project "${newProjectState.newProjectName}" is ready. Upload your BOQ file now to start analysis and pricing.`}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowNewProjectBanner(false)}><X className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
            <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
              <BOQAnalyzerPanel
                key={draggedFile?.name ?? "default"}
                initialFile={draggedFile ?? undefined}
                onProjectSaved={() => { setDraggedFile(null); setShowNewProjectBanner(false); fetchProjects(); setActiveTab("projects"); }}
                embedded={true}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="reports"><ReportsTab isArabic={isArabic} /></TabsContent>
          <TabsContent value="attachments"><AttachmentsTab initialExtractionMode={extractionMode} /></TabsContent>
          <TabsContent value="recycle-bin">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
              <RecycleBin onRestored={() => fetchProjects(true)} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>

      {/* Project Quick View Dialog */}
      <ProjectQuickView
        project={selectedProject}
        items={projectItems}
        isLoading={isLoadingItems}
        isArabic={isArabic}
        onClose={() => setSelectedProject(null)}
        onExportExcel={handleExportToExcel}
      />
    </div>
  );
}

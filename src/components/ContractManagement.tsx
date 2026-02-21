import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Save,
  Loader2,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  Shield,
  Percent,
  FileCheck,
  CheckCircle,
  Sparkles,
  Languages,
  Printer,
  BookOpen,
  LayoutTemplate,
  Zap,
  Award,
  TrendingUp,
  Check,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ContractsPrintPreview } from "@/components/contracts/ContractsPrintPreview";
import { ContractBOQTab } from "@/components/contracts/ContractBOQTab";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

// ============= TYPES =============
interface RegisteredSubcontractor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  license_number: string | null;
}
interface Contract {
  id: string;
  contract_number: string;
  contract_title: string;
  contractor_name: string | null;
  contractor_license_number: string | null;
  contractor_phone: string | null;
  contractor_email: string | null;
  contractor_address: string | null;
  contractor_category: string | null;
  contract_type: string;
  contract_value: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  payment_terms: string | null;
  scope_of_work: string | null;
  terms_conditions: string | null;
  notes: string | null;
  retention_percentage: number | null;
  advance_payment_percentage: number | null;
  performance_bond_value: number | null;
  performance_bond_percentage: number | null;
  execution_percentage: number | null;
  variation_limit_percentage: number | null;
  contract_duration_months: number | null;
  created_at: string;
}

interface ContractManagementProps {
  projectId?: string;
}

// ============= CONSTANTS (outside component) =============
const FIDIC_BOOKS = [
  { id: "fidic_red", colorClass: "from-red-500 to-red-700", borderClass: "border-red-500", bgClass: "bg-red-500", nameAr: "الكتاب الأحمر", nameEn: "Red Book", descAr: "المقاولات التقليدية - تصميم من صاحب العمل", descEn: "Traditional Construction - Employer's Design", icon: "🔴" },
  { id: "fidic_yellow", colorClass: "from-yellow-400 to-yellow-600", borderClass: "border-yellow-500", bgClass: "bg-yellow-500", nameAr: "الكتاب الأصفر", nameEn: "Yellow Book", descAr: "التصميم والبناء", descEn: "Design-Build", icon: "🟡" },
  { id: "fidic_silver", colorClass: "from-slate-400 to-slate-600", borderClass: "border-slate-400", bgClass: "bg-slate-400", nameAr: "الكتاب الفضي", nameEn: "Silver Book", descAr: "تسليم مفتاح EPC/Turnkey", descEn: "EPC/Turnkey Projects", icon: "⚪" },
  { id: "fidic_green", colorClass: "from-green-500 to-green-700", borderClass: "border-green-500", bgClass: "bg-green-500", nameAr: "الكتاب الأخضر", nameEn: "Green Book", descAr: "عقود قصيرة المدة", descEn: "Short Form Contracts", icon: "🟢" },
  { id: "fidic_gold", colorClass: "from-amber-500 to-amber-700", borderClass: "border-amber-500", bgClass: "bg-amber-500", nameAr: "الكتاب الذهبي", nameEn: "Gold Book", descAr: "التصميم والبناء والتشغيل DBO", descEn: "Design-Build-Operate (DBO)", icon: "🟠" },
  { id: "fidic_white", colorClass: "from-gray-300 to-gray-500", borderClass: "border-gray-400", bgClass: "bg-gray-400", nameAr: "الكتاب الأبيض", nameEn: "White Book", descAr: "الاستشارات الهندسية", descEn: "Consulting Services Agreement", icon: "⚪" },
] as const;

const CONTRACT_TEMPLATES = [
  { id: "general", iconEmoji: "🏗️", nameAr: "عقد مقاولات عامة", nameEn: "General Contracting", descAr: "عقد مقاولات تقليدية شامل للمشاريع الإنشائية", descEn: "Traditional comprehensive construction contract", defaults: { contract_type: "fidic_red", retention_percentage: "10", advance_payment_percentage: "20", performance_bond_percentage: "5", variation_limit_percentage: "15" } },
  { id: "design_build", iconEmoji: "📐", nameAr: "عقد تصميم وبناء", nameEn: "Design & Build", descAr: "عقد متكامل يشمل التصميم والتنفيذ", descEn: "Integrated design and construction contract", defaults: { contract_type: "fidic_yellow", retention_percentage: "10", advance_payment_percentage: "15", performance_bond_percentage: "10", variation_limit_percentage: "10" } },
  { id: "consulting", iconEmoji: "📋", nameAr: "عقد استشارات هندسية", nameEn: "Consulting Agreement", descAr: "عقد خدمات استشارية وإشراف هندسي", descEn: "Engineering consulting and supervision services", defaults: { contract_type: "fidic_white", retention_percentage: "5", advance_payment_percentage: "10", performance_bond_percentage: "5", variation_limit_percentage: "20" } },
  { id: "operation", iconEmoji: "⚙️", nameAr: "عقد تشغيل وصيانة", nameEn: "O&M Contract", descAr: "عقد تشغيل وصيانة المنشآت والمرافق", descEn: "Facilities operation and maintenance contract", defaults: { contract_type: "fidic_gold", retention_percentage: "5", advance_payment_percentage: "10", performance_bond_percentage: "5", variation_limit_percentage: "10" } },
] as const;

const CONTRACTOR_CATEGORIES = [
  { value: "first", labelEn: "First Class", labelAr: "الفئة الأولى" },
  { value: "second", labelEn: "Second Class", labelAr: "الفئة الثانية" },
  { value: "third", labelEn: "Third Class", labelAr: "الفئة الثالثة" },
  { value: "fourth", labelEn: "Fourth Class", labelAr: "الفئة الرابعة" },
  { value: "fifth", labelEn: "Fifth Class", labelAr: "الفئة الخامسة" },
  { value: "specialist", labelEn: "Specialist", labelAr: "متخصص" },
] as const;

const CONTRACT_TYPES = [
  { value: "fidic_red", labelEn: "FIDIC Red Book (Construction)", labelAr: "فيديك الكتاب الأحمر (البناء)", color: "bg-red-500" },
  { value: "fidic_yellow", labelEn: "FIDIC Yellow Book (Design-Build)", labelAr: "فيديك الكتاب الأصفر (التصميم والبناء)", color: "bg-yellow-500" },
  { value: "fidic_silver", labelEn: "FIDIC Silver Book (EPC/Turnkey)", labelAr: "فيديك الكتاب الفضي (تسليم مفتاح)", color: "bg-gray-500" },
  { value: "fidic_green", labelEn: "FIDIC Green Book (Short Form)", labelAr: "فيديك الكتاب الأخضر (النموذج القصير)", color: "bg-green-500" },
  { value: "fidic_gold", labelEn: "FIDIC Gold Book (DBO)", labelAr: "فيديك الكتاب الذهبي (تصميم وبناء وتشغيل)", color: "bg-amber-500" },
  { value: "fidic_white", labelEn: "FIDIC White Book (Consulting)", labelAr: "فيديك الكتاب الأبيض (استشارات)", color: "bg-gray-400" },
  { value: "fixed_price", labelEn: "Fixed Price", labelAr: "سعر ثابت", color: "bg-blue-500" },
  { value: "cost_plus", labelEn: "Cost Plus", labelAr: "التكلفة زائد", color: "bg-indigo-500" },
  { value: "unit_price", labelEn: "Unit Price", labelAr: "سعر الوحدة", color: "bg-cyan-500" },
  { value: "lump_sum", labelEn: "Lump Sum", labelAr: "مبلغ مقطوع", color: "bg-teal-500" },
] as const;

const CONTRACT_STATUSES = [
  { value: "draft", labelEn: "Draft", labelAr: "مسودة", color: "bg-gray-500" },
  { value: "pending", labelEn: "Pending Approval", labelAr: "بانتظار الموافقة", color: "bg-yellow-500" },
  { value: "active", labelEn: "Active", labelAr: "نشط", color: "bg-green-500" },
  { value: "on_hold", labelEn: "On Hold", labelAr: "معلق", color: "bg-orange-500" },
  { value: "completed", labelEn: "Completed", labelAr: "مكتمل", color: "bg-blue-500" },
  { value: "terminated", labelEn: "Terminated", labelAr: "منتهي", color: "bg-red-500" },
] as const;

const PROJECT_TYPES = [
  { value: "residential", labelAr: "مباني سكنية", labelEn: "Residential Buildings" },
  { value: "commercial", labelAr: "مباني تجارية", labelEn: "Commercial Buildings" },
  { value: "infrastructure", labelAr: "بنية تحتية", labelEn: "Infrastructure" },
  { value: "roads", labelAr: "طرق وجسور", labelEn: "Roads & Bridges" },
  { value: "industrial", labelAr: "منشآت صناعية", labelEn: "Industrial Facilities" },
  { value: "water", labelAr: "مشاريع مياه", labelEn: "Water Projects" },
  { value: "power", labelAr: "محطات طاقة", labelEn: "Power Plants" },
  { value: "renovation", labelAr: "ترميم", labelEn: "Renovation" },
] as const;

const TAB_ITEMS = [
  { value: "create", labelAr: "إنشاء عقد", labelEn: "Create Contract", icon: "📝" },
  { value: "fidic", labelAr: "FIDIC", labelEn: "FIDIC", icon: "📚" },
  { value: "templates", labelAr: "القوالب", labelEn: "Templates", icon: "📋" },
  { value: "features", labelAr: "الميزات", labelEn: "Features", icon: "⚡" },
  { value: "boq", labelAr: "بنود التسعير", labelEn: "BOQ Items", icon: "📦" },
  { value: "contracts", labelAr: "العقود الحالية", labelEn: "Current Contracts", icon: "📖" },
] as const;

const FEATURES_LIST = [
  { icon: Sparkles, titleAr: "توليد بالذكاء الاصطناعي", titleEn: "AI Content Generation", descAr: "توليد شروط الدفع ونطاق العمل تلقائياً", descEn: "Auto-generate payment terms & scope of work" },
  { icon: Languages, titleAr: "دعم ثنائي اللغة", titleEn: "Bilingual Support", descAr: "حقول ثنائية اللغة عربي/إنجليزي", descEn: "Arabic/English bilingual fields" },
  { icon: BookOpen, titleAr: "معايير FIDIC", titleEn: "FIDIC Standards", descAr: "دعم كامل لجميع كتب FIDIC الستة", descEn: "Full support for all 6 FIDIC books" },
  { icon: Shield, titleAr: "إدارة الضمانات", titleEn: "Bond Management", descAr: "حساب تلقائي للضمانات والمحتجزات", descEn: "Auto-calculation of bonds & retention" },
  { icon: TrendingUp, titleAr: "تتبع التقدم", titleEn: "Progress Tracking", descAr: "متابعة التقدم الزمني للعقود", descEn: "Time-based contract progress tracking" },
  { icon: Printer, titleAr: "تقارير احترافية", titleEn: "Professional Reports", descAr: "طباعة وتصدير تقارير العقود", descEn: "Print & export contract reports" },
] as const;

const INITIAL_FORM_DATA = {
  contract_number: "",
  contract_title: "",
  contract_type: "fidic_red",
  status: "draft",
  contractor_name: "",
  contractor_license_number: "",
  contractor_phone: "",
  contractor_email: "",
  contractor_address: "",
  contractor_category: "first",
  contract_value: "",
  currency: "SAR",
  start_date: "",
  end_date: "",
  contract_duration_months: "",
  retention_percentage: "10",
  advance_payment_percentage: "20",
  performance_bond_percentage: "5",
  performance_bond_value: "",
  variation_limit_percentage: "15",
  payment_terms: "",
  scope_of_work: "",
  notes: "",
  employer_name_ar: "",
  employer_name_en: "",
  employer_address_ar: "",
  employer_address_en: "",
  employer_id: "",
  employer_phone: "",
  contractor_name_en: "",
  contractor_address_en: "",
};

// ============= HELPER FUNCTIONS (outside component) =============
const getContractProgress = (contract: Contract) => {
  if (!contract.start_date || !contract.end_date) return 0;
  const start = new Date(contract.start_date);
  const end = new Date(contract.end_date);
  const now = new Date();
  const total = differenceInDays(end, start);
  const elapsed = differenceInDays(now, start);
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
};

const getDaysRemaining = (contract: Contract) => {
  if (!contract.end_date) return null;
  return differenceInDays(new Date(contract.end_date), new Date());
};

const getContractTypeInfo = (type: string) => {
  return CONTRACT_TYPES.find(t => t.value === type);
};

// ============= MEMOIZED SUB-COMPONENTS =============

const BiLabel = React.memo(({ ar: arText, en: enText, isArabic }: { ar: string; en: string; isArabic: boolean }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-primary font-semibold text-sm">{isArabic ? arText : enText}</span>
    <span className="text-muted-foreground text-xs font-normal">{isArabic ? enText : arText}</span>
  </div>
));
BiLabel.displayName = "BiLabel";

const StatsBar = React.memo(({ stats, isArabic }: { stats: { totalContracts: number; activeContracts: number; totalValueFormatted: string; avgProgress: number }; isArabic: boolean }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 bg-white/10 backdrop-blur-sm">
    {[
      { value: stats.totalContracts, labelAr: "إجمالي العقود", labelEn: "Total Contracts" },
      { value: stats.activeContracts, labelAr: "عقود نشطة", labelEn: "Active" },
      { value: stats.totalValueFormatted, labelAr: "إجمالي القيمة", labelEn: "Total Value", isText: true },
      { value: `${stats.avgProgress.toFixed(0)}%`, labelAr: "نسبة الإنجاز", labelEn: "Completion", isText: true },
    ].map((stat, idx) => (
      <div key={idx} className="text-center py-3 px-4 border-white/10 border-e last:border-e-0">
        <div className="text-lg md:text-xl font-bold text-amber-400">{stat.value}</div>
        <div className="text-xs text-white/80 mt-0.5">{isArabic ? stat.labelAr : stat.labelEn}</div>
      </div>
    ))}
  </div>
));
StatsBar.displayName = "StatsBar";

const ContractCard = React.memo(({ contract, isArabic, onView, onEdit, onDelete, formatCurrency }: {
  contract: Contract;
  isArabic: boolean;
  onView: (c: Contract) => void;
  onEdit: (c: Contract) => void;
  onDelete: (id: string) => void;
  formatCurrency: (value: number, currency: string) => string;
}) => {
  const status = CONTRACT_STATUSES.find(s => s.value === contract.status);
  const contractType = getContractTypeInfo(contract.contract_type);
  const progress = getContractProgress(contract);
  const daysRemaining = getDaysRemaining(contract);
  const category = CONTRACTOR_CATEGORIES.find(c => c.value === contract.contractor_category);

  return (
    <div className="p-4 rounded-xl border bg-card hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-xs">{contract.contract_number}</Badge>
            <Badge className={cn("text-white text-xs", status?.color)}>{isArabic ? status?.labelAr : status?.labelEn}</Badge>
            {contractType && contract.contract_type.startsWith("fidic_") && (
              <Badge variant="secondary" className={cn("text-xs text-white", contractType.color)}>FIDIC</Badge>
            )}
          </div>
          <h4 className="font-semibold">{contract.contract_title}</h4>
          {contract.contractor_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Building2 className="w-3 h-3" /><span>{contract.contractor_name}</span>
              {category && <Badge variant="outline" className="text-xs">{isArabic ? category.labelAr : category.labelEn}</Badge>}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onView(contract)}><Eye className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(contract)}><Edit className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(contract.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
        {contract.contract_value && (
          <div className="flex items-center gap-1"><DollarSign className="w-4 h-4 text-muted-foreground" /><span className="font-medium">{formatCurrency(contract.contract_value, contract.currency)}</span></div>
        )}
        <div className="flex items-center gap-1"><FileText className="w-4 h-4 text-muted-foreground" /><span className="text-xs">{contractType?.[isArabic ? "labelAr" : "labelEn"]}</span></div>
        {contract.start_date && (
          <div className="flex items-center gap-1"><Calendar className="w-4 h-4 text-muted-foreground" /><span>{format(new Date(contract.start_date), "PP", { locale: isArabic ? ar : enUS })}</span></div>
        )}
        {daysRemaining !== null && (
          <div className={cn("flex items-center gap-1", daysRemaining < 0 ? "text-red-600" : daysRemaining < 30 ? "text-orange-600" : "")}>
            <Clock className="w-4 h-4" />
            <span>{daysRemaining < 0 ? (isArabic ? `متأخر ${Math.abs(daysRemaining)} يوم` : `${Math.abs(daysRemaining)} days overdue`) : (isArabic ? `${daysRemaining} يوم متبقي` : `${daysRemaining} days left`)}</span>
          </div>
        )}
      </div>

      {contract.start_date && contract.end_date && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{isArabic ? "التقدم الزمني" : "Time Progress"}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
    </div>
  );
});
ContractCard.displayName = "ContractCard";

// ============= MAIN COMPONENT =============
export function ContractManagement({ projectId }: ContractManagementProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [activeTab, setActiveTab] = useState("create");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [registeredSubcontractors, setRegisteredSubcontractors] = useState<RegisteredSubcontractor[]>([]);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // Pagination
  const pagination = usePagination({ pageSize: 10 });

  // ============= DATA FETCHING =============
  const fetchContracts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("contracts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  const fetchRegisteredSubcontractors = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("subcontractors")
        .select("id, name, email, phone, specialty, license_number")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("name");
      setRegisteredSubcontractors(data || []);
    } catch (error) {
      console.error("Error fetching subcontractors:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchContracts();
    fetchRegisteredSubcontractors();
  }, [fetchContracts, fetchRegisteredSubcontractors]);

  // Auto-calculate duration
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const months = differenceInMonths(end, start);
      setFormData(prev => ({ ...prev, contract_duration_months: months.toString() }));
    }
  }, [formData.start_date, formData.end_date]);

  // Auto-calculate bond value
  useEffect(() => {
    if (formData.contract_value && formData.performance_bond_percentage) {
      const value = parseFloat(formData.contract_value);
      const percentage = parseFloat(formData.performance_bond_percentage);
      if (!isNaN(value) && !isNaN(percentage)) {
        const bondValue = (value * percentage / 100).toFixed(2);
        setFormData(prev => ({ ...prev, performance_bond_value: bondValue }));
      }
    }
  }, [formData.contract_value, formData.performance_bond_percentage]);

  // ============= MEMOIZED COMPUTATIONS =============
  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      const matchesSearch = searchTerm === "" || 
        contract.contract_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contract.contractor_name?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
      const matchesType = typeFilter === "all" || contract.contract_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [contracts, searchTerm, statusFilter, typeFilter]);

  // Update pagination when filtered contracts change
  useEffect(() => {
    pagination.setTotalItems(filteredContracts.length);
  }, [filteredContracts.length]);

  const paginatedContracts = useMemo(() => {
    return filteredContracts.slice(pagination.from, pagination.to + 1);
  }, [filteredContracts, pagination.from, pagination.to]);

  const stats = useMemo(() => {
    const totalValue = filteredContracts.reduce((sum, c) => sum + (c.contract_value || 0), 0);
    const activeContracts = filteredContracts.filter((c) => c.status === "active").length;
    const completedContracts = filteredContracts.filter((c) => c.status === "completed").length;
    const avgProgress = filteredContracts.length > 0
      ? filteredContracts.reduce((sum, c) => sum + getContractProgress(c), 0) / filteredContracts.length
      : 0;
    return { totalValue, activeContracts, completedContracts, avgProgress };
  }, [filteredContracts]);

  // ============= MEMOIZED CALLBACKS =============
  const formatCurrency = useCallback((value: number, currency: string) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency === "SAR" ? "SAR" : currency,
      maximumFractionDigits: 0,
    }).format(value);
  }, [isArabic]);

  const totalValueFormatted = useMemo(() => formatCurrency(stats.totalValue, "SAR"), [formatCurrency, stats.totalValue]);

  const statsBarData = useMemo(() => ({
    totalContracts: contracts.length,
    activeContracts: stats.activeContracts,
    totalValueFormatted,
    avgProgress: stats.avgProgress,
  }), [contracts.length, stats.activeContracts, totalValueFormatted, stats.avgProgress]);

  const handleSave = useCallback(async () => {
    if (!user || !formData.contract_number || !formData.contract_title) return;
    setSaving(true);
    try {
      const bilingualData = {
        employer_name_ar: formData.employer_name_ar,
        employer_name_en: formData.employer_name_en,
        employer_address_ar: formData.employer_address_ar,
        employer_address_en: formData.employer_address_en,
        employer_id: formData.employer_id,
        employer_phone: formData.employer_phone,
        contractor_name_en: formData.contractor_name_en,
        contractor_address_en: formData.contractor_address_en,
      };
      const notesWithBilingual = formData.notes 
        ? JSON.stringify({ text: formData.notes, bilingual: bilingualData })
        : JSON.stringify({ bilingual: bilingualData });

      const contractData = {
        user_id: user.id,
        project_id: projectId || null,
        contract_number: formData.contract_number,
        contract_title: formData.contract_title,
        contractor_name: formData.contractor_name || null,
        contractor_license_number: formData.contractor_license_number || null,
        contractor_phone: formData.contractor_phone || null,
        contractor_email: formData.contractor_email || null,
        contractor_address: formData.contractor_address || null,
        contractor_category: formData.contractor_category || null,
        contract_type: formData.contract_type,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
        currency: formData.currency,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        retention_percentage: formData.retention_percentage ? parseFloat(formData.retention_percentage) : null,
        advance_payment_percentage: formData.advance_payment_percentage ? parseFloat(formData.advance_payment_percentage) : null,
        performance_bond_percentage: formData.performance_bond_percentage ? parseFloat(formData.performance_bond_percentage) : null,
        performance_bond_value: formData.performance_bond_value ? parseFloat(formData.performance_bond_value) : null,
        variation_limit_percentage: formData.variation_limit_percentage ? parseFloat(formData.variation_limit_percentage) : null,
        contract_duration_months: formData.contract_duration_months ? parseInt(formData.contract_duration_months) : null,
        payment_terms: formData.payment_terms || null,
        scope_of_work: formData.scope_of_work || null,
        notes: notesWithBilingual,
      };

      if (editingContract) {
        const { error } = await supabase.from("contracts").update(contractData).eq("id", editingContract.id);
        if (error) throw error;
        toast({ title: isArabic ? "تم التحديث" : "Updated" });
      } else {
        const { error } = await supabase.from("contracts").insert(contractData);
        if (error) throw error;
        toast({ title: isArabic ? "تمت الإضافة" : "Added" });
      }

      resetForm();
      fetchContracts();
      setActiveTab("contracts");
    } catch (error) {
      console.error("Error saving contract:", error);
      toast({ title: isArabic ? "خطأ" : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [user, formData, editingContract, projectId, isArabic, toast, fetchContracts]);

  const handleDelete = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: isArabic ? "تم الحذف" : "Deleted" });
      fetchContracts();
    } catch (error) {
      console.error("Error deleting contract:", error);
    }
  }, [user, isArabic, toast, fetchContracts]);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setEditingContract(null);
  }, []);

  const openEditDialog = useCallback((contract: Contract) => {
    let bilingualData: any = {};
    let notesText = contract.notes || "";
    try {
      if (contract.notes) {
        const parsed = JSON.parse(contract.notes);
        if (parsed.bilingual) {
          bilingualData = parsed.bilingual;
          notesText = parsed.text || "";
        }
      }
    } catch { /* notes is plain text */ }

    setEditingContract(contract);
    setFormData({
      contract_number: contract.contract_number,
      contract_title: contract.contract_title,
      contract_type: contract.contract_type,
      status: contract.status,
      contractor_name: contract.contractor_name || "",
      contractor_license_number: contract.contractor_license_number || "",
      contractor_phone: contract.contractor_phone || "",
      contractor_email: contract.contractor_email || "",
      contractor_address: contract.contractor_address || "",
      contractor_category: contract.contractor_category || "first",
      contract_value: contract.contract_value?.toString() || "",
      currency: contract.currency,
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      contract_duration_months: contract.contract_duration_months?.toString() || "",
      retention_percentage: contract.retention_percentage?.toString() || "10",
      advance_payment_percentage: contract.advance_payment_percentage?.toString() || "20",
      performance_bond_percentage: contract.performance_bond_percentage?.toString() || "5",
      performance_bond_value: contract.performance_bond_value?.toString() || "",
      variation_limit_percentage: contract.variation_limit_percentage?.toString() || "15",
      payment_terms: contract.payment_terms || "",
      scope_of_work: contract.scope_of_work || "",
      notes: notesText,
      employer_name_ar: bilingualData.employer_name_ar || "",
      employer_name_en: bilingualData.employer_name_en || "",
      employer_address_ar: bilingualData.employer_address_ar || "",
      employer_address_en: bilingualData.employer_address_en || "",
      employer_id: bilingualData.employer_id || "",
      employer_phone: bilingualData.employer_phone || "",
      contractor_name_en: bilingualData.contractor_name_en || "",
      contractor_address_en: bilingualData.contractor_address_en || "",
    });
    setActiveTab("create");
  }, []);

  const openViewDialog = useCallback((contract: Contract) => {
    setViewingContract(contract);
    setIsViewDialogOpen(true);
  }, []);

  const generateWithAI = useCallback(async (field: 'payment_terms' | 'scope_of_work' | 'notes') => {
    setGeneratingField(field);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract-content', {
        body: { field, contract_type: formData.contract_type, contract_title: formData.contract_title, contractor_category: formData.contractor_category, language: isArabic ? 'ar' : 'en' }
      });
      if (error) throw error;
      if (data?.content) {
        setFormData(prev => ({ ...prev, [field]: data.content }));
        toast({ title: isArabic ? "تم التوليد بنجاح" : "Generated successfully" });
      }
    } catch (err) {
      console.error("AI generation error:", err);
      toast({ title: isArabic ? "خطأ في التوليد" : "Generation failed", variant: "destructive" });
    } finally {
      setGeneratingField(null);
    }
  }, [formData.contract_type, formData.contract_title, formData.contractor_category, isArabic, toast]);

  const translateContent = useCallback(async (field: 'payment_terms' | 'scope_of_work' | 'notes') => {
    const currentValue = formData[field];
    if (!currentValue) { toast({ title: isArabic ? "لا يوجد محتوى" : "No content", variant: "destructive" }); return; }
    setGeneratingField(field);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract-content', {
        body: { field, contract_type: formData.contract_type, contract_title: formData.contract_title, contractor_category: formData.contractor_category, language: isArabic ? 'en' : 'ar' }
      });
      if (error) throw error;
      if (data?.content) {
        setFormData(prev => ({ ...prev, [field]: data.content }));
        toast({ title: isArabic ? "تم الترجمة" : "Translated" });
      }
    } catch (err) {
      console.error("Translation error:", err);
      toast({ title: isArabic ? "خطأ" : "Error", variant: "destructive" });
    } finally {
      setGeneratingField(null);
    }
  }, [formData, isArabic, toast]);

  const applyTemplate = useCallback((template: typeof CONTRACT_TEMPLATES[number]) => {
    setFormData(prev => ({
      ...prev,
      ...template.defaults,
    }));
    setActiveTab("create");
    toast({ title: isArabic ? `تم تطبيق قالب: ${template.nameAr}` : `Template applied: ${template.nameEn}` });
  }, [isArabic, toast]);

  const selectFIDIC = useCallback((bookId: string) => {
    setFormData(prev => ({ ...prev, contract_type: bookId }));
    setActiveTab("create");
    toast({ title: isArabic ? "تم اختيار كتاب FIDIC" : "FIDIC book selected" });
  }, [isArabic, toast]);

  // AI buttons for text fields
  const AIButtons = useCallback(({ field }: { field: 'payment_terms' | 'scope_of_work' | 'notes' }) => (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={() => generateWithAI(field)} disabled={generatingField !== null} className="h-7 gap-1 text-xs text-primary hover:text-primary/80">
        {generatingField === field ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {isArabic ? "توليد AI" : "AI Generate"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => translateContent(field)} disabled={generatingField !== null || !formData[field]} className="h-7 gap-1 text-xs">
        <Languages className="w-3.5 h-3.5" />
        {isArabic ? "EN" : "عربي"}
      </Button>
    </div>
  ), [generateWithAI, translateContent, generatingField, isArabic, formData]);

  // ============= RENDER =============
  return (
    <div className="space-y-0">
      {/* Premium Header */}
      <div className="rounded-t-xl bg-gradient-to-r from-[hsl(222,47%,15%)] to-[hsl(217,72%,40%)] text-white p-0 overflow-hidden border-b-4 border-amber-500">
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl shadow-lg">
              🏗️
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                {isArabic ? "نظام العقود الهندسية الاحترافي" : "Professional Engineering Contracts"}
              </h1>
              <p className="text-sm text-white/80">
                {isArabic ? "وفقاً لمعايير FIDIC الدولية" : "According to FIDIC International Standards"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsPrintPreviewOpen(true)} className="gap-2 border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent">
              <Printer className="w-4 h-4" />
              {isArabic ? "طباعة" : "Print"}
            </Button>
            <Button onClick={() => { resetForm(); setActiveTab("create"); }} className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0 shadow-lg">
              <Plus className="w-4 h-4" />
              {isArabic ? "إنشاء عقد" : "New Contract"}
            </Button>
          </div>
        </div>
        <StatsBar stats={statsBarData} isArabic={isArabic} />
      </div>

      {/* Print Preview */}
      <ContractsPrintPreview open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen} contracts={filteredContracts} totalValue={stats.totalValue} activeCount={stats.activeContracts} />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-card border-b overflow-x-auto">
          <TabsList className="h-auto p-0 bg-transparent rounded-none w-full justify-start gap-0">
            {TAB_ITEMS.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 min-w-[140px] py-4 px-6 rounded-none border-b-[3px] border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary font-semibold text-muted-foreground hover:bg-muted/50 transition-all gap-2"
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{isArabic ? tab.labelAr : tab.labelEn}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="p-4 md:p-6 bg-muted/30 min-h-[400px]">
          {/* ============= CREATE TAB ============= */}
          <TabsContent value="create" className="mt-0 space-y-6">
            {/* Info Box */}
            <div className={cn("p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex gap-4 items-start", isArabic ? "border-r-4 border-blue-500" : "border-l-4 border-blue-500")}>
              <Info className="w-6 h-6 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-sm mb-1">{isArabic ? "نصيحة احترافية" : "Professional Tip"}</h4>
                <p className="text-sm text-muted-foreground">{isArabic ? "تأكد من اختيار كتاب FIDIC المناسب لنوع مشروعك. يمكنك الانتقال لتبويب FIDIC لمعرفة المزيد." : "Make sure to select the appropriate FIDIC book for your project. Visit the FIDIC tab to learn more."}</p>
              </div>
            </div>

            {/* Section 1: Contract Type & FIDIC */}
            <Card className="shadow-md border-0">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(217,72%,40%)] to-[hsl(222,47%,15%)] flex items-center justify-center text-white">🎯</div>
                  <div>
                    <CardTitle className="text-base">{isArabic ? "نوع العقد ومواصفات FIDIC" : "Contract Type & FIDIC Standards"}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label><BiLabel ar="نوع المشروع" en="Project Type" isArabic={isArabic} /></Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder={isArabic ? "-- اختر --" : "-- Select --"} /></SelectTrigger>
                      <SelectContent>
                        {PROJECT_TYPES.map(p => (
                          <SelectItem key={p.value} value={p.value}>{isArabic ? p.labelAr : p.labelEn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="كتاب FIDIC" en="FIDIC Book" isArabic={isArabic} /></Label>
                    <Select value={formData.contract_type} onValueChange={(v) => setFormData({ ...formData, contract_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTRACT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2.5 h-2.5 rounded-full", t.color)} />
                              {isArabic ? t.labelAr : t.labelEn}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="رقم العقد" en="Contract Number" isArabic={isArabic} /></Label>
                    <Input value={formData.contract_number} onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })} placeholder={isArabic ? "مثال: CON-2024-001" : "e.g., CON-2024-001"} />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="عنوان العقد" en="Contract Title" isArabic={isArabic} /></Label>
                    <Input value={formData.contract_title} onChange={(e) => setFormData({ ...formData, contract_title: e.target.value })} placeholder={isArabic ? "أدخل عنوان العقد" : "Enter contract title"} />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="تاريخ العقد" en="Contract Date" isArabic={isArabic} /></Label>
                    <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="الحالة" en="Status" isArabic={isArabic} /></Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTRACT_STATUSES.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2.5 h-2.5 rounded-full", s.color)} />
                              {isArabic ? s.labelAr : s.labelEn}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Employer */}
            <Card className="shadow-md border-0">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(217,72%,40%)] to-[hsl(222,47%,15%)] flex items-center justify-center text-white">👤</div>
                  <CardTitle className="text-base">{isArabic ? "بيانات صاحب العمل (The Employer)" : "Employer Details (صاحب العمل)"}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label><BiLabel ar="الاسم (عربي)" en="Name (Arabic)" isArabic={isArabic} /></Label>
                    <Input value={formData.employer_name_ar} onChange={(e) => setFormData({ ...formData, employer_name_ar: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="الاسم (إنجليزي)" en="Name (English)" isArabic={isArabic} /></Label>
                    <Input value={formData.employer_name_en} onChange={(e) => setFormData({ ...formData, employer_name_en: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="رقم الهوية/السجل" en="ID/Registration" isArabic={isArabic} /></Label>
                    <Input value={formData.employer_id} onChange={(e) => setFormData({ ...formData, employer_id: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="رقم الهاتف" en="Phone" isArabic={isArabic} /></Label>
                    <Input value={formData.employer_phone} onChange={(e) => setFormData({ ...formData, employer_phone: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="العنوان (عربي)" en="Address (Arabic)" isArabic={isArabic} /></Label>
                    <Input value={formData.employer_address_ar} onChange={(e) => setFormData({ ...formData, employer_address_ar: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="العنوان (إنجليزي)" en="Address (English)" isArabic={isArabic} /></Label>
                    <Input value={formData.employer_address_en} onChange={(e) => setFormData({ ...formData, employer_address_en: e.target.value })} dir="ltr" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Contractor */}
            <Card className="shadow-md border-0">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(217,72%,40%)] to-[hsl(222,47%,15%)] flex items-center justify-center text-white">🏢</div>
                  <CardTitle className="text-base">{isArabic ? "بيانات المقاول (The Contractor)" : "Contractor Details (المقاول)"}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Select from registered */}
                {registeredSubcontractors.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Users className="w-4 h-4" />{isArabic ? "اختيار مقاول مسجل" : "Select Registered Subcontractor"}</Label>
                    <Select value="none" onValueChange={(v) => {
                      if (v === "none") return;
                      const sub = registeredSubcontractors.find(s => s.id === v);
                      if (sub) setFormData(prev => ({ ...prev, contractor_name: sub.name, contractor_phone: sub.phone || "", contractor_email: sub.email || "", contractor_license_number: sub.license_number || "" }));
                    }}>
                      <SelectTrigger><SelectValue placeholder={isArabic ? "اختر أو أدخل يدوياً" : "Pick or enter manually"} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{isArabic ? "إدخال يدوي" : "Enter manually"}</SelectItem>
                        {registeredSubcontractors.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name} {sub.specialty ? `(${sub.specialty})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Separator className="my-2" />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label><BiLabel ar="اسم المقاول (عربي)" en="Name (Arabic)" isArabic={isArabic} /></Label>
                    <Input value={formData.contractor_name} onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="اسم المقاول (إنجليزي)" en="Name (English)" isArabic={isArabic} /></Label>
                    <Input value={formData.contractor_name_en} onChange={(e) => setFormData({ ...formData, contractor_name_en: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="رقم الترخيص" en="License Number" isArabic={isArabic} /></Label>
                    <Input value={formData.contractor_license_number} onChange={(e) => setFormData({ ...formData, contractor_license_number: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="رقم الهاتف" en="Phone" isArabic={isArabic} /></Label>
                    <Input value={formData.contractor_phone} onChange={(e) => setFormData({ ...formData, contractor_phone: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="البريد الإلكتروني" en="Email" isArabic={isArabic} /></Label>
                    <Input type="email" value={formData.contractor_email} onChange={(e) => setFormData({ ...formData, contractor_email: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="تصنيف المقاول" en="Category" isArabic={isArabic} /></Label>
                    <Select value={formData.contractor_category} onValueChange={(v) => setFormData({ ...formData, contractor_category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTRACTOR_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{isArabic ? c.labelAr : c.labelEn}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="العنوان (عربي)" en="Address (Arabic)" isArabic={isArabic} /></Label>
                    <Input value={formData.contractor_address} onChange={(e) => setFormData({ ...formData, contractor_address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="العنوان (إنجليزي)" en="Address (English)" isArabic={isArabic} /></Label>
                    <Input value={formData.contractor_address_en} onChange={(e) => setFormData({ ...formData, contractor_address_en: e.target.value })} dir="ltr" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Financial Values */}
            <Card className="shadow-md border-0">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white">💰</div>
                  <CardTitle className="text-base">{isArabic ? "القيم المالية والمدة" : "Financial Values & Duration"}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label><BiLabel ar="قيمة العقد" en="Contract Value" isArabic={isArabic} /></Label>
                    <Input type="number" value={formData.contract_value} onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="العملة" en="Currency" isArabic={isArabic} /></Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">SAR - ريال سعودي</SelectItem>
                        <SelectItem value="USD">USD - دولار أمريكي</SelectItem>
                        <SelectItem value="EUR">EUR - يورو</SelectItem>
                        <SelectItem value="AED">AED - درهم إماراتي</SelectItem>
                        <SelectItem value="EGP">EGP - جنيه مصري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="تاريخ الانتهاء" en="End Date" isArabic={isArabic} /></Label>
                    <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="مدة العقد (شهر)" en="Duration (months)" isArabic={isArabic} /></Label>
                    <Input value={formData.contract_duration_months} readOnly className="bg-muted/50" placeholder={isArabic ? "حساب تلقائي" : "Auto-calculated"} />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label><BiLabel ar="نسبة المحتجز (%)" en="Retention (%)" isArabic={isArabic} /></Label>
                    <Input type="number" value={formData.retention_percentage} onChange={(e) => setFormData({ ...formData, retention_percentage: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="الدفعة المقدمة (%)" en="Advance Payment (%)" isArabic={isArabic} /></Label>
                    <Input type="number" value={formData.advance_payment_percentage} onChange={(e) => setFormData({ ...formData, advance_payment_percentage: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label><BiLabel ar="ضمان الأداء (%)" en="Performance Bond (%)" isArabic={isArabic} /></Label>
                    <Input type="number" value={formData.performance_bond_percentage} onChange={(e) => setFormData({ ...formData, performance_bond_percentage: e.target.value })} />
                  </div>
                </div>

                {formData.contract_value && (
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
                    <h4 className="font-medium text-sm">{isArabic ? "ملخص الحسابات" : "Calculations Summary"}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">{isArabic ? "المحتجز:" : "Retention:"}</span><span className="font-medium">{formatCurrency(parseFloat(formData.contract_value) * parseFloat(formData.retention_percentage || "0") / 100, formData.currency)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{isArabic ? "الدفعة المقدمة:" : "Advance:"}</span><span className="font-medium">{formatCurrency(parseFloat(formData.contract_value) * parseFloat(formData.advance_payment_percentage || "0") / 100, formData.currency)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{isArabic ? "الضمان:" : "Bond:"}</span><span className="font-medium">{formatCurrency(parseFloat(formData.contract_value) * parseFloat(formData.performance_bond_percentage || "0") / 100, formData.currency)}</span></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 5: Scope & Notes */}
            <Card className="shadow-md border-0">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(217,72%,40%)] to-[hsl(222,47%,15%)] flex items-center justify-center text-white">📄</div>
                  <CardTitle className="text-base">{isArabic ? "النطاق والشروط والملاحظات" : "Scope, Terms & Notes"}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>{isArabic ? "شروط الدفع" : "Payment Terms"}</Label><AIButtons field="payment_terms" /></div>
                  <Textarea value={formData.payment_terms} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })} rows={3} placeholder={isArabic ? "أدخل شروط الدفع..." : "Enter payment terms..."} disabled={generatingField === 'payment_terms'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>{isArabic ? "نطاق العمل" : "Scope of Work"}</Label><AIButtons field="scope_of_work" /></div>
                  <Textarea value={formData.scope_of_work} onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })} rows={4} placeholder={isArabic ? "أدخل نطاق العمل..." : "Enter scope of work..."} disabled={generatingField === 'scope_of_work'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>{isArabic ? "ملاحظات إضافية" : "Additional Notes"}</Label><AIButtons field="notes" /></div>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder={isArabic ? "أي ملاحظات إضافية..." : "Any additional notes..."} disabled={generatingField === 'notes'} />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetForm} className="px-8">{isArabic ? "إعادة تعيين" : "Reset"}</Button>
              <Button onClick={handleSave} disabled={saving || !formData.contract_number || !formData.contract_title} className="px-8 bg-gradient-to-r from-[hsl(217,72%,40%)] to-[hsl(222,47%,15%)] hover:opacity-90 gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingContract ? (isArabic ? "تحديث العقد" : "Update Contract") : (isArabic ? "حفظ العقد" : "Save Contract")}
              </Button>
            </div>
          </TabsContent>

          {/* ============= FIDIC TAB ============= */}
          <TabsContent value="fidic" className="mt-0 space-y-6">
            <div className={cn("p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex gap-4 items-start", isArabic ? "border-r-4 border-amber-500" : "border-l-4 border-amber-500")}>
              <BookOpen className="w-6 h-6 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-sm mb-1">{isArabic ? "كتب FIDIC الدولية" : "FIDIC International Books"}</h4>
                <p className="text-sm text-muted-foreground">{isArabic ? "اختر كتاب FIDIC المناسب لمشروعك. سيتم تطبيقه تلقائياً على نموذج إنشاء العقد." : "Select the appropriate FIDIC book for your project. It will be automatically applied to the contract form."}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FIDIC_BOOKS.map(book => {
                const isSelected = formData.contract_type === book.id;
                return (
                  <div
                    key={book.id}
                    onClick={() => selectFIDIC(book.id)}
                    className={cn(
                      "relative rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl overflow-hidden group",
                      isSelected ? "border-green-500 bg-green-50 dark:bg-green-950/20 shadow-xl" : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <div className={cn("absolute top-0 left-0 right-0 h-2 bg-gradient-to-r", book.colorClass)} />
                    
                    {isSelected && (
                      <div className={cn("absolute top-4 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold", isArabic ? "left-4" : "right-4")}>
                        <Check className="w-5 h-5" />
                      </div>
                    )}

                    <div className="mt-2 text-3xl mb-3">{book.icon}</div>
                    <h4 className="text-lg font-bold mb-1">{isArabic ? book.nameAr : book.nameEn}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{isArabic ? book.nameEn : book.nameAr}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{isArabic ? book.descAr : book.descEn}</p>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ============= TEMPLATES TAB ============= */}
          <TabsContent value="templates" className="mt-0 space-y-6">
            <div className={cn("p-4 rounded-xl bg-green-50 dark:bg-green-950/30 flex gap-4 items-start", isArabic ? "border-r-4 border-green-500" : "border-l-4 border-green-500")}>
              <LayoutTemplate className="w-6 h-6 text-green-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-sm mb-1">{isArabic ? "قوالب عقود جاهزة" : "Ready-made Contract Templates"}</h4>
                <p className="text-sm text-muted-foreground">{isArabic ? "اختر قالب لملء البيانات الافتراضية تلقائياً في نموذج إنشاء العقد." : "Choose a template to auto-fill default values in the contract creation form."}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CONTRACT_TEMPLATES.map(template => (
                <div key={template.id} className="rounded-2xl border-2 border-border bg-card p-6 text-center hover:-translate-y-2 hover:shadow-xl hover:border-primary/50 transition-all duration-300 cursor-pointer" onClick={() => applyTemplate(template)}>
                  <div className="text-5xl mb-4">{template.iconEmoji}</div>
                  <h3 className="text-lg font-bold mb-1">{isArabic ? template.nameAr : template.nameEn}</h3>
                  <p className="text-xs text-muted-foreground mb-1">{isArabic ? template.nameEn : template.nameAr}</p>
                  <p className="text-sm text-muted-foreground mb-4">{isArabic ? template.descAr : template.descEn}</p>
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
                    {isArabic ? "استخدام القالب" : "Use Template"}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ============= FEATURES TAB ============= */}
          <TabsContent value="features" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES_LIST.map((feature, idx) => (
                <div key={idx} className="rounded-2xl border bg-card p-6 text-center hover:-translate-y-1 hover:shadow-lg transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[hsl(217,72%,40%)] to-[hsl(222,47%,15%)] flex items-center justify-center">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h4 className="font-bold mb-2">{isArabic ? feature.titleAr : feature.titleEn}</h4>
                  <p className="text-sm text-muted-foreground">{isArabic ? feature.descAr : feature.descEn}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ============= BOQ ITEMS TAB ============= */}
          <TabsContent value="boq" className="mt-0 space-y-4">
            {editingContract || viewingContract ? (
              <ContractBOQTab
                contractId={(editingContract || viewingContract)!.id}
                projectId={projectId || null}
                contractValue={(editingContract || viewingContract)!.contract_value}
                currency={(editingContract || viewingContract)!.currency}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">{isArabic ? "اختر عقد أولاً" : "Select a contract first"}</p>
                <p className="text-sm">{isArabic ? "افتح عقد من قائمة العقود الحالية لإدارة بنود التسعير" : "Open a contract from the contracts list to manage BOQ items"}</p>
                <Button className="mt-4 gap-2" onClick={() => setActiveTab("contracts")}>
                  {isArabic ? "عرض العقود" : "View Contracts"}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ============= CONTRACTS LIST TAB ============= */}
          <TabsContent value="contracts" className="mt-0 space-y-4">
            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={isArabic ? "بحث بالاسم أو الرقم..." : "Search by name or number..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder={isArabic ? "الحالة" : "Status"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "جميع الحالات" : "All Statuses"}</SelectItem>
                  {CONTRACT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{isArabic ? s.labelAr : s.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[200px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder={isArabic ? "النوع" : "Type"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "جميع الأنواع" : "All Types"}</SelectItem>
                  {CONTRACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{isArabic ? t.labelAr : t.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-card border shadow-sm">
                <div className="text-2xl font-bold">{filteredContracts.length}</div>
                <div className="text-xs text-muted-foreground">{isArabic ? "العقود المعروضة" : "Showing"}</div>
              </div>
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600">{stats.activeContracts}</div>
                <div className="text-xs text-muted-foreground">{isArabic ? "عقود نشطة" : "Active"}</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-600">{stats.completedContracts}</div>
                <div className="text-xs text-muted-foreground">{isArabic ? "مكتملة" : "Completed"}</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="text-xl font-bold text-amber-600">{formatCurrency(stats.totalValue, "SAR")}</div>
                <div className="text-xs text-muted-foreground">{isArabic ? "إجمالي القيمة" : "Total Value"}</div>
              </div>
            </div>

            {/* Contracts List */}
            {loading ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : filteredContracts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">{isArabic ? "لا توجد عقود" : "No contracts found"}</p>
                <p className="text-sm">{isArabic ? "ابدأ بإنشاء عقد جديد" : "Start by creating a new contract"}</p>
                <Button className="mt-4 gap-2" onClick={() => { resetForm(); setActiveTab("create"); }}>
                  <Plus className="w-4 h-4" />{isArabic ? "إنشاء عقد" : "Create Contract"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedContracts.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    isArabic={isArabic}
                    onView={openViewDialog}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                    formatCurrency={formatCurrency}
                  />
                ))}
                
                {/* Pagination Controls */}
                {filteredContracts.length > 10 && (
                  <PaginationControls
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    pageSize={pagination.pageSize}
                    from={pagination.from}
                    to={pagination.to}
                    hasNext={pagination.hasNext}
                    hasPrevious={pagination.hasPrevious}
                    onPageChange={pagination.goToPage}
                    onPageSizeChange={pagination.setPageSize}
                    onNextPage={pagination.nextPage}
                    onPreviousPage={pagination.previousPage}
                  />
                )}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* View Contract Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />{isArabic ? "تفاصيل العقد" : "Contract Details"}</DialogTitle>
          </DialogHeader>
          {viewingContract && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-sm">{viewingContract.contract_number}</Badge>
                  <Badge className={cn("text-white", CONTRACT_STATUSES.find(s => s.value === viewingContract.status)?.color)}>
                    {isArabic ? CONTRACT_STATUSES.find(s => s.value === viewingContract.status)?.labelAr : CONTRACT_STATUSES.find(s => s.value === viewingContract.status)?.labelEn}
                  </Badge>
                </div>
                <h3 className="text-xl font-semibold">{viewingContract.contract_title}</h3>
                <Separator />
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <h4 className="font-medium flex items-center gap-2"><Building2 className="w-4 h-4" />{isArabic ? "بيانات المقاول" : "Contractor Information"}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><Label className="text-muted-foreground">{isArabic ? "الاسم" : "Name"}</Label><p className="font-medium">{viewingContract.contractor_name || "-"}</p></div>
                    <div><Label className="text-muted-foreground">{isArabic ? "التصنيف" : "Category"}</Label><p className="font-medium">{CONTRACTOR_CATEGORIES.find(c => c.value === viewingContract.contractor_category)?.[isArabic ? "labelAr" : "labelEn"] || "-"}</p></div>
                    {viewingContract.contractor_phone && <div><Label className="text-muted-foreground">{isArabic ? "الهاتف" : "Phone"}</Label><p className="font-medium">{viewingContract.contractor_phone}</p></div>}
                    {viewingContract.contractor_email && <div><Label className="text-muted-foreground">{isArabic ? "البريد" : "Email"}</Label><p className="font-medium">{viewingContract.contractor_email}</p></div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">{isArabic ? "نوع العقد" : "Contract Type"}</Label><p className="font-medium">{getContractTypeInfo(viewingContract.contract_type)?.[isArabic ? "labelAr" : "labelEn"]}</p></div>
                  <div><Label className="text-muted-foreground">{isArabic ? "القيمة" : "Value"}</Label><p className="font-medium text-lg text-primary">{viewingContract.contract_value ? formatCurrency(viewingContract.contract_value, viewingContract.currency) : "-"}</p></div>
                  <div><Label className="text-muted-foreground">{isArabic ? "تاريخ البدء" : "Start Date"}</Label><p className="font-medium">{viewingContract.start_date ? format(new Date(viewingContract.start_date), "PPP", { locale: isArabic ? ar : enUS }) : "-"}</p></div>
                  <div><Label className="text-muted-foreground">{isArabic ? "تاريخ الانتهاء" : "End Date"}</Label><p className="font-medium">{viewingContract.end_date ? format(new Date(viewingContract.end_date), "PPP", { locale: isArabic ? ar : enUS }) : "-"}</p></div>
                </div>
                {(viewingContract.retention_percentage || viewingContract.advance_payment_percentage) && (
                  <>
                    <Separator />
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium mb-3">{isArabic ? "الشروط المالية" : "Financial Terms"}</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div><Label className="text-muted-foreground">{isArabic ? "المحتجز" : "Retention"}</Label><p className="font-medium">{viewingContract.retention_percentage}%</p></div>
                        <div><Label className="text-muted-foreground">{isArabic ? "الدفعة المقدمة" : "Advance"}</Label><p className="font-medium">{viewingContract.advance_payment_percentage}%</p></div>
                        <div><Label className="text-muted-foreground">{isArabic ? "الضمان" : "Bond"}</Label><p className="font-medium">{viewingContract.performance_bond_percentage}%</p></div>
                      </div>
                    </div>
                  </>
                )}
                {viewingContract.start_date && viewingContract.end_date && (
                  <><Separator /><div className="space-y-2"><Label className="text-muted-foreground">{isArabic ? "التقدم الزمني" : "Time Progress"}</Label><Progress value={getContractProgress(viewingContract)} className="h-3" /><p className="text-sm text-muted-foreground text-center">{getContractProgress(viewingContract).toFixed(0)}%</p></div></>
                )}
                {viewingContract.scope_of_work && <div><Label className="text-muted-foreground">{isArabic ? "نطاق العمل" : "Scope of Work"}</Label><p className="mt-1 p-3 bg-muted rounded-lg text-sm">{viewingContract.scope_of_work}</p></div>}
                {viewingContract.notes && <div><Label className="text-muted-foreground">{isArabic ? "ملاحظات" : "Notes"}</Label><p className="mt-1 p-3 bg-muted rounded-lg text-sm">{(() => { try { const p = JSON.parse(viewingContract.notes); return p.text || viewingContract.notes; } catch { return viewingContract.notes; } })()}</p></div>}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>{isArabic ? "إغلاق" : "Close"}</Button>
            <Button onClick={() => { setIsViewDialogOpen(false); viewingContract && openEditDialog(viewingContract); }}><Edit className="w-4 h-4 mr-2" />{isArabic ? "تعديل" : "Edit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { 
  FileText, Plus, Building2, DollarSign, TrendingUp,
  Trash2, Eye, Edit, Download, Search, Copy, CheckCircle2, Clock, FileCheck,
  ChevronLeft, ChevronRight, CreditCard, Link2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addPDFLetterheadHeader, addPDFLetterheadFooterWithQR } from "@/lib/letterhead-utils";
import React from "react";

interface Certificate {
  id: string;
  project_id: string | null;
  contract_id: string | null;
  contractor_name: string;
  certificate_number: number;
  period_from: string | null;
  period_to: string | null;
  total_work_done: number;
  previous_work_done: number;
  current_work_done: number;
  retention_percentage: number;
  retention_amount: number;
  advance_deduction: number;
  other_deductions: number;
  net_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface CertificateItem {
  id?: string;
  certificate_id?: string;
  project_item_id: string | null;
  item_number: string;
  description: string;
  unit: string;
  contract_quantity: number;
  unit_price: number;
  previous_quantity: number;
  current_quantity: number;
  total_quantity: number;
  current_amount: number;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface ContractInfo {
  id: string;
  contract_number: string;
  contract_title: string;
  contract_value: number | null;
  retention_percentage: number | null;
  payment_terms: string | null;
  terms_conditions: string | null;
  status: string | null;
}

interface PaymentInfo {
  id: string;
  payment_number: number;
  amount: number;
  status: string | null;
  due_date: string;
  description: string | null;
}

// Memoized table row
const CertificateRow = React.memo(({ cert, projectMap, contractMap, isArabic, formatCurrency, getStatusBadge, getRowBg, onView, onExport, onCopy, onUpdateStatus, onDelete }: any) => {
  // Fixed progress calculation: total_work_done / contract_value or fallback
  const contractValue = cert.contract_id && contractMap?.get(cert.contract_id)?.contract_value;
  const progressPct = contractValue && contractValue > 0
    ? Math.min(100, Math.round((cert.total_work_done / contractValue) * 100))
    : cert.total_work_done > 0 ? Math.min(100, Math.round((cert.current_work_done / cert.total_work_done) * 100)) : 0;

  const contractInfo = cert.contract_id ? contractMap?.get(cert.contract_id) : null;

  return (
    <TableRow className={getRowBg(cert.status)}>
      <TableCell className="font-medium">{cert.certificate_number}</TableCell>
      <TableCell>{cert.contractor_name}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {cert.project_id ? projectMap.get(cert.project_id) || '-' : '-'}
      </TableCell>
      <TableCell className="text-xs">
        {contractInfo ? (
          <span className="text-primary font-medium">{contractInfo.contract_number}</span>
        ) : '-'}
      </TableCell>
      <TableCell className="text-xs">{cert.period_from && cert.period_to ? `${cert.period_from} → ${cert.period_to}` : '-'}</TableCell>
      <TableCell>{formatCurrency(cert.current_work_done)}</TableCell>
      <TableCell className="font-bold">{formatCurrency(cert.net_amount)}</TableCell>
      <TableCell className="w-[100px]">
        <Progress value={progressPct} className="h-2" />
        <span className="text-[10px] text-muted-foreground">{progressPct}%</span>
      </TableCell>
      <TableCell>{getStatusBadge(cert.status)}</TableCell>
      <TableCell>
        <div className="flex gap-0.5">
          <Tooltip><TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={() => onView(cert)}><Eye className="h-4 w-4" /></Button>
          </TooltipTrigger><TooltipContent>{isArabic ? "عرض" : "View"}</TooltipContent></Tooltip>
          
          <Tooltip><TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={() => onExport(cert)}><Download className="h-4 w-4" /></Button>
          </TooltipTrigger><TooltipContent>{isArabic ? "تصدير PDF" : "Export PDF"}</TooltipContent></Tooltip>
          
          <Tooltip><TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={() => onCopy(cert)}><Copy className="h-4 w-4" /></Button>
          </TooltipTrigger><TooltipContent>{isArabic ? "نسخ مستخلص" : "Copy Certificate"}</TooltipContent></Tooltip>
          
          {cert.status === 'draft' && (
            <>
              <Tooltip><TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={() => onUpdateStatus(cert.id, 'submitted')}><FileCheck className="h-4 w-4" /></Button>
              </TooltipTrigger><TooltipContent>{isArabic ? "تقديم" : "Submit"}</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(cert.id)}><Trash2 className="h-4 w-4" /></Button>
              </TooltipTrigger><TooltipContent>{isArabic ? "حذف" : "Delete"}</TooltipContent></Tooltip>
            </>
          )}
          {cert.status === 'submitted' && <Button size="sm" variant="outline" onClick={() => onUpdateStatus(cert.id, 'approved')}>{isArabic ? "اعتماد" : "Approve"}</Button>}
          {cert.status === 'approved' && <Button size="sm" variant="outline" onClick={() => onUpdateStatus(cert.id, 'paid')}>{isArabic ? "مدفوع" : "Paid"}</Button>}
        </div>
      </TableCell>
    </TableRow>
  );
});

const ITEMS_PER_PAGE = 15;

const ProgressCertificatesPage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterContractor, setFilterContractor] = useState("");
  const [filterContractId, setFilterContractId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null);
  const [viewItems, setViewItems] = useState<CertificateItem[]>([]);
  const [viewContractInfo, setViewContractInfo] = useState<ContractInfo | null>(null);
  const [viewPayments, setViewPayments] = useState<PaymentInfo[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Contract map for display
  const [contractMap, setContractMap] = useState<Map<string, ContractInfo>>(new Map());
  const [allContracts, setAllContracts] = useState<ContractInfo[]>([]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [certRes, projRes, subRes, contractsRes] = await Promise.all([
        supabase.from("progress_certificates").select("*").order("created_at", { ascending: false }),
        supabase.from("project_data").select("id, name").order("created_at", { ascending: false }),
        supabase.from("subcontractors").select("id, name, specialty").order("name"),
        supabase.from("contracts").select("id, contract_number, contract_title, contract_value, retention_percentage, payment_terms, terms_conditions, status")
      ]);
      if (certRes.data) setCertificates(certRes.data as Certificate[]);
      if (projRes.data) setProjects(projRes.data);
      if (subRes.data) setContractors(subRes.data);
      if (contractsRes.data) {
        const contracts = contractsRes.data as ContractInfo[];
        setAllContracts(contracts);
        const map = new Map<string, ContractInfo>();
        contracts.forEach(c => map.set(c.id, c));
        setContractMap(map);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCertificate = useCallback(async (cert: Certificate) => {
    setViewingCertificate(cert);
    setViewContractInfo(null);
    setViewPayments([]);

    const itemsPromise = supabase.from("progress_certificate_items").select("*").eq("certificate_id", cert.id).order("item_number");
    
    // Also fetch contract info and payments if contract_id exists
    if (cert.contract_id) {
      const [itemsRes, contractRes, paymentsRes] = await Promise.all([
        itemsPromise,
        supabase.from("contracts").select("id, contract_number, contract_title, contract_value, retention_percentage, payment_terms, terms_conditions, status").eq("id", cert.contract_id).single(),
        supabase.from("contract_payments").select("id, payment_number, amount, status, due_date, description").eq("contract_id", cert.contract_id).order("payment_number")
      ]);
      setViewItems((itemsRes.data || []) as CertificateItem[]);
      if (contractRes.data) setViewContractInfo(contractRes.data as ContractInfo);
      if (paymentsRes.data) setViewPayments(paymentsRes.data as PaymentInfo[]);
    } else {
      const { data } = await itemsPromise;
      setViewItems((data || []) as CertificateItem[]);
    }
    setShowViewDialog(true);
  }, []);

  const handleUpdateStatus = useCallback(async (id: string, status: string) => {
    const { error } = await supabase.from("progress_certificates").update({ status }).eq("id", id);
    if (!error) {
      setCertificates(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      toast.success(isArabic ? "تم تحديث الحالة" : "Status updated");
    }
  }, [isArabic]);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from("progress_certificates").delete().eq("id", id);
    if (!error) {
      setCertificates(prev => prev.filter(c => c.id !== id));
      toast.success(isArabic ? "تم الحذف" : "Deleted");
    }
  }, [isArabic]);

  const handleCopyCertificate = useCallback((cert: Certificate) => {
    navigate("/progress-certificates/new", { state: { copyFrom: cert } });
    toast.info(isArabic ? "تم نسخ بيانات المستخلص" : "Certificate data copied");
  }, [navigate, isArabic]);

  const handleExportPDF = async (cert: Certificate, items: CertificateItem[]) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      let y = addPDFLetterheadHeader(doc);
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      const title = isArabic ? `مستخلص رقم: ${cert.certificate_number}` : `Progress Certificate #${cert.certificate_number}`;
      doc.text(title, pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const statusLabels: Record<string, string> = { draft: isArabic ? 'مسودة' : 'Draft', submitted: isArabic ? 'مقدم' : 'Submitted', approved: isArabic ? 'معتمد' : 'Approved', paid: isArabic ? 'مدفوع' : 'Paid' };
      const infoLines = [[isArabic ? 'المقاول' : 'Contractor', cert.contractor_name], [isArabic ? 'الفترة' : 'Period', `${cert.period_from || '-'} → ${cert.period_to || '-'}`], [isArabic ? 'الحالة' : 'Status', statusLabels[cert.status] || cert.status]];
      infoLines.forEach(([label, value]) => { doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, 15, y); doc.setFont('helvetica', 'normal'); doc.text(value, 55, y); y += 6; });
      y += 4;
      const fmtNum = (v: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
      const tableHeaders = isArabic ? ['المبلغ', 'إجمالي', 'حالي', 'سابق', 'السعر', 'الكمية', 'الوحدة', 'الوصف', 'رقم'] : ['#', 'Description', 'Unit', 'Qty', 'Price', 'Prev', 'Current', 'Total', 'Amount'];
      const tableBody = items.map(item => { const row = [item.item_number, item.description?.substring(0, 40) || '', item.unit || '', fmtNum(item.contract_quantity || 0), fmtNum(item.unit_price || 0), fmtNum(item.previous_quantity || 0), fmtNum(item.current_quantity || 0), fmtNum(item.total_quantity || 0), fmtNum(item.current_amount || 0)]; return isArabic ? row.reverse() : row; });
      autoTable(doc, { startY: y, head: [tableHeaders], body: tableBody, theme: 'grid', styles: { fontSize: 8, cellPadding: 2, halign: isArabic ? 'right' : 'left' }, headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', halign: 'center' }, columnStyles: isArabic ? { 0: { halign: 'right' } } : { 8: { halign: 'right' } }, margin: { left: 10, right: 10 } });
      y = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 41, 59);
      doc.text(isArabic ? 'الملخص المالي' : 'Financial Summary', 15, y); y += 8;
      doc.setDrawColor(30, 64, 175); doc.setLineWidth(0.3); doc.line(15, y - 2, pageWidth - 15, y - 2);
      const summaryLines: [string, string][] = [[isArabic ? 'الأعمال الحالية' : 'Current Work Done', fmtNum(cert.current_work_done)], [isArabic ? 'الأعمال السابقة' : 'Previous Work Done', fmtNum(cert.previous_work_done)], [isArabic ? 'إجمالي الأعمال' : 'Total Work Done', fmtNum(cert.total_work_done)]];
      doc.setFontSize(10);
      summaryLines.forEach(([label, value]) => { doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85); doc.text(label, 20, y); doc.setFont('helvetica', 'bold'); doc.text(`${value} SAR`, pageWidth - 20, y, { align: 'right' }); y += 6; });
      y += 2; doc.setDrawColor(200, 200, 200); doc.line(15, y, pageWidth - 15, y); y += 6;
      doc.setTextColor(220, 38, 38);
      const deductions: [string, number][] = [[isArabic ? `الاحتجاز (${cert.retention_percentage || 10}%)` : `Retention (${cert.retention_percentage || 10}%)`, cert.retention_amount], [isArabic ? 'خصم دفعة مقدمة' : 'Advance Deduction', cert.advance_deduction], [isArabic ? 'خصومات أخرى' : 'Other Deductions', cert.other_deductions]];
      deductions.forEach(([label, value]) => { if (value > 0) { doc.setFont('helvetica', 'normal'); doc.text(label, 20, y); doc.setFont('helvetica', 'bold'); doc.text(`-${fmtNum(value)} SAR`, pageWidth - 20, y, { align: 'right' }); y += 6; } });
      y += 2; doc.setDrawColor(30, 64, 175); doc.setLineWidth(0.5); doc.line(15, y, pageWidth - 15, y); y += 8;
      doc.setFontSize(13); doc.setTextColor(30, 64, 175); doc.setFont('helvetica', 'bold');
      doc.text(isArabic ? 'صافي المستحق' : 'Net Amount Due', 20, y);
      doc.text(`${fmtNum(cert.net_amount)} SAR`, pageWidth - 20, y, { align: 'right' });
      await addPDFLetterheadFooterWithQR(doc, 1, 1);
      doc.save(`certificate-${cert.certificate_number}.pdf`);
      toast.success(isArabic ? 'تم تصدير PDF بنجاح' : 'PDF exported successfully');
    } catch (error) { console.error('PDF export error:', error); toast.error(isArabic ? 'خطأ في التصدير' : 'Export error'); }
  };

  const handleExportCertificatePDF = useCallback(async (cert: Certificate) => {
    const { data } = await supabase.from("progress_certificate_items").select("*").eq("certificate_id", cert.id).order("item_number");
    await handleExportPDF(cert, (data || []) as CertificateItem[]);
  }, [isArabic]);

  // Export all filtered PDFs - uses certificates from state
  const handleExportAllPDF = useCallback(async () => {
    toast.info(isArabic ? "جاري تصدير جميع المستخلصات..." : "Exporting all certificates...");
    const toExport = certificates.slice(0, 20);
    for (const cert of toExport) {
      await handleExportCertificatePDF(cert);
    }
    toast.success(isArabic ? "تم التصدير بنجاح" : "Export completed");
  }, [certificates, isArabic]);

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    return certificates.filter(c => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (filterProjectId && filterProjectId !== "all" && c.project_id !== filterProjectId) return false;
      if (filterContractor && filterContractor !== "all" && c.contractor_name !== filterContractor) return false;
      if (filterContractId && filterContractId !== "all" && c.contract_id !== filterContractId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return c.contractor_name.toLowerCase().includes(q) || 
               String(c.certificate_number).includes(q) ||
               (c.project_id && projectMap.get(c.project_id)?.toLowerCase().includes(q));
      }
      return true;
    });
  }, [certificates, statusFilter, filterProjectId, filterContractor, filterContractId, searchQuery, projectMap]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedCerts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [statusFilter, filterProjectId, filterContractor, filterContractId, searchQuery]);

  const formatCurrency = useCallback((v: number) => {
    if (v == null) return '0.00';
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  }, [isArabic]);

  const getStatusBadge = useCallback((status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      draft: { label: isArabic ? "مسودة" : "Draft", variant: "secondary" },
      submitted: { label: isArabic ? "مقدم" : "Submitted", variant: "outline" },
      approved: { label: isArabic ? "معتمد" : "Approved", variant: "default" },
      paid: { label: isArabic ? "مدفوع" : "Paid", variant: "default" }
    };
    const cfg = map[status] || map.draft;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  }, [isArabic]);

  const stats = useMemo(() => ({
    totalNet: filtered.reduce((s, c) => s + (c.net_amount || 0), 0),
    totalCurrent: filtered.reduce((s, c) => s + (c.current_work_done || 0), 0),
    approvedCount: filtered.filter(c => c.status === 'approved' || c.status === 'paid').length,
  }), [filtered]);

  const getRowBg = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-50/50 dark:bg-green-950/10';
      case 'paid': return 'bg-emerald-50/50 dark:bg-emerald-950/10';
      case 'submitted': return 'bg-yellow-50/50 dark:bg-yellow-950/10';
      default: return '';
    }
  };

  const statusTabs = [
    { value: "all", label: isArabic ? "الكل" : "All", icon: FileText },
    { value: "draft", label: isArabic ? "مسودة" : "Draft", icon: Clock },
    { value: "submitted", label: isArabic ? "مقدم" : "Submitted", icon: Edit },
    { value: "approved", label: isArabic ? "معتمد" : "Approved", icon: CheckCircle2 },
    { value: "paid", label: isArabic ? "مدفوع" : "Paid", icon: DollarSign },
  ];

  return (
    <PageLayout>
      <TooltipProvider>
      <div className="container mx-auto p-4 md:p-6 space-y-6" dir={isArabic ? "rtl" : "ltr"}>
        <PageHeader
          icon={FileCheck}
          title={isArabic ? "المستخلصات" : "Progress Certificates"}
          subtitle={isArabic ? "إدارة مستخلصات المقاولين ومقاولي الباطن" : "Manage contractor & subcontractor invoices"}
          actions={
            <div className="flex gap-2">
              {filtered.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExportAllPDF} className="gap-1.5">
                  <Download className="h-4 w-4" />
                  {isArabic ? "تصدير الكل PDF" : "Export All PDF"}
                </Button>
              )}
              <Link 
                to="/progress-certificates/new"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-gold text-white hover:bg-gold/90 relative z-[70] pointer-events-auto"
              >
                <Plus className="h-4 w-4 mr-1" />
                {isArabic ? "مستخلص جديد" : "New Certificate"}
              </Link>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10"><FileText className="h-6 w-6 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{isArabic ? "إجمالي المستخلصات" : "Total Certificates"}</p>
                  <p className="text-2xl font-bold">{filtered.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10"><DollarSign className="h-6 w-6 text-green-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{isArabic ? "إجمالي صافي" : "Total Net"}</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(stats.totalNet)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10"><TrendingUp className="h-6 w-6 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{isArabic ? "أعمال حالية" : "Current Work"}</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(stats.totalCurrent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10"><CheckCircle2 className="h-6 w-6 text-purple-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{isArabic ? "معتمدة/مدفوعة" : "Approved/Paid"}</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.approvedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Status Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isArabic ? "بحث بالرقم أو اسم المقاول أو المشروع..." : "Search by number, contractor or project..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {statusTabs.map(tab => {
              const Icon = tab.icon;
              const count = tab.value === "all" ? certificates.length : certificates.filter(c => c.status === tab.value).length;
              return (
                <Button
                  key={tab.value}
                  variant={statusFilter === tab.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(tab.value)}
                  className="gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[18px]">{count}</Badge>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Filters with Contract filter */}
        <div className="flex gap-4 flex-wrap">
          <Select value={filterProjectId} onValueChange={setFilterProjectId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder={isArabic ? "كل المشاريع" : "All Projects"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل المشاريع" : "All Projects"}</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterContractor} onValueChange={setFilterContractor}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder={isArabic ? "كل المقاولين" : "All Contractors"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل المقاولين" : "All Contractors"}</SelectItem>
              {contractors.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {allContracts.length > 0 && (
            <Select value={filterContractId} onValueChange={setFilterContractId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder={isArabic ? "كل العقود" : "All Contracts"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل العقود" : "All Contracts"}</SelectItem>
                {allContracts.map(c => <SelectItem key={c.id} value={c.id}>{c.contract_number} - {c.contract_title}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Certificates Table */}
        <Card>
          <CardHeader><CardTitle>{isArabic ? "قائمة المستخلصات" : "Certificates List"}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{isArabic ? "لا توجد مستخلصات" : "No certificates found"}</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "رقم" : "#"}</TableHead>
                      <TableHead>{isArabic ? "المقاول" : "Contractor"}</TableHead>
                      <TableHead>{isArabic ? "المشروع" : "Project"}</TableHead>
                      <TableHead>{isArabic ? "العقد" : "Contract"}</TableHead>
                      <TableHead>{isArabic ? "الفترة" : "Period"}</TableHead>
                      <TableHead>{isArabic ? "الأعمال الحالية" : "Current Work"}</TableHead>
                      <TableHead>{isArabic ? "صافي المستحق" : "Net Amount"}</TableHead>
                      <TableHead>{isArabic ? "الإنجاز" : "Progress"}</TableHead>
                      <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{isArabic ? "إجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCerts.map(cert => (
                      <CertificateRow
                        key={cert.id}
                        cert={cert}
                        projectMap={projectMap}
                        contractMap={contractMap}
                        isArabic={isArabic}
                        formatCurrency={formatCurrency}
                        getStatusBadge={getStatusBadge}
                        getRowBg={getRowBg}
                        onView={handleViewCertificate}
                        onExport={handleExportCertificatePDF}
                        onCopy={handleCopyCertificate}
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDelete}
                      />
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                      {isArabic
                        ? `عرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} من ${filtered.length}`
                        : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length}`}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(page)} className="w-8 h-8 p-0">
                            {page}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && <span className="text-xs text-muted-foreground px-1">...</span>}
                      <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Enhanced View Dialog */}
        {showViewDialog && viewingCertificate && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setShowViewDialog(false); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogDescription className="sr-only">View certificate details</DialogDescription>
              <div className="flex items-center justify-between">
                <DialogTitle>{isArabic ? `مستخلص رقم ${viewingCertificate.certificate_number}` : `Certificate #${viewingCertificate.certificate_number}`}</DialogTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportCertificatePDF(viewingCertificate)}>
                  <Download className="h-4 w-4 mr-1" />{isArabic ? "تصدير PDF" : "Export PDF"}
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">{isArabic ? "المقاول:" : "Contractor:"}</span> <strong>{viewingCertificate.contractor_name}</strong></div>
                <div><span className="text-muted-foreground">{isArabic ? "الحالة:" : "Status:"}</span> {getStatusBadge(viewingCertificate.status)}</div>
                <div><span className="text-muted-foreground">{isArabic ? "الفترة:" : "Period:"}</span> {viewingCertificate.period_from} → {viewingCertificate.period_to}</div>
                {viewingCertificate.project_id && (
                  <div><span className="text-muted-foreground">{isArabic ? "المشروع:" : "Project:"}</span> <strong>{projectMap.get(viewingCertificate.project_id) || '-'}</strong></div>
                )}
              </div>

              {/* Contract Info in View Dialog */}
              {viewContractInfo && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      {isArabic ? "تفاصيل العقد" : "Contract Details"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-background rounded border text-center">
                        <p className="text-[10px] text-muted-foreground">{isArabic ? "رقم العقد" : "Contract #"}</p>
                        <p className="font-bold text-primary">{viewContractInfo.contract_number}</p>
                      </div>
                      <div className="p-2 bg-background rounded border text-center">
                        <p className="text-[10px] text-muted-foreground">{isArabic ? "قيمة العقد" : "Value"}</p>
                        <p className="font-bold">{formatCurrency(viewContractInfo.contract_value || 0)}</p>
                      </div>
                      <div className="p-2 bg-background rounded border text-center">
                        <p className="text-[10px] text-muted-foreground">{isArabic ? "الاحتجاز" : "Retention"}</p>
                        <p className="font-bold">{viewContractInfo.retention_percentage ?? 10}%</p>
                      </div>
                      <div className="p-2 bg-background rounded border text-center">
                        <p className="text-[10px] text-muted-foreground">{isArabic ? "الحالة" : "Status"}</p>
                        <Badge variant={viewContractInfo.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{viewContractInfo.status}</Badge>
                      </div>
                    </div>
                    {viewContractInfo.payment_terms && (
                      <p className="text-[10px] text-muted-foreground mt-2"><strong>{isArabic ? "شروط الدفع:" : "Payment Terms:"}</strong> {viewContractInfo.payment_terms}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Payments in View Dialog */}
              {viewPayments.length > 0 && (
                <Card className="border-green-200 bg-green-50/30 dark:bg-green-950/10">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-green-600" />
                      {isArabic ? "الدفعات" : "Payments"}
                      <Badge variant="secondary" className="text-[10px]">{viewPayments.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="space-y-1 max-h-[100px] overflow-y-auto">
                      {viewPayments.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs bg-background p-1.5 rounded border">
                          <div className="flex items-center gap-1.5">
                            {p.status === 'paid' ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Clock className="h-3 w-3 text-yellow-600" />}
                            <span>#{p.payment_number}</span>
                          </div>
                          <span className="font-bold">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? "رقم" : "#"}</TableHead>
                    <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                    <TableHead>{isArabic ? "وحدة" : "Unit"}</TableHead>
                    <TableHead>{isArabic ? "الكمية" : "Qty"}</TableHead>
                    <TableHead>{isArabic ? "سابق" : "Prev"}</TableHead>
                    <TableHead>{isArabic ? "حالي" : "Current"}</TableHead>
                    <TableHead>{isArabic ? "إجمالي" : "Total"}</TableHead>
                    <TableHead>{isArabic ? "الإنجاز" : "Progress"}</TableHead>
                    <TableHead>{isArabic ? "المبلغ" : "Amount"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewItems.map((item, idx) => {
                    const pct = item.contract_quantity > 0 ? Math.round((item.total_quantity / item.contract_quantity) * 100) : 0;
                    return (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{item.item_number}</TableCell>
                      <TableCell className="text-xs">{item.description}</TableCell>
                      <TableCell className="text-xs">{item.unit}</TableCell>
                      <TableCell className="text-xs">{item.contract_quantity}</TableCell>
                      <TableCell className="text-xs">{item.previous_quantity}</TableCell>
                      <TableCell className="text-xs font-medium">{item.current_quantity}</TableCell>
                      <TableCell className="text-xs">{item.total_quantity}</TableCell>
                      <TableCell className="w-[80px]">
                        <Progress value={Math.min(pct, 100)} className="h-1.5" />
                        <span className="text-[10px] text-muted-foreground">{pct}%</span>
                      </TableCell>
                      <TableCell className="text-xs font-bold">{formatCurrency(item.current_amount)}</TableCell>
                    </TableRow>
                    );
                  })}</TableBody>
              </Table>
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
                  <CardContent className="pt-3 pb-2 text-center">
                    <p className="text-xs text-muted-foreground">{isArabic ? "الأعمال الحالية" : "Current Work"}</p>
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{formatCurrency(viewingCertificate.current_work_done)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-200">
                  <CardContent className="pt-3 pb-2 text-center">
                    <p className="text-xs text-muted-foreground">{isArabic ? "الخصومات" : "Deductions"}</p>
                    <p className="text-sm font-bold text-destructive">-{formatCurrency(viewingCertificate.retention_amount + viewingCertificate.advance_deduction + viewingCertificate.other_deductions)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200">
                  <CardContent className="pt-3 pb-2 text-center">
                    <p className="text-xs text-muted-foreground">{isArabic ? "صافي المستحق" : "Net Amount"}</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatCurrency(viewingCertificate.net_amount)}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>
      </TooltipProvider>
    </PageLayout>
  );
};

export default ProgressCertificatesPage;

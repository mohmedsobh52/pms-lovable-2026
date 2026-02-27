import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText, Building2, ArrowLeft,
  Calendar, Percent, FileCheck, Link2, AlertCircle,
  Search, CheckSquare, BarChart3, DollarSign, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, CreditCard, Clock, CheckCircle2, XCircle,
  Shield, FileWarning, Banknote
} from "lucide-react";
import React from "react";

interface CertificateItem {
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

interface ContractOption {
  id: string;
  contract_number: string;
  contract_title: string;
  contract_value: number | null;
  retention_percentage: number | null;
  advance_payment_percentage: number | null;
}

interface ContractFullDetails {
  id: string;
  contract_number: string;
  contract_title: string;
  contract_type: string | null;
  contract_value: number | null;
  retention_percentage: number | null;
  advance_payment_percentage: number | null;
  payment_terms: string | null;
  terms_conditions: string | null;
  start_date: string | null;
  end_date: string | null;
  execution_percentage: number | null;
  contractor_name: string | null;
  status: string | null;
  contract_duration_months: number | null;
  performance_bond_percentage: number | null;
  scope_of_work: string | null;
}

interface PaymentInfo {
  id: string;
  payment_number: number;
  amount: number;
  status: string | null;
  due_date: string;
  payment_date: string | null;
  description: string | null;
}

interface PreviousCertsSummary {
  count: number;
  totalWorkDone: number;
  totalNetPaid: number;
  lastCert: { number: number; date: string | null; status: string } | null;
}

// Memoized table row for performance
const ItemRow = React.memo(({ item, originalIdx, isArabic, formatCurrency, updateItemQuantity }: {
  item: CertificateItem; originalIdx: number; isArabic: boolean; formatCurrency: (v: number) => string; updateItemQuantity: (idx: number, qty: number) => void;
}) => {
  const remaining = Math.max(0, item.contract_quantity - item.total_quantity);
  const pct = item.contract_quantity > 0 ? Math.round((item.total_quantity / item.contract_quantity) * 100) : 0;
  const isOver = item.total_quantity > item.contract_quantity;
  const isComplete = item.total_quantity >= item.contract_quantity && item.contract_quantity > 0;
  return (
    <TableRow className={isOver ? 'bg-red-50/70 dark:bg-red-950/20' : isComplete ? 'bg-green-50/30 dark:bg-green-950/10' : ''}>
      <TableCell className="text-xs">{item.item_number}</TableCell>
      <TableCell className="text-xs max-w-[180px] truncate">{item.description}</TableCell>
      <TableCell className="text-xs">{item.unit}</TableCell>
      <TableCell className="text-xs">{item.contract_quantity}</TableCell>
      <TableCell className="text-xs">{item.unit_price.toFixed(2)}</TableCell>
      <TableCell className="text-xs">{item.previous_quantity}</TableCell>
      <TableCell>
        <Input type="number" className={`h-7 text-xs w-[75px] ${isOver ? 'border-destructive' : ''}`}
          value={item.current_quantity || ""}
          onChange={e => updateItemQuantity(originalIdx, parseFloat(e.target.value) || 0)}
          max={item.contract_quantity - item.previous_quantity} />
      </TableCell>
      <TableCell className={`text-xs ${isOver ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
        {isOver && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
        {remaining.toFixed(2)}
      </TableCell>
      <TableCell className="w-[80px]">
        <Progress value={Math.min(pct, 100)} className="h-1.5" />
        <span className="text-[10px] text-muted-foreground">{pct}%</span>
      </TableCell>
      <TableCell className="text-xs font-bold">{formatCurrency(item.current_amount)}</TableCell>
    </TableRow>
  );
});

const NewCertificatePage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [formProjectId, setFormProjectId] = useState("");
  const [formContractor, setFormContractor] = useState("");
  const [formContractId, setFormContractId] = useState("");
  const [formPeriodFrom, setFormPeriodFrom] = useState("");
  const [formPeriodTo, setFormPeriodTo] = useState("");
  const [formRetention, setFormRetention] = useState(10);
  const [formAdvanceDeduction, setFormAdvanceDeduction] = useState(0);
  const [formOtherDeductions, setFormOtherDeductions] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<CertificateItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fillPercentage, setFillPercentage] = useState("");

  const [availableContracts, setAvailableContracts] = useState<ContractOption[]>([]);
  const [previousCertsSummary, setPreviousCertsSummary] = useState<PreviousCertsSummary | null>(null);
  const [advancePercentage, setAdvancePercentage] = useState(0);
  const [selectedContractValue, setSelectedContractValue] = useState<number | null>(null);

  // NEW: contract details & payments
  const [contractDetails, setContractDetails] = useState<ContractFullDetails | null>(null);
  const [contractPayments, setContractPayments] = useState<PaymentInfo[]>([]);
  const [termsOpen, setTermsOpen] = useState(false);

  // Pagination for items
  const [visibleItemsCount, setVisibleItemsCount] = useState(25);

  const currentWorkDone = useMemo(() => formItems.reduce((s, i) => s + i.current_amount, 0), [formItems]);
  const previousWorkDone = useMemo(() => formItems.reduce((s, i) => s + (i.previous_quantity * i.unit_price), 0), [formItems]);
  const totalWorkDone = currentWorkDone + previousWorkDone;
  const retentionAmount = (currentWorkDone * formRetention) / 100;
  const netAmount = currentWorkDone - retentionAmount - formAdvanceDeduction - formOtherDeductions;

  const filledItemsCount = useMemo(() => formItems.filter(i => i.current_quantity > 0).length, [formItems]);
  const totalContractValue = useMemo(() => formItems.reduce((s, i) => s + (i.contract_quantity * i.unit_price), 0), [formItems]);
  const overallProgress = useMemo(() => totalContractValue > 0 ? Math.round((totalWorkDone / totalContractValue) * 100) : 0, [totalWorkDone, totalContractValue]);

  const displayItems = useMemo(() => {
    let items = formItems;
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      items = items.filter(i => i.description.toLowerCase().includes(q) || i.item_number.includes(q));
    }
    return items;
  }, [formItems, itemSearch]);

  // Paginated display items
  const paginatedItems = useMemo(() => displayItems.slice(0, visibleItemsCount), [displayItems, visibleItemsCount]);

  // Payment stats
  const paymentStats = useMemo(() => {
    const paid = contractPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    const pending = contractPayments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
    const overdue = contractPayments.filter(p => p.status === 'overdue' || (p.status === 'pending' && new Date(p.due_date) < new Date())).reduce((s, p) => s + p.amount, 0);
    return { paid, pending, overdue, total: contractPayments.length };
  }, [contractPayments]);

  useEffect(() => {
    if (user) fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (advancePercentage > 0) {
      setFormAdvanceDeduction(Math.round(currentWorkDone * advancePercentage / 100 * 100) / 100);
    }
  }, [formItems, advancePercentage]);

  const fetchInitialData = async () => {
    const [projRes, subRes] = await Promise.all([
      supabase.from("project_data").select("id, name").order("created_at", { ascending: false }),
      supabase.from("subcontractors").select("id, name, specialty").order("name")
    ]);
    if (projRes.data) setProjects(projRes.data);
    if (subRes.data) setContractors(subRes.data);
  };

  const formatCurrency = useCallback((v: number) => {
    if (v == null) return '0.00';
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  }, [isArabic]);

  const loadContractsForSelection = async (projectId: string, contractorName: string) => {
    if (!projectId || !contractorName) { setAvailableContracts([]); return; }
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, contract_number, contract_title, contract_value, retention_percentage, advance_payment_percentage")
        .eq("project_id", projectId).eq("contractor_name", contractorName)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setAvailableContracts(data as ContractOption[]);
        if (data.length === 1) handleContractSelect(data[0] as ContractOption);
      } else setAvailableContracts([]);
    } catch (err) { console.error("Error loading contracts:", err); }
  };

  const loadPreviousCertsSummary = async (projectId: string, contractorName: string) => {
    if (!projectId || !contractorName) { setPreviousCertsSummary(null); return; }
    try {
      const { data, error } = await supabase
        .from("progress_certificates")
        .select("certificate_number, status, current_work_done, net_amount, period_to, created_at")
        .eq("project_id", projectId).eq("contractor_name", contractorName)
        .in("status", ["approved", "paid"]).order("certificate_number", { ascending: false });
      if (!error && data && data.length > 0) {
        setPreviousCertsSummary({
          count: data.length,
          totalWorkDone: data.reduce((s, c) => s + (c.current_work_done || 0), 0),
          totalNetPaid: data.reduce((s, c) => s + (c.net_amount || 0), 0),
          lastCert: { number: data[0].certificate_number, date: data[0].period_to, status: data[0].status }
        });
      } else setPreviousCertsSummary(null);
    } catch (err) { console.error("Error loading previous certs:", err); }
  };

  // NEW: Fetch full contract details + payments when contract selected
  const fetchContractDetailsAndPayments = async (contractId: string) => {
    try {
      const [detailsRes, paymentsRes] = await Promise.all([
        supabase.from("contracts").select("*").eq("id", contractId).single(),
        supabase.from("contract_payments").select("id, payment_number, amount, status, due_date, payment_date, description")
          .eq("contract_id", contractId).order("payment_number", { ascending: true })
      ]);
      if (detailsRes.data) setContractDetails(detailsRes.data as ContractFullDetails);
      if (paymentsRes.data) setContractPayments(paymentsRes.data as PaymentInfo[]);
    } catch (err) { console.error("Error loading contract details:", err); }
  };

  const handleContractSelect = (contract: ContractOption) => {
    setFormContractId(contract.id);
    setFormRetention(contract.retention_percentage ?? 10);
    setAdvancePercentage(contract.advance_payment_percentage ?? 0);
    setSelectedContractValue(contract.contract_value);
    fetchContractDetailsAndPayments(contract.id);
  };

  const handleContractChange = (contractId: string) => {
    const contract = availableContracts.find(c => c.id === contractId);
    if (contract) handleContractSelect(contract);
  };

  const loadProjectItems = async (projectId: string, contractorName: string) => {
    setLoadingItems(true);
    setVisibleItemsCount(25);
    try {
      const { data, error } = await supabase
        .from("project_items").select("id, item_number, description, unit, quantity, unit_price, total_price, is_section")
        .eq("project_id", projectId).order("sort_order", { ascending: true });
      if (error) throw error;
      const items = (data || []).filter(i => !i.is_section).map(i => ({
        project_item_id: i.id, item_number: i.item_number || "", description: i.description || "",
        unit: i.unit || "", contract_quantity: i.quantity || 0, unit_price: i.unit_price || 0,
        previous_quantity: 0, current_quantity: 0, total_quantity: 0, current_amount: 0
      }));
      const { data: prevCerts } = await supabase.from("progress_certificates").select("id")
        .eq("project_id", projectId).eq("contractor_name", contractorName).in("status", ["approved", "paid"]);
      if (prevCerts && prevCerts.length > 0) {
        const { data: prevItems } = await supabase.from("progress_certificate_items")
          .select("project_item_id, current_quantity").in("certificate_id", prevCerts.map(c => c.id));
        if (prevItems) {
          const prevMap = new Map<string, number>();
          prevItems.forEach(pi => { const key = pi.project_item_id || ""; prevMap.set(key, (prevMap.get(key) || 0) + (pi.current_quantity || 0)); });
          items.forEach(item => { item.previous_quantity = prevMap.get(item.project_item_id || "") || 0; item.total_quantity = item.previous_quantity; });
        }
      }
      setFormItems(items);
    } catch (error) { console.error("Error loading items:", error); }
    finally { setLoadingItems(false); }
  };

  const handleProjectChange = (projectId: string) => {
    setFormProjectId(projectId); setFormContractId(""); setAvailableContracts([]); setSelectedContractValue(null); setAdvancePercentage(0);
    setContractDetails(null); setContractPayments([]);
    if (projectId && formContractor) { loadProjectItems(projectId, formContractor); loadContractsForSelection(projectId, formContractor); loadPreviousCertsSummary(projectId, formContractor); }
  };

  const handleContractorChange = (name: string) => {
    setFormContractor(name); setFormContractId(""); setAvailableContracts([]); setSelectedContractValue(null); setAdvancePercentage(0);
    setContractDetails(null); setContractPayments([]);
    if (formProjectId && name) { loadProjectItems(formProjectId, name); loadContractsForSelection(formProjectId, name); loadPreviousCertsSummary(formProjectId, name); }
  };

  const updateItemQuantity = useCallback((index: number, qty: number) => {
    setFormItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const total = item.previous_quantity + qty;
      return { ...item, current_quantity: qty, total_quantity: total, current_amount: qty * item.unit_price };
    }));
  }, []);

  const fillAllRemaining = useCallback(() => {
    setFormItems(prev => prev.map(item => {
      const remaining = Math.max(0, item.contract_quantity - item.previous_quantity);
      return { ...item, current_quantity: remaining, total_quantity: item.contract_quantity, current_amount: remaining * item.unit_price };
    }));
    toast.success(isArabic ? "تم ملء جميع الكميات المتبقية" : "All remaining quantities filled");
  }, [isArabic]);

  const fillByPercentage = useCallback((pct: number) => {
    setFormItems(prev => prev.map(item => {
      const targetTotal = item.contract_quantity * pct / 100;
      const qty = Math.round((targetTotal - item.previous_quantity) * 100) / 100;
      const safeQty = Math.max(0, Math.min(qty, item.contract_quantity - item.previous_quantity));
      return { ...item, current_quantity: safeQty, total_quantity: item.previous_quantity + safeQty, current_amount: safeQty * item.unit_price };
    }));
    toast.success(isArabic ? `تم التعبئة بنسبة ${pct}%` : `Filled at ${pct}%`);
  }, [isArabic]);

  const handleSaveClick = () => {
    if (!formProjectId || !formContractor) {
      toast.error(isArabic ? "يرجى اختيار المشروع والمقاول" : "Select project and contractor");
      return;
    }
    if (filledItemsCount === 0) {
      toast.error(isArabic ? "يرجى تعبئة بند واحد على الأقل" : "Fill at least one item");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleCreateCertificate = async () => {
    if (!user?.id) return;
    setShowConfirmDialog(false);
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("progress_certificates").select("certificate_number")
        .eq("project_id", formProjectId).eq("contractor_name", formContractor)
        .order("certificate_number", { ascending: false }).limit(1);
      const nextNumber = (existing?.[0]?.certificate_number || 0) + 1;
      const { data: cert, error: certError } = await supabase.from("progress_certificates").insert({
        user_id: user.id, project_id: formProjectId, contract_id: formContractId || null,
        contractor_name: formContractor, certificate_number: nextNumber,
        period_from: formPeriodFrom || null, period_to: formPeriodTo || null,
        total_work_done: totalWorkDone, previous_work_done: previousWorkDone, current_work_done: currentWorkDone,
        retention_percentage: formRetention, retention_amount: retentionAmount,
        advance_deduction: formAdvanceDeduction, other_deductions: formOtherDeductions,
        net_amount: netAmount, status: "draft", notes: formNotes || null
      }).select().single();
      if (certError) throw certError;
      const itemsToInsert = formItems.filter(i => i.current_quantity > 0).map(i => ({
        certificate_id: cert.id, project_item_id: i.project_item_id, item_number: i.item_number,
        description: i.description, unit: i.unit, contract_quantity: i.contract_quantity,
        unit_price: i.unit_price, previous_quantity: i.previous_quantity, current_quantity: i.current_quantity,
        total_quantity: i.total_quantity, current_amount: i.current_amount
      }));
      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from("progress_certificate_items").insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }
      toast.success(isArabic ? `تم إنشاء المستخلص رقم ${nextNumber}` : `Certificate #${nextNumber} created`);
      navigate("/progress-certificates");
    } catch (error) {
      console.error("Error:", error);
      toast.error(isArabic ? "حدث خطأ" : "Error occurred");
    } finally { setSaving(false); }
  };

  const contractTypeLabels: Record<string, string> = {
    fixed_price: isArabic ? "سعر ثابت" : "Fixed Price",
    unit_price: isArabic ? "أسعار وحدات" : "Unit Price",
    cost_plus: isArabic ? "التكلفة + ربح" : "Cost Plus",
    lump_sum: isArabic ? "مبلغ مقطوع" : "Lump Sum",
  };

  const getPaymentStatusIcon = (status: string | null) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
      case 'overdue': return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return <Clock className="h-3.5 w-3.5 text-yellow-600" />;
    }
  };

  // Remaining contract value after previous certificates
  const remainingContractValue = useMemo(() => {
    if (!selectedContractValue) return null;
    const prevTotal = previousCertsSummary?.totalWorkDone || 0;
    return selectedContractValue - prevTotal;
  }, [selectedContractValue, previousCertsSummary]);

  return (
    <PageLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 form-card-safe" dir={isArabic ? "rtl" : "ltr"}>
        {/* Header */}
        <PageHeader
          icon={FileCheck}
          title={isArabic ? "إنشاء مستخلص جديد" : "Create New Certificate"}
          subtitle={isArabic ? "أدخل بيانات المستخلص الجديد وربطه بالعقد" : "Enter new certificate details and link to contract"}
          actions={
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
        />

        <div className="space-y-4">
          {/* Section 1: Project, Contractor, Contract */}
          <Card className="border-primary/20">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {isArabic ? "المشروع والمقاول والعقد" : "Project, Contractor & Contract"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{isArabic ? "المشروع" : "Project"}</Label>
                  <Select value={formProjectId} onValueChange={handleProjectChange}>
                    <SelectTrigger><SelectValue placeholder={isArabic ? "اختر المشروع" : "Select project"} /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{isArabic ? "المقاول" : "Contractor"}</Label>
                  <Select value={formContractor} onValueChange={handleContractorChange}>
                    <SelectTrigger><SelectValue placeholder={isArabic ? "اختر المقاول" : "Select contractor"} /></SelectTrigger>
                    <SelectContent>
                      {contractors.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {availableContracts.length > 0 && (
                <div>
                  <Label className="flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />{isArabic ? "العقد المرتبط" : "Linked Contract"}</Label>
                  <Select value={formContractId} onValueChange={handleContractChange}>
                    <SelectTrigger><SelectValue placeholder={isArabic ? "اختر العقد" : "Select contract"} /></SelectTrigger>
                    <SelectContent>
                      {availableContracts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.contract_number} - {c.contract_title}{c.contract_value ? ` (${formatCurrency(c.contract_value)})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formProjectId && formContractor && availableContracts.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {isArabic ? "لا توجد عقود مسجلة لهذا المقاول في هذا المشروع" : "No contracts found for this contractor in this project"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* NEW: Contract Details Card */}
          {contractDetails && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {isArabic ? "تفاصيل العقد" : "Contract Details"}
                  <Badge variant="outline" className="text-[10px]">
                    {contractTypeLabels[contractDetails.contract_type || ''] || contractDetails.contract_type}
                  </Badge>
                  {contractDetails.status && (
                    <Badge variant={contractDetails.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {contractDetails.status === 'active' ? (isArabic ? 'نشط' : 'Active') : contractDetails.status}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-background rounded-lg border text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{isArabic ? "قيمة العقد" : "Contract Value"}</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(contractDetails.contract_value || 0)}</p>
                  </div>
                  <div className="p-2.5 bg-background rounded-lg border text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{isArabic ? "نسبة الاحتجاز" : "Retention %"}</p>
                    <p className="text-sm font-bold">{contractDetails.retention_percentage ?? 10}%</p>
                  </div>
                  <div className="p-2.5 bg-background rounded-lg border text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{isArabic ? "دفعة مقدمة" : "Advance Payment"}</p>
                    <p className="text-sm font-bold">{contractDetails.advance_payment_percentage ?? 0}%</p>
                  </div>
                  <div className="p-2.5 bg-background rounded-lg border text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{isArabic ? "نسبة الإنجاز" : "Execution %"}</p>
                    <p className="text-sm font-bold text-blue-600">{contractDetails.execution_percentage ?? 0}%</p>
                  </div>
                </div>

                {/* Duration */}
                {(contractDetails.start_date || contractDetails.end_date) && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{contractDetails.start_date || '—'} → {contractDetails.end_date || '—'}</span>
                    {contractDetails.contract_duration_months && (
                      <Badge variant="secondary" className="text-[10px]">{contractDetails.contract_duration_months} {isArabic ? "شهر" : "months"}</Badge>
                    )}
                  </div>
                )}

                {/* Progress bar: current vs contract */}
                {remainingContractValue !== null && selectedContractValue && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{isArabic ? "المنفذ من العقد" : "Executed from contract"}</span>
                      <span className="font-medium">{formatCurrency(selectedContractValue - remainingContractValue)} / {formatCurrency(selectedContractValue)}</span>
                    </div>
                    <Progress value={Math.min(100, ((selectedContractValue - remainingContractValue) / selectedContractValue) * 100)} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">{isArabic ? "المتبقي:" : "Remaining:"} <span className="font-semibold text-primary">{formatCurrency(remainingContractValue)}</span></p>
                  </div>
                )}

                {/* Payment Terms */}
                {contractDetails.payment_terms && (
                  <div className="flex items-start gap-2 text-xs bg-muted/40 p-2 rounded">
                    <Banknote className="h-3.5 w-3.5 mt-0.5 text-green-600 shrink-0" />
                    <div>
                      <span className="font-medium">{isArabic ? "شروط الدفع:" : "Payment Terms:"}</span>
                      <span className="ms-1 text-muted-foreground">{contractDetails.payment_terms}</span>
                    </div>
                  </div>
                )}

                {/* Terms & Conditions - Collapsible */}
                {contractDetails.terms_conditions && (
                  <Collapsible open={termsOpen} onOpenChange={setTermsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8">
                        <span className="flex items-center gap-1.5">
                          <FileWarning className="h-3.5 w-3.5" />
                          {isArabic ? "الشروط التعاقدية" : "Terms & Conditions"}
                        </span>
                        {termsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded mt-1 whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                        {contractDetails.terms_conditions}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          )}

          {/* Previous Certificates Summary */}
          {previousCertsSummary && (
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  {isArabic ? "ملخص المستخلصات السابقة" : "Previous Certificates Summary"}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-background rounded border">
                    <p className="text-xs text-muted-foreground">{isArabic ? "عدد المستخلصات" : "Certificates"}</p>
                    <p className="text-lg font-bold">{previousCertsSummary.count}</p>
                  </div>
                  <div className="text-center p-2 bg-background rounded border">
                    <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي الأعمال" : "Total Work"}</p>
                    <p className="text-sm font-bold">{formatCurrency(previousCertsSummary.totalWorkDone)}</p>
                  </div>
                  <div className="text-center p-2 bg-background rounded border">
                    <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي المدفوع" : "Total Paid"}</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(previousCertsSummary.totalNetPaid)}</p>
                  </div>
                  {previousCertsSummary.lastCert && (
                    <div className="text-center p-2 bg-background rounded border">
                      <p className="text-xs text-muted-foreground">{isArabic ? "آخر مستخلص" : "Last Cert"}</p>
                      <p className="text-sm font-bold">#{previousCertsSummary.lastCert.number}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* NEW: Payment History Card */}
          {contractPayments.length > 0 && (
            <Card className="border-green-200 bg-green-50/30 dark:bg-green-950/10 dark:border-green-800">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-green-600" />
                  {isArabic ? "سجل الدفعات" : "Payment History"}
                  <Badge variant="secondary" className="text-[10px]">{paymentStats.total} {isArabic ? "دفعة" : "payments"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-background rounded border">
                    <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-green-600 mb-1" />
                    <p className="text-[10px] text-muted-foreground">{isArabic ? "مدفوع" : "Paid"}</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(paymentStats.paid)}</p>
                  </div>
                  <div className="text-center p-2 bg-background rounded border">
                    <Clock className="h-3.5 w-3.5 mx-auto text-yellow-600 mb-1" />
                    <p className="text-[10px] text-muted-foreground">{isArabic ? "معلق" : "Pending"}</p>
                    <p className="text-sm font-bold text-yellow-600">{formatCurrency(paymentStats.pending)}</p>
                  </div>
                  <div className="text-center p-2 bg-background rounded border">
                    <XCircle className="h-3.5 w-3.5 mx-auto text-destructive mb-1" />
                    <p className="text-[10px] text-muted-foreground">{isArabic ? "متأخر" : "Overdue"}</p>
                    <p className="text-sm font-bold text-destructive">{formatCurrency(paymentStats.overdue)}</p>
                  </div>
                </div>
                {/* Payment list */}
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {contractPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs bg-background p-2 rounded border">
                      <div className="flex items-center gap-2">
                        {getPaymentStatusIcon(p.status)}
                        <span className="font-medium">#{p.payment_number}</span>
                        {p.description && <span className="text-muted-foreground truncate max-w-[120px]">{p.description}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{p.due_date}</span>
                        <span className="font-bold">{formatCurrency(p.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{isArabic ? "من تاريخ" : "Period From"}</Label>
              <Input type="date" value={formPeriodFrom} onChange={e => setFormPeriodFrom(e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{isArabic ? "إلى تاريخ" : "Period To"}</Label>
              <Input type="date" value={formPeriodTo} onChange={e => setFormPeriodTo(e.target.value)} />
            </div>
          </div>

          {/* Items Table with Pagination */}
          {formItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-lg font-semibold">{isArabic ? "بنود المشروع" : "Project Items"}</Label>
                  <Badge variant="secondary" className="text-xs">
                    {filledItemsCount} / {formItems.length} {isArabic ? "بند" : "items"}
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={fillAllRemaining} className="gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5" />
                    {isArabic ? "ملء الكل" : "Fill All"}
                  </Button>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="%"
                      value={fillPercentage}
                      onChange={e => setFillPercentage(e.target.value)}
                      className="h-8 w-16 text-xs"
                      min={0} max={100}
                    />
                    <Button size="sm" variant="outline" onClick={() => {
                      const pct = parseFloat(fillPercentage);
                      if (pct > 0 && pct <= 100) fillByPercentage(pct);
                      else toast.error(isArabic ? "أدخل نسبة صحيحة" : "Enter valid %");
                    }} className="gap-1">
                      <Percent className="h-3.5 w-3.5" />
                      {isArabic ? "ملء بنسبة" : "Fill %"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Item Search */}
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? "بحث في البنود..." : "Search items..."}
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  className="ps-9 h-8 text-xs"
                />
              </div>

              <ScrollArea className="h-[350px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">{isArabic ? "رقم" : "#"}</TableHead>
                      <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                      <TableHead className="w-[50px]">{isArabic ? "وحدة" : "Unit"}</TableHead>
                      <TableHead className="w-[70px]">{isArabic ? "الكمية" : "Qty"}</TableHead>
                      <TableHead className="w-[80px]">{isArabic ? "سعر" : "Price"}</TableHead>
                      <TableHead className="w-[70px]">{isArabic ? "سابق" : "Prev"}</TableHead>
                      <TableHead className="w-[90px]">{isArabic ? "حالي" : "Current"}</TableHead>
                      <TableHead className="w-[70px]">{isArabic ? "متبقي" : "Remain"}</TableHead>
                      <TableHead className="w-[80px]">{isArabic ? "الإنجاز" : "Progress"}</TableHead>
                      <TableHead className="w-[90px]">{isArabic ? "المبلغ" : "Amount"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item) => {
                      const originalIdx = formItems.indexOf(item);
                      return (
                        <ItemRow
                          key={originalIdx}
                          item={item}
                          originalIdx={originalIdx}
                          isArabic={isArabic}
                          formatCurrency={formatCurrency}
                          updateItemQuantity={updateItemQuantity}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Load More / Pagination */}
              {displayItems.length > visibleItemsCount && (
                <div className="text-center">
                  <Button variant="outline" size="sm" onClick={() => setVisibleItemsCount(prev => prev + 25)}>
                    {isArabic
                      ? `عرض المزيد (${visibleItemsCount} من ${displayItems.length})`
                      : `Show More (${visibleItemsCount} of ${displayItems.length})`}
                  </Button>
                </div>
              )}
              {displayItems.length > 0 && visibleItemsCount >= displayItems.length && displayItems.length > 25 && (
                <p className="text-center text-[10px] text-muted-foreground">{isArabic ? "تم عرض جميع البنود" : "All items displayed"}</p>
              )}
            </div>
          )}

          {loadingItems && <p className="text-center text-muted-foreground py-4">{isArabic ? "جاري تحميل البنود..." : "Loading items..."}</p>}

          <Separator />

          {/* Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" />
                {isArabic ? "نسبة الاحتجاز %" : "Retention %"}
                {formContractId && <span className="text-xs text-muted-foreground">({isArabic ? "من العقد" : "from contract"})</span>}
              </Label>
              <Input type="number" value={formRetention} onChange={e => setFormRetention(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                {isArabic ? "خصم دفعة مقدمة" : "Advance Deduction"}
                {advancePercentage > 0 && <span className="text-xs text-muted-foreground">({advancePercentage}%)</span>}
              </Label>
              <Input type="number" value={formAdvanceDeduction} onChange={e => { setFormAdvanceDeduction(parseFloat(e.target.value) || 0); setAdvancePercentage(0); }} />
            </div>
            <div>
              <Label>{isArabic ? "خصومات أخرى" : "Other Deductions"}</Label>
              <Input type="number" value={formOtherDeductions} onChange={e => setFormOtherDeductions(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Overall Progress */}
          {formItems.length > 0 && (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    {isArabic ? "نسبة الإنجاز الكلية" : "Overall Progress"}
                  </span>
                  <span className="text-sm font-bold text-primary">{overallProgress}%</span>
                </div>
                <Progress value={Math.min(overallProgress, 100)} className="h-3" />
              </CardContent>
            </Card>
          )}

          {/* Enhanced Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
              <CardContent className="pt-3 pb-2 text-center">
                <TrendingUp className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                <p className="text-[10px] text-muted-foreground">{isArabic ? "الأعمال الحالية" : "Current Work"}</p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{formatCurrency(currentWorkDone)}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50 border-muted-foreground/20">
              <CardContent className="pt-3 pb-2 text-center">
                <FileText className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-[10px] text-muted-foreground">{isArabic ? "الأعمال السابقة" : "Previous Work"}</p>
                <p className="text-sm font-bold">{formatCurrency(previousWorkDone)}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-200">
              <CardContent className="pt-3 pb-2 text-center">
                <DollarSign className="h-4 w-4 mx-auto text-destructive mb-1" />
                <p className="text-[10px] text-muted-foreground">{isArabic ? "الخصومات" : "Deductions"}</p>
                <p className="text-sm font-bold text-destructive">-{formatCurrency(retentionAmount + formAdvanceDeduction + formOtherDeductions)}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200">
              <CardContent className="pt-3 pb-2 text-center">
                <DollarSign className="h-4 w-4 mx-auto text-green-600 mb-1" />
                <p className="text-[10px] text-muted-foreground">{isArabic ? "صافي المستحق" : "Net Amount"}</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatCurrency(netAmount)}</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t form-actions-safe">
          <Button variant="outline" onClick={() => navigate(-1)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={handleSaveClick} disabled={!formProjectId || !formContractor || saving}>
            {saving ? (isArabic ? "جاري الحفظ..." : "Saving...") : (isArabic ? "حفظ المستخلص" : "Save Certificate")}
          </Button>
        </div>

        {/* Confirm Save Dialog */}
        {showConfirmDialog && (
          <Dialog open={true} onOpenChange={open => { if (!open) setShowConfirmDialog(false); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isArabic ? "تأكيد حفظ المستخلص" : "Confirm Save Certificate"}</DialogTitle>
                <DialogDescription>{isArabic ? "راجع ملخص المستخلص قبل الحفظ" : "Review certificate summary before saving"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{isArabic ? "المقاول" : "Contractor"}</span><strong>{formContractor}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{isArabic ? "بنود معبأة" : "Filled Items"}</span><strong>{filledItemsCount} / {formItems.length}</strong></div>
                {contractDetails && (
                  <div className="flex justify-between"><span className="text-muted-foreground">{isArabic ? "العقد" : "Contract"}</span><strong>{contractDetails.contract_number}</strong></div>
                )}
                <Separator />
                <div className="flex justify-between"><span>{isArabic ? "الأعمال الحالية" : "Current Work"}</span><strong>{formatCurrency(currentWorkDone)}</strong></div>
                <div className="flex justify-between text-destructive"><span>{isArabic ? "الخصومات" : "Deductions"}</span><span>-{formatCurrency(retentionAmount + formAdvanceDeduction + formOtherDeductions)}</span></div>
                <Separator />
                <div className="flex justify-between text-lg font-bold"><span>{isArabic ? "صافي المستحق" : "Net Amount"}</span><span className="text-primary">{formatCurrency(netAmount)}</span></div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>{isArabic ? "مراجعة" : "Review"}</Button>
                <Button onClick={handleCreateCertificate}>{isArabic ? "تأكيد الحفظ" : "Confirm Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PageLayout>
  );
};

export default NewCertificatePage;

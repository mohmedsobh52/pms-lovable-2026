import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { TrendingUp, DollarSign, FileText, Users, AlertTriangle, FileSignature, Calendar } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { SmartSuggestionsBanner, type SmartSuggestion } from "@/components/SmartSuggestionsBanner";

interface Contract {
  id: string;
  contract_title: string;
  contract_value: number | null;
  status: string | null;
  contract_type: string | null;
  contractor_name: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#10B981",
  draft: "#605F5F",
  pending: "#F3570C",
  completed: "#161616",
  terminated: "#EF4444",
  suspended: "#7C3AED",
};

const TYPE_COLORS = [
  "#F3570C", // Brand Primary
  "#161616", // Brand Foreground
  "#605F5F", // Brand Secondary
  "#10B981", // Green
  "#7C3AED", // Purple
  "#A0A09F", // Brand Border
];

export const ContractsDashboard = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    try {
      const { data } = await supabase
        .from("contracts")
        .select("*")
        .eq("user_id", user?.id);
      
      setContracts(data || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for Status Distribution Chart
  const statusData = Object.entries(
    contracts.reduce((acc, contract) => {
      const status = contract.status || "draft";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: isArabic ? getStatusArabic(name) : name,
    value,
    color: STATUS_COLORS[name] || "#6b7280",
  }));

  // Prepare data for Value by Type Chart
  const typeData = Object.entries(
    contracts.reduce((acc, contract) => {
      const type = contract.contract_type || "other";
      acc[type] = (acc[type] || 0) + (contract.contract_value || 0);
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value], index) => ({
    name: isArabic ? getTypeArabic(name) : formatTypeName(name),
    value,
    color: TYPE_COLORS[index % TYPE_COLORS.length],
  }));

  // Prepare data for Timeline Chart (last 12 months)
  const timelineData = Array.from({ length: 12 }, (_, i) => {
    const date = startOfMonth(subMonths(new Date(), 11 - i));
    const monthContracts = contracts.filter(c => {
      const createdAt = new Date(c.created_at);
      return createdAt >= date && createdAt < startOfMonth(subMonths(new Date(), 10 - i));
    });
    
    return {
      month: format(date, "MMM", { locale: isArabic ? ar : enUS }),
      contracts: monthContracts.length,
      value: monthContracts.reduce((sum, c) => sum + (c.contract_value || 0), 0) / 1000000,
    };
  });

  // Top contractors by value
  const topContractors = Object.entries(
    contracts.reduce((acc, contract) => {
      const name = contract.contractor_name || (isArabic ? "غير محدد" : "Unknown");
      acc[name] = (acc[name] || 0) + (contract.contract_value || 0);
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value: value / 1000000 }));

  const totalValue = contracts.reduce((sum, c) => sum + (c.contract_value || 0), 0);
  const activeContracts = contracts.filter(c => c.status === "active").length;
  const completedContracts = contracts.filter(c => c.status === "completed").length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const contractSuggestions = useMemo((): SmartSuggestion[] => {
    const list: SmartSuggestion[] = [];
    const drafts = contracts.filter(c => c.status === 'draft').length;
    if (drafts > 0) list.push({ id: 'drafts', icon: <FileText className="h-4 w-4" />, text: isArabic ? `${drafts} عقود مسودة — أكمل بياناتها وفعّلها` : `${drafts} draft contracts — complete and activate them`, action: () => {}, actionLabel: isArabic ? 'مراجعة' : 'Review' });
    if (contracts.length === 0) list.push({ id: 'no_contracts', icon: <FileSignature className="h-4 w-4" />, text: isArabic ? 'أنشئ أول عقد لتتبع التنفيذ والمدفوعات' : 'Create your first contract to track execution & payments', action: () => navigate('/contracts'), actionLabel: isArabic ? 'إنشاء' : 'Create' });
    const expiringContracts = contracts.filter(c => { if (!c.end_date) return false; const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)); return daysLeft > 0 && daysLeft <= 30; });
    if (expiringContracts.length > 0) list.push({ id: 'expiring', icon: <AlertTriangle className="h-4 w-4" />, text: isArabic ? `${expiringContracts.length} عقود تنتهي خلال 30 يوم` : `${expiringContracts.length} contracts expiring within 30 days`, action: () => {}, actionLabel: isArabic ? 'عرض' : 'View' });
    if (contracts.length > 0 && activeContracts === 0) list.push({ id: 'all_inactive', icon: <Calendar className="h-4 w-4" />, text: isArabic ? 'لا توجد عقود نشطة — فعّل عقداً أو أنشئ جديداً' : 'No active contracts — activate one or create new', action: () => navigate('/contracts'), actionLabel: isArabic ? 'إدارة' : 'Manage' });
    return list.slice(0, 3);
  }, [contracts, activeContracts, isArabic, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Smart Suggestions */}
      <SmartSuggestionsBanner suggestions={contractSuggestions} />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contracts.length}</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "إجمالي العقود" : "Total Contracts"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeContracts}</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "عقود نشطة" : "Active Contracts"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/20">
                <Users className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedContracts}</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "عقود مكتملة" : "Completed"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(totalValue)}</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "إجمالي القيمة" : "Total Value"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue contracts card */}
        {contracts.filter(c => {
          if (!c.end_date || c.status === 'completed' || c.status === 'terminated') return false;
          return new Date(c.end_date) < new Date();
        }).length > 0 && (
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20 col-span-2 md:col-span-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <FileText className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-lg font-bold text-destructive">
                    {contracts.filter(c => {
                      if (!c.end_date || c.status === 'completed' || c.status === 'terminated') return false;
                      return new Date(c.end_date) < new Date();
                    }).length} {isArabic ? "عقود متأخرة" : "Overdue Contracts"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? "يرجى مراجعة العقود المتأخرة فوراً" : "Please review overdue contracts immediately"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isArabic ? "توزيع العقود حسب الحالة" : "Contracts by Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد بيانات" : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Value by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isArabic ? "قيم العقود حسب النوع" : "Contract Values by Type"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد بيانات" : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isArabic ? "تطور العقود (آخر 12 شهر)" : "Contract Trends (Last 12 Months)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="contracts"
                  stroke="hsl(var(--primary))"
                  name={isArabic ? "عدد العقود" : "Contracts"}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  name={isArabic ? "القيمة (مليون)" : "Value (M)"}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Contractors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isArabic ? "أعلى 5 مقاولين" : "Top 5 Contractors"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topContractors.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topContractors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v.toFixed(1)}M`} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)}M SAR`} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد بيانات" : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function getStatusArabic(status: string): string {
  const map: Record<string, string> = {
    active: "نشط",
    draft: "مسودة",
    pending: "معلق",
    completed: "مكتمل",
    terminated: "منتهي",
    suspended: "موقف",
  };
  return map[status] || status;
}

function getTypeArabic(type: string): string {
  const map: Record<string, string> = {
    fidic_red: "فيديك الأحمر",
    fidic_yellow: "فيديك الأصفر",
    fidic_silver: "فيديك الفضي",
    fidic_green: "فيديك الأخضر",
    fidic_pink: "فيديك الوردي",
    lump_sum: "مقطوعة",
    unit_price: "أسعار الوحدات",
    cost_plus: "التكلفة زائد",
    other: "أخرى",
  };
  return map[type] || type;
}

function formatTypeName(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

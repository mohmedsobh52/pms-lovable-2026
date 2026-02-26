import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useLanguage } from "@/hooks/useLanguage";
import { useMaterialPrices } from "@/hooks/useMaterialPrices";
import { useLaborRates } from "@/hooks/useLaborRates";
import { useEquipmentRates } from "@/hooks/useEquipmentRates";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, BarChart3, TrendingDown, TrendingUp, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface MatchedItem {
  quotationItem: string;
  libraryItem: string;
  quotationPrice: number;
  libraryPrice: number;
  difference: number;
  differencePercent: number;
  type: 'material' | 'labor' | 'equipment';
  supplierName: string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b"];

// Simple keyword matching
const matchScore = (a: string, b: string): number => {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\u0600-\u06FF\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const wordsA = normalize(a);
  const wordsB = normalize(b);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  let matches = 0;
  for (const w of wordsA) {
    if (wordsB.some(wb => wb.includes(w) || w.includes(wb))) matches++;
  }
  return matches / Math.max(wordsA.length, wordsB.length);
};

export const LibraryQuotationReport = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { materials } = useMaterialPrices();
  const { laborRates } = useLaborRates();
  const { equipmentRates } = useEquipmentRates();
  const [search, setSearch] = useState("");

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['analyzed-quotations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('price_quotations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'analyzed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(q => ({
        ...q,
        ai_analysis: typeof q.ai_analysis === 'string' ? JSON.parse(q.ai_analysis) : q.ai_analysis
      }));
    },
    enabled: !!user,
  });

  const matchedItems = useMemo<MatchedItem[]>(() => {
    if (!quotations || quotations.length === 0) return [];
    
    const results: MatchedItem[] = [];
    const THRESHOLD = 0.3;

    for (const q of quotations) {
      const items = q.ai_analysis?.items || [];
      const supplierName = q.ai_analysis?.supplier?.name || q.supplier_name || q.name || '';

      for (const item of items) {
        if (!item.description || !item.unit_price || item.unit_price <= 0) continue;
        const desc = item.description;

        // Match materials
        let bestMatch: { name: string; price: number; score: number; type: 'material' | 'labor' | 'equipment' } | null = null;

        for (const m of materials) {
          const score = Math.max(matchScore(desc, m.name), m.name_ar ? matchScore(desc, m.name_ar) : 0);
          if (score > THRESHOLD && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { name: m.name, price: m.unit_price, score, type: 'material' };
          }
        }

        for (const l of laborRates) {
          const score = Math.max(matchScore(desc, l.name), l.name_ar ? matchScore(desc, l.name_ar) : 0);
          if (score > THRESHOLD && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { name: l.name, price: l.unit_rate, score, type: 'labor' };
          }
        }

        for (const e of equipmentRates) {
          const score = Math.max(matchScore(desc, e.name), e.name_ar ? matchScore(desc, e.name_ar) : 0);
          if (score > THRESHOLD && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { name: e.name, price: e.rental_rate, score, type: 'equipment' };
          }
        }

        if (bestMatch) {
          const diff = item.unit_price - bestMatch.price;
          const diffPct = bestMatch.price > 0 ? (diff / bestMatch.price) * 100 : 0;
          results.push({
            quotationItem: desc,
            libraryItem: bestMatch.name,
            quotationPrice: item.unit_price,
            libraryPrice: bestMatch.price,
            difference: diff,
            differencePercent: diffPct,
            type: bestMatch.type,
            supplierName,
          });
        }
      }
    }

    return results;
  }, [quotations, materials, laborRates, equipmentRates]);

  const filteredItems = useMemo(() => {
    if (!search) return matchedItems;
    const q = search.toLowerCase();
    return matchedItems.filter(item => 
      item.quotationItem.toLowerCase().includes(q) || 
      item.libraryItem.toLowerCase().includes(q) ||
      item.supplierName.toLowerCase().includes(q)
    );
  }, [matchedItems, search]);

  const stats = useMemo(() => {
    const totalQuotationItems = (quotations || []).reduce((acc, q) => acc + (q.ai_analysis?.items?.length || 0), 0);
    const matched = matchedItems.length;
    const coverage = totalQuotationItems > 0 ? (matched / totalQuotationItems) * 100 : 0;
    const avgDiff = matched > 0 ? matchedItems.reduce((acc, i) => acc + i.differencePercent, 0) / matched : 0;
    const savings = matchedItems.filter(i => i.difference > 0).reduce((acc, i) => acc + i.difference, 0);
    const byType = { material: 0, labor: 0, equipment: 0 };
    matchedItems.forEach(i => byType[i.type]++);
    return { totalQuotationItems, matched, coverage, avgDiff, savings, byType };
  }, [matchedItems, quotations]);

  const barChartData = useMemo(() => {
    return filteredItems.slice(0, 15).map((item, idx) => ({
      name: (item.libraryItem || '').slice(0, 20),
      library: item.libraryPrice,
      quotation: item.quotationPrice,
    }));
  }, [filteredItems]);

  const pieData = useMemo(() => [
    { name: isArabic ? 'مواد' : 'Materials', value: stats.byType.material },
    { name: isArabic ? 'عمالة' : 'Labor', value: stats.byType.labor },
    { name: isArabic ? 'معدات' : 'Equipment', value: stats.byType.equipment },
  ].filter(d => d.value > 0), [stats, isArabic]);

  const exportToExcel = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Comparison');
    const headers = ['Quotation Item', 'Library Item', 'Type', 'Quotation Price', 'Library Price', 'Difference', 'Difference %', 'Supplier'];
    sheet.addRow(headers);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2744' } };
    
    matchedItems.forEach(item => {
      sheet.addRow([
        item.quotationItem, item.libraryItem, item.type,
        item.quotationPrice, item.libraryPrice, item.difference,
        `${item.differencePercent.toFixed(1)}%`, item.supplierName,
      ]);
    });
    
    sheet.columns.forEach(col => { col.width = 22; });
    [4, 5, 6].forEach(i => { sheet.getColumn(i).numFmt = '#,##0.00'; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Library_vs_Quotations_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(isArabic ? "تم التصدير بنجاح" : "Exported successfully");
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!quotations || quotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-1">{isArabic ? "لا توجد عروض أسعار محللة" : "No analyzed quotations"}</p>
        <p className="text-sm">{isArabic ? "قم بتحليل عروض الأسعار أولاً من صفحة العروض" : "Analyze quotations first from the quotations page"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">{isArabic ? "بنود مطابقة" : "Matched Items"}</span>
            </div>
            <p className="text-2xl font-bold">{stats.matched}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? `من ${stats.totalQuotationItems} بند` : `of ${stats.totalQuotationItems} items`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{isArabic ? "نسبة التغطية" : "Coverage"}</span>
            </div>
            <p className="text-2xl font-bold">{stats.coverage.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              {stats.avgDiff > 0 ? <TrendingUp className="h-4 w-4 text-red-500" /> : <TrendingDown className="h-4 w-4 text-green-500" />}
              <span className="text-xs text-muted-foreground">{isArabic ? "متوسط الفرق" : "Avg Difference"}</span>
            </div>
            <p className={`text-2xl font-bold ${stats.avgDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.avgDiff > 0 ? '+' : ''}{stats.avgDiff.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">{isArabic ? "فرق إجمالي" : "Total Variance"}</span>
            </div>
            <p className="text-2xl font-bold">{stats.savings.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">SAR</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {matchedItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isArabic ? "مقارنة الأسعار: المكتبة vs العروض" : "Price Comparison: Library vs Quotations"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barChartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" fontSize={10} interval={0} />
                  <YAxis fontSize={10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => value.toLocaleString()}
                  />
                  <Bar dataKey="library" name={isArabic ? "المكتبة" : "Library"} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="quotation" name={isArabic ? "العروض" : "Quotations"} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isArabic ? "توزيع المطابقات" : "Match Distribution"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{isArabic ? "جدول المقارنة التفصيلي" : "Detailed Comparison Table"}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder={isArabic ? "بحث..." : "Search..."} value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm pr-9" />
              </div>
              <Button variant="outline" size="sm" className="gap-1 h-8" onClick={exportToExcel}>
                <Download className="h-3.5 w-3.5" />
                {isArabic ? "تصدير" : "Export"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right text-xs font-bold w-8">#</TableHead>
                  <TableHead className="text-right text-xs font-bold">{isArabic ? "بند العرض" : "Quotation Item"}</TableHead>
                  <TableHead className="text-right text-xs font-bold">{isArabic ? "بند المكتبة" : "Library Item"}</TableHead>
                  <TableHead className="text-right text-xs font-bold w-16">{isArabic ? "النوع" : "Type"}</TableHead>
                  <TableHead className="text-right text-xs font-bold w-24">{isArabic ? "سعر العرض" : "Quote Price"}</TableHead>
                  <TableHead className="text-right text-xs font-bold w-24">{isArabic ? "سعر المكتبة" : "Library Price"}</TableHead>
                  <TableHead className="text-right text-xs font-bold w-20">{isArabic ? "الفرق %" : "Diff %"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isArabic ? "لا توجد بنود مطابقة" : "No matched items"}</TableCell></TableRow>
                ) : filteredItems.slice(0, 50).map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30">
                    <TableCell className="text-xs">{idx + 1}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={item.quotationItem}>{item.quotationItem}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={item.libraryItem}>{item.libraryItem}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {item.type === 'material' ? (isArabic ? 'مواد' : 'Mat') : item.type === 'labor' ? (isArabic ? 'عمالة' : 'Lab') : (isArabic ? 'معدات' : 'Eq')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{item.quotationPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-mono">{item.libraryPrice.toLocaleString()}</TableCell>
                    <TableCell className={`text-xs font-bold ${item.differencePercent > 5 ? 'text-red-600' : item.differencePercent < -5 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {item.differencePercent > 0 ? '+' : ''}{item.differencePercent.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredItems.length > 50 && (
            <p className="text-xs text-center text-muted-foreground py-2">{isArabic ? `عرض 50 من ${filteredItems.length} بند` : `Showing 50 of ${filteredItems.length} items`}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

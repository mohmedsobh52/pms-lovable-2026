import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  GitCompare, 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  Equal,
  AlertTriangle,
  FileText,
  Layers
} from "lucide-react";

interface AnalyzedFile {
  id: string;
  file_name: string;
  category: string | null;
  analysis_result: any;
  is_analyzed: boolean | null;
}

interface FilesComparisonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analyzedFiles: AnalyzedFile[];
}

interface ComparisonItem {
  description: string;
  file1Qty?: number | string;
  file2Qty?: number | string;
  file1Price?: number;
  file2Price?: number;
  difference?: number;
  percentChange?: number;
  status: "higher" | "lower" | "equal" | "new" | "missing";
}

export function FilesComparisonDialog({ isOpen, onClose, analyzedFiles }: FilesComparisonDialogProps) {
  const { isArabic } = useLanguage();
  const [file1Id, setFile1Id] = useState<string>("");
  const [file2Id, setFile2Id] = useState<string>("");

  const file1 = useMemo(() => analyzedFiles.find(f => f.id === file1Id), [analyzedFiles, file1Id]);
  const file2 = useMemo(() => analyzedFiles.find(f => f.id === file2Id), [analyzedFiles, file2Id]);

  const comparison = useMemo(() => {
    if (!file1?.analysis_result?.items || !file2?.analysis_result?.items) {
      return null;
    }

    const items1 = file1.analysis_result.items as any[];
    const items2 = file2.analysis_result.items as any[];
    
    const comparisonResults: ComparisonItem[] = [];
    const matched2Indices = new Set<number>();

    // Compare items from file1 to file2
    items1.forEach(item1 => {
      const desc1 = (item1.description || "").toLowerCase().trim();
      const match = items2.findIndex((item2, idx) => {
        if (matched2Indices.has(idx)) return false;
        const desc2 = (item2.description || "").toLowerCase().trim();
        // Simple similarity check
        return desc1 === desc2 || 
               desc1.includes(desc2) || 
               desc2.includes(desc1) ||
               (desc1.length > 10 && desc2.length > 10 && 
                (desc1.slice(0, 20) === desc2.slice(0, 20)));
      });

      if (match !== -1) {
        matched2Indices.add(match);
        const item2 = items2[match];
        const price1 = parseFloat(item1.total_price) || parseFloat(item1.unit_price) || 0;
        const price2 = parseFloat(item2.total_price) || parseFloat(item2.unit_price) || 0;
        const difference = price2 - price1;
        const percentChange = price1 > 0 ? ((price2 - price1) / price1) * 100 : 0;

        comparisonResults.push({
          description: item1.description || "-",
          file1Qty: item1.quantity,
          file2Qty: item2.quantity,
          file1Price: price1,
          file2Price: price2,
          difference,
          percentChange,
          status: difference > 0 ? "higher" : difference < 0 ? "lower" : "equal"
        });
      } else {
        comparisonResults.push({
          description: item1.description || "-",
          file1Qty: item1.quantity,
          file1Price: parseFloat(item1.total_price) || parseFloat(item1.unit_price) || 0,
          status: "missing"
        });
      }
    });

    // Add items only in file2
    items2.forEach((item2, idx) => {
      if (!matched2Indices.has(idx)) {
        comparisonResults.push({
          description: item2.description || "-",
          file2Qty: item2.quantity,
          file2Price: parseFloat(item2.total_price) || parseFloat(item2.unit_price) || 0,
          status: "new"
        });
      }
    });

    return comparisonResults;
  }, [file1, file2]);

  const summaryStats = useMemo(() => {
    if (!comparison) return null;

    const total1 = file1?.analysis_result?.total_value || 
                   file1?.analysis_result?.extracted_data?.total_value || 
                   comparison.filter(c => c.file1Price).reduce((sum, c) => sum + (c.file1Price || 0), 0);
    const total2 = file2?.analysis_result?.total_value || 
                   file2?.analysis_result?.extracted_data?.total_value ||
                   comparison.filter(c => c.file2Price).reduce((sum, c) => sum + (c.file2Price || 0), 0);

    return {
      total1,
      total2,
      difference: total2 - total1,
      percentChange: total1 > 0 ? ((total2 - total1) / total1) * 100 : 0,
      higherCount: comparison.filter(c => c.status === "higher").length,
      lowerCount: comparison.filter(c => c.status === "lower").length,
      equalCount: comparison.filter(c => c.status === "equal").length,
      newCount: comparison.filter(c => c.status === "new").length,
      missingCount: comparison.filter(c => c.status === "missing").length,
    };
  }, [comparison, file1, file2]);

  const getStatusIcon = (status: ComparisonItem["status"]) => {
    switch (status) {
      case "higher": return <TrendingUp className="w-4 h-4 text-red-500" />;
      case "lower": return <TrendingDown className="w-4 h-4 text-green-500" />;
      case "equal": return <Equal className="w-4 h-4 text-blue-500" />;
      case "new": return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "missing": return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ComparisonItem["status"]) => {
    const styles = {
      higher: "bg-red-500/10 text-red-600 border-red-500/30",
      lower: "bg-green-500/10 text-green-600 border-green-500/30",
      equal: "bg-blue-500/10 text-blue-600 border-blue-500/30",
      new: "bg-orange-500/10 text-orange-600 border-orange-500/30",
      missing: "bg-gray-500/10 text-gray-500 border-gray-500/30",
    };
    const labels = {
      higher: isArabic ? "أعلى" : "Higher",
      lower: isArabic ? "أقل" : "Lower",
      equal: isArabic ? "متساوي" : "Equal",
      new: isArabic ? "جديد" : "New",
      missing: isArabic ? "مفقود" : "Missing",
    };
    return <Badge variant="outline" className={styles[status]}>{labels[status]}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            {isArabic ? "مقارنة الملفات المحللة" : "Compare Analyzed Files"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "اختر ملفين لمقارنة نتائج تحليلهما واكتشاف الفروقات"
              : "Select two files to compare their analysis results and discover differences"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{isArabic ? "الملف الأول" : "File 1"}</label>
              <Select value={file1Id} onValueChange={setFile1Id}>
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? "اختر ملف..." : "Select file..."} />
                </SelectTrigger>
                <SelectContent>
                  {analyzedFiles.filter(f => f.id !== file2Id).map(file => (
                    <SelectItem key={file.id} value={file.id}>
                      <span className="truncate">{file.file_name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isArabic ? "الملف الثاني" : "File 2"}</label>
              <Select value={file2Id} onValueChange={setFile2Id}>
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? "اختر ملف..." : "Select file..."} />
                </SelectTrigger>
                <SelectContent>
                  {analyzedFiles.filter(f => f.id !== file1Id).map(file => (
                    <SelectItem key={file.id} value={file.id}>
                      <span className="truncate">{file.file_name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison Results */}
          {file1 && file2 && comparison ? (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary" className="gap-2">
                  <Layers className="w-4 h-4" />
                  {isArabic ? "الملخص" : "Summary"}
                </TabsTrigger>
                <TabsTrigger value="details" className="gap-2">
                  <FileText className="w-4 h-4" />
                  {isArabic ? "التفاصيل" : "Details"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary">
                {summaryStats && (
                  <div className="space-y-4">
                    {/* Total Comparison */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-sm text-muted-foreground mb-1">{file1.file_name.slice(0, 20)}...</p>
                        <p className="text-2xl font-bold">{summaryStats.total1.toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 text-center flex flex-col items-center justify-center">
                        <ArrowUpDown className="w-6 h-6 mb-2" />
                        <p className={cn(
                          "text-lg font-bold",
                          summaryStats.difference > 0 ? "text-red-500" : summaryStats.difference < 0 ? "text-green-500" : "text-blue-500"
                        )}>
                          {summaryStats.difference > 0 ? "+" : ""}{summaryStats.difference.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ({summaryStats.percentChange > 0 ? "+" : ""}{summaryStats.percentChange.toFixed(1)}%)
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-sm text-muted-foreground mb-1">{file2.file_name.slice(0, 20)}...</p>
                        <p className="text-2xl font-bold">{summaryStats.total2.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Status Counts */}
                    <div className="grid grid-cols-5 gap-2">
                      <div className="p-3 rounded-lg bg-red-500/10 text-center">
                        <TrendingUp className="w-5 h-5 text-red-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{summaryStats.higherCount}</p>
                        <p className="text-xs text-muted-foreground">{isArabic ? "أعلى" : "Higher"}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/10 text-center">
                        <TrendingDown className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{summaryStats.lowerCount}</p>
                        <p className="text-xs text-muted-foreground">{isArabic ? "أقل" : "Lower"}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                        <Equal className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{summaryStats.equalCount}</p>
                        <p className="text-xs text-muted-foreground">{isArabic ? "متساوي" : "Equal"}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                        <AlertTriangle className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{summaryStats.newCount}</p>
                        <p className="text-xs text-muted-foreground">{isArabic ? "جديد" : "New"}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-500/10 text-center">
                        <AlertTriangle className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-lg font-bold">{summaryStats.missingCount}</p>
                        <p className="text-xs text-muted-foreground">{isArabic ? "مفقود" : "Missing"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details">
                <ScrollArea className="h-[50vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-start p-2">{isArabic ? "البند" : "Item"}</th>
                        <th className="text-center p-2">{isArabic ? "الملف 1" : "File 1"}</th>
                        <th className="text-center p-2">{isArabic ? "الملف 2" : "File 2"}</th>
                        <th className="text-center p-2">{isArabic ? "الفرق" : "Diff"}</th>
                        <th className="text-center p-2">{isArabic ? "الحالة" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/30">
                          <td className="p-2 max-w-[200px] truncate">{item.description}</td>
                          <td className="p-2 text-center">{item.file1Price?.toLocaleString() || "-"}</td>
                          <td className="p-2 text-center">{item.file2Price?.toLocaleString() || "-"}</td>
                          <td className={cn(
                            "p-2 text-center font-medium",
                            (item.difference || 0) > 0 ? "text-red-500" : (item.difference || 0) < 0 ? "text-green-500" : ""
                          )}>
                            {item.difference !== undefined ? (
                              <>
                                {item.difference > 0 ? "+" : ""}{item.difference.toLocaleString()}
                                {item.percentChange !== undefined && (
                                  <span className="text-xs text-muted-foreground block">
                                    ({item.percentChange > 0 ? "+" : ""}{item.percentChange.toFixed(1)}%)
                                  </span>
                                )}
                              </>
                            ) : "-"}
                          </td>
                          <td className="p-2 text-center">
                            {getStatusBadge(item.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : file1 && file2 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{isArabic ? "لا توجد بنود للمقارنة في أحد الملفين أو كليهما" : "No items to compare in one or both files"}</p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <GitCompare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{isArabic ? "اختر ملفين للمقارنة" : "Select two files to compare"}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

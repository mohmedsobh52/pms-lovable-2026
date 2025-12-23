import { useState, useMemo } from "react";
import { GitCompare, Calendar, Trash2, Eye, ArrowUp, ArrowDown, Minus, Plus, X, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface BOQVersion {
  id: string;
  name: string;
  date: string;
  items: BOQItem[];
  totalValue: number;
  itemCount: number;
}

interface VarianceItem {
  item_number: string;
  description: string;
  v1_quantity: number;
  v2_quantity: number;
  v1_price: number;
  v2_price: number;
  quantity_change: number;
  price_change: number;
  status: "added" | "removed" | "increased" | "decreased" | "unchanged";
}

const STORAGE_KEY = "boq_versions";

export function BOQVersionComparison({ 
  currentItems, 
  currentTotalValue 
}: { 
  currentItems?: BOQItem[]; 
  currentTotalValue?: number;
}) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<BOQVersion[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedV1, setSelectedV1] = useState<string | null>(null);
  const [selectedV2, setSelectedV2] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [versionName, setVersionName] = useState("");

  const saveVersion = () => {
    if (!currentItems || currentItems.length === 0) {
      toast({
        title: "No Data",
        description: "Upload a BOQ file first to save a version.",
        variant: "destructive"
      });
      return;
    }

    const name = versionName.trim() || `Version ${versions.length + 1}`;
    const newVersion: BOQVersion = {
      id: crypto.randomUUID(),
      name,
      date: new Date().toISOString(),
      items: currentItems,
      totalValue: currentTotalValue || currentItems.reduce((sum, item) => sum + (item.total_price || 0), 0),
      itemCount: currentItems.length
    };

    const updatedVersions = [newVersion, ...versions].slice(0, 10); // Keep max 10 versions
    setVersions(updatedVersions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVersions));
    setVersionName("");

    toast({
      title: "Version Saved",
      description: `"${name}" saved with ${currentItems.length} items.`
    });
  };

  const deleteVersion = (id: string) => {
    const updatedVersions = versions.filter(v => v.id !== id);
    setVersions(updatedVersions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVersions));
    
    if (selectedV1 === id) setSelectedV1(null);
    if (selectedV2 === id) setSelectedV2(null);

    toast({
      title: "Version Deleted",
      description: "The version has been removed."
    });
  };

  const variance = useMemo(() => {
    if (!selectedV1 || !selectedV2) return null;

    const v1 = versions.find(v => v.id === selectedV1);
    const v2 = versions.find(v => v.id === selectedV2);

    if (!v1 || !v2) return null;

    const result: VarianceItem[] = [];
    const v1Map = new Map(v1.items.map(item => [item.item_number, item]));
    const v2Map = new Map(v2.items.map(item => [item.item_number, item]));

    // Check items in v1
    for (const [itemNo, item1] of v1Map) {
      const item2 = v2Map.get(itemNo);
      
      if (!item2) {
        // Removed in v2
        result.push({
          item_number: itemNo,
          description: item1.description,
          v1_quantity: item1.quantity,
          v2_quantity: 0,
          v1_price: item1.total_price || 0,
          v2_price: 0,
          quantity_change: -item1.quantity,
          price_change: -(item1.total_price || 0),
          status: "removed"
        });
      } else {
        // Exists in both
        const qtyChange = item2.quantity - item1.quantity;
        const priceChange = (item2.total_price || 0) - (item1.total_price || 0);
        
        result.push({
          item_number: itemNo,
          description: item2.description,
          v1_quantity: item1.quantity,
          v2_quantity: item2.quantity,
          v1_price: item1.total_price || 0,
          v2_price: item2.total_price || 0,
          quantity_change: qtyChange,
          price_change: priceChange,
          status: priceChange > 0 ? "increased" : priceChange < 0 ? "decreased" : "unchanged"
        });
      }
    }

    // Check items only in v2 (added)
    for (const [itemNo, item2] of v2Map) {
      if (!v1Map.has(itemNo)) {
        result.push({
          item_number: itemNo,
          description: item2.description,
          v1_quantity: 0,
          v2_quantity: item2.quantity,
          v1_price: 0,
          v2_price: item2.total_price || 0,
          quantity_change: item2.quantity,
          price_change: item2.total_price || 0,
          status: "added"
        });
      }
    }

    // Sort by status priority
    const statusOrder = { added: 0, removed: 1, increased: 2, decreased: 3, unchanged: 4 };
    result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return {
      v1,
      v2,
      items: result,
      totalV1: v1.totalValue,
      totalV2: v2.totalValue,
      totalChange: v2.totalValue - v1.totalValue,
      changePercent: v1.totalValue > 0 ? ((v2.totalValue - v1.totalValue) / v1.totalValue) * 100 : 0,
      addedCount: result.filter(i => i.status === "added").length,
      removedCount: result.filter(i => i.status === "removed").length,
      changedCount: result.filter(i => i.status === "increased" || i.status === "decreased").length
    };
  }, [selectedV1, selectedV2, versions]);

  const exportVariance = () => {
    if (!variance) return;

    const headers = ["Item Code", "Description", "V1 Qty", "V2 Qty", "Qty Change", "V1 Price", "V2 Price", "Price Change", "Status"];
    const rows = variance.items.map(item => [
      item.item_number,
      item.description,
      item.v1_quantity.toString(),
      item.v2_quantity.toString(),
      item.quantity_change.toString(),
      item.v1_price.toLocaleString(),
      item.v2_price.toLocaleString(),
      item.price_change.toLocaleString(),
      item.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `variance_${variance.v1.name}_vs_${variance.v2.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Variance report exported to CSV."
    });
  };

  const getStatusIcon = (status: VarianceItem["status"]) => {
    switch (status) {
      case "added": return <Plus className="w-4 h-4 text-green-500" />;
      case "removed": return <Minus className="w-4 h-4 text-red-500" />;
      case "increased": return <ArrowUp className="w-4 h-4 text-orange-500" />;
      case "decreased": return <ArrowDown className="w-4 h-4 text-blue-500" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: VarianceItem["status"]) => {
    const classes = {
      added: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      removed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      increased: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      decreased: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      unchanged: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    };
    return classes[status];
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GitCompare className="w-4 h-4" />
          Compare Versions
          {versions.length > 0 && (
            <Badge variant="secondary" className="ml-1">{versions.length}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            BOQ Version Comparison
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Save Current Version */}
          <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
            <input
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="Version name (optional)"
              className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
            />
            <Button onClick={saveVersion} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Save Current BOQ
            </Button>
          </div>

          {/* Saved Versions List */}
          {versions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Saved Versions ({versions.length}/10)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {versions.map((version) => (
                  <div 
                    key={version.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer",
                      selectedV1 === version.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" :
                      selectedV2 === version.id ? "border-green-500 bg-green-50 dark:bg-green-900/20" :
                      "border-border hover:border-primary/50"
                    )}
                    onClick={() => {
                      if (!selectedV1 || selectedV1 === version.id) {
                        setSelectedV1(selectedV1 === version.id ? null : version.id);
                      } else if (!selectedV2 || selectedV2 === version.id) {
                        setSelectedV2(selectedV2 === version.id ? null : version.id);
                      } else {
                        setSelectedV1(version.id);
                        setSelectedV2(null);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{version.name}</span>
                          {selectedV1 === version.id && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">V1</Badge>
                          )}
                          {selectedV2 === version.id && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700">V2</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(version.date).toLocaleDateString()}
                          </span>
                          <span>{version.itemCount} items</span>
                          <span className="font-medium text-primary">
                            {version.totalValue.toLocaleString()} SAR
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteVersion(version.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compare Button */}
          {selectedV1 && selectedV2 && (
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowComparison(true)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                View Comparison
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedV1(null);
                  setSelectedV2(null);
                }}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Clear Selection
              </Button>
            </div>
          )}

          {/* Comparison Results */}
          {showComparison && variance && (
            <div className="space-y-4 border-t pt-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400">V1: {variance.v1.name}</p>
                  <p className="font-bold text-lg text-blue-700 dark:text-blue-300">
                    {variance.totalV1.toLocaleString()} SAR
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600 dark:text-green-400">V2: {variance.v2.name}</p>
                  <p className="font-bold text-lg text-green-700 dark:text-green-300">
                    {variance.totalV2.toLocaleString()} SAR
                  </p>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  variance.totalChange >= 0 
                    ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                )}>
                  <p className="text-xs text-muted-foreground">Total Change</p>
                  <p className={cn(
                    "font-bold text-lg",
                    variance.totalChange >= 0 ? "text-orange-600" : "text-blue-600"
                  )}>
                    {variance.totalChange >= 0 ? "+" : ""}{variance.totalChange.toLocaleString()} SAR
                    <span className="text-sm ml-1">
                      ({variance.changePercent >= 0 ? "+" : ""}{variance.changePercent.toFixed(1)}%)
                    </span>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground">Items Summary</p>
                  <div className="flex gap-2 mt-1">
                    <Badge className="bg-green-500/20 text-green-700 text-xs">+{variance.addedCount}</Badge>
                    <Badge className="bg-red-500/20 text-red-700 text-xs">-{variance.removedCount}</Badge>
                    <Badge className="bg-orange-500/20 text-orange-700 text-xs">~{variance.changedCount}</Badge>
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={exportVariance} className="gap-2">
                  <FileDown className="w-4 h-4" />
                  Export Variance Report
                </Button>
              </div>

              {/* Variance Table */}
              <ScrollArea className="h-[300px] border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Item Code</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">V1 Qty</th>
                      <th className="px-3 py-2 text-right">V2 Qty</th>
                      <th className="px-3 py-2 text-right">V1 Price</th>
                      <th className="px-3 py-2 text-right">V2 Price</th>
                      <th className="px-3 py-2 text-right">Δ Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variance.items.filter(i => i.status !== "unchanged").map((item, idx) => (
                      <tr key={idx} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(item.status)}
                            <Badge className={cn("text-xs", getStatusBadge(item.status))}>
                              {item.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{item.item_number}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate" title={item.description}>
                          {item.description}
                        </td>
                        <td className="px-3 py-2 text-right">{item.v1_quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{item.v2_quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{item.v1_price.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{item.v2_price.toLocaleString()}</td>
                        <td className={cn(
                          "px-3 py-2 text-right font-medium",
                          item.price_change > 0 ? "text-orange-600" : item.price_change < 0 ? "text-blue-600" : ""
                        )}>
                          {item.price_change > 0 ? "+" : ""}{item.price_change.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}

          {versions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No saved versions yet.</p>
              <p className="text-sm">Upload a BOQ file and save it to start comparing versions.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
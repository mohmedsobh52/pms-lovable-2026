import { useNavigate } from "react-router-dom";
import {
  FolderOpen, Loader2, Calendar, Edit, DollarSign, Package,
  FileSpreadsheet, History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ProjectData, ProjectItem, formatLargeNumber, getSafeProjectTotal, computeSafeTotalFromItems } from "@/lib/project-utils";

interface ProjectQuickViewProps {
  project: ProjectData | null;
  items: ProjectItem[];
  isLoading: boolean;
  isArabic: boolean;
  onClose: () => void;
  onExportExcel: (project: ProjectData) => void;
}

export function ProjectQuickView({ project, items, isLoading, isArabic, onClose, onExportExcel }: ProjectQuickViewProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={!!project} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            {project?.name}
          </DialogTitle>
        </DialogHeader>
        
        {project && <div className="overflow-y-auto max-h-[60vh]">
          {isLoading ? (
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
                  <p className="font-semibold text-lg">{items.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">{isArabic ? "القيمة الإجمالية" : "Total Value"}</p>
                  </div>
                  <p className="font-semibold text-lg text-emerald-600">
                    {formatLargeNumber(
                      items.length > 0
                        ? (computeSafeTotalFromItems(items) || getSafeProjectTotal(project))
                        : getSafeProjectTotal(project),
                      project.currency || 'SAR'
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <p className="text-xs text-muted-foreground">{isArabic ? "تاريخ الإنشاء" : "Created"}</p>
                  </div>
                  <p className="font-semibold">
                    {new Date(project.created_at).toLocaleDateString()}
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
                    {items.map((item, idx) => (
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
              {items.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {isArabic ? "اقتراحات ذكية" : "Smart Suggestions"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.some(item => !item.unit_price || item.unit_price === 0) && (
                      <Button
                        variant="outline" size="sm" className="gap-2 text-xs"
                        onClick={() => { onClose(); navigate(`/projects/${project.id}`); }}
                      >
                        <Edit className="w-3 h-3" />
                        {isArabic ? "فتح للتسعير" : "Open for Pricing"}
                        <Badge variant="secondary" className="text-[10px] px-1">
                          {items.filter(i => !i.unit_price || i.unit_price === 0).length} {isArabic ? "بدون سعر" : "unpriced"}
                        </Badge>
                      </Button>
                    )}
                    <Button
                      variant="outline" size="sm" className="gap-2 text-xs"
                      onClick={() => onExportExcel(project)}
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      {isArabic ? "تصدير إلى Excel" : "Export to Excel"}
                    </Button>
                    {items.length >= 5 && (
                      <Button
                        variant="outline" size="sm" className="gap-2 text-xs"
                        onClick={() => { onClose(); navigate('/historical-pricing'); }}
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
  );
}

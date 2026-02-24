import { useState, useMemo, useCallback, memo } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Download, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

interface WBSTreeDiagramProps {
  wbsData: WBSItem[];
}

interface TreeNode {
  item: WBSItem;
  children: TreeNode[];
  totalDescendants: number;
}

// Count total descendants recursively
function countDescendants(node: TreeNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

// Memoized tree node component
const TreeNodeComponent = memo(function TreeNodeComponent({
  node,
  level,
  expandedNodes,
  onToggle,
}: {
  node: TreeNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (code: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.item.code);
  const levelColors = [
    "bg-primary text-primary-foreground",
    "bg-accent text-accent-foreground",
    "bg-muted text-foreground",
  ];

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50",
          level === 0 && "font-semibold"
        )}
        onClick={() => hasChildren && onToggle(node.item.code)}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}
        
        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="w-5 h-5 text-warning" />
          ) : (
            <Folder className="w-5 h-5 text-warning" />
          )
        ) : (
          <FileText className="w-5 h-5 text-muted-foreground" />
        )}

        <span className={cn(
          "px-2 py-0.5 rounded text-xs font-mono",
          levelColors[Math.min(level, levelColors.length - 1)]
        )}>
          {node.item.code}
        </span>

        <span className={cn(
          "text-sm",
          level === 0 ? "font-medium" : "text-muted-foreground"
        )}>
          {node.item.title}
        </span>

        {node.item.items.length > 0 && (
          <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {node.item.items.length} items
          </span>
        )}

        {/* Show descendant count when collapsed */}
        {hasChildren && !isExpanded && node.totalDescendants > 0 && (
          <span className="ml-1 text-xs text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
            +{node.totalDescendants}
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="border-l-2 border-border/50 ml-6">
          {node.children.map(child => (
            <TreeNodeComponent
              key={child.item.code}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export function WBSTreeDiagram({ wbsData }: WBSTreeDiagramProps) {
  const { isArabic } = useLanguage();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set(wbsData.map(w => w.code)));
  const [zoom, setZoom] = useState(100);

  // Memoized tree building
  const tree = useMemo(() => {
    const nodeMap: Record<string, TreeNode> = {};
    const roots: TreeNode[] = [];

    wbsData.forEach(item => {
      nodeMap[item.code] = { item, children: [], totalDescendants: 0 };
    });

    wbsData.forEach(item => {
      const node = nodeMap[item.code];
      if (item.parent_code && nodeMap[item.parent_code]) {
        nodeMap[item.parent_code].children.push(node);
      } else if (item.level === 1) {
        roots.push(node);
      }
    });

    Object.values(nodeMap).forEach(node => {
      node.children.sort((a, b) => a.item.code.localeCompare(b.item.code));
    });

    // Calculate descendants
    const calcDesc = (n: TreeNode): number => {
      n.totalDescendants = countDescendants(n);
      n.children.forEach(calcDesc);
      return n.totalDescendants;
    };
    roots.forEach(calcDesc);

    return roots;
  }, [wbsData]);

  const toggleNode = useCallback((code: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedNodes(new Set(wbsData.map(w => w.code)));
  }, [wbsData]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const exportToPDF = useCallback(() => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Work Breakdown Structure (WBS)", margin, 16);

    yPos = 35;
    pdf.setTextColor(30, 41, 59);

    const drawNode = (node: TreeNode, level: number) => {
      if (yPos > 190) { pdf.addPage(); yPos = 20; }
      const indent = margin + (level * 15);
      const prefix = level === 0 ? "▸ " : level === 1 ? "▹ " : "○ ";
      pdf.setFontSize(level === 0 ? 12 : level === 1 ? 10 : 9);
      pdf.setFont("helvetica", level === 0 ? "bold" : "normal");
      pdf.text(`${prefix}${node.item.code} - ${node.item.title}`, indent, yPos);
      yPos += 7;
      if (node.item.items?.length > 0) {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Items: ${node.item.items.join(", ")}`, indent + 10, yPos);
        pdf.setTextColor(30, 41, 59);
        yPos += 5;
      }
      node.children.forEach(child => drawNode(child, level + 1));
    };
    tree.forEach(root => drawNode(root, 0));
    pdf.save('wbs-tree-diagram.pdf');
  }, [tree]);

  if (wbsData.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          {isArabic ? "لا توجد بيانات WBS لعرضها" : "No WBS data to display"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-warning" />
          {isArabic ? "الهيكل التنظيمي - WBS" : "WBS Tree Diagram"}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={collapseAll}>
            {isArabic ? "طي الكل" : "Collapse All"}
          </Button>
          <Button variant="outline" size="sm" onClick={expandAll}>
            {isArabic ? "توسيع الكل" : "Expand All"}
          </Button>
          <div className="flex items-center gap-1 border border-border rounded-lg px-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(50, zoom - 10))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(150, zoom + 10))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="overflow-auto max-h-[600px] p-4 bg-muted/20 rounded-xl border border-border"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
        >
          {tree.map(root => (
            <TreeNodeComponent
              key={root.item.code}
              node={root}
              level={0}
              expandedNodes={expandedNodes}
              onToggle={toggleNode}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-warning" />
            <span>{isArabic ? "مجلد قابل للتوسيع" : "Expandable Group"}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span>{isArabic ? "عنصر نهائي" : "Leaf Item"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

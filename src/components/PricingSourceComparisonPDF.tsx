import { useCallback } from "react";
import { FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { REFERENCE_PRICES } from "@/lib/reference-prices";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface CalculatedCosts {
  calculatedUnitPrice: number;
  aiSuggestedRate?: number;
}

interface CostData {
  materials?: number;
  equipment?: number;
  general_labor?: number;
}

interface PricingSourceComparisonPDFProps {
  items: BOQItem[];
  projectName: string;
  currency: string;
  getItemCalculatedCosts: (itemId: string) => CalculatedCosts;
  getItemCostData?: (itemId: string) => CostData | null;
}

function findRefPrice(desc: string): { min: number; max: number; avg: number } | null {
  const d = desc.toLowerCase();
  for (const ref of REFERENCE_PRICES) {
    if (ref.keywords.some(kw => d.includes(kw.toLowerCase())) || ref.keywordsAr.some(kw => d.includes(kw))) {
      return { min: ref.minPrice, max: ref.maxPrice, avg: ref.avgPrice };
    }
  }
  return null;
}

function computeConfidence(sources: (number | null)[]): number {
  const valid = sources.filter(s => s !== null && s > 0) as number[];
  if (valid.length === 0) return 0;

  const totalSources = sources.length;
  const sourceCoverage = valid.length / totalSources;

  let consistency = 1;
  if (valid.length >= 2) {
    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const stdDev = Math.sqrt(valid.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / valid.length);
    consistency = Math.max(0, 1 - (stdDev / mean));
  }

  return Math.round((sourceCoverage * 0.4 + consistency * 0.3 + (valid.length >= 2 ? 0.2 : 0) + 0.1) * 100);
}

export function PricingSourceComparisonPDF({
  items,
  projectName,
  currency,
  getItemCalculatedCosts,
  getItemCostData,
}: PricingSourceComparisonPDFProps) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();

  const generateReport = useCallback(() => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // --- Cover page ---
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("Pricing Source Comparison Report", pageW / 2, 60, { align: "center" });
    doc.setFontSize(14);
    doc.text(projectName, pageW / 2, 80, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageW / 2, 95, { align: "center" });
    doc.text(`Items: ${items.length} | Currency: ${currency}`, pageW / 2, 105, { align: "center" });

    // --- Source summary page ---
    doc.addPage();
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text("Source Coverage Summary", 14, 20);

    // Calculate source stats
    let userCount = 0, refCount = 0, aiCount = 0, calcCount = 0;
    const confidences: number[] = [];

    const rowsData = items.map(item => {
      const calc = getItemCalculatedCosts(item.item_number);
      const ref = findRefPrice(item.description);
      const userPrice = item.unit_price || 0;
      const refPrice = ref?.avg || null;
      const aiPrice = calc.aiSuggestedRate || null;
      const calcPrice = calc.calculatedUnitPrice || null;

      if (userPrice > 0) userCount++;
      if (refPrice) refCount++;
      if (aiPrice) aiCount++;
      if (calcPrice) calcCount++;

      const sources: (number | null)[] = [userPrice || null, refPrice, aiPrice, calcPrice];
      const confidence = computeConfidence(sources);
      confidences.push(confidence);

      const validPrices = sources.filter(s => s !== null && s > 0) as number[];
      const bestPrice = validPrices.length > 0
        ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
        : 0;

      return {
        itemNumber: item.item_number,
        desc: (item.description || "").substring(0, 40),
        unit: item.unit,
        userPrice,
        refPrice,
        aiPrice,
        calcPrice,
        bestPrice,
        confidence,
      };
    });

    const avgConfidence = confidences.length > 0
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : 0;

    autoTable(doc, {
      startY: 30,
      head: [["Source", "Items Covered", "Coverage %", "Avg Confidence"]],
      body: [
        ["User Price", `${userCount}`, `${Math.round((userCount / items.length) * 100)}%`, "-"],
        ["Reference DB", `${refCount}`, `${Math.round((refCount / items.length) * 100)}%`, "-"],
        ["AI Suggested", `${aiCount}`, `${Math.round((aiCount / items.length) * 100)}%`, "-"],
        ["Calculated", `${calcCount}`, `${Math.round((calcCount / items.length) * 100)}%`, "-"],
        ["Overall", `${items.length}`, "100%", `${avgConfidence}%`],
      ],
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 8 },
    });

    // Confidence distribution
    const high = confidences.filter(c => c >= 70).length;
    const medium = confidences.filter(c => c >= 40 && c < 70).length;
    const low = confidences.filter(c => c < 40).length;

    const summaryY = (doc as any).lastAutoTable?.finalY || 80;
    doc.setFontSize(12);
    doc.text("Confidence Distribution", 14, summaryY + 15);
    doc.setFontSize(9);
    doc.setTextColor(34, 139, 34);
    doc.text(`High (>=70%): ${high} items (${Math.round((high / items.length) * 100)}%)`, 14, summaryY + 25);
    doc.setTextColor(255, 165, 0);
    doc.text(`Medium (40-69%): ${medium} items (${Math.round((medium / items.length) * 100)}%)`, 14, summaryY + 32);
    doc.setTextColor(220, 20, 60);
    doc.text(`Low (<40%): ${low} items (${Math.round((low / items.length) * 100)}%)`, 14, summaryY + 39);

    // --- Detailed comparison table ---
    doc.addPage();
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text("Detailed Price Source Comparison", 14, 20);

    autoTable(doc, {
      startY: 28,
      head: [["#", "Description", "Unit", "User Price", "Ref. Price", "AI Price", "Calc. Price", "Best Price", "Confidence"]],
      body: rowsData.map(r => [
        r.itemNumber,
        r.desc,
        r.unit,
        r.userPrice > 0 ? r.userPrice.toLocaleString() : "-",
        r.refPrice ? r.refPrice.toLocaleString() : "-",
        r.aiPrice ? r.aiPrice.toLocaleString() : "-",
        r.calcPrice ? r.calcPrice.toLocaleString() : "-",
        r.bestPrice > 0 ? r.bestPrice.toLocaleString() : "-",
        `${r.confidence}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7, cellPadding: 1.5 },
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 55 },
        8: { cellWidth: 18 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 8) {
          const val = parseInt(String(data.cell.raw).replace("%", ""));
          if (val >= 70) data.cell.styles.textColor = [34, 139, 34];
          else if (val >= 40) data.cell.styles.textColor = [200, 130, 0];
          else data.cell.styles.textColor = [220, 20, 60];
        }
      },
    });

    // --- Recommendations page ---
    const needsReview = rowsData.filter(r => r.confidence < 40 || r.userPrice === 0);
    if (needsReview.length > 0) {
      doc.addPage();
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text("Items Requiring Review", 14, 20);

      autoTable(doc, {
        startY: 28,
        head: [["#", "Description", "Issue", "Suggested Action"]],
        body: needsReview.slice(0, 50).map(r => [
          r.itemNumber,
          r.desc,
          r.userPrice === 0 ? "No user price" : `Low confidence (${r.confidence}%)`,
          r.bestPrice > 0 ? `Consider price: ${r.bestPrice.toLocaleString()} ${currency}` : "Add pricing data",
        ]),
        theme: "grid",
        headStyles: { fillColor: [180, 50, 50], textColor: [255, 255, 255], fontSize: 8 },
        styles: { fontSize: 7 },
      });
    }

    doc.save(`pricing-source-comparison-${projectName.replace(/\s/g, "-")}.pdf`);

    toast({
      title: isArabic ? "تم إنشاء التقرير" : "Report Generated",
      description: isArabic ? "تم تحميل تقرير مقارنة المصادر" : "Source comparison report downloaded",
    });
  }, [items, projectName, currency, getItemCalculatedCosts, getItemCostData, isArabic, toast]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2 w-full justify-start text-xs"
      onClick={generateReport}
    >
      <FileBarChart className="w-4 h-4 text-indigo-500" />
      {isArabic ? "تقرير مقارنة المصادر" : "Source Comparison Report"}
    </Button>
  );
}

import { useState } from "react";
import { FileDown, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProjectData {
  id: string;
  name: string;
  totalValue: number;
  itemsCount: number;
  currency: string;
  progress?: number;
  spi?: number;
  cpi?: number;
  ev?: number;
  pv?: number;
  ac?: number;
}

interface ProjectComparisonPDFExportProps {
  projects: ProjectData[];
  comparisonName?: string;
}

export function ProjectComparisonPDFExport({
  projects,
  comparisonName = "Project Comparison Report",
}: ProjectComparisonPDFExportProps) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportToPDF = async () => {
    if (projects.length === 0) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "لا توجد مشاريع للمقارنة" : "No projects to compare",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(comparisonName, margin, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 28);
      doc.text(`Projects: ${projects.length}`, pageWidth - margin - 30, 28);

      yPos = 50;

      // Summary Section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(isArabic ? "ملخص المقارنة" : "Comparison Summary", margin, yPos);
      yPos += 10;

      // Summary stats
      const totalValue = projects.reduce((sum, p) => sum + (p.totalValue || 0), 0);
      const avgProgress = projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length;
      const avgSPI = projects.filter(p => p.spi).reduce((sum, p) => sum + (p.spi || 0), 0) / 
                     projects.filter(p => p.spi).length || 0;
      const avgCPI = projects.filter(p => p.cpi).reduce((sum, p) => sum + (p.cpi || 0), 0) / 
                     projects.filter(p => p.cpi).length || 0;

      const summaryData = [
        [isArabic ? "إجمالي القيمة" : "Total Value", `${(totalValue / 1000000).toFixed(2)}M SAR`],
        [isArabic ? "متوسط التقدم" : "Avg Progress", `${avgProgress.toFixed(1)}%`],
        [isArabic ? "متوسط SPI" : "Avg SPI", avgSPI.toFixed(2)],
        [isArabic ? "متوسط CPI" : "Avg CPI", avgCPI.toFixed(2)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [[isArabic ? "المؤشر" : "Metric", isArabic ? "القيمة" : "Value"]],
        body: summaryData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        tableWidth: 80,
        margin: { left: margin },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Projects Comparison Table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(isArabic ? "تفاصيل المشاريع" : "Project Details", margin, yPos);
      yPos += 10;

      const tableHead = [
        isArabic ? "المشروع" : "Project",
        isArabic ? "القيمة" : "Value",
        isArabic ? "البنود" : "Items",
        isArabic ? "التقدم" : "Progress",
        "SPI",
        "CPI",
        "EV",
        "PV",
        "AC",
      ];

      const tableBody = projects.map((project) => [
        project.name.substring(0, 25),
        `${(project.totalValue / 1000000).toFixed(2)}M`,
        project.itemsCount.toString(),
        `${(project.progress || 0).toFixed(1)}%`,
        (project.spi || 0).toFixed(2),
        (project.cpi || 0).toFixed(2),
        project.ev ? `${(project.ev / 1000000).toFixed(2)}M` : "-",
        project.pv ? `${(project.pv / 1000000).toFixed(2)}M` : "-",
        project.ac ? `${(project.ac / 1000000).toFixed(2)}M` : "-",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [tableHead],
        body: tableBody,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        styles: { cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25 },
          2: { cellWidth: 15 },
          3: { cellWidth: 20 },
          4: { cellWidth: 15 },
          5: { cellWidth: 15 },
          6: { cellWidth: 25 },
          7: { cellWidth: 25 },
          8: { cellWidth: 25 },
        },
        margin: { left: margin, right: margin },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Performance Analysis
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(isArabic ? "تحليل الأداء" : "Performance Analysis", margin, yPos);
      yPos += 10;

      // Performance categorization
      const performanceData = projects.map((project) => {
        const spiStatus = (project.spi || 0) >= 1 ? "On Track" : (project.spi || 0) >= 0.9 ? "At Risk" : "Critical";
        const cpiStatus = (project.cpi || 0) >= 1 ? "On Budget" : (project.cpi || 0) >= 0.9 ? "Over Budget" : "Critical";
        return [
          project.name.substring(0, 30),
          spiStatus,
          cpiStatus,
          (project.spi || 0) >= 1 && (project.cpi || 0) >= 1 ? "Healthy" : "Needs Attention",
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [[
          isArabic ? "المشروع" : "Project",
          isArabic ? "حالة الجدول" : "Schedule Status",
          isArabic ? "حالة التكلفة" : "Cost Status",
          isArabic ? "الحالة العامة" : "Overall Status",
        ]],
        body: performanceData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        didParseCell: (data) => {
          if (data.section === "body") {
            const cell = data.cell.raw as string;
            if (cell === "Critical") {
              data.cell.styles.fillColor = [254, 202, 202];
              data.cell.styles.textColor = [153, 27, 27];
            } else if (cell === "At Risk" || cell === "Over Budget") {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [146, 64, 14];
            } else if (cell === "On Track" || cell === "On Budget" || cell === "Healthy") {
              data.cell.styles.fillColor = [209, 250, 229];
              data.cell.styles.textColor = [6, 78, 59];
            }
          }
        },
        margin: { left: margin, right: margin },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      // Save the PDF
      const fileName = `${comparisonName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: isArabic ? "تم التصدير" : "Exported",
        description: isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل تصدير التقرير" : "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={exportToPDF}
      disabled={exporting || projects.length === 0}
      variant="outline"
      className="gap-2"
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      {isArabic ? "تصدير PDF" : "Export PDF"}
    </Button>
  );
}

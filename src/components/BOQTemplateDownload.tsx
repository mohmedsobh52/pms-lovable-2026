import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

export function BOQTemplateDownload() {
  const { isArabic, t } = useLanguage();
  const { toast } = useToast();

  const handleDownloadTemplate = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Define headers in both Arabic and English
    const headers = [
      { ar: 'رقم البند', en: 'Item No.' },
      { ar: 'الوصف', en: 'Description' },
      { ar: 'المواصفات', en: 'Specifications' },
      { ar: 'الوحدة', en: 'Unit' },
      { ar: 'الكمية', en: 'Quantity' },
      { ar: 'سعر الوحدة', en: 'Unit Price' },
      { ar: 'الإجمالي', en: 'Total' },
      { ar: 'ملاحظات', en: 'Notes' },
    ];

    // Create Arabic sheet
    const arabicData = [
      headers.map(h => h.ar),
      ['1', 'أعمال الحفر والردم', 'حفر في جميع أنواع التربة', 'م³', '500', '45', '22500', ''],
      ['2', 'خرسانة عادية', 'خرسانة عادية للأساسات', 'م³', '100', '350', '35000', ''],
      ['3', 'خرسانة مسلحة', 'خرسانة مسلحة للأعمدة والكمرات', 'م³', '250', '550', '137500', ''],
      ['4', 'حديد تسليح', 'حديد تسليح قطر 12-16 مم', 'طن', '25', '3500', '87500', ''],
      ['5', 'أعمال البلوك', 'بلوك خرساني 20 سم', 'م²', '800', '85', '68000', ''],
    ];

    const wsArabic = XLSX.utils.aoa_to_sheet(arabicData);
    
    // Set column widths for Arabic sheet
    wsArabic['!cols'] = [
      { wch: 12 },  // Item No
      { wch: 35 },  // Description
      { wch: 40 },  // Specifications
      { wch: 10 },  // Unit
      { wch: 12 },  // Quantity
      { wch: 15 },  // Unit Price
      { wch: 15 },  // Total
      { wch: 20 },  // Notes
    ];

    // Create English sheet
    const englishData = [
      headers.map(h => h.en),
      ['1', 'Excavation and Backfill', 'Excavation in all soil types', 'm³', '500', '45', '22500', ''],
      ['2', 'Plain Concrete', 'Plain concrete for foundations', 'm³', '100', '350', '35000', ''],
      ['3', 'Reinforced Concrete', 'Reinforced concrete for columns and beams', 'm³', '250', '550', '137500', ''],
      ['4', 'Steel Reinforcement', 'Steel rebar 12-16mm diameter', 'ton', '25', '3500', '87500', ''],
      ['5', 'Block Work', 'Concrete blocks 20cm', 'm²', '800', '85', '68000', ''],
    ];

    const wsEnglish = XLSX.utils.aoa_to_sheet(englishData);
    
    // Set column widths for English sheet
    wsEnglish['!cols'] = [
      { wch: 12 },  // Item No
      { wch: 35 },  // Description
      { wch: 40 },  // Specifications
      { wch: 10 },  // Unit
      { wch: 12 },  // Quantity
      { wch: 15 },  // Unit Price
      { wch: 15 },  // Total
      { wch: 20 },  // Notes
    ];

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, wsArabic, 'BOQ عربي');
    XLSX.utils.book_append_sheet(wb, wsEnglish, 'BOQ English');

    // Generate and download file
    const fileName = isArabic ? 'قالب_جدول_الكميات.xlsx' : 'BOQ_Template.xlsx';
    XLSX.writeFile(wb, fileName);

    toast({
      title: t('templateDownloaded'),
      description: t('templateDownloadedDesc'),
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownloadTemplate}
      className="gap-2 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:border-green-800 dark:hover:border-green-700 dark:hover:bg-green-950/30"
    >
      <FileSpreadsheet className="w-4 h-4" />
      <Download className="w-3 h-3" />
      {t('downloadBOQTemplate')}
    </Button>
  );
}
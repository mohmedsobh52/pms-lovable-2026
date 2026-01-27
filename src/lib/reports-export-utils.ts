import * as ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStoredLogo } from "@/components/CompanyLogoUpload";
import { getCompanySettings } from "@/hooks/useCompanySettings";

interface BOQItem {
  item_number?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface AnalysisData {
  items?: BOQItem[];
  summary?: {
    total_value?: number;
    currency?: string;
    total_items?: number;
  };
}

// Helper function to add company header to Excel worksheet
const addCompanyHeaderToWorksheet = async (
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  isArabic = false
): Promise<number> => {
  const companyLogo = getStoredLogo();
  const companySettings = getCompanySettings();
  const companyNameEn = companySettings.companyNameEn || '';
  const companyNameAr = companySettings.companyNameAr || '';
  
  // Row 1: Company header
  worksheet.mergeCells('A1:B1');
  worksheet.getCell('A1').value = companyNameEn;
  worksheet.getCell('A1').font = { bold: true, italic: true, name: 'Times New Roman', size: 12, color: { argb: 'FF1E293B' } };
  worksheet.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' };
  
  worksheet.mergeCells('E1:F1');
  worksheet.getCell('E1').value = companyNameAr;
  worksheet.getCell('E1').font = { bold: true, name: 'Arial', size: 14, color: { argb: 'FF1E293B' } };
  worksheet.getCell('E1').alignment = { horizontal: 'right', vertical: 'middle' };
  
  // Add logo in center if available
  if (companyLogo) {
    try {
      const base64Data = companyLogo.split(',')[1];
      const extension = companyLogo.includes('image/png') ? 'png' : 'jpeg';
      const imageId = workbook.addImage({
        base64: base64Data,
        extension: extension as 'png' | 'jpeg',
      });
      worksheet.addImage(imageId, {
        tl: { col: 2.5, row: 0.2 },
        ext: { width: 80, height: 40 }
      });
    } catch (e) {
      console.error('Error adding logo to Excel:', e);
    }
  }
  
  worksheet.getRow(1).height = 45;
  
  // Row 2: Blue separator line
  worksheet.getRow(2).height = 5;
  ['A2', 'B2', 'C2', 'D2', 'E2', 'F2'].forEach(cell => {
    worksheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }
    };
  });
  
  // Row 3: Empty row for spacing
  worksheet.getRow(3).height = 15;
  
  return 4; // Data starts at row 4
};

// Export BOQ to Excel with RTL support and company header
export const exportBOQToExcel = async (items: BOQItem[], projectName: string, isArabic = false) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('BOQ', {
    views: [{ rightToLeft: isArabic }]
  });

  // Add company header
  const dataStartRow = await addCompanyHeaderToWorksheet(workbook, worksheet, isArabic);

  // Add project name row
  worksheet.mergeCells(`A${dataStartRow}:F${dataStartRow}`);
  worksheet.getCell(`A${dataStartRow}`).value = projectName;
  worksheet.getCell(`A${dataStartRow}`).font = { bold: true, size: 14, color: { argb: 'FF3B82F6' } };
  worksheet.getCell(`A${dataStartRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(dataStartRow).height = 25;

  const headerRow = dataStartRow + 2;

  // Header row with proper font for Arabic
  const headers = [
    { header: isArabic ? 'رقم البند' : 'Item No.', key: 'item_number', width: 12 },
    { header: isArabic ? 'الوصف' : 'Description', key: 'description', width: 50 },
    { header: isArabic ? 'الوحدة' : 'Unit', key: 'unit', width: 10 },
    { header: isArabic ? 'الكمية' : 'Quantity', key: 'quantity', width: 12 },
    { header: isArabic ? 'سعر الوحدة' : 'Unit Price', key: 'unit_price', width: 15 },
    { header: isArabic ? 'الإجمالي' : 'Total Price', key: 'total_price', width: 18 },
  ];

  // Set column widths
  worksheet.columns = headers.map(h => ({ key: h.key, width: h.width }));

  // Add header row
  const headerRowObj = worksheet.getRow(headerRow);
  headers.forEach((h, idx) => {
    headerRowObj.getCell(idx + 1).value = h.header;
  });

  // Style header
  headerRowObj.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FFFFFFFF' } };
  headerRowObj.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRowObj.alignment = { horizontal: isArabic ? 'right' : 'left', vertical: 'middle' };

  // Add data
  let currentRow = headerRow + 1;
  items.forEach((item) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = item.item_number || '';
    row.getCell(2).value = item.description || '';
    row.getCell(3).value = item.unit || '';
    row.getCell(4).value = item.quantity || 0;
    row.getCell(5).value = item.unit_price || 0;
    row.getCell(6).value = item.total_price || (item.quantity || 0) * (item.unit_price || 0);
    row.font = { name: 'Arial', size: 10 };
    row.alignment = { horizontal: isArabic ? 'right' : 'left', vertical: 'middle' };
    currentRow++;
  });

  // Calculate total
  const totalValue = items.reduce((sum, item) => 
    sum + (item.total_price || (item.quantity || 0) * (item.unit_price || 0)), 0);

  // Add total row
  const totalRow = worksheet.getRow(currentRow);
  totalRow.getCell(1).value = '';
  totalRow.getCell(2).value = isArabic ? 'الإجمالي' : 'TOTAL';
  totalRow.getCell(3).value = '';
  totalRow.getCell(4).value = '';
  totalRow.getCell(5).value = '';
  totalRow.getCell(6).value = totalValue;
  totalRow.font = { bold: true, name: 'Arial', size: 11 };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' }
  };
  totalRow.alignment = { horizontal: isArabic ? 'right' : 'left', vertical: 'middle' };
  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_BOQ.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

// Export Enhanced BOQ to Excel with bilingual support, RTL and company header
export const exportEnhancedBOQToExcel = async (
  items: BOQItem[], 
  projectName: string, 
  language: 'en' | 'ar' | 'both'
) => {
  const workbook = new ExcelJS.Workbook();
  const isRTL = language === 'ar';
  const worksheet = workbook.addWorksheet('Enhanced BOQ', {
    views: [{ rightToLeft: isRTL }]
  });

  // Add company header
  const dataStartRow = await addCompanyHeaderToWorksheet(workbook, worksheet, isRTL);

  // Add project name row
  worksheet.mergeCells(`A${dataStartRow}:G${dataStartRow}`);
  worksheet.getCell(`A${dataStartRow}`).value = projectName;
  worksheet.getCell(`A${dataStartRow}`).font = { bold: true, size: 14, color: { argb: 'FF3B82F6' } };
  worksheet.getCell(`A${dataStartRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(dataStartRow).height = 25;

  const headerRow = dataStartRow + 2;

  const headers = {
    en: ['Item No.', 'Description', 'Unit', 'Quantity', 'Unit Price', 'Total Price', 'Category'],
    ar: ['رقم البند', 'الوصف', 'الوحدة', 'الكمية', 'سعر الوحدة', 'السعر الإجمالي', 'القسم'],
  };

  const selectedHeaders = language === 'both' 
    ? headers.en.map((h, i) => `${h} / ${headers.ar[i]}`)
    : headers[language];

  const columnWidths = [12, 50, 10, 12, 15, 18, 20];

  // Set column widths
  worksheet.columns = columnWidths.map((w, i) => ({ width: w }));

  // Add header row
  const headerRowObj = worksheet.getRow(headerRow);
  selectedHeaders.forEach((h, idx) => {
    headerRowObj.getCell(idx + 1).value = h;
  });

  // Style header
  headerRowObj.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FFFFFFFF' } };
  headerRowObj.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRowObj.alignment = { horizontal: isRTL ? 'right' : 'left', vertical: 'middle' };

  // Group by category
  const groupedItems = items.reduce((acc: Record<string, BOQItem[]>, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  let currentRow = headerRow + 1;

  // Add items with category subtotals
  Object.entries(groupedItems).forEach(([category, categoryItems]) => {
    categoryItems.forEach((item) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = item.item_number || '';
      row.getCell(2).value = item.description || '';
      row.getCell(3).value = item.unit || '';
      row.getCell(4).value = item.quantity || 0;
      row.getCell(5).value = item.unit_price || 0;
      row.getCell(6).value = item.total_price || (item.quantity || 0) * (item.unit_price || 0);
      row.getCell(7).value = category;
      row.font = { name: 'Arial', size: 10 };
      row.alignment = { horizontal: isRTL ? 'right' : 'left', vertical: 'middle' };
      currentRow++;
    });

    // Subtotal for category
    const subtotal = categoryItems.reduce((sum, item) => 
      sum + (item.total_price || (item.quantity || 0) * (item.unit_price || 0)), 0);
    
    const subtotalRow = worksheet.getRow(currentRow);
    subtotalRow.getCell(1).value = '';
    subtotalRow.getCell(2).value = language === 'ar' ? `المجموع الفرعي - ${category}` : `Subtotal - ${category}`;
    subtotalRow.getCell(6).value = subtotal;
    subtotalRow.font = { bold: true, italic: true, name: 'Arial', size: 10 };
    subtotalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' }
    };
    subtotalRow.alignment = { horizontal: isRTL ? 'right' : 'left', vertical: 'middle' };
    currentRow++;
  });

  // Grand total
  const grandTotal = items.reduce((sum, item) => 
    sum + (item.total_price || (item.quantity || 0) * (item.unit_price || 0)), 0);
  
  const totalRow = worksheet.getRow(currentRow);
  totalRow.getCell(2).value = language === 'ar' ? 'المجموع الكلي' : 'GRAND TOTAL';
  totalRow.getCell(6).value = grandTotal;
  totalRow.font = { bold: true, size: 12, name: 'Arial' };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' }
  };
  totalRow.alignment = { horizontal: isRTL ? 'right' : 'left', vertical: 'middle' };
  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_Enhanced_BOQ_${language}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

// Export Tender Summary to Excel with company header
export const exportTenderSummaryToExcel = async (analysisData: AnalysisData, projectName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Tender Summary');

  // Add company header
  const dataStartRow = await addCompanyHeaderToWorksheet(workbook, worksheet, false);

  const items = analysisData.items || [];
  const summary = analysisData.summary || {};

  // Title
  worksheet.mergeCells(`A${dataStartRow}:F${dataStartRow}`);
  worksheet.getCell(`A${dataStartRow}`).value = `Tender Summary - ${projectName}`;
  worksheet.getCell(`A${dataStartRow}`).font = { bold: true, size: 16 };
  worksheet.getCell(`A${dataStartRow}`).alignment = { horizontal: 'center' };

  let currentRow = dataStartRow + 2;

  // Summary info
  worksheet.getRow(currentRow).values = ['Project Name:', projectName];
  currentRow++;
  worksheet.getRow(currentRow).values = ['Total Items:', items.length];
  currentRow++;
  worksheet.getRow(currentRow).values = ['Total Value:', summary.total_value || 0];
  currentRow++;
  worksheet.getRow(currentRow).values = ['Currency:', summary.currency || 'SAR'];
  currentRow += 2;

  // Category breakdown
  worksheet.getRow(currentRow).values = ['Category Breakdown'];
  worksheet.getRow(currentRow).font = { bold: true };
  currentRow++;

  const groupedItems = items.reduce((acc: Record<string, number>, item) => {
    const category = item.category || 'Uncategorized';
    const value = item.total_price || (item.quantity || 0) * (item.unit_price || 0);
    acc[category] = (acc[category] || 0) + value;
    return acc;
  }, {});

  Object.entries(groupedItems).forEach(([category, value]) => {
    worksheet.getRow(currentRow).values = [category, value];
    currentRow++;
  });

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_Tender_Summary.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

// Generate company header HTML for PDF exports
const getCompanyHeaderHTML = () => {
  const companyLogo = getStoredLogo();
  const companySettings = getCompanySettings();
  const companyNameEn = companySettings.companyNameEn || '';
  const companyNameAr = companySettings.companyNameAr || '';
  
  return `
    <div class="company-header">
      <div class="company-name-en">${companyNameEn}</div>
      <div class="company-logo">
        ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" />` : ''}
      </div>
      <div class="company-name-ar">${companyNameAr}</div>
    </div>
  `;
};

const getCompanyHeaderCSS = () => `
  .company-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 25px;
    background: #fff;
    border-bottom: 3px solid #1e40af;
    margin-bottom: 20px;
  }
  .company-name-en {
    font-size: 14px;
    font-weight: 600;
    font-style: italic;
    color: #1e293b;
    font-family: 'Times New Roman', serif;
    flex: 1;
    text-align: left;
  }
  .company-name-ar {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    font-family: 'Cairo', sans-serif;
    flex: 1;
    text-align: right;
  }
  .company-logo {
    flex-shrink: 0;
    padding: 0 20px;
  }
  .company-logo img {
    max-height: 50px;
    max-width: 80px;
    object-fit: contain;
  }
`;

// Export Tender Summary to PDF using HTML-to-Print for Arabic support with company header
export const exportTenderSummaryToPDF = (analysisData: AnalysisData, projectName: string, isArabic = false) => {
  const items = analysisData.items || [];
  const summary = analysisData.summary || {};
  
  // Category breakdown
  const groupedItems = items.reduce((acc: Record<string, { count: number; value: number }>, item) => {
    const category = item.category || 'Uncategorized';
    const value = item.total_price || (item.quantity || 0) * (item.unit_price || 0);
    if (!acc[category]) acc[category] = { count: 0, value: 0 };
    acc[category].count++;
    acc[category].value += value;
    return acc;
  }, {});

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="UTF-8">
      <title>${projectName} - Tender Summary</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { font-family: 'Cairo', 'Segoe UI', sans-serif; box-sizing: border-box; }
        body { 
          direction: ${isArabic ? 'rtl' : 'ltr'}; 
          text-align: ${isArabic ? 'right' : 'left'}; 
          padding: 30px;
          color: #1e293b;
        }
        ${getCompanyHeaderCSS()}
        h1 { text-align: center; color: #3b82f6; margin-bottom: 5px; }
        h2 { text-align: center; color: #64748b; font-weight: normal; margin-bottom: 30px; }
        .summary-box {
          background: #f1f5f9;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 25px;
        }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .summary-row:last-child { border-bottom: none; }
        .label { color: #64748b; }
        .value { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #4472C4; color: white; padding: 12px; text-align: ${isArabic ? 'right' : 'left'}; }
        td { border: 1px solid #e2e8f0; padding: 10px; text-align: ${isArabic ? 'right' : 'left'}; }
        tr:nth-child(even) { background: #f8fafc; }
      </style>
    </head>
    <body>
      ${getCompanyHeaderHTML()}
      <h1>${isArabic ? 'ملخص العطاء' : 'Tender Summary'}</h1>
      <h2>${projectName}</h2>
      
      <div class="summary-box">
        <div class="summary-row">
          <span class="label">${isArabic ? 'إجمالي البنود' : 'Total Items'}</span>
          <span class="value">${items.length}</span>
        </div>
        <div class="summary-row">
          <span class="label">${isArabic ? 'إجمالي القيمة' : 'Total Value'}</span>
          <span class="value">${new Intl.NumberFormat('en-US').format(summary.total_value || 0)} ${summary.currency || 'SAR'}</span>
        </div>
      </div>
      
      <h3>${isArabic ? 'توزيع الفئات' : 'Category Breakdown'}</h3>
      <table>
        <thead>
          <tr>
            <th>${isArabic ? 'الفئة' : 'Category'}</th>
            <th>${isArabic ? 'عدد البنود' : 'Items'}</th>
            <th>${isArabic ? 'القيمة' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(groupedItems).map(([category, data]) => `
            <tr>
              <td>${category}</td>
              <td>${data.count}</td>
              <td>${new Intl.NumberFormat('en-US').format(data.value)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

// Export Price Analysis to Excel with company header
export const exportPriceAnalysisToExcel = async (items: BOQItem[], projectName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Price Analysis');

  // Add company header
  const dataStartRow = await addCompanyHeaderToWorksheet(workbook, worksheet, false);

  // Add project name row
  worksheet.mergeCells(`A${dataStartRow}:G${dataStartRow}`);
  worksheet.getCell(`A${dataStartRow}`).value = `Price Analysis - ${projectName}`;
  worksheet.getCell(`A${dataStartRow}`).font = { bold: true, size: 14, color: { argb: 'FF3B82F6' } };
  worksheet.getCell(`A${dataStartRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(dataStartRow).height = 25;

  const headerRow = dataStartRow + 2;

  const headers = ['Item No.', 'Description', 'Unit', 'Quantity', 'Unit Price', 'Total Price', 'Price %'];
  const columnWidths = [12, 40, 10, 12, 15, 18, 15];

  // Set column widths
  worksheet.columns = columnWidths.map((w) => ({ width: w }));

  // Add header row
  const headerRowObj = worksheet.getRow(headerRow);
  headers.forEach((h, idx) => {
    headerRowObj.getCell(idx + 1).value = h;
  });

  // Style header
  headerRowObj.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRowObj.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  const grandTotal = items.reduce((sum, item) => 
    sum + (item.total_price || (item.quantity || 0) * (item.unit_price || 0)), 0);

  let currentRow = headerRow + 1;
  items.forEach((item) => {
    const totalPrice = item.total_price || (item.quantity || 0) * (item.unit_price || 0);
    const percentage = grandTotal > 0 ? ((totalPrice / grandTotal) * 100).toFixed(2) + '%' : '0%';
    
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = item.item_number || '';
    row.getCell(2).value = item.description || '';
    row.getCell(3).value = item.unit || '';
    row.getCell(4).value = item.quantity || 0;
    row.getCell(5).value = item.unit_price || 0;
    row.getCell(6).value = totalPrice;
    row.getCell(7).value = percentage;
    currentRow++;
  });

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_Price_Analysis.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

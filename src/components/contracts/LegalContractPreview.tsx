import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, FileText, Phone, Mail, Globe } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import jsPDF from "jspdf";
import QRCode from "qrcode";

interface Contract {
  id: string;
  contract_number: string;
  contract_title: string;
  contractor_name: string | null;
  contractor_license_number?: string | null;
  contractor_category?: string | null;
  contractor_address?: string | null;
  contractor_phone?: string | null;
  contractor_email?: string | null;
  contract_type: string;
  contract_value: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  contract_duration_months?: number | null;
  status: string;
  execution_percentage: number | null;
  retention_percentage?: number | null;
  advance_payment_percentage?: number | null;
  performance_bond_percentage?: number | null;
  variation_limit_percentage?: number | null;
  payment_terms?: string | null;
  scope_of_work?: string | null;
  notes?: string | null;
  terms_conditions?: string | null;
}

interface LegalContractPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
}

const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  fidic_red: { en: "FIDIC Red Book", ar: "فيديك الكتاب الأحمر" },
  fidic_yellow: { en: "FIDIC Yellow Book", ar: "فيديك الكتاب الأصفر" },
  fidic_silver: { en: "FIDIC Silver Book", ar: "فيديك الكتاب الفضي" },
  fidic_green: { en: "FIDIC Green Book", ar: "فيديك الكتاب الأخضر" },
  fidic_pink: { en: "FIDIC Pink Book", ar: "فيديك الكتاب الوردي" },
  fixed_price: { en: "Fixed Price Contract", ar: "عقد السعر الثابت" },
  cost_plus: { en: "Cost Plus Contract", ar: "عقد التكلفة زائد" },
  time_materials: { en: "Time & Materials", ar: "عقد الوقت والمواد" },
  unit_price: { en: "Unit Price Contract", ar: "عقد سعر الوحدة" },
  lump_sum: { en: "Lump Sum Contract", ar: "عقد المبلغ المقطوع" },
};

const numberToArabicWords = (num: number): string => {
  if (num === 0) return "صفر";
  
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const millionWord = millions === 1 ? "مليون" : millions === 2 ? "مليونان" : `${millions} ملايين`;
    return rest > 0 ? `${millionWord} و${numberToArabicWords(rest)}` : millionWord;
  }
  
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    const rest = num % 1000;
    const thousandWord = thousands === 1 ? "ألف" : thousands === 2 ? "ألفان" : `${numberToArabicWords(thousands)} آلاف`;
    return rest > 0 ? `${thousandWord} و${numberToArabicWords(rest)}` : thousandWord;
  }
  
  if (num >= 100) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    return rest > 0 ? `${hundreds[h]} و${numberToArabicWords(rest)}` : hundreds[h];
  }
  
  if (num >= 20) {
    const t = Math.floor(num / 10);
    const o = num % 10;
    return o > 0 ? `${ones[o]} و${tens[t]}` : tens[t];
  }
  
  if (num >= 10) {
    return teens[num - 10];
  }
  
  return ones[num];
};

// Format scope of work text into structured paragraphs and bullet points
const formatScopeOfWork = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Split by common section markers
  const lines = text.split(/[\n\r]+/).filter(line => line.trim());
  
  const elements: React.ReactNode[] = [];
  let currentSection: string | null = null;
  let bulletItems: string[] = [];
  let sectionCounter = 0;
  
  const flushBullets = () => {
    if (bulletItems.length > 0) {
      elements.push(
        <ul key={`bullets-${elements.length}`} className="list-disc list-inside space-y-2 mr-6 my-3">
          {bulletItems.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed text-gray-700">
              {item.replace(/^[\*\-•]\s*/, '').trim()}
            </li>
          ))}
        </ul>
      );
      bulletItems = [];
    }
  };
  
  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();
    
    // Check for bold section headers (marked with **)
    const boldMatch = trimmedLine.match(/^\*\*([^*]+)\*\*:?$/);
    if (boldMatch) {
      flushBullets();
      sectionCounter++;
      elements.push(
        <div key={`section-${idx}`} className="mt-6 mb-3">
          <h5 className="font-bold text-[#1e3a5f] text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs flex items-center justify-center">
              {sectionCounter}
            </span>
            {boldMatch[1].trim()}
          </h5>
          <div className="h-px bg-gray-200 mt-2" />
        </div>
      );
      return;
    }
    
    // Check for numbered sections like "1." or "1-"
    const numberedMatch = trimmedLine.match(/^(\d+)[\.\-\)]\s*(.+)$/);
    if (numberedMatch) {
      flushBullets();
      elements.push(
        <div key={`numbered-${idx}`} className="flex gap-3 my-3">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs flex items-center justify-center shrink-0 mt-1">
            {numberedMatch[1]}
          </span>
          <p className="text-sm leading-relaxed text-gray-700 flex-1">
            {numberedMatch[2]}
          </p>
        </div>
      );
      return;
    }
    
    // Check for lettered sections like "أ." or "أ-"
    const arabicLetterMatch = trimmedLine.match(/^([أ-ي])[\.\-\)]\s*(.+)$/);
    if (arabicLetterMatch) {
      flushBullets();
      elements.push(
        <div key={`letter-${idx}`} className="flex gap-3 my-3 mr-4">
          <span className="w-6 h-6 rounded bg-gray-100 text-gray-700 text-xs flex items-center justify-center shrink-0 mt-1 font-bold">
            {arabicLetterMatch[1]}
          </span>
          <p className="text-sm leading-relaxed text-gray-700 flex-1 font-semibold">
            {arabicLetterMatch[2]}
          </p>
        </div>
      );
      return;
    }
    
    // Check for bullet points
    if (trimmedLine.match(/^[\*\-•]\s*.+/)) {
      bulletItems.push(trimmedLine);
      return;
    }
    
    // Regular paragraph
    flushBullets();
    elements.push(
      <p key={`para-${idx}`} className="text-sm leading-loose text-gray-700 my-3 text-justify">
        {trimmedLine}
      </p>
    );
  });
  
  flushBullets();
  
  return <div className="space-y-1">{elements}</div>;
};

export function LegalContractPreview({
  open,
  onOpenChange,
  contract,
}: LegalContractPreviewProps) {
  const { isArabic } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  // Company settings from localStorage
  const companySettings = JSON.parse(localStorage.getItem("company_settings") || "{}");
  const companyLogo = localStorage.getItem("company_logo") || "";

  const company = {
    nameEn: companySettings.name_en || "AL IMTYAZ ALWATANIYA CONT.",
    nameAr: companySettings.name_ar || "الإمتياز الوطنية للمقاولات",
    crNumber: companySettings.cr_number || "181551",
    address: companySettings.address || "Jeddah, Kingdom of Saudi Arabia",
    addressAr: companySettings.address_ar || "جدة، المملكة العربية السعودية",
    phone: companySettings.phone || "+966-12-677-3822",
    fax: companySettings.fax || "+966-12-677-3822",
    email: companySettings.email || "contact@imtyaz.sa",
    website: companySettings.website || "www.imtyaz.sa",
  };

  useEffect(() => {
    QRCode.toDataURL(window.location.href, { width: 100 })
      .then(setQrCodeUrl)
      .catch(console.error);
  }, []);

  const formatCurrency = (value: number, currency: string = "SAR") => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: isArabic ? ar : enUS });
  };

  const getArabicOrdinal = (num: number): string => {
    const ordinals = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];
    return ordinals[num] || `${num}`;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !printRef.current) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>${isArabic ? "عقد مقاولة" : "Construction Contract"} - ${contract.contract_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Amiri:wght@400;700&display=swap');
          
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Cairo', 'Amiri', serif; 
            font-size: 14px;
            line-height: 1.8;
            padding: 30px;
            direction: rtl;
            background: white;
            color: #1a1a1a;
          }
          
          .contract-container {
            max-width: 900px;
            margin: 0 auto;
            border: 3px double #1e3a5f;
            padding: 40px;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #1e3a5f;
          }
          
          .header img {
            max-height: 70px;
            margin-bottom: 10px;
          }
          
          .company-names {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          
          .company-name-en {
            font-family: 'Times New Roman', serif;
            font-style: italic;
            font-size: 14px;
            color: #1e3a5f;
          }
          
          .company-name-ar {
            font-family: 'Cairo', sans-serif;
            font-weight: bold;
            font-size: 16px;
            color: #1e3a5f;
          }
          
          .blue-line {
            height: 3px;
            background: linear-gradient(90deg, #1e3a5f 0%, #3b82f6 50%, #1e3a5f 100%);
            margin: 15px 0;
          }
          
          .contract-title {
            text-align: center;
            margin: 30px 0;
          }
          
          .contract-title h1 {
            font-size: 28px;
            font-weight: bold;
            color: #1e3a5f;
            margin-bottom: 10px;
            letter-spacing: 4px;
          }
          
          .contract-title h2 {
            font-size: 20px;
            color: #374151;
            font-family: 'Times New Roman', serif;
            margin-bottom: 10px;
          }
          
          .contract-number {
            font-size: 16px;
            color: #6b7280;
            font-weight: 600;
          }
          
          .preamble {
            text-align: center;
            margin: 30px 0;
            font-size: 15px;
            line-height: 2;
          }
          
          .party-box {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            background: #f9fafb;
          }
          
          .party-title {
            font-weight: bold;
            font-size: 16px;
            color: #1e3a5f;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .party-info {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 8px;
            font-size: 14px;
          }
          
          .party-label {
            font-weight: 600;
            color: #374151;
          }
          
          .article {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          
          .article-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e3a5f;
            margin-bottom: 15px;
            padding: 12px 15px;
            background: linear-gradient(90deg, #f0f9ff 0%, transparent 100%);
            border-right: 4px solid #1e3a5f;
          }
          
          .article-content {
            padding: 15px 20px;
            line-height: 2;
            text-align: justify;
          }
          
          .scope-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-top: 15px;
          }
          
          .scope-header {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: bold;
            color: #1e3a5f;
            font-size: 15px;
            margin-bottom: 12px;
          }
          
          .scope-number {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #1e3a5f;
            color: white;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .scope-list {
            list-style: disc;
            list-style-position: inside;
            margin-right: 24px;
          }
          
          .scope-list li {
            margin: 8px 0;
            line-height: 1.8;
          }
          
          .value-box {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            text-align: center;
          }
          
          .value-amount {
            font-size: 24px;
            font-weight: bold;
            color: #0369a1;
          }
          
          .value-words {
            font-size: 14px;
            color: #374151;
            margin-top: 5px;
          }
          
          .financial-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          .financial-table th,
          .financial-table td {
            border: 1px solid #d1d5db;
            padding: 12px;
            text-align: center;
          }
          
          .financial-table th {
            background: #1e3a5f;
            color: white;
            font-weight: 600;
          }
          
          .financial-table td {
            background: #f9fafb;
          }
          
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 60px;
            page-break-inside: avoid;
          }
          
          .signature-box {
            text-align: center;
            padding: 20px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
          }
          
          .signature-title {
            font-weight: bold;
            font-size: 16px;
            color: #1e3a5f;
            margin-bottom: 40px;
          }
          
          .signature-line {
            border-bottom: 2px solid #374151;
            margin: 30px 40px;
          }
          
          .signature-label {
            font-size: 12px;
            color: #6b7280;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #1e3a5f;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 11px;
            color: #6b7280;
          }
          
          .footer-contact {
            display: flex;
            gap: 20px;
          }
          
          .footer-qr img {
            width: 70px;
            height: 70px;
          }
          
          .copies-note {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #374151;
            font-style: italic;
          }
          
          @media print {
            body { padding: 15px; }
            .contract-container { border: 2px solid #1e3a5f; padding: 25px; }
            .no-print { display: none !important; }
            .article { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 25;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text(isArabic ? "عـقـد مـقـاولـة" : "CONSTRUCTION CONTRACT", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${isArabic ? "رقم العقد:" : "Contract #:"} ${contract.contract_number}`, pageWidth / 2, y, { align: "center" });
    y += 15;

    // Parties
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(isArabic ? "الطرف الأول (صاحب العمل)" : "First Party (Employer)", margin, y);
    y += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(`${company.nameAr} / ${company.nameEn}`, margin, y);
    y += 6;
    doc.text(`${isArabic ? "السجل التجاري:" : "CR:"} ${company.crNumber}`, margin, y);
    y += 15;

    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(isArabic ? "الطرف الثاني (المقاول)" : "Second Party (Contractor)", margin, y);
    y += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(contract.contractor_name || "-", margin, y);
    y += 6;
    if (contract.contractor_license_number) {
      doc.text(`${isArabic ? "رقم الترخيص:" : "License #:"} ${contract.contractor_license_number}`, margin, y);
      y += 6;
    }
    y += 15;

    // Contract Value
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(isArabic ? "قيمة العقد" : "Contract Value", margin, y);
    y += 8;
    
    doc.setFontSize(16);
    doc.setTextColor(3, 105, 161);
    doc.text(formatCurrency(contract.contract_value || 0, contract.currency), margin, y);
    y += 15;

    // Duration
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(isArabic ? "مدة العقد" : "Contract Duration", margin, y);
    y += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(`${isArabic ? "من:" : "From:"} ${formatDate(contract.start_date)}  ${isArabic ? "إلى:" : "To:"} ${formatDate(contract.end_date)}`, margin, y);
    y += 15;

    // QR Code
    if (qrCodeUrl) {
      try {
        doc.addImage(qrCodeUrl, "PNG", pageWidth - 35, 15, 20, 20);
      } catch (e) {
        console.error("QR Code error:", e);
      }
    }

    doc.save(`${isArabic ? "عقد" : "contract"}_${contract.contract_number}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isArabic ? "عرض العقد القانوني" : "Legal Contract Preview"} - {contract.contract_number}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[85vh]">
          <div ref={printRef} className="p-8" dir="rtl">
            {/* Contract Container */}
            <div className="border-[3px] border-double border-[#1e3a5f] p-10 bg-white max-w-[900px] mx-auto shadow-lg">
              {/* Header */}
              <div className="text-center mb-10 pb-6 border-b-2 border-[#1e3a5f]">
                {companyLogo && (
                  <img src={companyLogo} alt="Company Logo" className="h-20 mx-auto mb-4" />
                )}
                <div className="flex justify-between items-center mb-4">
                  <span className="font-serif italic text-sm text-[#1e3a5f]">{company.nameEn}</span>
                  <span className="font-bold text-lg text-[#1e3a5f]">{company.nameAr}</span>
                </div>
                <div className="h-[3px] bg-gradient-to-l from-[#1e3a5f] via-blue-500 to-[#1e3a5f]" />
              </div>

              {/* Contract Title */}
              <div className="text-center my-10">
                <h1 className="text-4xl font-bold text-[#1e3a5f] tracking-[0.3em] mb-4">
                  عـقـد مـقـاولـة
                </h1>
                <h2 className="text-2xl text-gray-600 font-serif mb-4">
                  CONSTRUCTION CONTRACT
                </h2>
                <div className="h-1 w-48 mx-auto bg-gradient-to-l from-transparent via-[#1e3a5f] to-transparent" />
                <p className="text-lg text-gray-500 mt-6 font-semibold">
                  {isArabic ? "رقم العقد:" : "Contract #:"} {contract.contract_number}
                </p>
                <Badge variant="outline" className="mt-3 text-base px-4 py-1">
                  {isArabic 
                    ? TYPE_LABELS[contract.contract_type]?.ar || contract.contract_type
                    : TYPE_LABELS[contract.contract_type]?.en || contract.contract_type
                  }
                </Badge>
              </div>

              {/* Preamble */}
              <div className="text-center my-10 text-lg leading-[2.5]">
                أبرم هذا العقد في يوم <span className="font-bold">{format(new Date(), "EEEE", { locale: ar })}</span> الموافق <span className="font-bold">{format(new Date(), "dd/MM/yyyy")}</span> بين كل من:
              </div>

              {/* First Party */}
              <div className="border-2 rounded-xl p-6 mb-6 bg-gradient-to-bl from-gray-50 to-white shadow-sm">
                <h3 className="font-bold text-xl text-[#1e3a5f] mb-5 pb-4 border-b-2 border-[#1e3a5f] flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white text-sm flex items-center justify-center">1</span>
                  الطرف الأول (صاحب العمل)
                </h3>
                <div className="grid grid-cols-[120px_1fr] gap-4 text-base">
                  <span className="font-semibold text-gray-600">الاسم:</span>
                  <span className="font-bold">{company.nameAr}</span>
                  <span className="font-semibold text-gray-600">السجل التجاري:</span>
                  <span>{company.crNumber}</span>
                  <span className="font-semibold text-gray-600">العنوان:</span>
                  <span>{company.addressAr}</span>
                </div>
              </div>

              {/* Second Party */}
              <div className="border-2 rounded-xl p-6 mb-10 bg-gradient-to-bl from-gray-50 to-white shadow-sm">
                <h3 className="font-bold text-xl text-[#1e3a5f] mb-5 pb-4 border-b-2 border-[#1e3a5f] flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white text-sm flex items-center justify-center">2</span>
                  الطرف الثاني (المقاول)
                </h3>
                <div className="grid grid-cols-[120px_1fr] gap-4 text-base">
                  <span className="font-semibold text-gray-600">الاسم:</span>
                  <span className="font-bold">{contract.contractor_name || "-"}</span>
                  {contract.contractor_license_number && (
                    <>
                      <span className="font-semibold text-gray-600">رقم الترخيص:</span>
                      <span>{contract.contractor_license_number}</span>
                    </>
                  )}
                  {contract.contractor_category && (
                    <>
                      <span className="font-semibold text-gray-600">التصنيف:</span>
                      <span>{contract.contractor_category}</span>
                    </>
                  )}
                  {contract.contractor_address && (
                    <>
                      <span className="font-semibold text-gray-600">العنوان:</span>
                      <span>{contract.contractor_address}</span>
                    </>
                  )}
                  {(contract.contractor_phone || contract.contractor_email) && (
                    <>
                      <span className="font-semibold text-gray-600">التواصل:</span>
                      <span>
                        {contract.contractor_phone && <span>{contract.contractor_phone}</span>}
                        {contract.contractor_phone && contract.contractor_email && <span> | </span>}
                        {contract.contractor_email && <span>{contract.contractor_email}</span>}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <Separator className="my-8 h-px bg-gradient-to-l from-transparent via-gray-300 to-transparent" />

              {/* Article 1: Subject */}
              <div className="my-8">
                <h4 className="text-lg font-bold text-[#1e3a5f] mb-5 p-4 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f] rounded-l-lg">
                  البند {getArabicOrdinal(1)}: موضوع العقد
                </h4>
                <div className="px-6 leading-[2] text-justify">
                  <p className="text-base mb-4">
                    يلتزم الطرف الثاني بتنفيذ الأعمال التالية وفقاً للمواصفات والشروط المتفق عليها:
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mt-4">
                    <h5 className="font-bold text-[#1e3a5f] text-base mb-4 flex items-center gap-2 border-b pb-3">
                      <FileText className="w-5 h-5" />
                      نطاق العمل
                    </h5>
                    <div className="scope-content text-base leading-[2]">
                      {formatScopeOfWork(contract.scope_of_work || contract.contract_title)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Article 2: Value */}
              <div className="my-8">
                <h4 className="text-lg font-bold text-[#1e3a5f] mb-5 p-4 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f] rounded-l-lg">
                  البند {getArabicOrdinal(2)}: قيمة العقد
                </h4>
                <div className="px-6">
                  <div className="bg-gradient-to-bl from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 text-center shadow-sm">
                    <div className="text-3xl font-bold text-blue-700 mb-3">
                      {formatCurrency(contract.contract_value || 0, contract.currency)}
                    </div>
                    <div className="text-base text-gray-700 bg-white/80 rounded-lg py-2 px-4 inline-block">
                      ({numberToArabicWords(contract.contract_value || 0)} {contract.currency === "SAR" ? "ريال سعودي" : contract.currency} فقط لا غير)
                    </div>
                  </div>
                </div>
              </div>

              {/* Article 3: Duration */}
              <div className="my-8">
                <h4 className="text-lg font-bold text-[#1e3a5f] mb-5 p-4 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f] rounded-l-lg">
                  البند {getArabicOrdinal(3)}: مدة العقد
                </h4>
                <div className="px-6">
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 mb-2">تاريخ البدء</p>
                      <p className="text-xl font-bold text-green-700">{formatDate(contract.start_date)}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 mb-2">تاريخ الانتهاء</p>
                      <p className="text-xl font-bold text-red-700">{formatDate(contract.end_date)}</p>
                    </div>
                  </div>
                  {contract.contract_duration_months && (
                    <div className="bg-gray-50 border rounded-lg p-4 text-center">
                      <p className="text-base">
                        مدة التنفيذ: <span className="font-bold text-[#1e3a5f] text-xl">{contract.contract_duration_months}</span> شهر
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Article 4: Financial Terms */}
              <div className="my-8">
                <h4 className="text-lg font-bold text-[#1e3a5f] mb-5 p-4 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f] rounded-l-lg">
                  البند {getArabicOrdinal(4)}: الشروط المالية
                </h4>
                <div className="px-6 overflow-x-auto">
                  <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
                    <thead>
                      <tr className="bg-[#1e3a5f] text-white">
                        <th className="border border-[#1e3a5f] p-4 text-base">الاحتجاز</th>
                        <th className="border border-[#1e3a5f] p-4 text-base">الدفعة المقدمة</th>
                        <th className="border border-[#1e3a5f] p-4 text-base">ضمان الأداء</th>
                        <th className="border border-[#1e3a5f] p-4 text-base">حد التغييرات</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-gray-50">
                        <td className="border p-4 text-center text-xl font-bold text-[#1e3a5f]">{contract.retention_percentage || 10}%</td>
                        <td className="border p-4 text-center text-xl font-bold text-green-700">{contract.advance_payment_percentage || 20}%</td>
                        <td className="border p-4 text-center text-xl font-bold text-blue-700">{contract.performance_bond_percentage || 5}%</td>
                        <td className="border p-4 text-center text-xl font-bold text-orange-700">{contract.variation_limit_percentage || 15}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Article 5: Payment Terms */}
              {contract.payment_terms && (
                <div className="my-8">
                  <h4 className="text-lg font-bold text-[#1e3a5f] mb-5 p-4 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f] rounded-l-lg">
                    البند {getArabicOrdinal(5)}: شروط الدفع
                  </h4>
                  <div className="px-6 leading-[2] text-justify">
                    <div className="bg-gray-50 border rounded-lg p-5">
                      {formatScopeOfWork(contract.payment_terms)}
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              {contract.notes && (
                <div className="my-8">
                  <h4 className="text-lg font-bold text-[#1e3a5f] mb-5 p-4 bg-gradient-to-l from-yellow-50 to-transparent border-r-4 border-yellow-500 rounded-l-lg">
                    ملاحظات إضافية
                  </h4>
                  <div className="px-6 leading-[2] text-justify">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
                      {formatScopeOfWork(contract.notes)}
                    </div>
                  </div>
                </div>
              )}

              {/* Copies Note */}
              <div className="text-center my-10 text-base text-gray-600 italic border-t border-b py-4">
                حرر هذا العقد من نسختين أصليتين، نسخة لكل طرف
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 mt-14">
                <div className="text-center p-6 border-2 rounded-xl bg-gradient-to-b from-gray-50 to-white">
                  <h5 className="font-bold text-lg text-[#1e3a5f] mb-12">الطرف الأول</h5>
                  <div className="border-b-2 border-gray-400 mx-8 my-10" />
                  <p className="text-sm text-gray-500">التوقيع والختم</p>
                </div>
                <div className="text-center p-6 border-2 rounded-xl bg-gradient-to-b from-gray-50 to-white">
                  <h5 className="font-bold text-lg text-[#1e3a5f] mb-12">الطرف الثاني</h5>
                  <div className="border-b-2 border-gray-400 mx-8 my-10" />
                  <p className="text-sm text-gray-500">التوقيع والختم</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-6 border-t-2 border-[#1e3a5f] flex justify-between items-end text-sm text-gray-500">
                <div className="flex gap-6">
                  <span className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {company.phone}
                  </span>
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {company.email}
                  </span>
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {company.website}
                  </span>
                </div>
                {qrCodeUrl && (
                  <div>
                    <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isArabic ? "إغلاق" : "Close"}
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            {isArabic ? "طباعة" : "Print"}
          </Button>
          <Button onClick={handleExportPDF} className="gap-2">
            <Download className="w-4 h-4" />
            {isArabic ? "تنزيل PDF" : "Export PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

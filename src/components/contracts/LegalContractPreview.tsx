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
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";

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

interface BOQItem {
  id: string;
  item_number: string | null;
  description: string;
  unit: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
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
  fidic_gold: { en: "FIDIC Gold Book", ar: "فيديك الكتاب الذهبي" },
  fidic_white: { en: "FIDIC White Book", ar: "فيديك الكتاب الأبيض" },
  fixed_price: { en: "Fixed Price Contract", ar: "عقد السعر الثابت" },
  cost_plus: { en: "Cost Plus Contract", ar: "عقد التكلفة زائد" },
  time_materials: { en: "Time & Materials", ar: "عقد الوقت والمواد" },
  unit_price: { en: "Unit Price Contract", ar: "عقد سعر الوحدة" },
  lump_sum: { en: "Lump Sum Contract", ar: "عقد المبلغ المقطوع" },
};

const ARABIC_ORDINALS = [
  "", "الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة",
  "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة",
  "الحادية عشرة", "الثانية عشرة", "الثالثة عشرة", "الرابعة عشرة",
  "الخامسة عشرة", "السادسة عشرة", "السابعة عشرة", "الثامنة عشرة",
  "التاسعة عشرة", "العشرون", "الحادية والعشرون", "الثانية والعشرون",
  "الثالثة والعشرون", "الرابعة والعشرون", "الخامسة والعشرون",
];

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
  if (num >= 10) return teens[num - 10];
  return ones[num];
};

const formatScopeOfWork = (text: string): React.ReactNode => {
  if (!text) return null;
  const lines = text.split(/[\n\r]+/).filter(line => line.trim());
  const elements: React.ReactNode[] = [];
  let bulletItems: string[] = [];
  let sectionCounter = 0;

  const flushBullets = () => {
    if (bulletItems.length > 0) {
      elements.push(
        <ul key={`bullets-${elements.length}`} className="list-disc list-inside space-y-2 mr-6 my-3">
          {bulletItems.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed text-gray-700">{item.replace(/^[\*\-•]\s*/, '').trim()}</li>
          ))}
        </ul>
      );
      bulletItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();
    const boldMatch = trimmedLine.match(/^\*\*([^*]+)\*\*:?$/);
    if (boldMatch) {
      flushBullets();
      sectionCounter++;
      elements.push(
        <div key={`section-${idx}`} className="mt-6 mb-3">
          <h5 className="font-bold text-[#1e3a5f] text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs flex items-center justify-center">{sectionCounter}</span>
            {boldMatch[1].trim()}
          </h5>
          <div className="h-px bg-gray-200 mt-2" />
        </div>
      );
      return;
    }
    const numberedMatch = trimmedLine.match(/^(\d+)[\.\-\)]\s*(.+)$/);
    if (numberedMatch) {
      flushBullets();
      elements.push(
        <div key={`numbered-${idx}`} className="flex gap-3 my-3">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs flex items-center justify-center shrink-0 mt-1">{numberedMatch[1]}</span>
          <p className="text-sm leading-relaxed text-gray-700 flex-1">{numberedMatch[2]}</p>
        </div>
      );
      return;
    }
    if (trimmedLine.match(/^[\*\-•]\s*.+/)) { bulletItems.push(trimmedLine); return; }
    flushBullets();
    elements.push(<p key={`para-${idx}`} className="text-sm leading-loose text-gray-700 my-3 text-justify">{trimmedLine}</p>);
  });
  flushBullets();
  return <div className="space-y-1">{elements}</div>;
};

// Sub-article component for nested numbering
const SubArticle = ({ num, children }: { num: string; children: React.ReactNode }) => (
  <div className="flex gap-3 my-3">
    <span className="font-bold text-[#1e3a5f] shrink-0 min-w-[32px]">{num}</span>
    <div className="text-base leading-[2] text-justify flex-1">{children}</div>
  </div>
);

// Definition item
const DefinitionItem = ({ term, definition }: { term: string; definition: string }) => (
  <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
    <span className="font-bold text-[#1e3a5f] min-w-[160px] shrink-0">{term}:</span>
    <span className="text-gray-700">{definition}</span>
  </div>
);

export function LegalContractPreview({ open, onOpenChange, contract }: LegalContractPreviewProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);

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
    QRCode.toDataURL(window.location.href, { width: 100 }).then(setQrCodeUrl).catch(console.error);
  }, []);

  useEffect(() => {
    if (!open || !user || !contract.id) return;
    const fetchBOQ = async () => {
      try {
        const { data } = await supabase
          .from("contract_boq_items")
          .select("id, item_number, description, unit, quantity, unit_price, total_price")
          .eq("contract_id", contract.id)
          .eq("user_id", user.id)
          .order("created_at");
        setBoqItems((data || []) as BOQItem[]);
      } catch (err) {
        console.error("Error fetching BOQ:", err);
      }
    };
    fetchBOQ();
  }, [open, contract.id, user]);

  const formatCurrency = (value: number, currency: string = "SAR") => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency", currency, maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 2 }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: isArabic ? ar : enUS });
  };

  const totalBOQ = boqItems.reduce((s, i) => s + (i.total_price || 0), 0);
  let articleNum = 0;
  const nextArticle = () => {
    articleNum++;
    return ARABIC_ORDINALS[articleNum] || `${articleNum}`;
  };

  const ArticleTitle = ({ children }: { children: React.ReactNode }) => (
    <h4 className="text-lg font-bold text-[#1e3a5f] mb-5 p-4 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f] rounded-l-lg">
      {children}
    </h4>
  );

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !printRef.current) return;
    printWindow.document.write(`
      <!DOCTYPE html><html dir="rtl"><head>
        <title>${isArabic ? "عقد مقاولة - مشاريع كبرى" : "Mega Project Contract"} - ${contract.contract_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Amiri:wght@400;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Cairo', 'Amiri', serif; font-size: 14px; line-height: 1.8; padding: 30px; direction: rtl; background: white; color: #1a1a1a; }
          .contract-container { max-width: 900px; margin: 0 auto; border: 3px double #1e3a5f; padding: 40px; background: white; }
          .article { page-break-inside: avoid; margin: 25px 0; }
          .article-title { font-size: 16px; font-weight: bold; color: #1e3a5f; margin-bottom: 15px; padding: 12px 15px; background: linear-gradient(90deg, #f0f9ff 0%, transparent 100%); border-right: 4px solid #1e3a5f; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: center; }
          th { background: #1e3a5f; color: white; font-weight: 600; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
          .signature-box { text-align: center; padding: 20px; border: 1px solid #d1d5db; border-radius: 8px; }
          @media print { body { padding: 15px; } .contract-container { border: 2px solid #1e3a5f; padding: 25px; } @page { margin: 1.5cm; size: A4; @bottom-center { content: "صفحة " counter(page) " من " counter(pages); } } }
        </style>
      </head><body>${printRef.current.innerHTML}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 25;

    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text("بسم الله الرحمن الرحيم", pageWidth / 2, y, { align: "center" });
    y += 12;
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text("عقد مقاولة للمشاريع الكبرى", pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.text("MEGA PROJECT CONSTRUCTION CONTRACT", pageWidth / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`رقم العقد: ${contract.contract_number}`, pageWidth / 2, y, { align: "center" });
    y += 15;

    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text("الطرف الأول (صاحب العمل)", margin, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(`${company.nameAr} / ${company.nameEn}`, margin, y);
    y += 6;
    doc.text(`السجل التجاري: ${company.crNumber}`, margin, y);
    y += 15;

    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text("الطرف الثاني (المقاول)", margin, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(contract.contractor_name || "-", margin, y);
    y += 15;

    doc.setFontSize(16);
    doc.setTextColor(3, 105, 161);
    doc.text(`قيمة العقد: ${formatCurrency(contract.contract_value || 0, contract.currency)}`, margin, y);

    if (qrCodeUrl) {
      try { doc.addImage(qrCodeUrl, "PNG", pageWidth - 35, 15, 20, 20); } catch {}
    }
    doc.save(`عقد_مشروع_كبير_${contract.contract_number}.pdf`);
  };

  // Reset article counter on each render
  articleNum = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden" onOpenAutoFocus={e => e.preventDefault()} onCloseAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isArabic ? "عقد مقاولة - مشاريع كبرى" : "Mega Project Contract"} - {contract.contract_number}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[85vh]">
          <div ref={printRef} className="p-8" dir="rtl">
            <div className="border-[3px] border-double border-[#1e3a5f] p-10 bg-white max-w-[900px] mx-auto shadow-lg">
              {/* Bismillah */}
              <div className="text-center mb-6">
                <p className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Amiri', serif" }}>
                  بسم الله الرحمن الرحيم
                </p>
              </div>

              {/* Header */}
              <div className="text-center mb-10 pb-6 border-b-2 border-[#1e3a5f]">
                {companyLogo && <img src={companyLogo} alt="Company Logo" className="h-20 mx-auto mb-4" />}
                <div className="flex justify-between items-center mb-4">
                  <span className="font-serif italic text-sm text-[#1e3a5f]">{company.nameEn}</span>
                  <span className="font-bold text-lg text-[#1e3a5f]">{company.nameAr}</span>
                </div>
                <div className="h-[3px] bg-gradient-to-l from-[#1e3a5f] via-blue-500 to-[#1e3a5f]" />
              </div>

              {/* Contract Title */}
              <div className="text-center my-10">
                <h1 className="text-4xl font-bold text-[#1e3a5f] tracking-[0.3em] mb-3">عـقـد مـقـاولـة</h1>
                <h2 className="text-xl text-[#1e3a5f] font-bold mb-2">للمشاريع الكبرى</h2>
                <h3 className="text-2xl text-gray-500 font-serif mb-4">MEGA PROJECT CONSTRUCTION CONTRACT</h3>
                <div className="h-1 w-48 mx-auto bg-gradient-to-l from-transparent via-[#1e3a5f] to-transparent" />
                <p className="text-lg text-gray-500 mt-6 font-semibold">رقم العقد: {contract.contract_number}</p>
                <Badge variant="outline" className="mt-3 text-base px-4 py-1">
                  {TYPE_LABELS[contract.contract_type]?.ar || contract.contract_type}
                </Badge>
              </div>

              {/* Enhanced Legal Preamble */}
              <div className="my-10 text-base leading-[2.5] text-justify bg-gray-50 p-6 rounded-xl border">
                <p className="font-bold text-center text-lg text-[#1e3a5f] mb-4">التمهيد</p>
                <p className="mb-3">
                  إنه في يوم <span className="font-bold">{format(new Date(), "EEEE", { locale: ar })}</span> الموافق <span className="font-bold">{format(new Date(), "dd/MM/yyyy")}</span>م، واستناداً إلى أحكام الشريعة الإسلامية الغراء، وما تقتضيه أحكام نظام المنافسات والمشتريات الحكومية الصادر بالمرسوم الملكي رقم (م/128) وتاريخ 13/11/1440هـ ولائحته التنفيذية، ونظام المعاملات المدنية، وبناءً على الأهلية القانونية الكاملة والمعتبرة شرعاً ونظاماً لكلا الطرفين، وبعد أن أقر كل طرف بكامل أهليته للتعاقد والتصرف القانوني وخلو إرادته من أي عيب من عيوب الرضا، فقد اتفق كل من:
                </p>
              </div>

              {/* First Party */}
              <div className="border-2 rounded-xl p-6 mb-6 bg-gradient-to-bl from-gray-50 to-white shadow-sm">
                <h3 className="font-bold text-xl text-[#1e3a5f] mb-5 pb-4 border-b-2 border-[#1e3a5f] flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white text-sm flex items-center justify-center">1</span>
                  الطرف الأول (صاحب العمل) - يُشار إليه فيما بعد بـ "صاحب العمل"
                </h3>
                <div className="grid grid-cols-[120px_1fr] gap-4 text-base">
                  <span className="font-semibold text-gray-600">الاسم:</span>
                  <span className="font-bold">{company.nameAr}</span>
                  <span className="font-semibold text-gray-600">السجل التجاري:</span>
                  <span>{company.crNumber}</span>
                  <span className="font-semibold text-gray-600">العنوان:</span>
                  <span>{company.addressAr}</span>
                  <span className="font-semibold text-gray-600">الهاتف:</span>
                  <span>{company.phone}</span>
                </div>
              </div>

              {/* Second Party */}
              <div className="border-2 rounded-xl p-6 mb-10 bg-gradient-to-bl from-gray-50 to-white shadow-sm">
                <h3 className="font-bold text-xl text-[#1e3a5f] mb-5 pb-4 border-b-2 border-[#1e3a5f] flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white text-sm flex items-center justify-center">2</span>
                  الطرف الثاني (المقاول) - يُشار إليه فيما بعد بـ "المقاول"
                </h3>
                <div className="grid grid-cols-[120px_1fr] gap-4 text-base">
                  <span className="font-semibold text-gray-600">الاسم:</span>
                  <span className="font-bold">{contract.contractor_name || "-"}</span>
                  {contract.contractor_license_number && (<><span className="font-semibold text-gray-600">رقم الترخيص:</span><span>{contract.contractor_license_number}</span></>)}
                  {contract.contractor_category && (<><span className="font-semibold text-gray-600">التصنيف:</span><span>{contract.contractor_category}</span></>)}
                  {contract.contractor_address && (<><span className="font-semibold text-gray-600">العنوان:</span><span>{contract.contractor_address}</span></>)}
                  {(contract.contractor_phone || contract.contractor_email) && (
                    <><span className="font-semibold text-gray-600">التواصل:</span>
                    <span>{contract.contractor_phone}{contract.contractor_phone && contract.contractor_email && " | "}{contract.contractor_email}</span></>
                  )}
                </div>
              </div>

              <p className="text-center text-base font-bold text-[#1e3a5f] my-8">فقد اتفق الطرفان وهما بكامل أهليتهما المعتبرة شرعاً ونظاماً على ما يلي:</p>
              <Separator className="my-8 h-px bg-gradient-to-l from-transparent via-gray-300 to-transparent" />

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة الأولى: التعريفات والمصطلحات */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: التعريفات والمصطلحات</ArticleTitle>
                <div className="px-6 leading-[2] text-justify">
                  <p className="text-base mb-4">يُقصد بالمصطلحات الواردة في هذا العقد ما لم يقتضِ السياق خلاف ذلك المعاني الآتية:</p>
                  <div className="bg-gray-50 border rounded-xl p-5 space-y-1 text-base">
                    <DefinitionItem term="العقد" definition="هذه الوثيقة وجميع ملحقاتها ومرفقاتها التي تشكل مجتمعة اتفاقاً ملزماً بين الطرفين." />
                    <DefinitionItem term="صاحب العمل" definition="الطرف الأول المذكور أعلاه أو من ينوب عنه أو يخلفه قانوناً." />
                    <DefinitionItem term="المقاول" definition="الطرف الثاني المذكور أعلاه المُكلّف بتنفيذ الأعمال وفقاً لشروط هذا العقد." />
                    <DefinitionItem term="المهندس المشرف" definition="الشخص أو الجهة المعيّنة من قبل صاحب العمل للإشراف على تنفيذ الأعمال واعتماد المستخلصات وإصدار التعليمات." />
                    <DefinitionItem term="أمر التغيير" definition="تعليمات خطية صادرة من صاحب العمل أو المهندس المشرف بتعديل نطاق الأعمال أو كمياتها أو مواصفاتها." />
                    <DefinitionItem term="المستخلص" definition="المطالبة المالية الدورية التي يقدمها المقاول عن الأعمال المنجزة خلال فترة محددة." />
                    <DefinitionItem term="شهادة الإنجاز" definition="الشهادة الصادرة من المهندس المشرف تفيد بإتمام الأعمال أو جزء منها بصورة مرضية." />
                    <DefinitionItem term="الاستلام الابتدائي" definition="قبول صاحب العمل للأعمال المنجزة بصورة مبدئية مع بداية فترة الضمان." />
                    <DefinitionItem term="الاستلام النهائي" definition="القبول النهائي للأعمال بعد انتهاء فترة الضمان ومعالجة جميع العيوب." />
                    <DefinitionItem term="فترة الضمان (العيوب)" definition="المدة المحددة بعد الاستلام الابتدائي والتي يلتزم خلالها المقاول بإصلاح أي عيوب تظهر في الأعمال." />
                    <DefinitionItem term="القوة القاهرة" definition="أي حدث استثنائي غير متوقع وخارج عن إرادة الطرفين ولا يمكن تفاديه أو التغلب عليه." />
                    <DefinitionItem term="مقاول الباطن" definition="أي شخص طبيعي أو اعتباري يتعاقد معه المقاول لتنفيذ جزء من الأعمال بموافقة صاحب العمل الخطية." />
                    <DefinitionItem term="اليوم التقويمي" definition="كل يوم من أيام السنة الميلادية بما فيها أيام الجمع والعطلات الرسمية." />
                    <DefinitionItem term="البرنامج الزمني" definition="الجدول الزمني التفصيلي لتنفيذ الأعمال والمعتمد من صاحب العمل." />
                    <DefinitionItem term="الموقع" definition="المكان المحدد لتنفيذ الأعمال وأي مكان آخر يُحدد في العقد كجزء من موقع العمل." />
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة الثانية: موضوع العقد ونطاق الأعمال */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: موضوع العقد ونطاق الأعمال</ArticleTitle>
                <div className="px-6 leading-[2] text-justify">
                  <p className="text-base mb-4">
                    يلتزم المقاول بتنفيذ كافة الأعمال الموضحة في هذا العقد وملحقاته، وذلك وفقاً للمواصفات الفنية والرسومات الهندسية المعتمدة والشروط العامة والخاصة المتفق عليها بين الطرفين، وبما يتوافق مع أعلى المعايير الهندسية والمهنية المعمول بها في المملكة العربية السعودية.
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mt-4">
                    <h5 className="font-bold text-[#1e3a5f] text-base mb-4 flex items-center gap-2 border-b pb-3">
                      <FileText className="w-5 h-5" />
                      نطاق العمل
                    </h5>
                    <div className="text-base leading-[2]">
                      {formatScopeOfWork(contract.scope_of_work || contract.contract_title)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة الثالثة: أولوية الوثائق التعاقدية */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: أولوية الوثائق التعاقدية</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-3">
                  <p>تُشكّل الوثائق التالية جزءاً لا يتجزأ من هذا العقد، وفي حال وجود تعارض أو اختلاف بين هذه الوثائق تكون الأولوية وفقاً للترتيب التالي:</p>
                  <div className="bg-gray-50 border rounded-xl p-5">
                    {[
                      "العقد الرئيسي (هذه الوثيقة)",
                      "الشروط الخاصة للعقد",
                      "الشروط العامة للعقد",
                      "جدول الكميات والأسعار (BOQ)",
                      "المواصفات الفنية العامة والخاصة",
                      "الرسومات الهندسية المعتمدة",
                      "البرنامج الزمني المعتمد",
                      "ملحقات العقد والمراسلات المتبادلة",
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                        <span className="w-7 h-7 rounded-full bg-[#1e3a5f] text-white text-xs flex items-center justify-center shrink-0">{idx + 1}</span>
                        <span className="font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة الرابعة: قيمة العقد */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: قيمة العقد</ArticleTitle>
                <div className="px-6">
                  <p className="text-base mb-4 leading-[2] text-justify">
                    حُددت القيمة الإجمالية لهذا العقد بمبلغ وقدره:
                  </p>
                  <div className="bg-gradient-to-bl from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 text-center shadow-sm">
                    <div className="text-3xl font-bold text-blue-700 mb-3">
                      {formatCurrency(contract.contract_value || 0, contract.currency)}
                    </div>
                    <div className="text-base text-gray-700 bg-white/80 rounded-lg py-2 px-4 inline-block">
                      ({numberToArabicWords(contract.contract_value || 0)} {contract.currency === "SAR" ? "ريال سعودي" : contract.currency} فقط لا غير)
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-4 leading-[2]">
                    وتشمل هذه القيمة جميع التكاليف المباشرة وغير المباشرة بما فيها تكاليف المواد والعمالة والمعدات والنقل والتأمين والأرباح والضرائب وضريبة القيمة المضافة وأي رسوم حكومية أخرى مستحقة نظاماً.
                  </p>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة الخامسة: جدول الكميات والأسعار */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              {boqItems.length > 0 && (
                <div className="my-8">
                  <ArticleTitle>المادة {nextArticle()}: جدول الكميات والأسعار</ArticleTitle>
                  <div className="px-6">
                    <p className="text-base mb-4 leading-[2] text-justify">
                      يُعد جدول الكميات والأسعار التالي جزءاً لا يتجزأ من هذا العقد، وتُحدد بموجبه الأعمال والكميات وأسعار الوحدات المتفق عليها بين الطرفين. والكميات المبينة تقريبية وقابلة للتعديل وفقاً للكميات الفعلية المنفذة:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm text-sm">
                        <thead>
                          <tr className="bg-[#1e3a5f] text-white">
                            <th className="border border-[#1e3a5f] p-3 w-12">م</th>
                            <th className="border border-[#1e3a5f] p-3 w-20">رقم البند</th>
                            <th className="border border-[#1e3a5f] p-3">وصف البند</th>
                            <th className="border border-[#1e3a5f] p-3 w-16">الوحدة</th>
                            <th className="border border-[#1e3a5f] p-3 w-20">الكمية</th>
                            <th className="border border-[#1e3a5f] p-3 w-24">سعر الوحدة</th>
                            <th className="border border-[#1e3a5f] p-3 w-28">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boqItems.map((item, idx) => (
                            <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="border p-2 text-center font-medium">{idx + 1}</td>
                              <td className="border p-2 text-center">{item.item_number || "-"}</td>
                              <td className="border p-2 text-right">{item.description}</td>
                              <td className="border p-2 text-center">{item.unit || "-"}</td>
                              <td className="border p-2 text-center">{formatNumber(item.quantity)}</td>
                              <td className="border p-2 text-center">{formatNumber(item.unit_price)}</td>
                              <td className="border p-2 text-center font-bold">{formatNumber(item.total_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#1e3a5f] text-white font-bold">
                            <td colSpan={6} className="border p-3 text-center">الإجمالي الكلي</td>
                            <td className="border p-3 text-center text-lg">{formatCurrency(totalBOQ, contract.currency)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: مدة العقد والبرنامج الزمني */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: مدة العقد والبرنامج الزمني</ArticleTitle>
                <div className="px-6">
                  <p className="text-base mb-4 leading-[2] text-justify">
                    يلتزم المقاول بإنجاز كافة الأعمال المنصوص عليها في هذا العقد خلال المدة المحددة أدناه، ويُعتبر البرنامج الزمني المعتمد جزءاً لا يتجزأ من هذا العقد:
                  </p>
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
                      <p className="text-base">مدة التنفيذ: <span className="font-bold text-[#1e3a5f] text-xl">{contract.contract_duration_months}</span> شهراً ميلادياً من تاريخ تسليم الموقع</p>
                    </div>
                  )}
                  <div className="mt-4 text-base leading-[2] space-y-2">
                    <SubArticle num="1.">يلتزم المقاول بتقديم برنامج زمني تفصيلي خلال (14) يوماً من توقيع العقد لاعتماده من المهندس المشرف.</SubArticle>
                    <SubArticle num="2.">يجب أن يتضمن البرنامج الزمني المسار الحرج (Critical Path) والمراحل الرئيسية (Milestones).</SubArticle>
                    <SubArticle num="3.">يلتزم المقاول بتحديث البرنامج الزمني شهرياً وتقديمه للمهندس المشرف.</SubArticle>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: الشروط المالية */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: الشروط المالية</ArticleTitle>
                <div className="px-6 overflow-x-auto">
                  <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
                    <thead>
                      <tr className="bg-[#1e3a5f] text-white">
                        <th className="border border-[#1e3a5f] p-4 text-base">نسبة الاحتجاز</th>
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

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: شروط الدفع والمستخلصات */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: شروط الدفع والمستخلصات</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-2">
                  {contract.payment_terms && (
                    <div className="bg-gray-50 border rounded-lg p-5 mb-4">{formatScopeOfWork(contract.payment_terms)}</div>
                  )}
                  <SubArticle num="1.">يقدم المقاول مستخلصاً شهرياً عن الأعمال المنجزة مدعوماً بالقياسات والمستندات المؤيدة خلال الأسبوع الأول من كل شهر.</SubArticle>
                  <SubArticle num="2.">يقوم المهندس المشرف بمراجعة المستخلص واعتماده خلال (14) يوماً من تاريخ استلامه.</SubArticle>
                  <SubArticle num="3.">يلتزم صاحب العمل بصرف قيمة المستخلص المعتمد خلال (30) يوماً من تاريخ الاعتماد.</SubArticle>
                  <SubArticle num="4.">يُحتجز نسبة ({contract.retention_percentage || 10}%) من كل مستخلص كضمان حسن التنفيذ، ويُفرج عن نصفها عند الاستلام الابتدائي والنصف الآخر عند الاستلام النهائي.</SubArticle>
                  <SubArticle num="5.">يحق لصاحب العمل خصم أي غرامات أو تكاليف مستحقة على المقاول من المستخلصات الجارية.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: التزامات صاحب العمل */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: التزامات صاحب العمل</ArticleTitle>
                <div className="px-6 leading-[2] text-justify">
                  <ul className="list-none space-y-3">
                    {[
                      "تسليم الموقع للمقاول خالياً من العوائق خلال المدة المتفق عليها، وتحرير محضر تسليم الموقع موقع من الطرفين.",
                      "توفير الرسومات الهندسية والمواصفات الفنية المعتمدة اللازمة لتنفيذ الأعمال في الوقت المناسب.",
                      "صرف المستحقات المالية للمقاول وفقاً لجدول الدفعات المتفق عليه وخلال المدد المحددة في هذا العقد.",
                      "تعيين المهندس المشرف لمتابعة سير الأعمال واعتماد المستخلصات وإصدار التعليمات والموافقات.",
                      "إخطار المقاول بأي تعديلات أو أوامر تغييرية خطياً وفي الوقت المناسب.",
                      "الحصول على التراخيص والموافقات الحكومية اللازمة المتعلقة بالمشروع والتي تقع ضمن مسؤوليته.",
                      "توفير نقاط التوصيل لخدمات الكهرباء والمياه إلى حدود الموقع.",
                    ].map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-base">
                        <span className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs flex items-center justify-center shrink-0 mt-1">{idx + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: التزامات المقاول (موسّعة) */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: التزامات المقاول</ArticleTitle>
                <div className="px-6 leading-[2] text-justify">
                  <ul className="list-none space-y-3">
                    {[
                      "تنفيذ الأعمال وفقاً للرسومات والمواصفات الفنية المعتمدة وبأعلى معايير الجودة والإتقان.",
                      "الالتزام بالجدول الزمني المعتمد وتقديم تقارير تقدم أسبوعية وشهرية للمهندس المشرف.",
                      "توفير العمالة الفنية المؤهلة والمعدات والمواد اللازمة على نفقته الخاصة وبالمواصفات المطلوبة.",
                      "الالتزام الصارم بأنظمة السلامة والصحة المهنية (OSHA) وكود البناء السعودي (SBC) وتعيين مسؤول سلامة مؤهل.",
                      "تقديم ضمان حسن الأداء بنسبة ({0}%) من قيمة العقد قبل مباشرة الأعمال.".replace("{0}", String(contract.performance_bond_percentage || 5)),
                      "إصلاح أي عيوب تظهر خلال فترة الضمان على نفقته الخاصة وخلال المدة التي يحددها المهندس المشرف.",
                      "عدم التنازل عن هذا العقد أو أي جزء منه أو التعاقد من الباطن دون موافقة خطية مسبقة من صاحب العمل.",
                      "توفير وسائل حماية البيئة ومنع التلوث والتخلص الآمن من المخلفات وفقاً للأنظمة البيئية المعمول بها.",
                      "الحفاظ على نظافة الموقع وتنظيم المواد والمعدات بشكل يضمن سلامة العمل وسهولة الحركة.",
                      "تقديم عينات المواد للاعتماد قبل التوريد والتركيب، والالتزام بالمواد المعتمدة فقط.",
                      "إعداد الرسومات التنفيذية (Shop Drawings) وتقديمها للمهندس المشرف للاعتماد قبل التنفيذ.",
                      "إعداد رسومات ما بعد التنفيذ (As-Built Drawings) وتسليمها عند الاستلام الابتدائي.",
                      "الالتزام بأنظمة العمل والتأمينات الاجتماعية ونظام حماية الأجور في المملكة العربية السعودية.",
                    ].map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-base">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center shrink-0 mt-1">{idx + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: التعاقد من الباطن */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: التعاقد من الباطن</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-2">
                  <SubArticle num="1.">لا يجوز للمقاول التعاقد من الباطن على أي جزء من الأعمال دون الحصول على موافقة خطية مسبقة من صاحب العمل.</SubArticle>
                  <SubArticle num="2.">يظل المقاول مسؤولاً مسؤولية كاملة وتضامنية عن أعمال مقاولي الباطن وكأنه هو المنفذ لها.</SubArticle>
                  <SubArticle num="3.">يلتزم المقاول بالتأكد من أن مقاولي الباطن مؤهلون ومصنفون ومرخصون وفقاً للأنظمة المعمول بها.</SubArticle>
                  <SubArticle num="4.">يحق لصاحب العمل رفض أي مقاول باطن يراه غير مؤهل، وعلى المقاول الالتزام بذلك.</SubArticle>
                  <SubArticle num="5.">لا يُنشئ التعاقد من الباطن أي علاقة تعاقدية مباشرة بين صاحب العمل ومقاول الباطن.</SubArticle>
                  <SubArticle num="6.">لا يجوز أن تتجاوز نسبة الأعمال المسندة لمقاولي الباطن (30%) من إجمالي قيمة العقد دون موافقة خاصة.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: أحكام التغييرات والأوامر التغييرية */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: أحكام التغييرات والأوامر التغييرية</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-2">
                  <SubArticle num="1.">يحق لصاحب العمل إصدار أوامر تغييرية بالزيادة أو النقصان في حدود ({contract.variation_limit_percentage || 15}%) من قيمة العقد دون الحاجة لموافقة المقاول.</SubArticle>
                  <SubArticle num="2.">يجب أن تكون جميع الأوامر التغييرية مكتوبة وموقعة من صاحب العمل أو المهندس المشرف المفوض.</SubArticle>
                  <SubArticle num="3.">تُسعّر الأعمال التغييرية وفقاً لأسعار جدول الكميات. وفي حال عدم وجود بنود مماثلة، يتم الاتفاق على الأسعار الجديدة بناءً على تحليل أسعار معتمد.</SubArticle>
                  <SubArticle num="4.">لا يحق للمقاول المطالبة بتمديد المدة إلا إذا أثبت كتابياً أن الأعمال التغييرية تؤثر على المسار الحرج للمشروع.</SubArticle>
                  <SubArticle num="5.">لا يجوز للمقاول تنفيذ أي أعمال إضافية دون أمر تغييري معتمد، وإلا فلا يستحق أي تعويض عنها.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: التأمينات */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: التأمينات</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-2">
                  <SubArticle num="1.">يلتزم المقاول بتأمين شامل ضد جميع المخاطر (Contractor's All Risks - CAR) يغطي الأعمال والمواد والمعدات طوال مدة التنفيذ وفترة الصيانة.</SubArticle>
                  <SubArticle num="2.">يلتزم المقاول بتأمين المسؤولية المدنية تجاه الغير بمبلغ لا يقل عن (10%) من قيمة العقد.</SubArticle>
                  <SubArticle num="3.">يلتزم المقاول بتأمين العمال والموظفين وفقاً لأنظمة العمل والتأمينات الاجتماعية.</SubArticle>
                  <SubArticle num="4.">يجب تقديم وثائق التأمين لصاحب العمل للاعتماد قبل مباشرة الأعمال بمدة لا تقل عن (7) أيام.</SubArticle>
                  <SubArticle num="5.">يُدرج صاحب العمل كمستفيد مشترك في جميع وثائق التأمين.</SubArticle>
                  <SubArticle num="6.">يلتزم المقاول بتجديد وثائق التأمين قبل انتهاء صلاحيتها بمدة لا تقل عن (30) يوماً، وإلا جاز لصاحب العمل تجديدها على حساب المقاول.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: الغرامات والجزاءات (جديدة) */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: الغرامات والجزاءات</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-4">
                  <p className="font-bold text-[#1e3a5f]">أولاً: غرامة التأخير</p>
                  <SubArticle num="1.">في حال تأخر المقاول عن إتمام الأعمال في الموعد المحدد دون عذر مقبول من صاحب العمل، تُفرض غرامة تأخير يومية بنسبة (0.5%) من قيمة العقد الإجمالية.</SubArticle>
                  <SubArticle num="2.">يكون الحد الأقصى لغرامات التأخير (10%) من قيمة العقد الإجمالية.</SubArticle>
                  <SubArticle num="3.">بلوغ غرامات التأخير الحد الأقصى يمنح صاحب العمل الحق في فسخ العقد وفقاً لأحكام مادة الفسخ.</SubArticle>

                  <p className="font-bold text-[#1e3a5f] mt-6">ثانياً: غرامات الجودة</p>
                  <SubArticle num="4.">في حال رفض أعمال بسبب عدم مطابقتها للمواصفات، يتحمل المقاول تكلفة الإزالة وإعادة التنفيذ بالإضافة إلى غرامة تعادل ضعف (2x) تكلفة الإصلاح.</SubArticle>
                  <SubArticle num="5.">يحق للمهندس المشرف إيقاف أي أعمال مخالفة فوراً لحين تصحيحها على حساب المقاول.</SubArticle>

                  <p className="font-bold text-[#1e3a5f] mt-6">ثالثاً: غرامات السلامة</p>
                  <SubArticle num="6.">تُفرض غرامات على مخالفات السلامة والصحة المهنية تتراوح بين (5,000) و(50,000) ريال حسب درجة الخطورة.</SubArticle>
                  <SubArticle num="7.">في حال وقوع إصابة عمل ناتجة عن إهمال المقاول، يتحمل المقاول كافة التكاليف والتعويضات.</SubArticle>

                  <p className="font-bold text-[#1e3a5f] mt-6">رابعاً: آلية الخصم</p>
                  <SubArticle num="8.">يحق لصاحب العمل خصم جميع الغرامات والجزاءات تلقائياً من المستخلصات الجارية أو من ضمان الأداء أو من أي مبالغ مستحقة للمقاول.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: الاستلام الابتدائي والنهائي (جديدة) */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: الاستلام الابتدائي والنهائي</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-4">
                  <p className="font-bold text-[#1e3a5f]">أولاً: الاستلام الابتدائي</p>
                  <SubArticle num="1.">يتقدم المقاول بطلب الاستلام الابتدائي خطياً عند إتمام الأعمال بنسبة لا تقل عن (98%).</SubArticle>
                  <SubArticle num="2.">تُشكّل لجنة استلام من قبل صاحب العمل خلال (14) يوماً من تاريخ طلب الاستلام.</SubArticle>
                  <SubArticle num="3.">تُعد اللجنة قائمة ملاحظات (Punch List) بالعيوب والنواقص التي يتوجب على المقاول معالجتها.</SubArticle>
                  <SubArticle num="4.">يلتزم المقاول بمعالجة جميع الملاحظات خلال مدة لا تتجاوز (30) يوماً من تاريخ إبلاغه بها.</SubArticle>
                  <SubArticle num="5.">يحق لصاحب العمل رفض الاستلام الابتدائي إذا كانت الأعمال غير مطابقة للمواصفات بشكل جوهري.</SubArticle>

                  <p className="font-bold text-[#1e3a5f] mt-6">ثانياً: فترة الضمان (فترة العيوب)</p>
                  <SubArticle num="6.">تبدأ فترة الضمان من تاريخ الاستلام الابتدائي ومدتها (12) شهراً ميلادياً.</SubArticle>
                  <SubArticle num="7.">يلتزم المقاول خلال فترة الضمان بإصلاح أي عيوب أو أضرار تظهر في الأعمال على نفقته الخاصة خلال (7) أيام من إبلاغه.</SubArticle>
                  <SubArticle num="8.">في حال عدم قيام المقاول بالإصلاح خلال المدة المحددة، يحق لصاحب العمل إجراء الإصلاح بنفسه أو بواسطة الغير على حساب المقاول.</SubArticle>

                  <p className="font-bold text-[#1e3a5f] mt-6">ثالثاً: الاستلام النهائي</p>
                  <SubArticle num="9.">يتم الاستلام النهائي بعد انتهاء فترة الضمان ومعالجة جميع العيوب والملاحظات.</SubArticle>
                  <SubArticle num="10.">يُحرر محضر استلام نهائي موقع من الطرفين، ويُفرج عن المحتجزات المتبقية بعد التحقق من خلو الأعمال من العيوب.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: ضمانات الأعمال وفترة العيوب (جديدة) */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: ضمانات الأعمال وفترة العيوب</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-2">
                  <SubArticle num="1.">يضمن المقاول سلامة الأعمال المنفذة من أي عيوب في التصميم أو المواد أو التنفيذ لمدة لا تقل عن (10) سنوات للأعمال الإنشائية و(5) سنوات للأعمال الميكانيكية والكهربائية.</SubArticle>
                  <SubArticle num="2.">يضمن المقاول أن جميع المواد المستخدمة جديدة وأصلية ومطابقة للمواصفات المعتمدة.</SubArticle>
                  <SubArticle num="3.">يقدم المقاول شهادات ضمان المصنّعين لجميع المعدات والأنظمة الرئيسية.</SubArticle>
                  <SubArticle num="4.">لا تبرأ ذمة المقاول من العيوب الخفية حتى بعد انتهاء فترة الضمان التعاقدية، وتسري عليها أحكام الضمان العشري وفقاً للأنظمة المعمول بها.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: حقوق صاحب العمل في الفسخ (موسّعة جداً) */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: حقوق صاحب العمل في فسخ العقد</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-4">
                  <p className="font-bold text-[#1e3a5f] text-lg mb-3">أولاً: حالات الفسخ</p>
                  <p>يحق لصاحب العمل فسخ هذا العقد كلياً أو جزئياً في أي من الحالات التالية:</p>
                  
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
                    {[
                      "تأخر المقاول عن البرنامج الزمني المعتمد بنسبة تزيد عن (15%) دون تقديم عذر مقبول ومعتمد من صاحب العمل.",
                      "إفلاس المقاول أو تصفيته أو دخوله في إعسار أو حل منشأته أو تقديم طلب حماية من الدائنين.",
                      "التنازل عن العقد أو أي جزء منه أو التعاقد من الباطن بدون الحصول على موافقة خطية مسبقة من صاحب العمل.",
                      "ثبوت استخدام مواد مخالفة للمواصفات المعتمدة أو رفض إزالة الأعمال المرفوضة بعد إنذاره خطياً.",
                      "سحب المعدات الرئيسية أو العمالة الفنية الأساسية من الموقع دون مبرر مشروع أو موافقة المهندس المشرف.",
                      "عدم الامتثال لتعليمات المهندس المشرف الخطية بعد إنذارين متتاليين خلال (7) أيام لكل منهما.",
                      "تكرار مخالفات السلامة والصحة المهنية الجسيمة التي تعرض الأرواح أو الممتلكات للخطر.",
                      "التوقف عن العمل أو تقليص حجم العمل بشكل جوهري لمدة تزيد عن (14) يوماً تقويمياً متتالياً بدون موافقة خطية من صاحب العمل.",
                      "عدم تجديد خطابات الضمان أو وثائق التأمين قبل انتهاء صلاحيتها بمدة لا تقل عن (30) يوماً.",
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="w-7 h-7 rounded-full bg-red-600 text-white text-xs flex items-center justify-center shrink-0 mt-1">{idx + 1}</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <p className="font-bold text-[#1e3a5f] text-lg mt-8 mb-3">ثانياً: إجراءات الفسخ</p>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 space-y-3">
                    <SubArticle num="أ."><span className="font-bold">الإنذار الأول:</span> يوجه صاحب العمل إنذاراً خطياً للمقاول يحدد فيه المخالفة ويمنحه مهلة (7) أيام لتصحيحها.</SubArticle>
                    <SubArticle num="ب."><span className="font-bold">الإنذار الثاني:</span> في حال عدم الاستجابة، يوجه إنذاراً ثانياً نهائياً بمهلة (7) أيام إضافية.</SubArticle>
                    <SubArticle num="ج."><span className="font-bold">قرار الفسخ:</span> بعد انقضاء المهلتين دون تصحيح المخالفة، يصدر صاحب العمل قرار الفسخ كتابياً ويكون نافذاً من تاريخ تبليغه.</SubArticle>
                    <SubArticle num="د."><span className="font-bold">الحالات المستعجلة:</span> يحق لصاحب العمل الفسخ الفوري دون إنذار في حالات الإفلاس أو مخالفات السلامة الجسيمة أو الغش.</SubArticle>
                  </div>

                  <p className="font-bold text-[#1e3a5f] text-lg mt-8 mb-3">ثالثاً: آثار الفسخ</p>
                  <SubArticle num="1.">يحق لصاحب العمل مصادرة ضمان الأداء والمحتجزات المالية.</SubArticle>
                  <SubArticle num="2.">يحق لصاحب العمل الاستعانة بمقاول بديل لإتمام الأعمال على حساب المقاول المتعثر، مع خصم فرق التكلفة من مستحقاته.</SubArticle>
                  <SubArticle num="3.">يلتزم المقاول بإخلاء الموقع وتسليم جميع المواد والمعدات الموجودة فيه خلال (14) يوماً من تاريخ قرار الفسخ.</SubArticle>
                  <SubArticle num="4.">يحتفظ صاحب العمل بحقه في المطالبة بالتعويض عن أي أضرار ناتجة عن إخلال المقاول بالتزاماته.</SubArticle>
                  <SubArticle num="5.">تُجرد الأعمال المنجزة بحضور الطرفين أو ممثليهما، ويُصرف للمقاول قيمة الأعمال المقبولة فقط بعد خصم الغرامات والتعويضات.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: القوة القاهرة */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: القوة القاهرة</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-2">
                  <SubArticle num="1.">لا يُسأل أي من الطرفين عن عدم تنفيذ التزاماته إذا كان ذلك ناتجاً عن قوة قاهرة خارجة عن إرادته، بشرط أن يكون الحدث غير متوقع ولا يمكن تفاديه أو التغلب عليه.</SubArticle>
                  <SubArticle num="2.">يلتزم الطرف المتأثر بإخطار الطرف الآخر خطياً خلال (14) يوماً من وقوع القوة القاهرة مع تقديم الأدلة والمستندات الكافية.</SubArticle>
                  <SubArticle num="3.">تشمل القوة القاهرة على سبيل المثال لا الحصر: الكوارث الطبيعية، الحروب، الأوبئة، القرارات الحكومية المفاجئة غير المتوقعة.</SubArticle>
                  <SubArticle num="4.">لا تُعتبر من القوة القاهرة: تقلبات الأسعار، نقص العمالة القابل للتعويض، الأحوال الجوية الموسمية المتوقعة.</SubArticle>
                  <SubArticle num="5.">إذا استمرت القوة القاهرة لمدة تزيد عن (180) يوماً، يحق لأي من الطرفين إنهاء العقد مع تسوية المستحقات عن الأعمال المنجزة.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: تسوية النزاعات والتحكيم */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: تسوية النزاعات والتحكيم</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-2">
                  <SubArticle num="1.">في حال نشوء أي خلاف أو نزاع بين الطرفين بشأن تفسير أو تنفيذ هذا العقد، يسعى الطرفان أولاً لحله ودياً خلال (30) يوماً.</SubArticle>
                  <SubArticle num="2.">في حال تعذر الحل الودي، يُحال النزاع إلى لجنة فض نزاعات مكونة من ثلاثة أعضاء (عضو من كل طرف وعضو محايد يتفق عليه الطرفان) خلال (60) يوماً.</SubArticle>
                  <SubArticle num="3.">في حال فشل لجنة فض النزاعات، يُحال النزاع إلى التحكيم وفقاً لنظام التحكيم السعودي الصادر بالمرسوم الملكي رقم (م/34) لعام 1433هـ.</SubArticle>
                  <SubArticle num="4.">يكون مقر التحكيم في مدينة جدة، المملكة العربية السعودية، ولغة التحكيم العربية.</SubArticle>
                  <SubArticle num="5.">يكون حكم التحكيم نهائياً وملزماً للطرفين وغير قابل للطعن فيه إلا وفقاً لأحكام نظام التحكيم.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: السرية وحقوق الملكية الفكرية */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: السرية وحقوق الملكية الفكرية</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-2">
                  <SubArticle num="1.">يلتزم الطرفان بالحفاظ على سرية المعلومات المتبادلة بينهما والمتعلقة بهذا العقد، ويستمر هذا الالتزام لمدة (5) سنوات بعد انتهاء العقد.</SubArticle>
                  <SubArticle num="2.">تؤول جميع حقوق الملكية الفكرية المتعلقة بالتصاميم والرسومات والمستندات الفنية المعدة لأغراض هذا المشروع إلى صاحب العمل.</SubArticle>
                  <SubArticle num="3.">لا يحق للمقاول استخدام التصاميم أو الرسومات الخاصة بالمشروع في أي مشروع آخر دون موافقة خطية.</SubArticle>
                  <SubArticle num="4.">لا يحق لأي من الطرفين الإفصاح عن شروط هذا العقد أو قيمته لأي طرف ثالث دون موافقة خطية مسبقة.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: الإخطارات */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: الإخطارات</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-2">
                  <SubArticle num="1.">جميع الإخطارات والمراسلات المنصوص عليها في هذا العقد يجب أن تكون خطية وتُرسل على العناوين المبينة في صدر هذا العقد.</SubArticle>
                  <SubArticle num="2.">تُعتبر الإخطارات مُستلمة عند التسليم باليد مع التوقيع بالاستلام، أو بعد (3) أيام عمل من الإرسال بالبريد المسجل أو البريد الإلكتروني المعتمد.</SubArticle>
                  <SubArticle num="3.">يلتزم كل طرف بإخطار الطرف الآخر فوراً بأي تغيير في عنوانه أو بيانات الاتصال الخاصة به.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: القانون الحاكم والاختصاص القضائي */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: القانون الحاكم والاختصاص القضائي</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-2">
                  <SubArticle num="1.">يخضع هذا العقد في تفسيره وتنفيذه لأحكام الشريعة الإسلامية والأنظمة المرعية في المملكة العربية السعودية.</SubArticle>
                  <SubArticle num="2.">تُطبق أحكام نظام المنافسات والمشتريات الحكومية ولائحته التنفيذية على ما لم يرد بشأنه نص خاص في هذا العقد.</SubArticle>
                  <SubArticle num="3.">تختص المحاكم المختصة في مدينة جدة، المملكة العربية السعودية، بالنظر في أي نزاع ينشأ عن هذا العقد لا يتم حله بالتحكيم.</SubArticle>
                  <SubArticle num="4.">يُعمل بالنصوص العربية في حال وجود تعارض بين النصين العربي والإنجليزي لهذا العقد.</SubArticle>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* المادة: أحكام ختامية */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="my-8">
                <ArticleTitle>المادة {nextArticle()}: أحكام ختامية</ArticleTitle>
                <div className="px-6 leading-[2] text-justify text-base space-y-2">
                  <SubArticle num="1.">يُعد هذا العقد وجميع ملحقاته ومرفقاته وحدة واحدة لا تتجزأ، ويُلغي أي اتفاقات سابقة بين الطرفين بشأن موضوع هذا العقد.</SubArticle>
                  <SubArticle num="2.">لا يجوز تعديل أي بند من بنود هذا العقد إلا بموجب ملحق مكتوب وموقع من كلا الطرفين أو ممثليهما المفوضين.</SubArticle>
                  <SubArticle num="3.">إذا حُكم ببطلان أو عدم نفاذ أي بند من بنود هذا العقد، فإن ذلك لا يؤثر على صحة ونفاذ باقي البنود.</SubArticle>
                  <SubArticle num="4.">تنازل أي من الطرفين عن حقه في التمسك بأي بند من بنود هذا العقد لا يُعد تنازلاً دائماً عن ذلك الحق.</SubArticle>
                  <SubArticle num="5.">حُرر هذا العقد من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها، ولكل منهما ذات الحجية القانونية.</SubArticle>
                </div>
              </div>

              {/* Additional Notes */}
              {contract.notes && (
                <div className="my-8">
                  <h4 className="text-lg font-bold text-[#1e3a5f] mb-5 p-4 bg-gradient-to-l from-yellow-50 to-transparent border-r-4 border-yellow-500 rounded-l-lg">
                    ملاحظات إضافية
                  </h4>
                  <div className="px-6 leading-[2] text-justify">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">{formatScopeOfWork(contract.notes)}</div>
                  </div>
                </div>
              )}

              {/* والله ولي التوفيق */}
              <div className="text-center my-12">
                <p className="text-xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Amiri', serif" }}>
                  والله ولي التوفيق
                </p>
              </div>

              {/* Copies Note */}
              <div className="text-center my-10 text-base text-gray-600 italic border-t border-b py-4">
                حُرر هذا العقد من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها
              </div>

              {/* Signatures - 4 blocks */}
              <div className="grid grid-cols-2 gap-8 mt-14">
                <div className="text-center p-6 border-2 rounded-xl bg-gradient-to-b from-gray-50 to-white">
                  <h5 className="font-bold text-lg text-[#1e3a5f] mb-12">الطرف الأول (صاحب العمل)</h5>
                  <p className="text-sm text-gray-500 mb-2">{company.nameAr}</p>
                  <div className="border-b-2 border-gray-400 mx-8 my-10" />
                  <p className="text-sm text-gray-500">التوقيع والختم</p>
                </div>
                <div className="text-center p-6 border-2 rounded-xl bg-gradient-to-b from-gray-50 to-white">
                  <h5 className="font-bold text-lg text-[#1e3a5f] mb-12">الطرف الثاني (المقاول)</h5>
                  <p className="text-sm text-gray-500 mb-2">{contract.contractor_name || "-"}</p>
                  <div className="border-b-2 border-gray-400 mx-8 my-10" />
                  <p className="text-sm text-gray-500">التوقيع والختم</p>
                </div>
                <div className="text-center p-5 border rounded-xl bg-gray-50">
                  <h5 className="font-bold text-base text-gray-700 mb-8">الشاهد الأول</h5>
                  <p className="text-xs text-gray-400 mb-2">الاسم: ................................</p>
                  <p className="text-xs text-gray-400 mb-2">رقم الهوية: ................................</p>
                  <div className="border-b border-gray-300 mx-8 my-6" />
                  <p className="text-xs text-gray-400">التوقيع</p>
                </div>
                <div className="text-center p-5 border rounded-xl bg-gray-50">
                  <h5 className="font-bold text-base text-gray-700 mb-8">الشاهد الثاني</h5>
                  <p className="text-xs text-gray-400 mb-2">الاسم: ................................</p>
                  <p className="text-xs text-gray-400 mb-2">رقم الهوية: ................................</p>
                  <div className="border-b border-gray-300 mx-8 my-6" />
                  <p className="text-xs text-gray-400">التوقيع</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-6 border-t-2 border-[#1e3a5f] flex justify-between items-end text-sm text-gray-500">
                <div className="flex gap-6">
                  <span className="flex items-center gap-2"><Phone className="w-4 h-4" />{company.phone}</span>
                  <span className="flex items-center gap-2"><Mail className="w-4 h-4" />{company.email}</span>
                  <span className="flex items-center gap-2"><Globe className="w-4 h-4" />{company.website}</span>
                </div>
                {qrCodeUrl && <div><img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" /></div>}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{isArabic ? "إغلاق" : "Close"}</Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" />{isArabic ? "طباعة" : "Print"}</Button>
          <Button onClick={handleExportPDF} className="gap-2"><Download className="w-4 h-4" />{isArabic ? "تنزيل PDF" : "Export PDF"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

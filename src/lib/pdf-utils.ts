import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '@/integrations/supabase/client';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
  usedOCR?: boolean;
}

// Configuration for batch processing
const BATCH_CONFIG = {
  CHUNK_SIZE: 10, // Pages per chunk
  MAX_PARALLEL_CHUNKS: 3, // Process 3 chunks in parallel
  LARGE_PDF_THRESHOLD: 50, // PDFs with 50+ pages use batch processing
};

// Clean mojibake (encoding corruption) from text - especially for Arabic
function cleanMojibake(text: string): string {
  if (!text) return '';
  
  // Pattern for common mojibake sequences (corrupted Arabic encoding)
  const mojibakePatterns = [
    /p[\*ˆ˜°´¸¹²³µ¶·ºª¡¿€£¥¢¤®©™±×÷«»‹›""''‚„†‡…‰ËŽxÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿA-Za-z]+/gi,
    /[\u0080-\u009F]+/g, // C1 control characters
    /Ã[\u0080-\u00BF]/g, // UTF-8 misinterpreted as Latin-1
    /Â[\u0080-\u00BF]/g, // Another common UTF-8 misinterpretation
  ];
  
  let cleaned = text;
  
  // Check if text has significant mojibake
  const mojibakeRatio = (text.match(/[\u0080-\u00FF]/g) || []).length / text.length;
  
  if (mojibakeRatio > 0.1) {
    // Text is likely corrupted, try to clean it
    for (const pattern of mojibakePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // Remove remaining Latin-1 supplement if they're not part of valid Arabic
    const hasArabic = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
    if (!hasArabic) {
      cleaned = cleaned.replace(/[\u00C0-\u00FF]+/g, '');
    }
  }
  
  // Clean up whitespace
  return cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Check if text is valid (not corrupted)
function isValidText(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Count different character types
  const arabicChars = (text.match(/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  const numbers = (text.match(/\d/g) || []).length;
  const corruptedChars = (text.match(/[\u0080-\u00FF]/g) || []).length;
  
  const totalChars = text.replace(/\s/g, '').length;
  if (totalChars === 0) return false;
  
  // If corrupted characters are more than 20% of text, it's invalid
  if (corruptedChars / totalChars > 0.2) return false;
  
  // Valid if has meaningful text (Arabic, Latin, or numbers)
  return (arabicChars + latinChars + numbers) / totalChars > 0.3;
}

// Convert PDF page to base64 image
async function pageToImage(page: any, scale: number = 2): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Cannot create canvas context');
  }
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  return canvas.toDataURL('image/png');
}

// Process a single page and extract text with Arabic support
async function extractPageText(pdf: any, pageNum: number): Promise<string> {
  try {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent({
      // Enable better Arabic text extraction
      includeMarkedContent: true,
      disableCombineTextItems: false,
    });
    
    let pageText = "";
    let lastY = -1;
    let lastX = -1;
    
    // Sort items by position for better text flow (handle RTL Arabic)
    const items = textContent.items.filter((item: any) => 'str' in item && item.str);
    
    for (const item of items) {
      if ('str' in item && item.str) {
        const currentY = 'transform' in item ? item.transform[5] : -1;
        const currentX = 'transform' in item ? item.transform[4] : -1;
        
        // New line detection
        if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
          pageText += "\n";
        } else if (pageText.length > 0 && !pageText.endsWith(" ") && !item.str.startsWith(" ")) {
          // Add space between words (but be careful with Arabic RTL)
          const isArabicText = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(item.str);
          const prevIsArabic = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(pageText.slice(-1));
          
          // Only add space if there's significant horizontal gap
          if (lastX !== -1 && Math.abs(currentX - lastX) > 5) {
            pageText += " ";
          } else if (!isArabicText && !prevIsArabic) {
            pageText += " ";
          }
        }
        
        pageText += item.str;
        lastY = currentY;
        lastX = currentX + (item.width || 0);
      }
    }
    
    // Clean the extracted text
    let cleanedText = cleanMojibake(pageText);
    
    // If text appears corrupted, return empty to trigger OCR
    if (!isValidText(cleanedText) && pageText.length > 20) {
      console.warn(`Page ${pageNum}: Text appears corrupted, may need OCR`);
      return ""; // Return empty to trigger OCR
    }
    
    return cleanedText;
  } catch (error) {
    console.warn(`Error extracting page ${pageNum}:`, error);
    return "";
  }
}

// Process a chunk of pages in parallel
async function processChunk(
  pdf: any, 
  startPage: number, 
  endPage: number,
  onProgress?: (current: number, total: number) => void,
  totalPages?: number
): Promise<{ text: string; successCount: number }> {
  const pagePromises: Promise<{ pageNum: number; text: string }>[] = [];
  
  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    pagePromises.push(
      extractPageText(pdf, pageNum).then(text => ({ pageNum, text }))
    );
  }
  
  const results = await Promise.all(pagePromises);
  let chunkText = "";
  let successCount = 0;
  
  // Sort by page number and combine
  results.sort((a, b) => a.pageNum - b.pageNum);
  
  for (const result of results) {
    if (result.text.length > 0) {
      chunkText += `--- Page ${result.pageNum} ---\n${result.text}\n\n`;
      successCount++;
    }
    onProgress?.(result.pageNum, totalPages || endPage);
  }
  
  return { text: chunkText, successCount };
}

// Batch process large PDFs with parallel chunk processing
export async function batchExtractFromPDF(
  pdf: any,
  onProgress?: (current: number, total: number) => void
): Promise<{ text: string; successCount: number; failedCount: number }> {
  const totalPages = pdf.numPages;
  const chunks: Array<{ start: number; end: number }> = [];
  
  // Create chunks
  for (let i = 1; i <= totalPages; i += BATCH_CONFIG.CHUNK_SIZE) {
    chunks.push({
      start: i,
      end: Math.min(i + BATCH_CONFIG.CHUNK_SIZE - 1, totalPages)
    });
  }
  
  console.log(`Batch processing ${totalPages} pages in ${chunks.length} chunks`);
  
  let fullText = "";
  let totalSuccess = 0;
  let processedPages = 0;
  
  // Process chunks in parallel batches
  for (let i = 0; i < chunks.length; i += BATCH_CONFIG.MAX_PARALLEL_CHUNKS) {
    const parallelChunks = chunks.slice(i, i + BATCH_CONFIG.MAX_PARALLEL_CHUNKS);
    
    const chunkResults = await Promise.all(
      parallelChunks.map(chunk => 
        processChunk(pdf, chunk.start, chunk.end, (current) => {
          processedPages = Math.max(processedPages, current);
          onProgress?.(processedPages, totalPages);
        }, totalPages)
      )
    );
    
    for (const result of chunkResults) {
      fullText += result.text;
      totalSuccess += result.successCount;
    }
  }
  
  return {
    text: fullText.trim(),
    successCount: totalSuccess,
    failedCount: totalPages - totalSuccess
  };
}

// Extract text using OCR (AI Vision)
async function extractWithOCR(
  pdf: any, 
  fileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  const numPages = pdf.numPages;
  let fullText = '';
  
  console.log(`Starting OCR extraction for ${numPages} pages`);
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      onProgress?.(pageNum, numPages);
      console.log(`OCR processing page ${pageNum}/${numPages}`);
      
      const page = await pdf.getPage(pageNum);
      const imageBase64 = await pageToImage(page);
      
      const { data, error } = await supabase.functions.invoke('ocr-extract', {
        body: {
          imageBase64,
          pageNumber: pageNum,
          totalPages: numPages,
          fileName,
        },
      });
      
      if (error) {
        console.error(`OCR error on page ${pageNum}:`, error);
        fullText += `\n--- Page ${pageNum} ---\n[خطأ في OCR]\n`;
        continue;
      }
      
      if (data?.success && data?.text) {
        fullText += `\n--- Page ${pageNum} ---\n${data.text}\n`;
      } else if (data?.error) {
        console.error(`OCR failed on page ${pageNum}:`, data.error);
        fullText += `\n--- Page ${pageNum} ---\n[فشل OCR: ${data.error}]\n`;
      }
      
      // Small delay between pages to avoid rate limiting
      if (pageNum < numPages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (pageError) {
      console.error(`Error processing page ${pageNum}:`, pageError);
      fullText += `\n--- Page ${pageNum} ---\n[خطأ في معالجة صفحة OCR]\n`;
    }
  }
  
  return fullText.trim();
}

async function extractWithSelectiveOCR(
  pdf: any,
  fileName: string,
  pageNumbers: number[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const total = pageNumbers.length;

  console.log(`Starting selective OCR for ${total} pages`);

  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNum = pageNumbers[i];
    try {
      onProgress?.(i + 1, total);
      console.log(`Selective OCR page ${pageNum} (${i + 1}/${total})`);

      const page = await pdf.getPage(pageNum);
      const imageBase64 = await pageToImage(page);

      const { data, error } = await supabase.functions.invoke('ocr-extract', {
        body: {
          imageBase64,
          pageNumber: pageNum,
          totalPages: pdf.numPages,
          fileName,
        },
      });

      if (error) {
        console.error(`Selective OCR error on page ${pageNum}:`, error);
        continue;
      }

      const text = data?.success && data?.text ? String(data.text) : '';
      if (text.trim()) {
        result.set(pageNum, text.trim());
      }

      // delay to reduce rate limiting risk
      if (i < pageNumbers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    } catch (err) {
      console.error(`Selective OCR failed for page ${pageNum}:`, err);
    }
  }

  return result;
}

function parsePageBlocks(text: string): Map<number, string> {
  const map = new Map<number, string>();
  if (!text) return map;

  const regex = /--- Page (\d+) ---\n([\s\S]*?)(?=\n--- Page \d+ ---\n|$)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const pageNum = Number(match[1]);
    const pageText = (match[2] || '').trim();
    if (!Number.isNaN(pageNum)) {
      map.set(pageNum, pageText);
    }
  }

  return map;
}

function buildPagedText(pageCount: number, pages: Map<number, string>): string {
  let out = '';
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const t = pages.get(pageNum);
    if (t && t.trim()) {
      out += `--- Page ${pageNum} ---\n${t.trim()}\n\n`;
    }
  }
  return out.trim();
}

export async function extractTextFromPDF(
  file: File,
  options?: {
    useOCR?: boolean;
    onOCRProgress?: (current: number, total: number) => void;
    onProgress?: (current: number, total: number) => void;
    forceOCR?: boolean; // Force OCR even if text extraction works
  }
): Promise<string> {
  try {
    console.log("Starting PDF extraction for:", file.name);
    console.log("File size:", (file.size / 1024 / 1024).toFixed(2), "MB");
    
    const arrayBuffer = await file.arrayBuffer();
    
    // Use PDF.js to properly parse the PDF with Arabic support
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      // Enable better Unicode/Arabic support
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    }).promise;
    
    const totalPages = pdf.numPages;
    console.log(`PDF loaded: ${totalPages} pages`);
    
    // If force OCR is requested, skip text extraction
    if (options?.forceOCR) {
      console.log("Force OCR requested, skipping text extraction");
      const ocrText = await extractWithOCR(pdf, file.name, options?.onOCRProgress);
      if (ocrText && ocrText.length > 50) {
        return ocrText;
      }
    }
    
    const pages = new Map<number, string>();
    const missingPages: number[] = [];

    // Extract text page-by-page (or via batch), tracking missing pages
    if (totalPages >= BATCH_CONFIG.LARGE_PDF_THRESHOLD) {
      console.log(`Large PDF detected (${totalPages} pages), using batch processing...`);
      const batchResult = await batchExtractFromPDF(pdf, options?.onProgress);

      const pageBlocks = parsePageBlocks(batchResult.text);
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const t = pageBlocks.get(pageNum);
        if (t && t.trim()) {
          pages.set(pageNum, t.trim());
        } else {
          missingPages.push(pageNum);
        }
      }

      console.log(`Batch extraction: got ${pages.size}/${totalPages} pages as text`);
    } else {
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          options?.onProgress?.(pageNum, totalPages);

          const pageText = await extractPageText(pdf, pageNum);
          if (pageText && pageText.trim() && isValidText(pageText)) {
            pages.set(pageNum, pageText.trim());
          } else {
            missingPages.push(pageNum);
          }

          if (pageNum % 5 === 0 || pageNum === totalPages || totalPages <= 10) {
            console.log(`Extracted page ${pageNum}/${totalPages} (${pageText.length} chars)`);
          }
        } catch (pageError) {
          console.warn(`Error extracting page ${pageNum}:`, pageError);
          missingPages.push(pageNum);
        }
      }

      console.log(`Standard extraction: got ${pages.size}/${totalPages} pages as text`);
    }

    // If we are missing pages, fill them with selective OCR
    if (missingPages.length > 0 && options?.useOCR !== false) {
      console.log(`⚠️ Missing ${missingPages.length} pages - running selective OCR...`);

      try {
        const ocrMap = await extractWithSelectiveOCR(pdf, file.name, missingPages, options?.onOCRProgress);
        for (const [pageNum, t] of ocrMap.entries()) {
          if (t && t.trim()) pages.set(pageNum, t.trim());
        }
      } catch (err) {
        console.error('Selective OCR failed:', err);
      }

      // If still missing a lot, fallback to full OCR
      const coverage = pages.size / totalPages;
      if (coverage < 0.7) {
        console.log(`Coverage is low (${Math.round(coverage * 100)}%), falling back to full OCR...`);
        const ocrText = await extractWithOCR(pdf, file.name, options?.onOCRProgress);
        if (ocrText && ocrText.length > 50) return ocrText;
      }
    }

    // Build final text in correct page order
    let extractedText = buildPagedText(totalPages, pages);

    // Clean up while preserving formatting
    extractedText = cleanMojibake(extractedText)
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Optional warning if some pages are still missing
    if (pages.size < totalPages) {
      const stillMissing: number[] = [];
      for (let p = 1; p <= totalPages; p++) {
        if (!pages.has(p)) stillMissing.push(p);
      }
      if (stillMissing.length > 0) {
        extractedText += `\n\n[تنبيه: لم يتم استخراج ${stillMissing.length} صفحة: ${stillMissing.join(', ')}]`;
      }
    }

    console.log("Extracted text length:", extractedText.length);
    console.log("First 300 chars:", extractedText.substring(0, 300));

    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 1).length;
    const hasValidText = isValidText(extractedText);

    console.log(`Final extraction: ${extractedText.length} chars, ${wordCount} words, valid: ${hasValidText}`);

    // If final result is still poor, attempt full OCR (unless explicitly disabled)
    if ((!hasValidText || wordCount < 10) && options?.useOCR !== false) {
      console.log("⚠️ Final text still insufficient - attempting full OCR extraction");
      const ocrText = await extractWithOCR(pdf, file.name, options?.onOCRProgress);
      if (ocrText && ocrText.length > 50) return ocrText;
    }

    return extractedText;
    
  } catch (error) {
    console.error("PDF extraction error:", error);
    
    // Return a helpful error message
    return `[فشل قراءة ملف PDF]

ملف: ${file.name}
الخطأ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}

🔧 الحل:
1. تأكد من أن الملف ليس محمياً بكلمة مرور
2. جرب استخدام OCR لاستخراج النص
3. أو افتح الملف ونسخ النص يدوياً`;
  }
}

// Standalone OCR extraction function
export async function extractWithOCROnly(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    return await extractWithOCR(pdf, file.name, onProgress);
  } catch (error) {
    console.error("OCR extraction error:", error);
    throw error;
  }
}

// Check if text contains binary data
export function containsBinaryData(text: string): boolean {
  // Check for control characters (binary data indicators)
  const invalidCharCount = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
  const invalidRatio = invalidCharCount / text.length;
  return invalidRatio > 0.05; // More than 5% invalid chars means binary
}

// Validate extracted text quality
export function validateExtractedText(text: string): {
  isValid: boolean;
  hasArabic: boolean;
  hasNumbers: boolean;
  wordCount: number;
  issues: string[];
  isBinary: boolean;
  needsOCR: boolean;
} {
  const issues: string[] = [];
  
  // Check for binary data first
  const isBinary = containsBinaryData(text);
  if (isBinary) {
    issues.push("النص يحتوي على بيانات ثنائية غير صالحة");
    return {
      isValid: false,
      hasArabic: false,
      hasNumbers: false,
      wordCount: 0,
      issues,
      isBinary: true,
      needsOCR: true,
    };
  }
  
  // Check for error messages from extraction
  const needsOCR = text.includes("[فشل استخراج النص - يمكنك تجربة OCR]");
  
  if (text.includes("[فشل استخراج النص") || text.includes("[فشل قراءة ملف PDF]") || text.includes("[تعذر استخراج النص") || text.includes("[لم يتم العثور")) {
    issues.push("فشل استخراج النص من الملف");
    return {
      isValid: false,
      hasArabic: false,
      hasNumbers: false,
      wordCount: 0,
      issues,
      isBinary: false,
      needsOCR,
    };
  }
  
  // Check for Arabic text
  const arabicPattern = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const hasArabic = arabicPattern.test(text);
  
  // Check for numbers (quantities)
  const numberPattern = /\d+/;
  const hasNumbers = numberPattern.test(text);
  
  // Word count
  const wordCount = text.split(/\s+/).filter(w => w.length > 1).length;
  
  if (!hasArabic && !text.match(/[a-zA-Z]/)) {
    issues.push("لا يحتوي على نص مقروء");
  }
  
  if (!hasNumbers) {
    issues.push("لا يحتوي على أرقام (كميات)");
  }
  
  if (wordCount < 20) {
    issues.push("عدد الكلمات قليل جداً");
  }
  
  return {
    isValid: issues.length === 0 && wordCount >= 20,
    hasArabic,
    hasNumbers,
    wordCount,
    issues,
    isBinary: false,
    needsOCR: false,
  };
}

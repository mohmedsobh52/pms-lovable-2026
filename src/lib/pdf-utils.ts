import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log("Starting PDF extraction for:", file.name);
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded: ${pdf.numPages} pages`);
    
    let fullText = "";
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items with proper spacing
        const pageText = textContent.items
          .map((item: any) => {
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .join(' ');
        
        if (pageText.trim()) {
          fullText += `\n--- صفحة ${pageNum} ---\n${pageText}\n`;
        }
        
        console.log(`Page ${pageNum}: extracted ${pageText.length} characters`);
      } catch (pageError) {
        console.warn(`Error extracting page ${pageNum}:`, pageError);
      }
    }
    
    // Clean up the text
    fullText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s+\n/g, '\n\n')
      .trim();
    
    console.log(`Total extracted: ${fullText.length} characters`);
    
    if (fullText.length < 50) {
      return `[لم يتم العثور على نص كافٍ في ملف PDF]
      
ملف: ${file.name}
عدد الصفحات: ${pdf.numPages}

💡 نصيحة: إذا كان الملف يحتوي على صور أو نص ممسوح ضوئياً، يُرجى:
1. نسخ المحتوى يدوياً من Excel أو Word
2. أو استخدام ملف PDF يحتوي على نص قابل للتحديد`;
    }
    
    return fullText;
    
  } catch (error) {
    console.error("PDF extraction error:", error);
    
    // Fallback to simple extraction
    try {
      return await simpleExtraction(file);
    } catch {
      throw new Error(`فشل في استخراج النص من ملف PDF: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  }
}

// Fallback simple extraction for compatibility
async function simpleExtraction(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const content = decoder.decode(uint8Array);
        
        // Extract readable text patterns from PDF
        let text = "";
        const textMatches = content.match(/\(([^)]+)\)/g);
        if (textMatches) {
          text = textMatches
            .map(match => match.slice(1, -1))
            .filter(t => t.length > 1 && /[\u0600-\u06FFa-zA-Z0-9]/.test(t))
            .join(" ");
        }
        
        // Clean up
        text = text
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "")
          .replace(/\s+/g, " ")
          .trim();
        
        if (text.length < 50) {
          resolve(`[تعذر استخراج النص - يرجى النسخ اليدوي]

ملف: ${file.name}
الحجم: ${(file.size / 1024).toFixed(2)} KB`);
        } else {
          resolve(text);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
    reader.readAsArrayBuffer(file);
  });
}

// Validate extracted text quality
export function validateExtractedText(text: string): {
  isValid: boolean;
  hasArabic: boolean;
  hasNumbers: boolean;
  wordCount: number;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for Arabic text
  const arabicPattern = /[\u0600-\u06FF]/;
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
  };
}

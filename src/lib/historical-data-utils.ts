// Normalized historical item interface
export interface NormalizedHistoricalItem {
  id: string;
  item_number: string;
  description: string;
  description_ar: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_code: string;
}

// Column name mapping table - expanded with more Arabic/English aliases
const COLUMN_MAPPINGS: Record<string, string[]> = {
  item_number: ['item', 'no', 'no.', '#', 'م', 'رقم البند', 'item_number', 'البند', 'item no', 'item_no', 'رقم', 'serial', 'sn', 's/n', 'رقم البند', 'مسلسل', 'تسلسل', 'seq', 'line', 'line no'],
  description: ['description', 'desc', 'item description', 'الوصف الانجليزي', 'english description', 'desc.', 'item desc', 'بند', 'العمل', 'نوع العمل', 'work description', 'scope', 'البند', 'scope of work', 'works', 'activity', 'task'],
  description_ar: ['وصف البند', 'الوصف', 'البيان', 'الوصف العربي', 'وصف', 'بيان الأعمال', 'بيان', 'التفاصيل', 'تفصيل', 'الأعمال', 'وصف الأعمال', 'وصف العمل', 'تفاصيل البند'],
  unit: ['unit', 'الوحدة', 'وحدة', 'uom', 'الوحده', 'وحدة القياس', 'unit of measure'],
  quantity: ['quantity', 'الكمية', 'qty', 'الكميه', 'كمية', 'qty.', 'عدد', 'الأعداد', 'count', 'الكمية المطلوبة', 'الكميات', 'المقدار'],
  unit_price: ['price', 'سعر الوحدة', 'unit_price', 'unit price', 'سعر', 'rate', 'unit rate', 'سعر الوحده', 'السعر', 'ثمن الوحدة', 'cost', 'unit cost', 'سعر الوحدة الواحدة', 'فئة السعر', 'الفئة'],
  total_price: ['total', 'الإجمالي', 'الاجمالي', 'total_price', 'المبلغ', 'القيمة', 'إجمالي', 'اجمالي', 'total price', 'المبلغ الإجمالي', 'المبلغ الكلي', 'القيمة الإجمالية', 'sub total', 'subtotal', 'قيمة', 'المجموع', 'total amount', 'total cost'],
  item_code: ['item code', 'كود البند', 'item_code', 'code', 'الكود', 'كود', 'رمز البند', 'wbs', 'wbs code'],
};

// Arabic/Eastern numeral conversion
function convertArabicNumerals(str: string): string {
  const arabicNumerals = '٠١٢٣٤٥٦٧٨٩';
  const easternNumerals = '۰۱۲۳۴۵۶۷۸۹';
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(arabicNumerals[i], 'g'), String(i));
    result = result.replace(new RegExp(easternNumerals[i], 'g'), String(i));
  }
  return result;
}

/**
 * Match a column name from the file to a normalized field name
 */
export function matchColumnName(columnName: string): string | null {
  const normalized = columnName.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  
  // Phase 1: Exact match only (highest priority)
  for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    if (aliases.some(a => normalized === a.toLowerCase())) {
      return field;
    }
  }
  
  // Phase 2: includes as fallback
  for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    if (aliases.some(a => normalized.includes(a.toLowerCase()))) {
      return field;
    }
  }
  
  return null;
}

/**
 * Generate a simple UUID
 */
function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * Parse a numeric value from various formats including Arabic/Eastern numerals
 */
function parseNumeric(value: any): number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined || value === '') return 0;
  let str = String(value);
  // Convert Arabic/Eastern numerals
  str = convertArabicNumerals(str);
  const cleaned = str.replace(/[,،\s]/g, '').replace(/[^\d.\-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Check if a value looks numeric
 */
function isNumericValue(value: any): boolean {
  if (typeof value === 'number') return true;
  if (value === null || value === undefined || value === '') return false;
  let str = String(value);
  str = convertArabicNumerals(str);
  const cleaned = str.replace(/[,،\s]/g, '').replace(/[^\d.\-]/g, '');
  return cleaned.length > 0 && !isNaN(parseFloat(cleaned));
}

/**
 * Build a column mapping from headers to normalized field names
 */
function buildColumnMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const usedFields = new Set<string>();

  for (const header of headers) {
    const field = matchColumnName(header);
    if (field && !usedFields.has(field)) {
      map[header] = field;
      usedFields.add(field);
    }
  }
  return map;
}

/**
 * Auto-detect numeric columns from data when column mapping fails
 */
function autoDetectNumericColumns(
  rawItems: any[], 
  headers: string[], 
  existingMap: Record<string, string>
): Record<string, string> {
  const mappedFields = new Set(Object.values(existingMap));
  const needsQuantity = !mappedFields.has('quantity');
  const needsUnitPrice = !mappedFields.has('unit_price');
  const needsTotalPrice = !mappedFields.has('total_price');
  
  if (!needsQuantity && !needsUnitPrice && !needsTotalPrice) return existingMap;
  
  const unmappedHeaders = headers.filter(h => !existingMap[h]);
  const sampleSize = Math.min(rawItems.length, 20);
  
  interface ColumnStats {
    header: string;
    numericRatio: number;
    avgValue: number;
    values: number[];
  }
  
  const numericColumns: ColumnStats[] = [];
  
  for (const header of unmappedHeaders) {
    let numericCount = 0;
    const values: number[] = [];
    
    for (let i = 0; i < sampleSize; i++) {
      const val = rawItems[i]?.[header];
      if (isNumericValue(val)) {
        numericCount++;
        values.push(parseNumeric(val));
      }
    }
    
    const ratio = sampleSize > 0 ? numericCount / sampleSize : 0;
    if (ratio >= 0.5) {
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      numericColumns.push({ header, numericRatio: ratio, avgValue: avg, values });
    }
  }
  
  // Sort by average value to guess: smallest avg = quantity, medium = unit_price, largest = total_price
  numericColumns.sort((a, b) => a.avgValue - b.avgValue);
  
  const augmentedMap = { ...existingMap };
  let idx = 0;
  
  if (needsQuantity && idx < numericColumns.length) {
    augmentedMap[numericColumns[idx].header] = 'quantity';
    idx++;
  }
  if (needsUnitPrice && idx < numericColumns.length) {
    augmentedMap[numericColumns[idx].header] = 'unit_price';
    idx++;
  }
  if (needsTotalPrice && idx < numericColumns.length) {
    augmentedMap[numericColumns[idx].header] = 'total_price';
    idx++;
  }
  
  return augmentedMap;
}

// Known unit patterns for auto-detection
const KNOWN_UNITS = [
  'م', 'م2', 'م3', 'م.ط', 'طن', 'كجم', 'عدد', 'لتر', 'حبة', 'مقطوعية', 'ر.م', 'م.م',
  'm', 'm2', 'm3', 'kg', 'ton', 'ls', 'no', 'pcs', 'set', 'lump sum', 'l.s', 'nos',
  'ea', 'each', 'nr', 'trip', 'day', 'month', 'hr', 'sqm', 'cum', 'rm', 'lm',
];

/**
 * Auto-detect text columns (description, unit) from data when column mapping fails
 */
function autoDetectTextColumns(
  rawItems: any[],
  headers: string[],
  existingMap: Record<string, string>
): Record<string, string> {
  const mappedFields = new Set(Object.values(existingMap));
  const needsDescription = !mappedFields.has('description') && !mappedFields.has('description_ar');
  const needsUnit = !mappedFields.has('unit');

  if (!needsDescription && !needsUnit) return existingMap;

  const unmappedHeaders = headers.filter(h => !existingMap[h]);
  const sampleSize = Math.min(rawItems.length, 20);
  const augmentedMap = { ...existingMap };

  if (needsDescription) {
    // Find the column with longest average text length
    let bestDescHeader = '';
    let bestAvgLen = 0;

    for (const header of unmappedHeaders) {
      let totalLen = 0;
      let count = 0;
      for (let i = 0; i < sampleSize; i++) {
        const val = rawItems[i]?.[header];
        if (val != null && String(val).trim()) {
          const str = String(val).trim();
          // Skip pure numbers
          if (!isNumericValue(val)) {
            totalLen += str.length;
            count++;
          }
        }
      }
      const avgLen = count > 0 ? totalLen / count : 0;
      if (avgLen > bestAvgLen && avgLen > 5) {
        bestAvgLen = avgLen;
        bestDescHeader = header;
      }
    }

    if (bestDescHeader) {
      // Detect if it's Arabic text
      const sampleVal = String(rawItems[0]?.[bestDescHeader] || '');
      const isArabic = /[\u0600-\u06FF]/.test(sampleVal);
      augmentedMap[bestDescHeader] = isArabic ? 'description_ar' : 'description';
      console.log('Auto-detected description column:', bestDescHeader, '(avg length:', bestAvgLen, ')');
    }
  }

  if (needsUnit) {
    const unitLower = KNOWN_UNITS.map(u => u.toLowerCase());
    let bestUnitHeader = '';
    let bestUnitScore = 0;

    for (const header of unmappedHeaders) {
      if (augmentedMap[header]) continue; // already mapped
      let matchCount = 0;
      let totalCount = 0;
      for (let i = 0; i < sampleSize; i++) {
        const val = rawItems[i]?.[header];
        if (val != null && String(val).trim()) {
          totalCount++;
          const str = String(val).trim().toLowerCase();
          if (str.length <= 15 && unitLower.some(u => str === u || str.includes(u))) {
            matchCount++;
          }
        }
      }
      const score = totalCount > 0 ? matchCount / totalCount : 0;
      if (score > bestUnitScore && score >= 0.3) {
        bestUnitScore = score;
        bestUnitHeader = header;
      }
    }

    if (bestUnitHeader) {
      augmentedMap[bestUnitHeader] = 'unit';
      console.log('Auto-detected unit column:', bestUnitHeader, '(match ratio:', bestUnitScore, ')');
    }
  }

  return augmentedMap;
}

/**
 * Normalize raw historical items from varied column formats into a unified BOQ structure
 */
export function normalizeHistoricalItems(rawItems: any[], headers?: string[]): NormalizedHistoricalItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  // Get headers from first item if not provided
  const itemHeaders = headers || Object.keys(rawItems[0] || {});
  let columnMap = buildColumnMap(itemHeaders);
  
  console.log('normalizeHistoricalItems - Headers:', itemHeaders);
  console.log('normalizeHistoricalItems - Initial columnMap:', columnMap);
  
  // Auto-detect numeric columns if quantity/unit_price/total_price are missing
  columnMap = autoDetectNumericColumns(rawItems, itemHeaders, columnMap);
  
  // Auto-detect text columns if description/unit are missing
  columnMap = autoDetectTextColumns(rawItems, itemHeaders, columnMap);
  
  console.log('normalizeHistoricalItems - Final columnMap:', columnMap);

  return rawItems.map((raw, index) => {
    const item: Partial<NormalizedHistoricalItem> = {
      id: generateId(),
    };

    // Map each raw field to normalized field
    for (const [originalKey, normalizedKey] of Object.entries(columnMap)) {
      const value = raw[originalKey];
      if (value === undefined || value === null) continue;

      switch (normalizedKey) {
        case 'item_number':
          item.item_number = String(value).trim();
          break;
        case 'description':
          item.description = String(value).trim();
          break;
        case 'description_ar':
          item.description_ar = String(value).trim();
          break;
        case 'unit':
          item.unit = String(value).trim();
          break;
        case 'quantity':
          item.quantity = parseNumeric(value);
          break;
        case 'unit_price':
          item.unit_price = parseNumeric(value);
          break;
        case 'total_price':
          item.total_price = parseNumeric(value);
          break;
        case 'item_code':
          item.item_code = String(value).trim();
          break;
      }
    }

    // If no mapping found, try to detect from already normalized keys
    if (!item.item_number && raw.item_number) item.item_number = String(raw.item_number);
    if (!item.description && raw.description) item.description = String(raw.description);
    if (!item.description_ar && raw.description_ar) item.description_ar = String(raw.description_ar);
    if (!item.unit && raw.unit) item.unit = String(raw.unit);
    if (item.quantity === undefined && raw.quantity !== undefined) item.quantity = parseNumeric(raw.quantity);
    if (item.unit_price === undefined && raw.unit_price !== undefined) item.unit_price = parseNumeric(raw.unit_price);
    if (item.total_price === undefined && raw.total_price !== undefined) item.total_price = parseNumeric(raw.total_price);
    if (!item.item_code && raw.item_code) item.item_code = String(raw.item_code);

    // Defaults
    const quantity = item.quantity ?? 0;
    const unitPrice = item.unit_price ?? 0;
    const totalPrice = item.total_price ?? (quantity * unitPrice);

    return {
      id: item.id!,
      item_number: item.item_number || String(index + 1),
      description: item.description || '',
      description_ar: item.description_ar || '',
      unit: item.unit || '',
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice > 0 ? totalPrice : quantity * unitPrice,
      item_code: item.item_code || '',
    };
  });
}

/**
 * Create an empty normalized item
 */
export function createEmptyItem(): NormalizedHistoricalItem {
  return {
    id: generateId(),
    item_number: '',
    description: '',
    description_ar: '',
    unit: '',
    quantity: 0,
    unit_price: 0,
    total_price: 0,
    item_code: '',
  };
}

/**
 * Calculate total price from quantity and unit price
 */
export function calculateTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * Safely compute total value from items, filtering out corrupt/overflow numbers
 */
export function safeTotalValue(items: NormalizedHistoricalItem[]): number {
  return items.reduce((sum, item) => {
    const tp = item.total_price || 0;
    if (!Number.isFinite(tp) || tp > 1e15 || tp < -1e15) return sum;
    return sum + tp;
  }, 0);
}

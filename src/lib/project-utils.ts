export interface ProjectData {
  id: string;
  name: string;
  file_name: string | null;
  analysis_data: any;
  wbs_data: any;
  total_value: number | null;
  items_count: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  item_number: string;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  category: string | null;
}

export function sanitizeItemPrice(item: any): { quantity: number; unitPrice: number; totalPrice: number } {
  const qty = parseFloat(item.quantity) || 0;
  const up = parseFloat(item.unit_price) || 0;
  const tp = parseFloat(item.total_price) || 0;
  
  const safeUp = (up > 0 && up < 1e7) ? up : 0;
  const computed = qty * safeUp;
  const safeTp = (tp > 0 && tp < 1e12) ? tp : 0;
  
  return {
    quantity: qty,
    unitPrice: safeUp,
    totalPrice: computed > 0 ? computed : safeTp,
  };
}

export function getSafeProjectTotal(project: ProjectData | null | undefined): number {
  if (!project) return 0;
  const storedTotal = project.total_value || 0;
  if (storedTotal > 0 && storedTotal < 1e12) return storedTotal;
  
  const items = project.analysis_data?.items || [];
  if (items.length === 0) return 0;
  
  let total = 0;
  for (const item of items) {
    const safe = sanitizeItemPrice(item);
    total += safe.totalPrice;
  }
  return total;
}

export function formatLargeNumber(value: number, currency?: string): string {
  const suffix = currency ? ` ${currency}` : '';
  if (!Number.isFinite(value) || value < 0) return `—${suffix}`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

export function computeSafeTotalFromItems(items: ProjectItem[]): number {
  return items.reduce((sum, item) => {
    const safe = sanitizeItemPrice(item);
    return sum + safe.totalPrice;
  }, 0);
}

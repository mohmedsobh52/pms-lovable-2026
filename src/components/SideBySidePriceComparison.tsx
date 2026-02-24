import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, CheckCircle, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceSource {
  current: number | null;
  ai: number | null;
  reference: number | null;
}

interface ComparisonItem {
  id: string;
  item_number: string;
  description: string;
  unit: string;
  prices: PriceSource;
}

interface SideBySidePriceComparisonProps {
  items: ComparisonItem[];
  isArabic: boolean;
  currency: string;
  onApplyPrice: (itemId: string, price: number, source: string) => void;
  formatCurrency: (value: number) => string;
}

export function SideBySidePriceComparison({
  items,
  isArabic,
  currency,
  onApplyPrice,
  formatCurrency,
}: SideBySidePriceComparisonProps) {
  const getBestPrice = (prices: PriceSource): { price: number; source: string } | null => {
    const candidates = [
      { price: prices.current, source: 'current' },
      { price: prices.ai, source: 'ai' },
      { price: prices.reference, source: 'reference' },
    ].filter(c => c.price && c.price > 0) as { price: number; source: string }[];
    
    if (candidates.length === 0) return null;
    return candidates.reduce((min, c) => c.price < min.price ? c : min);
  };

  const getVarianceColor = (price: number | null, avgPrice: number): string => {
    if (!price || avgPrice === 0) return "";
    const ratio = price / avgPrice;
    if (ratio > 1.3) return "text-destructive font-bold";
    if (ratio < 0.7) return "text-green-600 font-bold";
    return "";
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {isArabic ? "لا توجد بنود للمقارنة" : "No items to compare"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="w-5 h-5" />
          {isArabic ? "مقارنة الأسعار جنباً إلى جنب" : "Side-by-Side Price Comparison"}
          <Badge variant="secondary">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{isArabic ? "رقم البند" : "Item"}</TableHead>
                <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                <TableHead className="text-center w-[120px]">{isArabic ? "السعر الحالي" : "Current"}</TableHead>
                <TableHead className="text-center w-[120px]">{isArabic ? "سعر AI" : "AI Price"}</TableHead>
                <TableHead className="text-center w-[120px]">{isArabic ? "المرجعي" : "Reference"}</TableHead>
                <TableHead className="text-center w-[60px]">{isArabic ? "الفرق" : "Var."}</TableHead>
                <TableHead className="text-center w-[100px]">{isArabic ? "إجراء" : "Action"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => {
                const allPrices = [item.prices.current, item.prices.ai, item.prices.reference].filter(Boolean) as number[];
                const avgPrice = allPrices.length > 0 ? allPrices.reduce((s, p) => s + p, 0) / allPrices.length : 0;
                const best = getBestPrice(item.prices);
                const maxPrice = Math.max(...allPrices, 1);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.item_number}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{item.description}</TableCell>
                    <TableCell className="text-center">
                      {item.prices.current && item.prices.current > 0 ? (
                        <div>
                          <p className={cn("text-sm", getVarianceColor(item.prices.current, avgPrice))}>
                            {formatCurrency(item.prices.current)}
                          </p>
                          <div className="h-1.5 bg-secondary rounded-full mt-1 mx-auto w-16">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(item.prices.current / maxPrice) * 100}%` }} />
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.prices.ai && item.prices.ai > 0 ? (
                        <div>
                          <p className={cn("text-sm", getVarianceColor(item.prices.ai, avgPrice))}>
                            {formatCurrency(item.prices.ai)}
                          </p>
                          <div className="h-1.5 bg-secondary rounded-full mt-1 mx-auto w-16">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(item.prices.ai / maxPrice) * 100}%` }} />
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.prices.reference && item.prices.reference > 0 ? (
                        <div>
                          <p className={cn("text-sm", getVarianceColor(item.prices.reference, avgPrice))}>
                            {formatCurrency(item.prices.reference)}
                          </p>
                          <div className="h-1.5 bg-secondary rounded-full mt-1 mx-auto w-16">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(item.prices.reference / maxPrice) * 100}%` }} />
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {allPrices.length >= 2 ? (
                        <span className="text-xs">
                          {Math.round(((Math.max(...allPrices) - Math.min(...allPrices)) / avgPrice) * 100)}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {best && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          onClick={() => onApplyPrice(item.id, best.price, best.source)}
                        >
                          <CheckCircle className="w-3 h-3" />
                          {isArabic ? "تطبيق" : "Apply"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

import { QuotationUpload } from "@/components/QuotationUpload";
import { QuotationComparison } from "@/components/QuotationComparison";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Search } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const QuotationsPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [unpricedItems, setUnpricedItems] = useState<any[]>([]);
  const [loadingUnpriced, setLoadingUnpriced] = useState(false);

  const fetchUnpricedItems = async () => {
    if (!user) return;
    setLoadingUnpriced(true);
    try {
      const { data } = await supabase
        .from("project_items")
        .select("id, item_number, description, unit, quantity, unit_price, project_id")
        .or("unit_price.is.null,unit_price.eq.0")
        .eq("is_section", false)
        .limit(100);
      setUnpricedItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUnpriced(false);
    }
  };

  return (
    <PageLayout>
      <ErrorBoundary>
        <PageHeader
          icon={FileText}
          title={isArabic ? "عروض الأسعار" : "Quotations"}
          subtitle={isArabic ? "رفع ومقارنة عروض الأسعار" : "Upload and compare price quotations"}
        />
        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="tabs-navigation-safe">
            <TabsTrigger value="upload">
              {isArabic ? "رفع عروض الأسعار" : "Upload Quotations"}
            </TabsTrigger>
            <TabsTrigger value="compare">
              {isArabic ? "مقارنة العروض" : "Compare Quotations"}
            </TabsTrigger>
            <TabsTrigger value="unpriced" onClick={fetchUnpricedItems} className="gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {isArabic ? "مواد غير مسعرة" : "Unpriced Items"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <QuotationUpload />
          </TabsContent>
          <TabsContent value="compare">
            <QuotationComparison />
          </TabsContent>
          <TabsContent value="unpriced">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  {isArabic ? "بنود بدون تسعير" : "Items Without Pricing"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingUnpriced ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : unpricedItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>{isArabic ? "لا توجد بنود غير مسعرة" : "No unpriced items found"}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={fetchUnpricedItems}>
                      <Search className="w-4 h-4 me-1" />
                      {isArabic ? "بحث مجدداً" : "Search Again"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {isArabic ? `${unpricedItems.length} بند بدون سعر` : `${unpricedItems.length} items without price`}
                      </p>
                      <Button variant="outline" size="sm" onClick={() => toast.info(isArabic ? "سيتم البحث في أسعار السوق..." : "Searching market prices...")}>
                        <Search className="w-4 h-4 me-1" />
                        {isArabic ? "بحث في السوق" : "Search Market"}
                      </Button>
                    </div>
                    <div className="divide-y max-h-[400px] overflow-auto rounded-lg border">
                      {unpricedItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.description || item.item_number}</p>
                            <p className="text-xs text-muted-foreground">{item.item_number} • {item.unit} • {isArabic ? "كمية" : "Qty"}: {item.quantity}</p>
                          </div>
                          <Badge variant="destructive" className="shrink-0 text-xs">
                            {isArabic ? "بدون سعر" : "No Price"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ErrorBoundary>
    </PageLayout>
  );
};

export default QuotationsPage;

import { useState, useCallback } from "react";
import { Upload, FileText, Trash2, Eye, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Quotation {
  id: string;
  name: string;
  file_name: string;
  file_url: string;
  file_type: string;
  supplier_name?: string;
  quotation_date?: string;
  total_amount?: number;
  currency: string;
  status: string;
  created_at: string;
}

interface QuotationUploadProps {
  projectId?: string;
  onQuotationUploaded?: (quotation: Quotation) => void;
}

export function QuotationUpload({ projectId, onQuotationUploaded }: QuotationUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    supplier_name: "",
    quotation_date: "",
    total_amount: "",
  });

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول لرفع عروض الأسعار",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "نوع ملف غير صالح",
        description: "يرجى رفع ملفات PDF أو Excel فقط",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "حجم الملف كبير جداً",
        description: "الحد الأقصى لحجم الملف هو 10 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('quotations')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('quotations')
        .getPublicUrl(fileName);

      // Save to database
      const { data: quotation, error: dbError } = await supabase
        .from('price_quotations')
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          name: formData.name || file.name.replace(/\.[^/.]+$/, ""),
          file_name: file.name,
          file_url: publicUrl,
          file_type: fileExt === 'pdf' ? 'pdf' : 'excel',
          supplier_name: formData.supplier_name || null,
          quotation_date: formData.quotation_date || null,
          total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
          status: 'pending',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setQuotations(prev => [quotation, ...prev]);
      onQuotationUploaded?.(quotation);
      
      // Reset form
      setFormData({
        name: "",
        supplier_name: "",
        quotation_date: "",
        total_amount: "",
      });

      toast({
        title: "تم الرفع بنجاح",
        description: `تم رفع عرض السعر "${file.name}"`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "خطأ في الرفع",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء رفع الملف",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  }, [user, projectId, formData, toast, onQuotationUploaded]);

  const deleteQuotation = async (quotation: Quotation) => {
    if (!user) return;

    try {
      // Delete from storage
      const filePath = quotation.file_url.split('/quotations/')[1];
      if (filePath) {
        await supabase.storage.from('quotations').remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('price_quotations')
        .delete()
        .eq('id', quotation.id);

      if (error) throw error;

      setQuotations(prev => prev.filter(q => q.id !== quotation.id));
      
      toast({
        title: "تم الحذف",
        description: "تم حذف عرض السعر بنجاح",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف الملف",
        variant: "destructive",
      });
    }
  };

  const loadQuotations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('price_quotations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error("Error loading quotations:", error);
    }
  }, [user]);

  // Load quotations on mount
  useState(() => {
    loadQuotations();
  });

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-5 h-5" />
            رفع عرض سعر جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم العرض</Label>
              <Input
                id="name"
                placeholder="مثال: عرض سعر المواد"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">اسم المورد</Label>
              <Input
                id="supplier"
                placeholder="مثال: شركة ABC للمقاولات"
                value={formData.supplier_name}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">تاريخ العرض</Label>
              <Input
                id="date"
                type="date"
                value={formData.quotation_date}
                onChange={(e) => setFormData(prev => ({ ...prev, quotation_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ الإجمالي (اختياري)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.total_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
              />
            </div>
          </div>

          {/* File Upload Area */}
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.xls,.xlsx"
              onChange={handleFileUpload}
              disabled={isUploading || !user}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-colors
              ${isUploading ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              ${!user ? 'opacity-50' : ''}
            `}>
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">جاري رفع الملف...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-3">
                    <FileText className="w-10 h-10 text-red-500" />
                    <FileSpreadsheet className="w-10 h-10 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">اسحب الملف هنا أو انقر للاختيار</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF أو Excel • الحد الأقصى 10 ميجابايت
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!user && (
            <p className="text-sm text-amber-600 text-center">
              يرجى تسجيل الدخول لرفع عروض الأسعار
            </p>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Quotations List */}
      {quotations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">عروض الأسعار المرفوعة ({quotations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quotations.map((quotation) => (
                <div
                  key={quotation.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${quotation.file_type === 'pdf' ? 'bg-red-500/10' : 'bg-green-500/10'}
                    `}>
                      {quotation.file_type === 'pdf' ? (
                        <FileText className="w-5 h-5 text-red-500" />
                      ) : (
                        <FileSpreadsheet className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{quotation.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {quotation.supplier_name && (
                          <span className="text-xs text-muted-foreground">
                            {quotation.supplier_name}
                          </span>
                        )}
                        {quotation.total_amount && (
                          <Badge variant="outline" className="text-xs">
                            {quotation.total_amount.toLocaleString()} {quotation.currency}
                          </Badge>
                        )}
                        <Badge 
                          variant={quotation.status === 'analyzed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {quotation.status === 'analyzed' ? 'تم التحليل' : 'قيد الانتظار'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(quotation.file_url, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteQuotation(quotation)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
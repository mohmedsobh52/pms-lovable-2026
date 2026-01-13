import { useState, useEffect, useMemo } from 'react';
import { Package, Minimize2, Info, Zap, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { compressText } from '@/hooks/useChunkedAnalysis';

interface TextOptimizationPanelProps {
  text: string;
  onOptimizedSettings: (settings: OptimizationSettings) => void;
  defaultChunkSize?: number;
}

export interface OptimizationSettings {
  enableCompression: boolean;
  chunkSize: number;
  isArabicOptimized: boolean;
  estimatedChunks: number;
  estimatedTimeMinutes: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

const CHUNK_SIZE_OPTIONS = [10, 15, 20, 30];

// Detect if text is primarily Arabic
const isArabicText = (text: string): boolean => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
  const arabicCount = (text.match(arabicPattern) || []).length;
  return arabicCount > text.length * 0.3;
};

// Format size for display
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export function TextOptimizationPanel({
  text,
  onOptimizedSettings,
  defaultChunkSize = 30,
}: TextOptimizationPanelProps) {
  const { isArabic } = useLanguage();
  const [enableCompression, setEnableCompression] = useState(true);
  const [chunkSize, setChunkSize] = useState(defaultChunkSize);
  
  // Detect if text is Arabic
  const textIsArabic = useMemo(() => isArabicText(text), [text]);
  
  // Auto-reduce chunk size for Arabic content
  useEffect(() => {
    if (textIsArabic && chunkSize > 15) {
      setChunkSize(15);
    }
  }, [textIsArabic]);
  
  // Calculate sizes and estimates
  const originalSize = useMemo(() => new Blob([text]).size, [text]);
  
  const compressedSize = useMemo(() => {
    if (!enableCompression) return originalSize;
    const compressed = compressText(text);
    return new Blob([compressed]).size;
  }, [text, enableCompression]);
  
  const compressionRatio = useMemo(() => {
    if (originalSize === 0) return 0;
    return Math.round((1 - compressedSize / originalSize) * 100);
  }, [originalSize, compressedSize]);
  
  const estimatedChunks = useMemo(() => {
    const chunkSizeBytes = chunkSize * 1000;
    return Math.ceil(text.length / chunkSizeBytes);
  }, [text, chunkSize]);
  
  // Estimate time: ~20 seconds per chunk with delays
  const estimatedTimeMinutes = useMemo(() => {
    const secondsPerChunk = textIsArabic ? 25 : 20;
    const totalSeconds = estimatedChunks * secondsPerChunk;
    return Math.ceil(totalSeconds / 60);
  }, [estimatedChunks, textIsArabic]);
  
  // Notify parent of settings changes
  useEffect(() => {
    onOptimizedSettings({
      enableCompression,
      chunkSize,
      isArabicOptimized: textIsArabic,
      estimatedChunks,
      estimatedTimeMinutes,
      originalSize,
      compressedSize,
      compressionRatio,
    });
  }, [enableCompression, chunkSize, textIsArabic, estimatedChunks, estimatedTimeMinutes, originalSize, compressedSize, compressionRatio, onOptimizedSettings]);
  
  // Only show panel for large files (> 50KB)
  if (originalSize < 50 * 1024) {
    return null;
  }
  
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          {isArabic ? 'تحسين المستند' : 'Document Optimization'}
          {textIsArabic && (
            <Badge variant="secondary" className="gap-1">
              <Languages className="h-3 w-3" />
              {isArabic ? 'عربي' : 'Arabic'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Size Info */}
        <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-background/80">
          <span className="text-muted-foreground">
            {isArabic ? 'حجم النص:' : 'Text Size:'}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{formatSize(originalSize)}</span>
            {enableCompression && compressionRatio > 0 && (
              <>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatSize(compressedSize)}
                </span>
                <Badge variant="outline" className="text-green-600 dark:text-green-400">
                  {compressionRatio}% {isArabic ? 'توفير' : 'saved'}
                </Badge>
              </>
            )}
          </div>
        </div>
        
        {/* Compression Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Minimize2 className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="compression" className="text-sm">
              {isArabic ? 'ضغط النص (LZ-String)' : 'Compress Text (LZ-String)'}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    {isArabic 
                      ? 'ضغط النص يقلل حجم البيانات المرسلة ويحسن الأداء'
                      : 'Compression reduces data size and improves performance'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            id="compression"
            checked={enableCompression}
            onCheckedChange={setEnableCompression}
          />
        </div>
        
        {/* Chunk Size Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              {isArabic ? 'حجم القطعة:' : 'Chunk Size:'}
            </Label>
            <Badge variant={chunkSize <= 15 ? 'default' : 'secondary'}>
              {chunkSize}K {textIsArabic && chunkSize <= 15 && (isArabic ? '(موصى)' : '(recommended)')}
            </Badge>
          </div>
          <Slider
            value={[chunkSize]}
            onValueChange={([value]) => setChunkSize(value)}
            min={10}
            max={30}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10K ({isArabic ? 'أكثر استقراراً' : 'More stable'})</span>
            <span>30K ({isArabic ? 'أسرع' : 'Faster'})</span>
          </div>
        </div>
        
        {/* Arabic Optimization Notice */}
        {textIsArabic && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2 text-sm">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  {isArabic ? 'تم اكتشاف محتوى عربي' : 'Arabic Content Detected'}
                </span>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                  {isArabic 
                    ? 'تم تفعيل التحسينات للمستندات العربية (حجم قطعة أصغر للاستقرار)'
                    : 'Arabic optimizations enabled (smaller chunks for stability)'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Estimates */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-background/80 text-center">
            <div className="text-2xl font-bold text-primary">{estimatedChunks}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? 'أجزاء متوقعة' : 'Expected Chunks'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-background/80 text-center">
            <div className="text-2xl font-bold text-primary">~{estimatedTimeMinutes}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? 'دقائق تقريباً' : 'Minutes (approx)'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

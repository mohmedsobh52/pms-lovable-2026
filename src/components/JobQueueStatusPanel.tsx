import { useState, useEffect, useMemo } from 'react';
import { 
  Clock, AlertTriangle, XCircle, CheckCircle2, Loader2, 
  RefreshCw, Pause, Play, Ban, CreditCard, Timer, Server
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import type { AnalysisJob, ChunkProgress } from '@/hooks/useChunkedAnalysis';

interface JobQueueStatusPanelProps {
  job: AnalysisJob | null;
  progress: ChunkProgress;
  onRetry?: () => void;
  onResume?: (jobId: string) => void;
  onCancel?: () => void;
  errorDetails?: {
    errorCode?: string;
    statusCode?: number;
    retryAfter?: number;
    message?: string;
  };
}

// Error type detection and display
interface ErrorInfo {
  type: 'rate_limit' | 'credits_exhausted' | 'server_error' | 'timeout' | 'unknown';
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ReactNode;
  color: string;
  canRetry: boolean;
}

const getErrorInfo = (errorDetails?: JobQueueStatusPanelProps['errorDetails'], errorMessage?: string | null): ErrorInfo => {
  const message = errorDetails?.message || errorMessage || '';
  const statusCode = errorDetails?.statusCode;
  const errorCode = errorDetails?.errorCode;
  
  // Check for 402 - Credits exhausted
  if (statusCode === 402 || message.includes('402') || message.includes('credits') || message.includes('quota') || errorCode === 'CREDITS_402') {
    return {
      type: 'credits_exhausted',
      title: 'AI Credits Exhausted',
      titleAr: 'نفاد رصيد AI',
      description: 'Your AI credits have been exhausted. Please wait or upgrade your plan.',
      descriptionAr: 'تم استنفاد رصيد AI الخاص بك. يرجى الانتظار أو ترقية الخطة.',
      icon: <CreditCard className="h-5 w-5" />,
      color: 'text-red-600 dark:text-red-400',
      canRetry: true,
    };
  }
  
  // Check for 429 - Rate limit
  if (statusCode === 429 || message.includes('429') || message.includes('rate limit') || message.includes('too many') || errorCode === 'RATE_LIMIT_429') {
    return {
      type: 'rate_limit',
      title: 'Rate Limit Exceeded',
      titleAr: 'تجاوز حد الطلبات',
      description: 'Too many requests. Please wait before retrying.',
      descriptionAr: 'عدد طلبات كبير جداً. يرجى الانتظار قبل إعادة المحاولة.',
      icon: <Timer className="h-5 w-5" />,
      color: 'text-orange-600 dark:text-orange-400',
      canRetry: true,
    };
  }
  
  // Check for 5xx - Server error
  if (statusCode && statusCode >= 500) {
    return {
      type: 'server_error',
      title: 'Server Error',
      titleAr: 'خطأ في الخادم',
      description: 'The server encountered an error. Retrying automatically...',
      descriptionAr: 'حدث خطأ في الخادم. جاري إعادة المحاولة تلقائياً...',
      icon: <Server className="h-5 w-5" />,
      color: 'text-purple-600 dark:text-purple-400',
      canRetry: true,
    };
  }
  
  // Check for timeout
  if (message.includes('timeout') || message.includes('Timeout') || errorCode === 'TIMEOUT') {
    return {
      type: 'timeout',
      title: 'Request Timeout',
      titleAr: 'انتهت مهلة الطلب',
      description: 'The request took too long. Retrying with smaller chunks...',
      descriptionAr: 'استغرق الطلب وقتاً طويلاً. جاري إعادة المحاولة بقطع أصغر...',
      icon: <Clock className="h-5 w-5" />,
      color: 'text-yellow-600 dark:text-yellow-400',
      canRetry: true,
    };
  }
  
  return {
    type: 'unknown',
    title: 'Analysis Failed',
    titleAr: 'فشل التحليل',
    description: message || 'An unexpected error occurred.',
    descriptionAr: message || 'حدث خطأ غير متوقع.',
    icon: <XCircle className="h-5 w-5" />,
    color: 'text-red-600 dark:text-red-400',
    canRetry: true,
  };
};

// Format countdown
const formatCountdown = (seconds: number): string => {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
};

export function JobQueueStatusPanel({
  job,
  progress,
  onRetry,
  onResume,
  onCancel,
  errorDetails,
}: JobQueueStatusPanelProps) {
  const { isArabic } = useLanguage();
  const [countdown, setCountdown] = useState<number>(0);
  
  // Initialize countdown from retryAfter or waitingSeconds
  useEffect(() => {
    const retryAfter = errorDetails?.retryAfter || progress.waitingSeconds || 0;
    if (retryAfter > 0) {
      setCountdown(retryAfter);
    }
  }, [errorDetails?.retryAfter, progress.waitingSeconds]);
  
  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [countdown]);
  
  // Get error info
  const errorInfo = useMemo(() => {
    if (progress.status === 'failed' || job?.status === 'failed') {
      return getErrorInfo(errorDetails, job?.errorMessage);
    }
    if (progress.status === 'rate_limited') {
      return getErrorInfo({ statusCode: 429 });
    }
    return null;
  }, [progress.status, job?.status, job?.errorMessage, errorDetails]);
  
  // Status icon
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return errorInfo?.icon || <XCircle className="h-5 w-5 text-red-500" />;
      case 'rate_limited':
        return <Timer className="h-5 w-5 animate-pulse text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  // Only show panel when relevant
  if (progress.status === 'idle' && !job) {
    return null;
  }
  
  const isFailed = progress.status === 'failed' || job?.status === 'failed';
  const isRateLimited = progress.status === 'rate_limited';
  const isProcessing = progress.status === 'processing' || progress.status === 'chunking' || progress.status === 'merging';
  
  return (
    <Card className={`border-2 ${isFailed ? 'border-red-200 dark:border-red-800' : isRateLimited ? 'border-orange-200 dark:border-orange-800' : 'border-blue-200 dark:border-blue-800'}`}>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>
              {isArabic ? 'حالة المعالجة الخلفية' : 'Background Processing Status'}
            </span>
          </div>
          <Badge variant={isFailed ? 'destructive' : isRateLimited ? 'secondary' : 'default'}>
            {progress.percentage}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Error Display */}
        {errorInfo && (isFailed || isRateLimited) && (
          <div className={`p-4 rounded-lg ${
            errorInfo.type === 'credits_exhausted' 
              ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
              : errorInfo.type === 'rate_limit'
              ? 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800'
              : 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="flex items-start gap-3">
              <div className={errorInfo.color}>
                {errorInfo.icon}
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold ${errorInfo.color}`}>
                  {isArabic ? errorInfo.titleAr : errorInfo.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {isArabic ? errorInfo.descriptionAr : errorInfo.description}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Countdown Timer */}
        {(isRateLimited || (isFailed && countdown > 0)) && countdown > 0 && (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Timer className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-medium">
                  {isArabic ? 'إعادة المحاولة بعد:' : 'Retry After:'}
                </span>
              </div>
              <span className="text-2xl font-mono font-bold text-amber-700 dark:text-amber-300">
                {formatCountdown(countdown)}
              </span>
            </div>
            <Progress 
              value={errorDetails?.retryAfter ? ((errorDetails.retryAfter - countdown) / errorDetails.retryAfter) * 100 : 50} 
              className="h-2"
            />
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-2">
              {isArabic 
                ? 'سيتم استئناف المعالجة تلقائياً بعد انتهاء المؤقت'
                : 'Processing will resume automatically after timer expires'}
            </p>
          </div>
        )}
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress.percentage} className="h-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {isArabic 
                ? `${progress.processedChunks} / ${progress.totalChunks} قطعة مكتملة`
                : `${progress.processedChunks} / ${progress.totalChunks} chunks completed`}
            </span>
            {progress.currentStep && (
              <span className="text-primary">{progress.currentStep}</span>
            )}
          </div>
        </div>
        
        {/* Job ID */}
        {job && (
          <div className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
            <span className="text-muted-foreground">
              {isArabic ? 'معرف المهمة:' : 'Job ID:'}
            </span>
            <code className="bg-background px-2 py-0.5 rounded text-[10px] font-mono">
              {job.id.slice(0, 8)}...{job.id.slice(-4)}
            </code>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Retry Button */}
          {isFailed && errorInfo?.canRetry && onRetry && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={onRetry}
              className="flex-1 gap-2"
              disabled={countdown > 0}
            >
              <RefreshCw className="h-4 w-4" />
              {isArabic ? 'إعادة المحاولة' : 'Retry'}
            </Button>
          )}
          
          {/* Resume Button */}
          {isFailed && job && onResume && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onResume(job.id)}
              className="flex-1 gap-2"
              disabled={countdown > 0}
            >
              <Play className="h-4 w-4" />
              {isArabic ? 'استئناف' : 'Resume'}
            </Button>
          )}
          
          {/* Cancel Button */}
          {isProcessing && onCancel && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={onCancel}
              className="gap-2"
            >
              <Ban className="h-4 w-4" />
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

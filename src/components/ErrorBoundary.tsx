import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, WifiOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: 'network' | 'permission' | 'generic';
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'generic',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const msg = error.message.toLowerCase();
    let errorType: State['errorType'] = 'generic';
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
      errorType = 'network';
    } else if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('403')) {
      errorType = 'permission';
    }
    return { hasError: true, error, errorType };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  handleReset = (): void => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'generic',
      retryCount: prev.retryCount + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { errorType, retryCount } = this.state;
      const canRetry = retryCount < this.maxRetries;

      const errorConfig = {
        network: {
          icon: <WifiOff className="w-8 h-8 text-orange-500" />,
          bgClass: "bg-orange-500/10",
          title: "خطأ في الاتصال / Connection Error",
          desc: "تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت / Unable to connect. Check your internet connection.",
        },
        permission: {
          icon: <ShieldAlert className="w-8 h-8 text-yellow-500" />,
          bgClass: "bg-yellow-500/10",
          title: "خطأ في الصلاحيات / Permission Error",
          desc: "ليس لديك صلاحية للوصول / You don't have permission to access this.",
        },
        generic: {
          icon: <AlertTriangle className="w-8 h-8 text-destructive" />,
          bgClass: "bg-destructive/10",
          title: "حدث خطأ غير متوقع",
          desc: "An unexpected error occurred",
        },
      };

      const config = errorConfig[errorType];

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className={`mx-auto w-16 h-16 rounded-full ${config.bgClass} flex items-center justify-center mb-4`}>
                {config.icon}
              </div>
              <CardTitle className="text-xl">{config.title}</CardTitle>
              <CardDescription className="mt-2">{config.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-mono text-xs text-destructive break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button onClick={this.handleReset} className="w-full gap-2">
                    <RefreshCw className="w-4 h-4" />
                    حاول مرة أخرى / Try Again ({this.maxRetries - retryCount} remaining)
                  </Button>
                )}
                <Button onClick={this.handleReload} variant={canRetry ? "outline" : "default"} className="w-full gap-2">
                  <RefreshCw className="w-4 h-4" />
                  إعادة تحميل الصفحة / Reload Page
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="w-full gap-2">
                  <Home className="w-4 h-4" />
                  العودة للرئيسية / Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

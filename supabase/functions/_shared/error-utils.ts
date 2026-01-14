/**
 * Convert error messages to safe, non-revealing messages for client responses.
 * This prevents exposing internal implementation details, API structures, or system information.
 */
export function getSafeErrorMessage(error: unknown): string {
  const errorMsg = error instanceof Error ? error.message.toLowerCase() : "";
  
  // Map specific error patterns to safe messages
  if (errorMsg.includes('rate limit') || errorMsg.includes('429') || errorMsg.includes('too many')) {
    return 'Service temporarily busy. Please try again in a few moments.';
  }
  if (errorMsg.includes('payment') || errorMsg.includes('402') || errorMsg.includes('credits') || errorMsg.includes('quota')) {
    return 'Service temporarily unavailable. Please contact support.';
  }
  if (errorMsg.includes('api key') || errorMsg.includes('not configured') || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
    return 'Service configuration error. Please contact support.';
  }
  if (errorMsg.includes('timeout') || errorMsg.includes('timed out') || errorMsg.includes('deadline')) {
    return 'Request timed out. Please try again.';
  }
  if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (errorMsg.includes('invalid') || errorMsg.includes('malformed') || errorMsg.includes('parse')) {
    return 'Invalid request data. Please check your input and try again.';
  }
  if (errorMsg.includes('not found') || errorMsg.includes('404')) {
    return 'Requested resource not found.';
  }
  if (errorMsg.includes('permission') || errorMsg.includes('forbidden') || errorMsg.includes('403')) {
    return 'You do not have permission to perform this action.';
  }
  
  // Generic safe message
  return 'An error occurred processing your request. Please try again or contact support if the issue persists.';
}

/**
 * Arabic version of safe error messages
 */
export function getSafeErrorMessageAr(error: unknown): string {
  const errorMsg = error instanceof Error ? error.message.toLowerCase() : "";
  
  if (errorMsg.includes('rate limit') || errorMsg.includes('429') || errorMsg.includes('too many')) {
    return 'الخدمة مشغولة مؤقتاً. يرجى المحاولة مرة أخرى بعد قليل.';
  }
  if (errorMsg.includes('payment') || errorMsg.includes('402') || errorMsg.includes('credits') || errorMsg.includes('quota')) {
    return 'الخدمة غير متاحة مؤقتاً. يرجى الاتصال بالدعم.';
  }
  if (errorMsg.includes('api key') || errorMsg.includes('not configured') || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
    return 'خطأ في تكوين الخدمة. يرجى الاتصال بالدعم.';
  }
  if (errorMsg.includes('timeout') || errorMsg.includes('timed out') || errorMsg.includes('deadline')) {
    return 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.';
  }
  if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
    return 'خطأ في الشبكة. يرجى التحقق من اتصالك والمحاولة مرة أخرى.';
  }
  if (errorMsg.includes('invalid') || errorMsg.includes('malformed') || errorMsg.includes('parse')) {
    return 'بيانات غير صالحة. يرجى التحقق من المدخلات والمحاولة مرة أخرى.';
  }
  if (errorMsg.includes('not found') || errorMsg.includes('404')) {
    return 'المورد المطلوب غير موجود.';
  }
  if (errorMsg.includes('permission') || errorMsg.includes('forbidden') || errorMsg.includes('403')) {
    return 'ليس لديك صلاحية لتنفيذ هذا الإجراء.';
  }
  
  return 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.';
}

/**
 * Log error details server-side for debugging
 */
export function logError(functionName: string, error: unknown): void {
  console.error(`[${functionName}] Error:`, {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });
}

import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { NotificationProvider } from "@/hooks/useNotifications";
import { LanguageProvider } from "@/hooks/useLanguage";
import { ThemeProvider } from "@/hooks/useTheme";
import { AnalysisProvider } from "@/hooks/useAnalysisData";
import { AnalysisTrackingProvider } from "@/hooks/useAnalysisTracking";
import { GlobalSearchProvider } from "@/contexts/GlobalSearchContext";
import { UpdateBanner } from "@/components/UpdateBanner";


import { FixedTopNav } from "@/components/FixedTopNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Loader2 } from "lucide-react";

// Auto-retry dynamic imports on chunk load failure (stale cache / HMR)
function lazyWithRetry(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().catch(() => {
      if (!sessionStorage.getItem('chunk_retry')) {
        sessionStorage.setItem('chunk_retry', '1');
        window.location.reload();
      }
      return importFn();
    })
  );
}

// Lazy loaded pages for better initial load performance
const Index = lazyWithRetry(() => import("./pages/Index"));
const HomePage = lazyWithRetry(() => import("./pages/HomePage"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const SharedView = lazyWithRetry(() => import("./pages/SharedView"));
const SavedProjectsPage = lazyWithRetry(() => import("./pages/SavedProjectsPage"));
const About = lazyWithRetry(() => import("./pages/About"));
const CostAnalysisPage = lazyWithRetry(() => import("./pages/CostAnalysisPage"));
const Changelog = lazyWithRetry(() => import("./pages/Changelog"));
const AdminVersions = lazyWithRetry(() => import("./pages/AdminVersions"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const DashboardPage = lazyWithRetry(() => import("./pages/DashboardPage"));
const ProcurementPage = lazyWithRetry(() => import("./pages/ProcurementPage"));
const SubcontractorsPage = lazyWithRetry(() => import("./pages/SubcontractorsPage"));
const QuotationsPage = lazyWithRetry(() => import("./pages/QuotationsPage"));
const ContractsPage = lazyWithRetry(() => import("./pages/ContractsPage"));
const RiskPage = lazyWithRetry(() => import("./pages/RiskPage"));
// ReportsPage lazy import removed - now integrated in SavedProjectsPage
const SettingsPage = lazyWithRetry(() => import("./pages/SettingsPage"));
const AnalysisToolsPage = lazyWithRetry(() => import("./pages/AnalysisToolsPage"));
const BOQItemsPage = lazyWithRetry(() => import("./pages/BOQItemsPage"));
const AttachmentsPage = lazyWithRetry(() => import("./pages/AttachmentsPage"));
const TemplatesPage = lazyWithRetry(() => import("./pages/TemplatesPage"));
const P6ExportPage = lazyWithRetry(() => import("./pages/P6ExportPage"));
const CompareVersionsPage = lazyWithRetry(() => import("./pages/CompareVersionsPage"));
const HistoricalPricingPage = lazyWithRetry(() => import("./pages/HistoricalPricingPage"));
const ResourcesPage = lazyWithRetry(() => import("./pages/ResourcesPage"));
const MaterialPricesPage = lazyWithRetry(() => import("./pages/MaterialPricesPage"));
const CalendarPage = lazyWithRetry(() => import("./pages/CalendarPage"));
// FastExtractionPage removed - now integrated in AttachmentsTab
const LibraryPage = lazyWithRetry(() => import("./pages/LibraryPage"));
const ProjectDetailsPage = lazyWithRetry(() => import("./pages/ProjectDetailsPage"));
const NewProjectPage = lazyWithRetry(() => import("./pages/NewProjectPage"));
const TenderSummaryPage = lazyWithRetry(() => import("./pages/TenderSummaryPage"));
const CompanySettingsPage = lazyWithRetry(() => import("./pages/CompanySettingsPage"));
const CostControlReportPage = lazyWithRetry(() => import("./pages/CostControlReportPage"));
const PricingAccuracyPage = lazyWithRetry(() => import("./pages/PricingAccuracyPage"));
const PartnerDetailsPage = lazyWithRetry(() => import("./pages/PartnerDetailsPage"));
const ProgressCertificatesPage = lazyWithRetry(() => import("./pages/ProgressCertificatesPage"));
const NewCertificatePage = lazyWithRetry(() => import("./pages/NewCertificatePage"));
const AdminDashboardPage = lazyWithRetry(() => import("./pages/AdminDashboardPage"));
const UserManagementPage = lazyWithRetry(() => import("./pages/UserManagementPage"));
const ActivityLogPage = lazyWithRetry(() => import("./pages/ActivityLogPage"));
const DrawingAnalysisPage = lazyWithRetry(() => import("./pages/DrawingAnalysisPage"));
const ExecutionPlanPage = lazyWithRetry(() => import("./pages/ExecutionPlanPage"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Page loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">جاري التحميل...</p>
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    sessionStorage.removeItem('chunk_retry');
  }, []);

  return (
  <ThemeProvider>
  <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
        <AnalysisProvider>
          <AnalysisTrackingProvider>
            <TooltipProvider>
              
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <GlobalSearchProvider>
                  <GlobalSearch />
                  <UpdateBanner />
                  
                  <FixedTopNav />
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/analyze" element={<Navigate to="/projects" replace />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/shared/:shareCode" element={<SharedView />} />
                        <Route path="/projects" element={<SavedProjectsPage />} />
                        <Route path="/projects/new" element={<NewProjectPage />} />
                        <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
                        <Route path="/projects/:projectId/pricing" element={<TenderSummaryPage />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/cost-analysis" element={<CostAnalysisPage />} />
                        <Route path="/changelog" element={<Changelog />} />
                        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="/admin/versions" element={<AdminVersions />} />
                        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                        <Route path="/admin/users" element={<UserManagementPage />} />
                        <Route path="/admin/activity" element={<ActivityLogPage />} />
                        {/* Separate pages for each section */}
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/items" element={<BOQItemsPage />} />
                        <Route path="/analysis-tools" element={<AnalysisToolsPage />} />
                        <Route path="/procurement" element={<ProcurementPage />} />
                        <Route path="/procurement/partner/:partnerId" element={<PartnerDetailsPage />} />
                        <Route path="/quotations" element={<QuotationsPage />} />
                        {/* Separate routes for contracts and subcontractors */}
                        <Route path="/contracts" element={<ContractsPage />} />
                        <Route path="/subcontractors" element={<SubcontractorsPage />} />
                        <Route path="/risk" element={<RiskPage />} />
                        <Route path="/reports" element={<Navigate to="/projects?tab=reports" replace />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/company-settings" element={<CompanySettingsPage />} />
                        <Route path="/attachments" element={<Navigate to="/projects?tab=attachments" replace />} />
                        <Route path="/templates" element={<TemplatesPage />} />
                        <Route path="/p6-export" element={<P6ExportPage />} />
                        <Route path="/compare-versions" element={<CompareVersionsPage />} />
                        <Route path="/historical-pricing" element={<HistoricalPricingPage />} />
                        <Route path="/resources" element={<ResourcesPage />} />
                        <Route path="/material-prices" element={<MaterialPricesPage />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/fast-extraction" element={<Navigate to="/projects?tab=attachments&mode=extraction" replace />} />
                        <Route path="/library" element={<LibraryPage />} />
                        <Route path="/cost-control-report" element={<CostControlReportPage />} />
                        <Route path="/pricing-accuracy" element={<PricingAccuracyPage />} />
                        <Route path="/progress-certificates" element={<ProgressCertificatesPage />} />
                        <Route path="/progress-certificates/new" element={<NewCertificatePage />} />
                        <Route path="/drawing-analysis" element={<DrawingAnalysisPage />} />
                        <Route path="/execution-plan" element={<ExecutionPlanPage />} />
                        <Route path="/execution-plan/:projectId" element={<ExecutionPlanPage />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </GlobalSearchProvider>
              </BrowserRouter>
            </TooltipProvider>
          </AnalysisTrackingProvider>
        </AnalysisProvider>
      </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </LanguageProvider>
  </ThemeProvider>
  );
};

export default App;

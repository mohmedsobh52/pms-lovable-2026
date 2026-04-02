import { useState, useEffect } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { ProjectOverview } from '@/components/dashboard/ProjectOverview';
import { ProjectTimeline } from '@/components/dashboard/ProjectTimeline';
import { TeamResources } from '@/components/dashboard/TeamResources';
import { BudgetTracking } from '@/components/dashboard/BudgetTracking';
import { TaskManagement } from '@/components/dashboard/TaskManagement';
import { KPICards } from '@/components/dashboard/KPICards';
import { PMSSetup } from '@/components/PMSSetup';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@supabase/supabase-js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function ProjectManagementPage() {
  const { data: projects = [], isLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);

  useEffect(() => {
    // Check if database tables exist
    const checkSetup = async () => {
      try {
        const { error } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true });

        if (error && error.code === 'PGRST116') {
          // Table not found
          setIsSetupNeeded(true);
        } else {
          setIsSetupNeeded(false);
        }
      } catch {
        setIsSetupNeeded(true);
      } finally {
        setIsCheckingSetup(false);
      }
    };

    checkSetup();
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Show setup screen if database not configured
  if (isCheckingSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">جاري التحقق من الإعداد...</p>
      </div>
    );
  }

  if (isSetupNeeded) {
    return <PMSSetup />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 text-center">
            <h1 className="text-3xl font-bold mb-4">لا توجد مشاريع</h1>
            <p className="text-gray-600 mb-8">لم يتم إنشاء أي مشاريع بعد. ابدأ بإنشاء مشروع جديد.</p>
            <Button size="lg">إنشاء مشروع جديد</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">إدارة المشاريع</h1>
          <p className="text-gray-600">منصة متكاملة لإدارة مشاريعك وفريقك</p>
        </div>

        {/* Project Selection */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-4">
            <label className="font-medium text-gray-700">اختر مشروع:</label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="اختر مشروع" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button>مشروع جديد</Button>
          </div>
        </Card>

        {selectedProject && (
          <>
            {/* KPI Cards */}
            <div className="mb-8">
              <KPICards projectId={selectedProject.id} />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Left Column - Project Overview */}
              <div className="lg:col-span-1">
                <ProjectOverview project={selectedProject} />
              </div>

              {/* Middle Column - Timeline */}
              <div className="lg:col-span-2">
                <ProjectTimeline projectId={selectedProject.id} />
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Team Resources */}
              <TeamResources projectId={selectedProject.id} />
              
              {/* Budget Tracking */}
              <BudgetTracking projectId={selectedProject.id} />
            </div>

            {/* Tasks */}
            <div className="mb-8">
              <TaskManagement projectId={selectedProject.id} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

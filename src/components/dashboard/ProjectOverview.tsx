import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Project } from '@/hooks/useProjects';

interface ProjectOverviewProps {
  project: Project;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'text-green-600',
      'completed': 'text-blue-600',
      'on-hold': 'text-amber-600',
      'cancelled': 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const getStatusBgColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-green-50',
      'completed': 'bg-blue-50',
      'on-hold': 'bg-amber-50',
      'cancelled': 'bg-red-50'
    };
    return colors[status] || 'bg-gray-50';
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-gray-600 mt-2">{project.description}</p>
            )}
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBgColor(project.status)} ${getStatusColor(project.status)}`}>
            {project.status}
          </div>
        </div>

        {/* Dates */}
        {(project.start_date || project.end_date) && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {project.start_date && (
              <div>
                <p className="text-gray-600">تاريخ البداية</p>
                <p className="font-medium">{new Date(project.start_date).toLocaleDateString('ar-EG')}</p>
              </div>
            )}
            {project.end_date && (
              <div>
                <p className="text-gray-600">تاريخ النهاية</p>
                <p className="font-medium">{new Date(project.end_date).toLocaleDateString('ar-EG')}</p>
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">التقدم الكلي</span>
            <span className="text-lg font-bold">{project.progress_percentage}%</span>
          </div>
          <Progress value={project.progress_percentage} className="h-3" />
        </div>

        {/* Budget */}
        {project.budget && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">الميزانية المتاحة</p>
            <p className="text-2xl font-bold">{project.budget.toLocaleString('ar-EG')} ر.س</p>
          </div>
        )}
      </div>
    </Card>
  );
}

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useProjectTasks } from '@/hooks/useTasks';
import { useState } from 'react';

interface TaskManagementProps {
  projectId: string;
}

export function TaskManagement({ projectId }: TaskManagementProps) {
  const { data: tasks = [] } = useProjectTasks(projectId);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'todo': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'on-hold': 'bg-amber-100 text-amber-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'low': 'text-green-600',
      'medium': 'text-yellow-600',
      'high': 'text-orange-600',
      'critical': 'text-red-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  const tasksByStatus = {
    'todo': tasks.filter(t => t.status === 'todo'),
    'in-progress': tasks.filter(t => t.status === 'in-progress'),
    'completed': tasks.filter(t => t.status === 'completed'),
    'on-hold': tasks.filter(t => t.status === 'on-hold')
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-6">إدارة المهام</h3>
      <div className="space-y-6">
        {tasks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">لم يتم إضافة مهام</p>
        ) : (
          Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-medium text-sm uppercase">{getStatusLabel(status)}</h4>
                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">
                  {statusTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {statusTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
                  >
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={(checked) => {
                        // Handle task completion
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </p>
                      {task.due_date && (
                        <p className="text-xs text-gray-600">
                          الموعد النهائي: {new Date(task.due_date).toLocaleDateString('ar-EG')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                        {getPriorityLabel(task.priority)}
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'todo': 'قيد الانتظار',
    'in-progress': 'قيد التنفيذ',
    'completed': 'مكتملة',
    'on-hold': 'موقوفة'
  };
  return labels[status] || status;
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    'low': 'منخفضة',
    'medium': 'متوسطة',
    'high': 'عالية',
    'critical': 'حرجة'
  };
  return labels[priority] || priority;
}

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface TimelineItem {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  progress_percentage: number;
  status: 'pending' | 'in-progress' | 'completed';
}

interface ProjectTimelineProps {
  projectId: string;
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const { data: timelineItems = [] } = useQuery({
    queryKey: ['timeline-items', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timeline_items')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []) as TimelineItem[];
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-gray-200',
      'in-progress': 'bg-blue-500',
      'completed': 'bg-green-500'
    };
    return colors[status] || 'bg-gray-200';
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-6">جدول الزمنية</h3>
      <div className="space-y-4">
        {timelineItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">لم يتم إضافة بنود للجدول الزمني</p>
        ) : (
          timelineItems.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(item.start_date).toLocaleDateString('ar-EG')} - {new Date(item.end_date).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                <span className="text-sm font-bold">{item.progress_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${getStatusColor(item.status)} transition-all duration-300`}
                  style={{ width: `${item.progress_percentage}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

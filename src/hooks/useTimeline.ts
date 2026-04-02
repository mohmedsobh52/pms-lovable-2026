import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface TimelineItem {
  id: string;
  project_id: string;
  title: string;
  start_date: string;
  end_date: string;
  progress_percentage: number;
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export function useProjectTimeline(projectId: string) {
  return useQuery({
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
    enabled: !!projectId,
  });
}

export async function createTimelineItem(item: Omit<TimelineItem, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('timeline_items')
    .insert([item])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TimelineItem;
}

export async function updateTimelineItem(id: string, updates: Partial<TimelineItem>) {
  const { data, error } = await supabase
    .from('timeline_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TimelineItem;
}

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useProjectTeamMembers } from '@/hooks/useTeamMembers';

interface TeamResourcesProps {
  projectId: string;
}

export function TeamResources({ projectId }: TeamResourcesProps) {
  const { data: teamMembers = [] } = useProjectTeamMembers(projectId);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleColor = (role: string | null) => {
    const colors: Record<string, string> = {
      'project-manager': 'bg-blue-100 text-blue-800',
      'developer': 'bg-purple-100 text-purple-800',
      'designer': 'bg-pink-100 text-pink-800',
      'qa': 'bg-green-100 text-green-800',
      'client': 'bg-amber-100 text-amber-800',
    };
    return colors[role || ''] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-6">فريق العمل</h3>
      <div className="space-y-4">
        {teamMembers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">لم يتم إضافة أعضاء فريق</p>
        ) : (
          teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{getInitials(member.user_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.user_name}</p>
                  {member.email && (
                    <p className="text-sm text-gray-600">{member.email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {member.role && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                    {member.role}
                  </span>
                )}
                <div className="text-right">
                  <p className="text-sm font-bold">{member.allocation_percentage}%</p>
                  <p className="text-xs text-gray-600">التخصيص</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

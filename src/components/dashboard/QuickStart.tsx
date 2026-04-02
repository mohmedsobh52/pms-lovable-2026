import { Card } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export function QuickStart() {
  const steps = [
    {
      title: 'إنشاء مشروع',
      description: 'أضف مشروعك الأول وحدد الميزانية والمدة الزمنية',
      icon: '📋'
    },
    {
      title: 'إضافة فريق',
      description: 'أضف أعضاء الفريق وحدد أدوارهم والنسبة المئوية لتخصيصهم',
      icon: '👥'
    },
    {
      title: 'تحديد المهام',
      description: 'قسم المشروع إلى مهام واضحة مع أولويات وتواريخ استحقاق',
      icon: '✓'
    },
    {
      title: 'تتبع الميزانية',
      description: 'راقب الإنفاق بالمقارنة مع الميزانية المخطط لها',
      icon: '💰'
    },
    {
      title: 'رصد التقدم',
      description: 'استخدم الرسوم البيانية والتقارير لمتابعة تقدم المشروع',
      icon: '📊'
    },
    {
      title: 'إدارة المخاطر',
      description: 'حدد وقيّم المخاطر المحتملة واتخذ إجراءات وقائية',
      icon: '⚠️'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {steps.map((step, idx) => (
        <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{step.icon}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

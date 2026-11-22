import React from 'react';
import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'cyan' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'cyan',
  trend,
  onClick,
}) => {
  const colorMap = {
    cyan: {
      bg: 'bg-gradient-to-br from-white to-cyan-50/40 border-cyan-100/80',
      iconBg: 'bg-cyan-500/10 text-cyan-600',
      glow: 'hover:border-cyan-300 hover:shadow-glow-cyan',
    },
    blue: {
      bg: 'bg-gradient-to-br from-white to-blue-50/40 border-blue-100/80',
      iconBg: 'bg-blue-500/10 text-blue-600',
      glow: 'hover:border-blue-300 hover:shadow-glow-blue',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-white to-emerald-50/40 border-emerald-100/80',
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      glow: 'hover:border-emerald-300',
    },
    amber: {
      bg: 'bg-gradient-to-br from-white to-amber-50/40 border-amber-100/80',
      iconBg: 'bg-amber-500/10 text-amber-600',
      glow: 'hover:border-amber-300',
    },
    rose: {
      bg: 'bg-gradient-to-br from-white to-rose-50/40 border-rose-100/80',
      iconBg: 'bg-rose-500/10 text-rose-600',
      glow: 'hover:border-rose-300',
    },
    slate: {
      bg: 'bg-white border-slate-200/80',
      iconBg: 'bg-slate-100 text-slate-600',
      glow: 'hover:border-slate-300',
    },
  };

  const currentTheme = colorMap[variant];

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative overflow-hidden rounded-2xl border p-5 shadow-soft transition-all duration-200',
        currentTheme.bg,
        currentTheme.glow,
        onClick && 'cursor-pointer hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
            {trend && (
              <span
                className={clsx(
                  'text-xs font-semibold',
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className={clsx('p-3 rounded-xl shrink-0', currentTheme.iconBg)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

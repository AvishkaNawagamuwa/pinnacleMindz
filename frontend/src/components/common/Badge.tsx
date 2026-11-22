import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'cyan'
    | 'purple'
    | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  dot = false,
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  const dotColors = {
    default: 'bg-slate-400',
    neutral: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-blue-500',
    cyan: 'bg-cyan-500',
    purple: 'bg-indigo-500',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border shadow-sm tracking-wide',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
};

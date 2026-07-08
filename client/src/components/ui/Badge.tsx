import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'negative';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'border-divider text-text-secondary',
    accent: 'border-accent text-accent',
    negative: 'border-negative text-negative',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium border rounded-[2px] ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

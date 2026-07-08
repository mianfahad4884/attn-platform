import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium tracking-wide uppercase rounded-[2px] transition-colors cursor-pointer';

  const variants: Record<string, string> = {
    primary: 'bg-accent text-white hover:bg-accent/90 disabled:bg-accent/50',
    secondary:
      'border border-divider text-text-primary bg-transparent hover:border-text-secondary disabled:text-text-secondary disabled:border-divider',
    danger:
      'text-negative bg-transparent border border-divider hover:border-negative disabled:text-negative/50',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2 text-sm',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? 'cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

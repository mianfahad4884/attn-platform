import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-panel border border-divider rounded-[2px] p-5 ${className}`}>
      {children}
    </div>
  );
}

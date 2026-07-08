import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs uppercase tracking-wider text-text-secondary font-medium"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`bg-bg border border-divider text-text-primary px-3 py-2 text-sm rounded-[2px] placeholder:text-text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent ${className}`}
        {...props}
      />
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = '', id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs uppercase tracking-wider text-text-secondary font-medium"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`bg-bg border border-divider text-text-primary px-3 py-2 text-sm rounded-[2px] placeholder:text-text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none ${className}`}
        {...props}
      />
    </div>
  );
}

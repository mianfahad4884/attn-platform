import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface ShellProps {
  title: string;
  children: React.ReactNode;
}

export function Shell({ title, children }: ShellProps) {
  return (
    <div className="flex min-h-screen bg-bg relative pt-6">
      <div className="absolute top-0 left-0 right-0 h-6 bg-accent text-bg font-mono text-xs uppercase flex items-center justify-center tracking-widest z-50">
        Demo Mode — Simulated Data
      </div>
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-[calc(100vh-1.5rem)] overflow-y-auto">
        <Header title={title} />
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}

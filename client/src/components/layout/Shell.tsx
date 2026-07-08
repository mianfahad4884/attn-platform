import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface ShellProps {
  title: string;
  children: React.ReactNode;
}

export function Shell({ title, children }: ShellProps) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <Header title={title} />
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}

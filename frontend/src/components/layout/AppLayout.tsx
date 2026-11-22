import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import clsx from 'clsx';

export const AppLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />

      {/* Main Content Area */}
      <div
        className={clsx(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          isCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        <TopNavbar />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

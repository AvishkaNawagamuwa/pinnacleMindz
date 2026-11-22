import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FolderGit2,
  FileCheck2,
  CheckSquare,
  AlertOctagon,
  CalendarDays,
  Award,
  CreditCard,
  FileSpreadsheet,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Scale,
  LogOut,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user?.role || 'ADMIN';
  const isAdmin = role === 'ADMIN' || (role as string) === 'SUPER_ADMIN';

  // Role-based Nav Items mapping
  const navItems = [
    {
      title: 'DASHBOARD',
      items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'STUDENTS & ACADEMICS',
      items: [
        ...(isAdmin
          ? [
              { label: 'All Students', path: '/students', icon: GraduationCap },
              { label: 'Mentor Assignments', path: '/mentor-assignments', icon: Scale },
            ]
          : []),
        ...(role === 'SUPERVISOR'
          ? [
              { label: 'All Students', path: '/students', icon: GraduationCap },
              { label: 'Mentor Workload', path: '/mentor-assignments', icon: Scale },
            ]
          : []),
        ...(role === 'MENTOR'
          ? [
              { label: 'My Students', path: '/my-students', icon: GraduationCap },
              { label: 'Student Directory', path: '/students', icon: Users },
            ]
          : []),
        ...(role === 'STUDENT'
          ? [{ label: 'My Project Workspace', path: '/students/me', icon: GraduationCap }]
          : []),
      ],
    },
    {
      title: 'PROJECT PROGRESS',
      items: [
        { label: 'Weekly Timeline', path: '/weekly-progress', icon: FolderGit2 },
        { label: 'Tasks & Milestones', path: '/tasks', icon: CheckSquare },
        { label: 'Corrections & Review', path: '/corrections', icon: AlertOctagon },
        { label: 'Document Submissions', path: '/documentation/submissions', icon: FileCheck2 },
        ...(isAdmin
          ? [{ label: 'Doc Requirements', path: '/documentation/requirements', icon: Layers }]
          : []),
      ],
    },
    {
      title: 'EVALUATION & SESSIONS',
      items: [
        { label: 'Meetings & Demos', path: '/meetings', icon: CalendarDays },
        { label: 'Academic Evaluations', path: '/evaluations', icon: Award },
      ],
    },
    ...(isAdmin || role === 'SUPERVISOR'
      ? [
          {
            title: 'INSTITUTE OPERATIONS',
            items: [
              ...(isAdmin
                ? [
                    { label: 'Student Payments', path: '/payments', icon: CreditCard },
                    { label: 'Staff Management', path: '/staff', icon: UserCheck },
                  ]
                : []),
              { label: 'Reports & Export', path: '/reports', icon: FileSpreadsheet },
            ],
          },
        ]
      : []),
    {
      title: 'SYSTEM',
      items: [
        { label: 'Notifications', path: '/notifications', icon: Bell },
        ...(isAdmin
          ? [
              { label: 'Security & Audit Logs', path: '/audit-logs', icon: ShieldCheck },
              { label: 'Institute Settings', path: '/settings', icon: Settings },
            ]
          : []),
      ],
    },
  ];

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0b1329] text-slate-300 transition-all duration-300 border-r border-slate-800/80 shadow-xl',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header with Logo */}
      <div className="flex h-18 items-center px-4 border-b border-slate-800/80 bg-[#070d1e]/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src="/logo.png"
            alt="Pinnacle Mindz Logo"
            className="w-10 h-10 object-contain rounded-full shrink-0 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
          />
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-extrabold text-white tracking-wider flex items-center gap-1.5">
                PINNACLE <span className="text-cyan-400">MINDZ</span>
              </span>
              <span className="text-[10px] text-cyan-200/60 font-mono tracking-tight truncate">
                Project Guidance System
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Role Pill */}
      {!isCollapsed && (
        <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'w-2 h-2 rounded-full animate-pulse',
                isAdmin
                  ? 'bg-rose-400'
                  : role === 'SUPERVISOR'
                  ? 'bg-cyan-400'
                  : role === 'MENTOR'
                  ? 'bg-emerald-400'
                  : 'bg-indigo-400'
              )}
            />
            <span className="text-[11px] font-mono uppercase text-slate-300 tracking-wider">
              {role} WORKSPACE
            </span>
          </div>
          <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{user?.fullName.split(' ')[0]}</span>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navItems.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <h4 className="px-3 text-[10px] font-mono font-semibold text-slate-400 tracking-wider uppercase">
                {section.title}
              </h4>
            )}
            {section.items.map((item, iIdx) => (
              <NavLink
                key={iIdx}
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-400 border-l-2 border-cyan-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  )
                }
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Authenticated User Status Card */}
      {!isCollapsed && user && (
        <div className="p-3 bg-slate-900/80 border border-slate-800/80 m-2 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-300 shrink-0">
              {user.fullName ? user.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{user.fullName || 'User'}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider truncate">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapse Toggle & Logout */}
      <div className="p-3 border-t border-slate-800/80 flex items-center justify-between bg-[#070d1e]/80">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center gap-2 p-2 rounded-lg text-rose-400 hover:bg-rose-950/30 transition-colors text-xs font-medium',
            isCollapsed && 'justify-center w-full'
          )}
          title="Logout"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  FolderGit2,
  FileCheck2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  AlertOctagon,
  CalendarDays,
  PlusCircle,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const role = user?.role || 'ADMIN';

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        let endpoint = '/dashboard/admin';
        if (role === 'SUPERVISOR') endpoint = '/dashboard/supervisor';
        else if (role === 'MENTOR') endpoint = '/dashboard/mentor';
        else if (role === 'STUDENT') endpoint = '/dashboard/student';

        const res = await api.get(endpoint);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [role]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // --- ADMIN DASHBOARD ---
  if (role === 'ADMIN') {
    const summary = data?.summaryCards || {};
    const charts = data?.charts || {};
    const COLORS = ['#06b6d4', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    return (
      <div className="space-y-8">
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Institute Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time monitoring of registered final-year projects, mentoring progress, documentation, and payments.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/students?register=true')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md cursor-pointer transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Register Student
            </button>
            <button
              onClick={() => navigate('/payments')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer transition-all"
            >
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Record Payment
            </button>
          </div>
        </div>

        {/* 10 Summary Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <StatCard
            title="Registered Students"
            value={summary.totalRegistered || 0}
            icon={Users}
            variant="cyan"
            onClick={() => navigate('/students')}
          />
          <StatCard
            title="Active Projects"
            value={summary.activeStudents || 0}
            icon={GraduationCap}
            variant="blue"
            onClick={() => navigate('/students')}
          />
          <StatCard
            title="Completed Projects"
            value={summary.completedProjects || 0}
            icon={FolderGit2}
            variant="emerald"
          />
          <StatCard
            title="Pending Documents"
            value={summary.pendingDocs || 0}
            icon={FileCheck2}
            variant="amber"
            onClick={() => navigate('/documentation')}
          />
          <StatCard
            title="Overdue Tasks"
            value={summary.overdueTasks || 0}
            icon={AlertTriangle}
            variant="rose"
            onClick={() => navigate('/tasks')}
          />
          <StatCard
            title="Upcoming Deadlines"
            value={summary.upcomingDeadlines || 0}
            subtitle="Next 7 days"
            icon={Clock}
            variant="slate"
            onClick={() => navigate('/reports')}
          />
          <StatCard
            title="Expected Revenue"
            value={`LKR ${(summary.totalExpectedFees || 0).toLocaleString()}`}
            icon={TrendingUp}
            variant="slate"
            onClick={() => navigate('/payments')}
          />
          <StatCard
            title="Total Collected"
            value={`LKR ${(summary.totalCollectedPayments || 0).toLocaleString()}`}
            icon={DollarSign}
            variant="emerald"
            onClick={() => navigate('/payments')}
          />
          <StatCard
            title="Outstanding Balance"
            value={`LKR ${(summary.outstandingBalances || 0).toLocaleString()}`}
            icon={AlertOctagon}
            variant="rose"
            onClick={() => navigate('/payments')}
          />
          <StatCard
            title="Needs Attention"
            value={summary.studentsRequiringAttentionCount || 0}
            subtitle="Updates missing"
            icon={AlertTriangle}
            variant="amber"
            onClick={() => navigate('/weekly-progress')}
          />
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Students by Mentor */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Mentor Workload Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.studentsByMentor || []}>
                  <XAxis dataKey="mentorName" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="studentCount" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project Stages Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Development Stage Distribution
            </h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.projectStages || []}
                    dataKey="count"
                    nameKey="stage"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {(charts.projectStages || []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Split Grid: Students Requiring Attention & Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Students Requiring Attention (Missing Weekly Updates) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Missing Progress Updates (Follow-Up Required)
              </h3>
              <Badge variant="warning">{data?.studentsRequiringAttention?.length || 0} Students</Badge>
            </div>

            <div className="space-y-3">
              {(data?.studentsRequiringAttention || []).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">All student progress updates are up to date.</div>
              ) : (
                data.studentsRequiringAttention.map((st: any) => (
                  <div
                    key={st.id}
                    onClick={() => navigate(`/students/${st.id}`)}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between hover:bg-amber-50 cursor-pointer transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{st.fullName}</div>
                      <div className="text-[11px] text-slate-500">{st.projectTitle}</div>
                      <div className="text-[10px] text-amber-800 font-mono mt-0.5">
                        Mentor: {st.assignedMentor} | {st.daysSinceLastUpdate} days since update
                      </div>
                    </div>
                    <Badge variant="warning">Update Missing</Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Demonstrations & Evaluations */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-cyan-600" />
                Upcoming Demos & Guidance Sessions
              </h3>
              <button
                onClick={() => navigate('/meetings')}
                className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
              >
                View Calendar →
              </button>
            </div>

            <div className="space-y-3">
              {(data?.upcomingDemos || []).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">No scheduled sessions.</div>
              ) : (
                data.upcomingDemos.map((demo: any) => (
                  <div key={demo.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{demo.student?.fullName}</div>
                      <div className="text-[11px] text-slate-500">{demo.discussionSummary}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Mentor: {demo.mentor?.fullName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-cyan-700">
                        {new Date(demo.meetingDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(demo.meetingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- SUPERVISOR DASHBOARD ---
  if (role === 'SUPERVISOR') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Academic Supervision Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor student submissions, identify stalled projects, review document drafts, and set correction directives.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Supervised Students"
            value={data?.totalSupervised || 0}
            icon={Users}
            variant="blue"
            onClick={() => navigate('/students')}
          />
          <StatCard
            title="Avg Project Completion"
            value={`${data?.overallCompletion || 0}%`}
            icon={TrendingUp}
            variant="cyan"
          />
          <StatCard
            title="Pending Document Reviews"
            value={data?.pendingReviewsCount || 0}
            subtitle="Awaiting your approval"
            icon={FileCheck2}
            variant="amber"
            onClick={() => navigate('/documentation')}
          />
          <StatCard
            title="Open Corrections"
            value={data?.openCorrectionsCount || 0}
            subtitle="Revisions in progress"
            icon={AlertOctagon}
            variant="rose"
            onClick={() => navigate('/corrections')}
          />
        </div>

        {/* Mentor Performance & Compliance Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
            Mentor Guidance & Weekly Reporting Compliance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Mentor Name</th>
                  <th className="py-2.5 px-3">Active Students</th>
                  <th className="py-2.5 px-3">Missing Weekly Reports</th>
                  <th className="py-2.5 px-3">Compliance Rate</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.mentorPerformance || []).map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{m.mentorName}</td>
                    <td className="py-3 px-3">{m.activeProjects}</td>
                    <td className="py-3 px-3">
                      {m.missingWeeklyUpdates > 0 ? (
                        <Badge variant="warning">{m.missingWeeklyUpdates} overdue</Badge>
                      ) : (
                        <Badge variant="success">All Updated</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-cyan-600">{m.complianceRate}%</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate('/mentor-assignments')}
                        className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
                      >
                        Inspect Workload →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- STUDENT DASHBOARD ---
  if (role === 'STUDENT') {
    const student = data;
    const project = student?.project;

    return (
      <div className="space-y-8">
        {/* Student Welcome Banner */}
        <div className="bg-gradient-to-r from-[#0b1329] via-[#0f1d3e] to-[#162a56] rounded-2xl p-6 sm:p-8 text-white border border-cyan-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono">
                  {student?.studentCode || 'STUDENT'}
                </span>
                <span className="text-xs text-slate-400 font-mono">Reg: {student?.registrationNumber}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-white">
                Welcome back, {student?.fullName || user?.fullName}
              </h1>
              <p className="text-xs text-cyan-200/80 mt-1 max-w-2xl">
                {student?.degreeProgramme} • {student?.university} • Batch {student?.batch}
              </p>
            </div>

            <button
              onClick={() => navigate(`/students/${student?.studentId || user?.studentId || user?.id}`)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-slate-900 bg-cyan-400 hover:bg-cyan-300 shadow-lg cursor-pointer transition-all shrink-0"
            >
              <FolderGit2 className="w-4 h-4" />
              Open Full Project Workspace (9 Tabs) →
            </button>
          </div>

          {project && (
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Project Title</span>
                <span className="text-white font-bold mt-0.5 block">{project.title}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Development Stage</span>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="cyan">{project.currentStage?.replace(/_/g, ' ') || 'PROPOSAL'}</Badge>
                  <span className="text-cyan-300 font-mono font-bold">{project.completionPercentage}% Complete</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Assigned Mentor & Supervisor</span>
                <span className="text-white mt-0.5 block">
                  Mentor: <strong>{student?.mentor?.fullName || 'Not assigned'}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Project Completion"
            value={`${project?.completionPercentage || 0}%`}
            icon={FolderGit2}
            variant="cyan"
            onClick={() => navigate(`/students/${student?.studentId || user?.studentId || user?.id}?tab=project`)}
          />
          <StatCard
            title="Documentation"
            value={`${student?.docsSummary?.approved || 0}/${student?.docsSummary?.total || 0} Approved`}
            icon={FileCheck2}
            variant="blue"
            onClick={() => navigate(`/students/${student?.studentId || user?.studentId || user?.id}?tab=documents`)}
          />
          <StatCard
            title="Pending Corrections"
            value={student?.pendingCorrections?.length || 0}
            icon={AlertOctagon}
            variant={student?.pendingCorrections?.length > 0 ? 'rose' : 'emerald'}
            onClick={() => navigate(`/students/${student?.studentId || user?.studentId || user?.id}?tab=evaluations`)}
          />
          <StatCard
            title="Fee Balance"
            value={`LKR ${(student?.paymentSummary?.balance || 0).toLocaleString()}`}
            icon={DollarSign}
            variant={student?.paymentSummary?.balance === 0 ? 'emerald' : 'cyan'}
            onClick={() => navigate(`/students/${student?.studentId || user?.studentId || user?.id}?tab=payments`)}
          />
        </div>

        {/* Two-Column Task & Mentoring Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Tasks & Directives */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Tasks */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-cyan-600" />
                  My Active Tasks & Milestones
                </h3>
                <button
                  onClick={() => navigate(`/students/${student?.studentId || user?.studentId || user?.id}?tab=progress`)}
                  className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                >
                  View Tasks Board <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {(student?.activeTasks || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No active tasks right now. Great job keeping up!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(student?.activeTasks || []).map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">{t.title}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <span>Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'}</span>
                          <span>•</span>
                          <span className="capitalize">{t.status.replace(/_/g, ' ').toLowerCase()}</span>
                        </div>
                      </div>
                      <Badge variant={t.priority === 'URGENT' || t.priority === 'HIGH' ? 'danger' : 'cyan'}>
                        {t.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Open Corrections */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  Supervisor Correction Directives
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {student?.pendingCorrections?.length || 0} Action Required
                </span>
              </div>

              {(student?.pendingCorrections || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-emerald-600 bg-emerald-50/50 rounded-xl flex items-center justify-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  No open corrections! All academic submissions are in good standing.
                </div>
              ) : (
                <div className="space-y-3">
                  {(student?.pendingCorrections || []).map((c: any) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border border-rose-200/80 bg-rose-50/40 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="danger">{c.severity || 'HIGH'} PRIORITY</Badge>
                        <span className="text-[11px] font-mono text-rose-700">
                          Due: {c.deadline ? new Date(c.deadline).toLocaleDateString() : 'Immediate'}
                        </span>
                      </div>
                      <div>
                        <strong className="text-slate-900 block">Issue:</strong>
                        <p className="text-slate-700 mt-0.5">{c.issueDescription}</p>
                      </div>
                      <div>
                        <strong className="text-slate-900 block">Required Action:</strong>
                        <p className="text-slate-700 mt-0.5">{c.correctionInstruction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Staff, Meetings, & Financials */}
          <div className="space-y-6">
            {/* Staff Contacts */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Project Mentoring Team
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-cyan-700 block tracking-wider">
                    Primary Demo / Mentor
                  </span>
                  <span className="font-bold text-slate-900 block">{student?.mentor?.fullName || 'Pending Assignment'}</span>
                  {student?.mentor?.email && (
                    <span className="text-slate-500 text-[11px] block">{student.mentor.email}</span>
                  )}
                  {student?.mentor?.phone && (
                    <span className="text-slate-500 text-[11px] font-mono block">{student.mentor.phone}</span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block tracking-wider">
                    Academic Supervisor
                  </span>
                  <span className="font-bold text-slate-900 block">{student?.supervisor?.fullName || 'Pending Assignment'}</span>
                  {student?.supervisor?.email && (
                    <span className="text-slate-500 text-[11px] block">{student.supervisor.email}</span>
                  )}
                  {student?.supervisor?.phone && (
                    <span className="text-slate-500 text-[11px] font-mono block">{student.supervisor.phone}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Upcoming Meetings */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-cyan-600" />
                Upcoming Demo / Review Sessions
              </h3>

              {(student?.upcomingMeetings || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No upcoming meetings scheduled.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(student?.upcomingMeetings || []).map((m: any) => (
                    <div key={m.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                      <div className="font-bold text-slate-900">{m.meetingType?.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-cyan-700 font-mono mt-0.5">
                        {new Date(m.meetingDate).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Overview */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Course Fee Summary
                </h3>
                <Badge variant={student?.paymentSummary?.status === 'PAID' ? 'success' : 'warning'}>
                  {student?.paymentSummary?.status}
                </Badge>
              </div>

              <div className="space-y-2 text-xs pt-1">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Agreed Course Fee</span>
                  <span className="font-mono font-bold text-slate-900">
                    LKR {(student?.paymentSummary?.totalPayable || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-emerald-700">Total Paid</span>
                  <span className="font-mono font-bold text-emerald-700">
                    LKR {(student?.paymentSummary?.totalPaid || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 pt-1.5">
                  <span className="text-slate-700 font-bold">Outstanding Balance</span>
                  <span className="font-mono font-bold text-rose-700">
                    LKR {(student?.paymentSummary?.balance || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MENTOR DASHBOARD ---
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mentor Project Workspace</h1>
        <p className="text-xs text-slate-500 mt-1">
          Track assigned student milestones, log daily progress, update tasks, and respond to supervisor corrections.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="My Assigned Students"
          value={data?.totalAssignedStudents || 0}
          icon={Users}
          variant="cyan"
          onClick={() => navigate('/my-students')}
        />
        <StatCard
          title="Tasks Due This Week"
          value={data?.tasksDueThisWeek || 0}
          icon={Clock}
          variant="blue"
          onClick={() => navigate('/tasks')}
        />
        <StatCard
          title="Pending Documentation"
          value={data?.pendingDocsCount || 0}
          icon={FileCheck2}
          variant="amber"
          onClick={() => navigate('/documentation')}
        />
        <StatCard
          title="Corrections Requiring Action"
          value={data?.feedbackNeedingAction?.length || 0}
          icon={AlertOctagon}
          variant="rose"
          onClick={() => navigate('/corrections')}
        />
      </div>

      {/* "My Students" Immediate Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            My Assigned Students
          </h3>
          <button
            onClick={() => navigate('/my-students')}
            className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
          >
            View Full List <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Reg No</th>
                <th className="py-2.5 px-3">Project Title</th>
                <th className="py-2.5 px-3">Stage</th>
                <th className="py-2.5 px-3">Progress</th>
                <th className="py-2.5 px-3">Open Corrections</th>
                <th className="py-2.5 px-3 text-right">Workspace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.assignedStudents || []).map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-bold text-slate-900">{s.fullName}</td>
                  <td className="py-3 px-3 font-mono text-slate-500">{s.registrationNumber}</td>
                  <td className="py-3 px-3 text-slate-700 max-w-xs truncate">{s.projectTitle}</td>
                  <td className="py-3 px-3">
                    <Badge variant="cyan">{s.currentStage?.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="py-3 px-3 font-bold text-cyan-600">{s.completionPercentage}%</td>
                  <td className="py-3 px-3">
                    {s.openCorrections > 0 ? (
                      <Badge variant="danger">{s.openCorrections} Action Required</Badge>
                    ) : (
                      <Badge variant="success">Clear</Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => navigate(`/students/${s.id}`)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shadow-xs"
                    >
                      Open →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

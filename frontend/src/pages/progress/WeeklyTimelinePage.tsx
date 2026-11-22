import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { ChevronDown, ChevronRight, AlertTriangle, Calendar, CheckCircle2, Clock } from 'lucide-react';

export const WeeklyTimelinePage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});
  const [missingData, setMissingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const [stRes, missRes] = await Promise.all([
          api.get('/students'),
          api.get('/progress/missing-updates'),
        ]);
        const stList = stRes.data.students || [];
        setStudents(stList);
        setMissingData(missRes.data);
        if (stList.length > 0) {
          setSelectedStudentId(stList[0].id);
        }
      } catch (err) {
        console.error('Failed to load students:', err);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;

    const fetchTimeline = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/progress/timeline/${selectedStudentId}`);
        const list = res.data.timeline || [];
        setTimelineData(list);
        // Expand the most recent week by default
        if (list.length > 0) {
          setExpandedWeeks({ [list[0].id]: true });
        }
      } catch (err) {
        console.error('Failed to load timeline:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeline();
  }, [selectedStudentId]);

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks((prev) => ({ ...prev, [weekId]: !prev[weekId] }));
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Project Progress Timeline</h1>
          <p className="text-xs text-slate-500 mt-1">
            Chronological audit of sprint weeks, completed deliverables, supervisor directives, and daily progress entries.
          </p>
        </div>

        {/* Student Selector */}
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800 shadow-xs focus:border-cyan-500 focus:outline-hidden"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName} ({s.studentId})
            </option>
          ))}
        </select>
      </div>

      {/* "Update Missing" Notice Banner if students have missing reports */}
      {missingData?.totalMissing > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-amber-900 block">
                {missingData.totalMissing} student(s) have missing weekly updates:
              </span>
              <span className="text-amber-800">
                {missingData.students.map((m: any) => `${m.fullName} (${m.daysSinceLastUpdate}d)`).join(', ')}
              </span>
            </div>
          </div>
          <Badge variant="warning">Reporting Alert</Badge>
        </div>
      )}

      {/* Selected Student Meta Card */}
      {selectedStudent && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{selectedStudent.fullName}</h3>
              <Badge variant="cyan">{selectedStudent.project?.currentStage || 'PROPOSAL'}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{selectedStudent.project?.title}</p>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="text-slate-400 block text-[10px]">Overall Progress</span>
            <span className="text-lg font-bold text-cyan-600">
              {selectedStudent.project?.completionPercentage || 0}%
            </span>
          </div>
        </div>
      )}

      {/* Chronological Timeline Cards */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading timeline...</div>
        ) : timelineData.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            No weekly reports recorded yet for this project.
          </div>
        ) : (
          timelineData.map((week) => {
            const isExpanded = expandedWeeks[week.id];
            const dailyEntries = week.dailyEntries || [];

            return (
              <div
                key={week.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden transition-all"
              >
                {/* Week Header */}
                <div
                  onClick={() => toggleWeek(week.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          Week {week.weekNumber} ({new Date(week.weekStartDate).toLocaleDateString()} –{' '}
                          {new Date(week.weekEndDate).toLocaleDateString()})
                        </span>
                        <Badge
                          variant={
                            week.status === 'ON_TRACK'
                              ? 'success'
                              : week.status === 'NEEDS_ATTENTION'
                              ? 'warning'
                              : week.status === 'BLOCKED'
                              ? 'danger'
                              : 'cyan'
                          }
                        >
                          {week.status}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Mentor: {week.mentor?.fullName} • {dailyEntries.length} daily logs
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-500 font-mono">
                    {new Date(week.updatedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-bold text-slate-800 block mb-1">Planned Activities:</span>
                        <p className="text-slate-600 whitespace-pre-line leading-relaxed">{week.plannedActivities}</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100">
                        <span className="font-bold text-emerald-900 block mb-1">Completed Deliverables:</span>
                        <p className="text-emerald-800 whitespace-pre-line leading-relaxed">{week.completedActivities}</p>
                      </div>
                    </div>

                    {week.problemsBlockers && (
                      <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100">
                        <span className="font-bold text-rose-900 block mb-1">Encountered Blockers:</span>
                        <p className="text-rose-800 leading-relaxed">{week.problemsBlockers}</p>
                      </div>
                    )}

                    {week.supervisorFeedback && (
                      <div className="p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-100">
                        <span className="font-bold text-cyan-900 block mb-1">Academic Supervisor Guidance:</span>
                        <p className="text-cyan-800 leading-relaxed">{week.supervisorFeedback}</p>
                      </div>
                    )}

                    {/* Daily Progress Entries inside this week */}
                    {dailyEntries.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                          Daily Activity Logs During This Week ({dailyEntries.length}):
                        </span>
                        <div className="space-y-2">
                          {dailyEntries.map((d: any) => (
                            <div key={d.id} className="p-3 rounded-xl border border-slate-200/60 bg-white flex flex-col gap-1">
                              <div className="flex items-center justify-between font-bold text-slate-900">
                                <span>{d.moduleTask}</span>
                                <span className="font-mono text-cyan-700">
                                  {new Date(d.date).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px]">
                                <strong>Done:</strong> {d.workCompleted}
                              </p>
                              {d.mistakesIdentified && (
                                <p className="text-amber-800 text-[11px]">
                                  <strong>Mistake/Feedback:</strong> {d.mistakesIdentified}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

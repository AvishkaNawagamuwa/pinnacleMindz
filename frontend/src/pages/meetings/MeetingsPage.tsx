import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Meeting } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { CalendarDays, PlusCircle, Clock, CheckCircle2, Video } from 'lucide-react';

export const MeetingsPage: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New meeting modal
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingType, setMeetingType] = useState('DEVELOPMENT_DEMO');
  const [summary, setSummary] = useState('');
  const [demoFeatures, setDemoFeatures] = useState('');

  const { success, error } = useToast();

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/meetings');
      setMeetings(res.data.meetings || []);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    const fetchStudents = async () => {
      try {
        const res = await api.get('/students');
        setStudentsList(res.data.students || []);
      } catch {}
    };
    fetchStudents();
  }, []);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !meetingDate || !summary) {
      error('Please fill in student, date, and discussion summary');
      return;
    }

    try {
      await api.post('/meetings', {
        studentId,
        meetingDate,
        meetingType,
        discussionSummary: summary,
        demonstratedFeatures: demoFeatures,
      });
      success('Meeting scheduled successfully');
      setIsScheduleOpen(false);
      setStudentId('');
      setMeetingDate('');
      setSummary('');
      setDemoFeatures('');
      fetchMeetings();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to schedule meeting');
    }
  };

  const handleMarkCompleted = async (meetingId: string) => {
    try {
      await api.put(`/meetings/${meetingId}`, { status: 'COMPLETED' });
      success('Session marked completed');
      fetchMeetings();
    } catch (err) {
      error('Failed to update session');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Meetings & Demonstrations Calendar</h1>
          <p className="text-xs text-slate-500 mt-1">
            Schedule and track code reviews, development demos, supervisor syncs, and viva rehearsals.
          </p>
        </div>

        <button
          onClick={() => setIsScheduleOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md cursor-pointer transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Schedule Session
        </button>
      </div>

      {/* Meetings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading sessions...</div>
        ) : meetings.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            No meetings scheduled yet.
          </div>
        ) : (
          meetings.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <Badge variant={m.meetingType.includes('DEMO') ? 'cyan' : 'purple'}>
                    {m.meetingType.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant={m.status === 'COMPLETED' ? 'success' : 'warning'}>{m.status}</Badge>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{m.student?.fullName}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{m.discussionSummary}</p>

                {m.demonstratedFeatures && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600">
                    <strong className="text-slate-800 block mb-0.5">Demonstrated:</strong>
                    {m.demonstratedFeatures}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-cyan-700 font-mono font-bold">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {new Date(m.meetingDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>

                {m.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleMarkCompleted(m.id)}
                    className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] cursor-pointer"
                  >
                    Done ✓
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Modal */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Guidance or Demo Session"
        subtitle="Set meeting date, objectives, and participants"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Student</label>
            <select
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="">-- Select Student --</option>
              {studentsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentId})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Meeting Type</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="PROJECT_DISCUSSION">Project Discussion</option>
                <option value="DEVELOPMENT_DEMO">Development Demo</option>
                <option value="CODE_REVIEW">Code Review</option>
                <option value="WEEKLY_REVIEW">Weekly Review</option>
                <option value="DOCUMENTATION_REVIEW">Documentation Review</option>
                <option value="VIVA_PREPARATION">Viva Preparation</option>
                <option value="SUPERVISOR_MEETING">Supervisor Meeting</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Discussion Agenda / Summary</label>
            <textarea
              rows={2}
              required
              placeholder="Key topics to discuss..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Demonstrated Features (Optional)</label>
            <textarea
              rows={2}
              placeholder="Features to be showcased live..."
              value={demoFeatures}
              onChange={(e) => setDemoFeatures(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsScheduleOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500"
            >
              Schedule Session
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { Scale, Users, CheckCircle2, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MentorAssignmentsPage: React.FC = () => {
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [newMentorId, setNewMentorId] = useState('');
  const [reason, setReason] = useState('');

  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchWorkloads = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/users/mentors-workload');
      setWorkloads(res.data.workload || []);
    } catch (err) {
      console.error('Failed to load mentor workloads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkloads();
  }, []);

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newMentorId) return;

    try {
      await api.post(`/students/${selectedStudent.id}/assign-mentor`, {
        newMentorId,
        reason: reason || 'Administrative workload rebalancing',
      });
      success(`Successfully reassigned ${selectedStudent.fullName}`);
      setIsReassignOpen(false);
      setSelectedStudent(null);
      setNewMentorId('');
      setReason('');
      fetchWorkloads();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to reassign mentor');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mentor Workload Balancing</h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor assigned student loads across demo staff, detect bottlenecks, and reallocate projects seamlessly.
        </p>
      </div>

      {/* Mentor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workloads.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{m.fullName}</h3>
                <span className="text-[10px] text-slate-400 font-mono">{m.email}</span>
              </div>
              <Badge variant={m.pendingUpdates > 0 ? 'warning' : 'cyan'}>
                {m.assignedStudentsCount} Students
              </Badge>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">ACTIVE</span>
                <span className="font-bold text-slate-800">{m.activeProjects}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">COMPLETED</span>
                <span className="font-bold text-emerald-600">{m.completedProjects}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">PENDING UPDATES</span>
                <span className={`font-bold ${m.pendingUpdates > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {m.pendingUpdates}
                </span>
              </div>
            </div>

            {/* Assigned Students Sub-List */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Allocated Students:
              </span>
              {(m.students || []).length === 0 ? (
                <div className="text-[11px] text-slate-400 italic py-2">No students currently assigned.</div>
              ) : (
                m.students.map((st: any) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs transition-colors"
                  >
                    <div className="truncate mr-2">
                      <div className="font-bold text-slate-800 truncate">{st.fullName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{st.project?.title}</div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudent(st);
                        setIsReassignOpen(true);
                      }}
                      className="px-2 py-1 rounded text-[10px] font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 shrink-0 cursor-pointer"
                    >
                      Reassign
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reassign Modal */}
      <Modal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        title="Reassign Project Mentor"
        subtitle={`Select a target staff mentor for ${selectedStudent?.fullName}`}
      >
        <form onSubmit={handleReassign} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Target Mentor</label>
            <select
              required
              value={newMentorId}
              onChange={(e) => setNewMentorId(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="">-- Choose Target Mentor --</option>
              {workloads.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.fullName} ({w.assignedStudentsCount} students currently)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Reason for Reassignment</label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Workload balancing, specialized framework expertise..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsReassignOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500"
            >
              Reassign Student
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

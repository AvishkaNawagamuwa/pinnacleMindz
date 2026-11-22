import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Correction, CorrectionStatus } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { AlertOctagon, CheckCircle2, Clock, Filter, PlusCircle, Check } from 'lucide-react';

export const CorrectionsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Status update modal / inline action
  const [selectedCorrection, setSelectedCorrection] = useState<Correction | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  const role = user?.role || 'ADMIN';

  const fetchCorrections = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/reviews/corrections', {
        params: { status: statusFilter || undefined },
      });
      setCorrections(res.data.corrections || []);
    } catch (err) {
      console.error('Failed to load corrections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrections();
  }, [statusFilter]);

  const handleUpdateStatus = async (correctionId: string, newStatus: CorrectionStatus, note?: string) => {
    try {
      await api.put(`/reviews/corrections/${correctionId}`, {
        status: newStatus,
        resolutionNote: note,
      });
      success(`Correction status updated to ${newStatus}`);
      setIsResolveModalOpen(false);
      setSelectedCorrection(null);
      setResolutionNote('');
      fetchCorrections();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update correction');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Supervisor Corrections & Directives</h1>
        <p className="text-xs text-slate-500 mt-1">
          Mandatory defects, academic review comments, and verified resolution audit trail.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
          >
            <option value="">All Corrections</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved (Pending Verification)</option>
            <option value="VERIFIED">Verified & Closed</option>
          </select>
        </div>

        <Badge variant="cyan">{corrections.length} Total Corrections</Badge>
      </div>

      {/* Corrections List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student & Project</th>
                <th className="py-3 px-4">Issue Description</th>
                <th className="py-3 px-4">Correction Instruction</th>
                <th className="py-3 px-4">Supervisor / Mentor</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading corrections...
                  </td>
                </tr>
              ) : corrections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No corrections matching criteria.
                  </td>
                </tr>
              ) : (
                corrections.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{c.student?.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{c.student?.studentId}</div>
                    </td>

                    <td className="py-3.5 px-4 text-rose-800 font-semibold max-w-xs leading-relaxed">
                      {c.issueDescription}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs leading-relaxed">
                      <div>{c.correctionInstruction}</div>
                      {c.resolutionNote && (
                        <div className="text-[10px] text-emerald-700 bg-emerald-50 p-1.5 rounded mt-1">
                          <strong>Resolution:</strong> {c.resolutionNote}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      <div>Sup: <strong className="text-slate-800">{c.supervisor?.fullName}</strong></div>
                      <div>Men: <strong className="text-slate-800">{c.assignedMentor?.fullName}</strong></div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {c.deadline ? new Date(c.deadline).toLocaleDateString() : 'Immediate'}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          c.status === 'VERIFIED'
                            ? 'success'
                            : c.status === 'RESOLVED'
                            ? 'info'
                            : c.status === 'IN_PROGRESS'
                            ? 'cyan'
                            : 'danger'
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {c.status !== 'RESOLVED' && c.status !== 'VERIFIED' && (
                        <button
                          onClick={() => {
                            setSelectedCorrection(c);
                            setIsResolveModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 text-white hover:bg-slate-700 font-bold"
                        >
                          Mark Resolved
                        </button>
                      )}

                      {(role === 'SUPERVISOR' || role === 'ADMIN') && c.status === 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus(c.id, 'VERIFIED')}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 font-bold"
                        >
                          Verify & Close ✓
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Resolved Modal */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Submit Correction Resolution Note"
        subtitle={`Explain changes made for: "${selectedCorrection?.issueDescription}"`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Resolution Explanation</label>
            <textarea
              rows={3}
              required
              placeholder="Detail the code fixes or report updates completed..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              onClick={() => setIsResolveModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedCorrection) {
                  handleUpdateStatus(selectedCorrection.id, 'RESOLVED', resolutionNote);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500"
            >
              Submit for Verification
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

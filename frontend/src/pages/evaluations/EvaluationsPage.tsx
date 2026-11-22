import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Evaluation } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Award, CheckCircle2, Clock } from 'lucide-react';

export const EvaluationsPage: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/evaluations');
        setEvaluations(res.data.evaluations || []);
      } catch (err) {
        console.error('Failed to load evaluations:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvaluations();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Academic Evaluations & Milestones</h1>
        <p className="text-xs text-slate-500 mt-1">
          Formal university milestones: Idea Approval, Scope Freeze, Interim Evaluation, Viva Rehearsals.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Milestone Title</th>
              <th className="py-3 px-4">Academic Stage</th>
              <th className="py-3 px-4">Scheduled Date</th>
              <th className="py-3 px-4">Marks / Rating</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Feedback Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Loading evaluations...
                </td>
              </tr>
            ) : evaluations.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No evaluations recorded yet.
                </td>
              </tr>
            ) : (
              evaluations.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div>{ev.student?.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{ev.student?.studentId}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{ev.evaluationTitle}</td>
                  <td className="py-3.5 px-4 font-mono text-cyan-700">{ev.stage.replace(/_/g, ' ')}</td>
                  <td className="py-3.5 px-4 font-mono">{new Date(ev.scheduledDate).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                    {ev.marksRating ? `${ev.marksRating}%` : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={ev.status === 'COMPLETED' ? 'success' : 'warning'}>{ev.status}</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                    {ev.feedback || 'Pending evaluation'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

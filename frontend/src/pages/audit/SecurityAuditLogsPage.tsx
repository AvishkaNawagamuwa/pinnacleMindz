import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { ActivityLog } from '../../types';
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  Terminal,
  RefreshCw,
} from 'lucide-react';

export const SecurityAuditLogsPage: React.FC = () => {
  const { error } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/activity', {
        params: {
          search: search || undefined,
          action: actionFilter || undefined,
          page,
          limit: 30,
        },
      });
      setLogs(res.data.logs || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalLogs(res.data.pagination?.total || 0);
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search, actionFilter]);

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN')) return <Badge variant="cyan">LOGIN</Badge>;
    if (action.includes('REGISTER')) return <Badge variant="success">REGISTER</Badge>;
    if (action.includes('DEACTIVATE')) return <Badge variant="danger">DEACTIVATE</Badge>;
    if (action.includes('REVIEW')) return <Badge variant="info">REVIEW</Badge>;
    if (action.includes('SUBMIT')) return <Badge variant="cyan">SUBMISSION</Badge>;
    if (action.includes('REASSIGN')) return <Badge variant="warning">REASSIGN</Badge>;
    return <Badge variant="default">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Security & Activity Audit Logs</h1>
            <Badge variant="cyan" className="font-mono text-[10px]">
              SUPER ADMIN / AUDIT
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable system audit trail tracking authentication, student lifecycle changes, and document evaluations.
          </p>
        </div>

        <button
          onClick={() => fetchLogs()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw className={isLoading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by actor name, action, or entity type..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:outline-hidden"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
        >
          <option value="">All Actions</option>
          <option value="LOGIN">LOGIN</option>
          <option value="REGISTER_STUDENT">REGISTER_STUDENT</option>
          <option value="DEACTIVATE_STUDENT">DEACTIVATE_STUDENT</option>
          <option value="ACTIVATE_STUDENT">ACTIVATE_STUDENT</option>
          <option value="UPDATE_STUDENT_PROFILE">UPDATE_STUDENT_PROFILE</option>
          <option value="REASSIGN_MENTOR">REASSIGN_MENTOR</option>
          <option value="SUBMIT_DOCUMENT_URL">SUBMIT_DOCUMENT_URL</option>
          <option value="REVIEW_DOCUMENT_SUBMISSION">REVIEW_DOCUMENT_SUBMISSION</option>
          <option value="CREATE_DOCUMENT_REQUIREMENT">CREATE_DOCUMENT_REQUIREMENT</option>
        </select>

        <span className="text-xs text-slate-500 font-mono">
          Showing {logs.length} of {totalLogs} events
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No activity logs recorded matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{log.actorName}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {log.entityType}
                      {log.entityId && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
                          {log.entityId}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-600 max-w-sm truncate">
                      {log.details ? (
                        <code className="bg-slate-100 px-2 py-1 rounded-md text-slate-700 block truncate">
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </code>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <span className="text-xs font-mono text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

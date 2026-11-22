import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { FileCheck2, Download, Search, Check, AlertOctagon } from 'lucide-react';

export const DocumentationPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Review modal
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState('APPROVED');
  const [reviewComments, setReviewComments] = useState('');
  const [corrections, setCorrections] = useState('');

  const role = user?.role || 'ADMIN';

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/documents', {
        params: {
          search,
          status: statusFilter || undefined,
        },
      });
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search, statusFilter]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    try {
      await api.post(`/documents/${selectedDoc.id}/review`, {
        status: reviewDecision,
        comments: reviewComments,
        requiredCorrections: corrections,
      });
      success(`Document review recorded as ${reviewDecision}`);
      setIsReviewOpen(false);
      setSelectedDoc(null);
      setReviewComments('');
      setCorrections('');
      fetchDocuments();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to review document');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Project Documentation Hub</h1>
        <p className="text-xs text-slate-500 mt-1">
          Central repository of academic submissions, version histories, and supervisor approvals.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search document name or student..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:outline-hidden"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
        >
          <option value="">All Statuses</option>
          <option value="READY_FOR_REVIEW">Ready for Review</option>
          <option value="REVISION_REQUIRED">Revision Required</option>
          <option value="APPROVED">Approved</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="NOT_STARTED">Not Started</option>
        </select>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">File Download</th>
                <th className="py-3 px-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading documentation registry...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No documents matching criteria.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const latestVer = doc.versions?.[0];
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{doc.student?.fullName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{doc.student?.studentId}</div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {doc.documentName}
                      </td>

                      <td className="py-3.5 px-4 font-mono">v{doc.currentVersion}</td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            doc.status === 'APPROVED'
                              ? 'success'
                              : doc.status === 'REVISION_REQUIRED'
                              ? 'danger'
                              : doc.status === 'READY_FOR_REVIEW'
                              ? 'info'
                              : 'default'
                          }
                        >
                          {doc.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        {latestVer ? (
                          <a
                            href={latestVer.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-cyan-600 hover:underline font-mono text-[11px]"
                          >
                            <Download className="w-3 h-3" /> {latestVer.fileName}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No file attached</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {(role === 'SUPERVISOR' || role === 'ADMIN') && (
                          <button
                            onClick={() => {
                              setSelectedDoc(doc);
                              setIsReviewOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 cursor-pointer shadow-xs transition-colors"
                          >
                            Review & Decide
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title="Supervisor Document Review"
        subtitle={`Evaluating submission: ${selectedDoc?.documentName} for ${selectedDoc?.student?.fullName}`}
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Decision</label>
            <select
              value={reviewDecision}
              onChange={(e) => setReviewDecision(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="APPROVED">Approve Document</option>
              <option value="REVISION_REQUIRED">Request Revision & Improvements</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Reviewer Feedback Comments</label>
            <textarea
              rows={3}
              required
              placeholder="Detailed remarks on research validity, formatting, or technical completeness..."
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200"
            />
          </div>

          {reviewDecision === 'REVISION_REQUIRED' && (
            <div>
              <label className="block text-rose-700 font-medium mb-1">Specific Required Corrections</label>
              <textarea
                rows={2}
                placeholder="List exact defects to be rectified..."
                value={corrections}
                onChange={(e) => setCorrections(e.target.value)}
                className="w-full p-2 rounded-lg border border-rose-200 bg-rose-50/30"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsReviewOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500"
            >
              Submit Review
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

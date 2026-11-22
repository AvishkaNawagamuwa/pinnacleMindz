import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { StudentDocument, DocumentStatus } from '../../types';
import {
  FileCheck2,
  Search,
  ExternalLink,
  Plus,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Eye,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';

export const DocumentSubmissionsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Submit URL Modal (Student or Staff on behalf)
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    documentId: '',
    submissionTitle: '',
    submissionUrl: '',
    submissionNote: '',
  });

  // Review Modal (Mentor / Supervisor)
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewingDoc, setReviewingDoc] = useState<StudentDocument | null>(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'APPROVED' as DocumentStatus,
    reviewerFeedback: '',
    correctionDeadline: '',
  });

  const role = user?.role || 'ADMIN';
  const isStudent = role === 'STUDENT';
  const canReview = role === 'ADMIN' || (role as string) === 'SUPER_ADMIN' || role === 'SUPERVISOR' || role === 'MENTOR';

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/documents', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      setDocuments(res.data.documents || []);
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to load document submissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search, statusFilter]);

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitForm.documentId || !submitForm.submissionUrl) {
      error('Please select a document and provide a valid submission URL.');
      return;
    }

    try {
      await api.post(`/documents/${submitForm.documentId}/submit-url`, {
        submissionTitle: submitForm.submissionTitle,
        submissionUrl: submitForm.submissionUrl,
        submissionNote: submitForm.submissionNote,
      });
      success('Document submission link recorded successfully.');
      setIsSubmitOpen(false);
      setSubmitForm({
        documentId: '',
        submissionTitle: '',
        submissionUrl: '',
        submissionNote: '',
      });
      fetchDocuments();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to submit document URL');
    }
  };

  const handleOpenReview = (doc: StudentDocument) => {
    setReviewingDoc(doc);
    setReviewForm({
      status: 'APPROVED',
      reviewerFeedback: doc.reviewerFeedback || '',
      correctionDeadline: '',
    });
    setIsReviewOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingDoc) return;

    try {
      await api.post(`/documents/${reviewingDoc.id}/review-submission`, reviewForm);
      success(`Document submission review recorded as ${reviewForm.status}.`);
      setIsReviewOpen(false);
      setReviewingDoc(null);
      fetchDocuments();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to record review');
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">APPROVED</Badge>;
      case 'CORRECTION_REQUIRED':
      case 'REVISION_REQUIRED':
        return <Badge variant="danger">CORRECTION REQUIRED</Badge>;
      case 'SUBMITTED':
      case 'RESUBMITTED':
        return <Badge variant="cyan">{status}</Badge>;
      case 'UNDER_REVIEW':
      case 'READY_FOR_REVIEW':
        return <Badge variant="info">UNDER REVIEW</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">REJECTED</Badge>;
      default:
        return <Badge variant="default">NOT STARTED</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Academic Document Submissions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track student external deliverable links (Google Drive, GitHub), revision cycles, and supervisor evaluations.
          </p>
        </div>

        {isStudent && (
          <button
            onClick={() => setIsSubmitOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Document Link</span>
          </button>
        )}
      </div>

      {/* Security and Sharing Disclaimer Callout */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-4 rounded-2xl border border-cyan-500/30 text-white shadow-soft flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-cyan-300 block">External Storage & Academic Submission Policy</span>
          <p className="text-slate-300 mt-0.5 leading-relaxed">
            All reports, proposals, and dissertations must be shared via accessible external URLs (such as Google Drive or GitHub).
            Ensure link sharing permissions are explicitly set to <span className="text-cyan-200 font-semibold">&quot;Anyone with the link can view/comment&quot;</span> so institute mentors and examiners can evaluate your work without access barriers.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, registration number, or document title..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:outline-hidden"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
        >
          <option value="">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="RESUBMITTED">Resubmitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="CORRECTION_REQUIRED">Correction Required</option>
          <option value="APPROVED">Approved</option>
          <option value="NOT_STARTED">Not Started</option>
        </select>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">External Deliverable Link</th>
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reviewer Feedback</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading submissions...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No document submissions found.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const hasLink = Boolean(doc.submissionUrl);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{doc.student?.fullName || 'N/A'}</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {doc.student?.registrationNumber} ({doc.student?.batch || '2026'})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{doc.documentName}</span>
                        {doc.submissionTitle && doc.submissionTitle !== doc.documentName && (
                          <span className="text-[11px] text-slate-500 italic block mt-0.5">{doc.submissionTitle}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-600">v{doc.currentVersion}</td>
                      <td className="py-3 px-4 max-w-xs">
                        {hasLink ? (
                          <a
                            href={doc.submissionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 font-medium text-[11px] border border-cyan-200/60 max-w-[220px] truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{doc.submissionUrl}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No link submitted</span>
                        )}
                        {doc.submissionNote && (
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 italic">
                            &quot;{doc.submissionNote}&quot;
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {doc.submittedAt ? new Date(doc.submittedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(doc.status)}</td>
                      <td className="py-3 px-4 max-w-xs">
                        {doc.reviewerFeedback ? (
                          <div>
                            <span className="text-slate-700 text-[11px] line-clamp-2">{doc.reviewerFeedback}</span>
                            {doc.reviewedBy && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                By: {doc.reviewedBy.fullName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Awaiting feedback</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {canReview && hasLink && (
                          <button
                            onClick={() => handleOpenReview(doc)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors"
                          >
                            Review
                          </button>
                        )}
                        {isStudent && (
                          <button
                            onClick={() => {
                              setSubmitForm({
                                documentId: doc.id,
                                submissionTitle: doc.documentName,
                                submissionUrl: doc.submissionUrl || '',
                                submissionNote: '',
                              });
                              setIsSubmitOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors"
                          >
                            {hasLink ? 'Update Link' : 'Submit Link'}
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

      {/* Student Submit Modal */}
      <Modal isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} title="Submit Academic Document Link">
        <form onSubmit={handleSubmitUrl} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Select Document Deliverable *</label>
            <select
              required
              value={submitForm.documentId}
              onChange={(e) => {
                const selected = documents.find((d) => d.id === e.target.value);
                setSubmitForm({
                  ...submitForm,
                  documentId: e.target.value,
                  submissionTitle: selected?.documentName || '',
                });
              }}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="">Choose Deliverable...</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.documentName} (Current: {d.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Submission Title / Label</label>
            <input
              type="text"
              value={submitForm.submissionTitle}
              onChange={(e) => setSubmitForm({ ...submitForm, submissionTitle: e.target.value })}
              placeholder="e.g. Project Proposal & Architecture Specification v2"
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              External Document URL (Google Drive / GitHub) *
            </label>
            <input
              type="url"
              required
              value={submitForm.submissionUrl}
              onChange={(e) => setSubmitForm({ ...submitForm, submissionUrl: e.target.value })}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono focus:bg-white focus:border-cyan-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              IMPORTANT: Ensure file access in Google Drive is set to &quot;Anyone with the link can view&quot;.
            </p>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Notes / Summary of Changes</label>
            <textarea
              rows={3}
              value={submitForm.submissionNote}
              onChange={(e) => setSubmitForm({ ...submitForm, submissionNote: e.target.value })}
              placeholder="Detail sections updated, corrections addressed, or key questions for the reviewer..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsSubmitOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md cursor-pointer"
            >
              Submit Deliverable Link
            </button>
          </div>
        </form>
      </Modal>

      {/* Staff Review Modal */}
      <Modal isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} title={`Review: ${reviewingDoc?.documentName}`}>
        <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 block">{reviewingDoc?.student?.fullName}</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {reviewingDoc?.student?.registrationNumber} | Version {reviewingDoc?.currentVersion}
              </span>
            </div>
            {reviewingDoc?.submissionUrl && (
              <a
                href={reviewingDoc.submissionUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-bold text-[11px] shadow-xs hover:bg-cyan-500"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Document</span>
              </a>
            )}
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Review Decision *</label>
            <select
              value={reviewForm.status}
              onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value as DocumentStatus })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="APPROVED">APPROVED (Deliverable meets standards)</option>
              <option value="CORRECTION_REQUIRED">CORRECTION REQUIRED (Action items for student)</option>
              <option value="UNDER_REVIEW">UNDER REVIEW (Currently evaluating)</option>
              <option value="REJECTED">REJECTED (Does not meet project criteria)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Reviewer Feedback & Instructions *
            </label>
            <textarea
              rows={4}
              required
              value={reviewForm.reviewerFeedback}
              onChange={(e) => setReviewForm({ ...reviewForm, reviewerFeedback: e.target.value })}
              placeholder="Provide constructive feedback, specific section corrections, or approval notes..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          {reviewForm.status === 'CORRECTION_REQUIRED' && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Target Resubmission Deadline</label>
              <input
                type="date"
                value={reviewForm.correctionDeadline}
                onChange={(e) => setReviewForm({ ...reviewForm, correctionDeadline: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsReviewOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md cursor-pointer"
            >
              Record Decision
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

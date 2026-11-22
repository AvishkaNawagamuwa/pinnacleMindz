import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Student, DocumentStatus, TaskStatus, WeeklyStatus, ProjectTask } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import {
  GraduationCap,
  FolderGit2,
  FileCheck2,
  CheckSquare,
  AlertOctagon,
  CalendarDays,
  Award,
  CreditCard,
  FileText,
  History,
  Download,
  PlusCircle,
  Clock,
  ExternalLink,
  Edit,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  GitCommit,
  Eye,
} from 'lucide-react';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'project'
    | 'documents'
    | 'progress'
    | 'evaluations'
    | 'meetings'
    | 'payments'
    | 'files'
    | 'history'
  >('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isDailyProgressOpen, setIsDailyProgressOpen] = useState(false);
  const [isWeeklyProgressOpen, setIsWeeklyProgressOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isReviewDocOpen, setIsReviewDocOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);

  // Upgraded Feature Modals
  const [isSubmitLinkOpen, setIsSubmitLinkOpen] = useState(false);
  const [submitLinkForm, setSubmitLinkForm] = useState({
    documentId: '',
    submissionTitle: '',
    submissionUrl: '',
    submissionNote: '',
  });

  const [isReviewSubmissionOpen, setIsReviewSubmissionOpen] = useState(false);
  const [reviewSubmissionForm, setReviewSubmissionForm] = useState({
    documentId: '',
    status: 'APPROVED' as DocumentStatus,
    reviewerFeedback: '',
    correctionDeadline: '',
  });

  const [isTaskProgressOpen, setIsTaskProgressOpen] = useState(false);
  const [taskProgressForm, setTaskProgressForm] = useState({
    taskId: '',
    title: '',
    completionPercentage: 0,
    githubRepoUrl: '',
    githubCommitOrPrUrl: '',
    studentProgressNote: '',
  });

  const [isVerifyTaskOpen, setIsVerifyTaskOpen] = useState(false);
  const [verifyTaskForm, setVerifyTaskForm] = useState({
    taskId: '',
    title: '',
    status: 'COMPLETED' as TaskStatus,
    mentorFeedback: '',
  });

  const [isAddSupportingMentorOpen, setIsAddSupportingMentorOpen] = useState(false);
  const [supportingMentorId, setSupportingMentorId] = useState('');

  // Form states for existing actions
  const [dailyForm, setDailyForm] = useState({
    moduleTask: '',
    workPlanned: '',
    workCompleted: '',
    currentStatus: 'On Track',
    problemsEncountered: '',
    mistakesIdentified: '',
    correctionsRequired: '',
    nextAction: '',
  });

  const [weeklyForm, setWeeklyForm] = useState({
    weekStartDate: new Date().toISOString().split('T')[0],
    plannedActivities: '',
    completedActivities: '',
    currentActivities: '',
    challenges: '',
    githubEvidenceUrl: '',
    incompleteActivities: '',
    problemsBlockers: '',
    nextWeekPlan: '',
    mentorNotes: '',
    status: 'SUBMITTED',
  });

  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSummary, setDocSummary] = useState('');

  const [reviewForm, setReviewForm] = useState({
    status: 'APPROVED',
    comments: '',
    requiredCorrections: '',
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
  });

  const [correctionForm, setCorrectionForm] = useState({
    issueDescription: '',
    correctionInstruction: '',
    deadline: '',
  });

  const [meetingForm, setMeetingForm] = useState({
    meetingDate: '',
    meetingType: 'DEVELOPMENT_DEMO',
    discussionSummary: '',
    demonstratedFeatures: '',
    decisionsMade: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    remarks: '',
  });

  const [reassignForm, setReassignForm] = useState({
    newMentorId: '',
    reason: '',
  });

  const [mentorsList, setMentorsList] = useState<any[]>([]);

  const role = user?.role || 'ADMIN';
  const isAdmin = role === 'ADMIN' || (role as string) === 'SUPER_ADMIN';
  const isSupervisor = role === 'SUPERVISOR';
  const isMentor = role === 'MENTOR';
  const isStudent = role === 'STUDENT';

  const fetchStudentWorkspace = async () => {
    try {
      setIsLoading(true);
      const targetId = id === 'me' ? 'me' : id;
      const res = await api.get(`/students/${targetId}`);
      setStudent(res.data.student);
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to load student workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchStudentWorkspace();
  }, [id]);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const res = await api.get('/users?role=MENTOR');
        setMentorsList(res.data.users || []);
      } catch {}
    };
    if (isAdmin || isSupervisor) {
      fetchMentors();
    }
  }, [role, isAdmin, isSupervisor]);

  // --- Handlers ---
  const handleDownloadReportPdf = () => {
    window.open(`/api/reports/student-progress-pdf/${student?.id || id}`, '_blank');
  };

  const handleToggleStudentStatus = async () => {
    if (!student) return;
    const nextIsActive = !student.isActive;
    if (!confirm(`Are you sure you want to ${nextIsActive ? 'activate' : 'deactivate'} this student account?`)) return;

    try {
      await api.put(`/students/${student.id}/status`, { isActive: nextIsActive });
      success(`Student account ${nextIsActive ? 'activated' : 'deactivated'} successfully.`);
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update student account status');
    }
  };

  const handleAddSupportingMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportingMentorId || !student) return;
    try {
      await api.post(`/students/${student.id}/supporting-mentors`, { mentorId: supportingMentorId });
      success('Supporting mentor added to student team.');
      setIsAddSupportingMentorOpen(false);
      setSupportingMentorId('');
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to add supporting mentor');
    }
  };

  const handleRemoveSupportingMentor = async (mentorId: string) => {
    if (!student || !confirm('Remove this supporting mentor?')) return;
    try {
      await api.delete(`/students/${student.id}/supporting-mentors/${mentorId}`);
      success('Supporting mentor removed.');
      fetchStudentWorkspace();
    } catch (err: any) {
      error('Failed to remove supporting mentor');
    }
  };

  const handleSubmitDocLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitLinkForm.documentId || !submitLinkForm.submissionUrl) {
      error('Document and submission URL are required.');
      return;
    }
    try {
      await api.post(`/documents/${submitLinkForm.documentId}/submit-url`, {
        submissionTitle: submitLinkForm.submissionTitle,
        submissionUrl: submitLinkForm.submissionUrl,
        submissionNote: submitLinkForm.submissionNote,
      });
      success('Document external link submitted successfully.');
      setIsSubmitLinkOpen(false);
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to submit document link');
    }
  };

  const handleReviewSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewSubmissionForm.documentId) return;
    try {
      await api.post(`/documents/${reviewSubmissionForm.documentId}/review-submission`, {
        status: reviewSubmissionForm.status,
        reviewerFeedback: reviewSubmissionForm.reviewerFeedback,
        correctionDeadline: reviewSubmissionForm.correctionDeadline || undefined,
      });
      success(`Submission review recorded as ${reviewSubmissionForm.status}.`);
      setIsReviewSubmissionOpen(false);
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to record review decision');
    }
  };

  const handleTaskProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/tasks/${taskProgressForm.taskId}/student-progress`, taskProgressForm);
      success('Task progress updated successfully.');
      setIsTaskProgressOpen(false);
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update task progress');
    }
  };

  const handleVerifyTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/tasks/${verifyTaskForm.taskId}/verify`, {
        status: verifyTaskForm.status,
        mentorFeedback: verifyTaskForm.mentorFeedback,
      });
      success(`Task verified as ${verifyTaskForm.status}.`);
      setIsVerifyTaskOpen(false);
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to verify task');
    }
  };

  const handleDailySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/progress/daily', { ...dailyForm, studentId: student?.id || id });
      success('Daily progress logged successfully');
      setIsDailyProgressOpen(false);
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to log daily progress');
    }
  };

  const handleWeeklySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isStudent) {
        await api.post('/progress/weekly/student-submit', {
          studentId: student?.id,
          weekStartDate: weeklyForm.weekStartDate,
          plannedActivities: weeklyForm.plannedActivities,
          completedActivities: weeklyForm.completedActivities,
          currentActivities: weeklyForm.currentActivities,
          challenges: weeklyForm.challenges,
          githubEvidenceUrl: weeklyForm.githubEvidenceUrl,
          nextWeekPlan: weeklyForm.nextWeekPlan,
        });
      } else {
        await api.post('/progress/weekly', { ...weeklyForm, studentId: student?.id || id });
      }
      success('Weekly progress report saved successfully');
      setIsWeeklyProgressOpen(false);
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to submit weekly report');
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tasks', { ...taskForm, studentId: student?.id || id });
      success('Project task created');
      setIsNewTaskOpen(false);
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', dueDate: '' });
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/reviews/corrections', { ...correctionForm, studentId: student?.id || id });
      success('Supervisor correction directive created');
      setIsCorrectionOpen(false);
      setCorrectionForm({ issueDescription: '', correctionInstruction: '', deadline: '' });
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create correction');
    }
  };

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/meetings', { ...meetingForm, studentId: student?.id || id });
      success('Meeting / Demo scheduled');
      setIsMeetingOpen(false);
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to schedule session');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payments', { ...paymentForm, studentId: student?.id || id });
      success('Payment recorded and receipt generated');
      setIsPaymentOpen(false);
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/students/${student?.id || id}/assign-mentor`, reassignForm);
      success('Primary mentor successfully reassigned');
      setIsReassignOpen(false);
      fetchStudentWorkspace();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to reassign mentor');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading student workspace...</div>;
  }

  if (!student) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Student not found or access unauthorized.
      </div>
    );
  }

  const project = student.project;
  const tabs = [
    { id: 'overview', label: '1. Overview', icon: GraduationCap },
    { id: 'project', label: '2. Project Details', icon: FolderGit2 },
    { id: 'documents', label: '3. Documentation Hub', icon: FileCheck2 },
    { id: 'progress', label: '4. Tasks & Weekly Progress', icon: CheckSquare },
    { id: 'evaluations', label: '5. Evaluations & Feedback', icon: Award },
    { id: 'meetings', label: '6. Meetings & Demos', icon: CalendarDays },
    { id: 'payments', label: '7. Payments', icon: CreditCard },
    { id: 'files', label: '8. Files', icon: FileText },
    { id: 'history', label: '9. Activity History', icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0b1329] to-[#162347] border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-lg font-mono shadow-md">
              {student.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{student.fullName}</h1>
                <Badge variant="cyan">{project?.currentStage?.replace(/_/g, ' ') || 'PROPOSAL'}</Badge>
                <span className="font-mono text-xs text-slate-500">{student.studentId}</span>
                {student.isActive ? (
                  <Badge variant="success">ACTIVE</Badge>
                ) : (
                  <Badge variant="danger">DEACTIVATED</Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">{project?.title}</p>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 mt-2 font-mono">
                <span>Reg: {student.registrationNumber}</span>
                <span>•</span>
                <span>Primary Mentor: <strong className="text-slate-800">{student.assignedMentor?.fullName || 'None'}</strong></span>
                <span>•</span>
                <span>Supervisor: <strong className="text-slate-800">{student.assignedSupervisor?.fullName || 'None'}</strong></span>
                <span>•</span>
                <span>Batch: {student.batch} ({student.academicYear || 'Level 3'})</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadReportPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5 text-cyan-600" />
              Download Progress Report (PDF)
            </button>

            {(isMentor || isAdmin) && (
              <button
                onClick={() => setIsDailyProgressOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-xs cursor-pointer transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Log Daily Progress
              </button>
            )}

            {(isSupervisor || isAdmin) && (
              <button
                onClick={() => setIsCorrectionOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-xs cursor-pointer transition-all"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                Assign Correction
              </button>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => setIsReassignOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer transition-all"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  Reassign Mentor
                </button>

                <button
                  onClick={handleToggleStudentStatus}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all ${
                    student.isActive
                      ? 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'
                      : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {student.isActive ? 'Deactivate Student' : 'Activate Student'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Project Progress Gauge Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex-1 mr-4">
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-600 text-[11px] uppercase tracking-wider font-mono">
                Project Milestone Progress
              </span>
              <span className="text-cyan-700 font-bold">{project?.completionPercentage || 0}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${project?.completionPercentage || 0}%` }}
              />
            </div>
          </div>
          <div className="font-mono text-[11px] text-slate-500 shrink-0">
            Tech: <strong className="text-slate-800">{project?.techStack || 'Not set'}</strong>
          </div>
        </div>
      </div>

      {/* 9-Tab Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-1.5 flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0b1329] text-cyan-400 shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Project Concept & Solution Architecture
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-medium mb-4">
                {project?.proposedSolution || 'No solution description specified yet.'}
              </p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-xs">
                <span className="font-bold text-slate-900 block mb-1">Problem Statement:</span>
                <span className="text-slate-600 leading-relaxed">{project?.problemStatement || 'Not recorded'}</span>
              </div>
            </div>

            {/* Quick Milestones */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                Key Project Milestones
              </h3>
              <div className="space-y-2.5">
                {(project?.milestones || []).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          m.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : m.status === 'IN_PROGRESS'
                            ? 'bg-cyan-500'
                            : 'bg-slate-300'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{m.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Stage: {m.stage} | Weight: {m.weight}%</div>
                      </div>
                    </div>
                    <Badge variant={m.status === 'COMPLETED' ? 'success' : 'default'}>{m.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Contact & Mentoring Team */}
          <div className="space-y-6">
            {/* Mentoring Team */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Mentoring & Supervision Team
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => setIsAddSupportingMentorOpen(true)}
                    className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Supporting
                  </button>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl border border-cyan-100 bg-cyan-50/40">
                  <span className="text-[10px] font-mono font-bold text-cyan-800 block uppercase">Primary Mentor</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {student.assignedMentor?.fullName || 'Not Assigned'}
                  </span>
                  {student.assignedMentor?.email && (
                    <span className="text-[10px] text-slate-500 block">{student.assignedMentor.email}</span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase">Project Supervisor</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {student.assignedSupervisor?.fullName || 'Not Assigned'}
                  </span>
                </div>

                {/* Supporting Mentors */}
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase mb-1">
                    Supporting Mentors ({student.supportingMentors?.length || 0})
                  </span>
                  {student.supportingMentors && student.supportingMentors.length > 0 ? (
                    <div className="space-y-1.5">
                      {student.supportingMentors.map((sm) => (
                        <div key={sm.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white">
                          <div>
                            <span className="font-semibold text-slate-800 block">{sm.fullName}</span>
                            <span className="text-[10px] text-slate-400">{sm.email}</span>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleRemoveSupportingMentor(sm.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded-md"
                              title="Remove Supporting Mentor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">No supporting mentors assigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Student & Academic Info
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Email:</span>
                  <span className="font-semibold text-slate-800">{student.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Contact Phone:</span>
                  <span className="font-semibold text-slate-800">{student.contactNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">WhatsApp:</span>
                  <span className="font-semibold text-slate-800">{student.whatsappNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">University:</span>
                  <span className="font-semibold text-slate-800">{student.university}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Degree Programme:</span>
                  <span className="font-semibold text-slate-800">{student.degreeProgramme}</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Repositories & Deployments
              </h3>
              <div className="space-y-2 text-xs">
                {project?.githubRepoUrl ? (
                  <a
                    href={project.githubRepoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 text-cyan-700 hover:bg-cyan-50 font-semibold"
                  >
                    <span>GitHub Repository</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-slate-400 italic text-[11px]">No GitHub repo linked</span>
                )}

                {project?.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 text-emerald-700 hover:bg-emerald-50 font-semibold"
                  >
                    <span>Live Demo Application</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Project Details */}
      {activeTab === 'project' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Complete Project Specification & Architecture
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <span className="font-bold text-slate-900 block mb-1">Project Idea:</span>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                {project?.idea || 'Not specified'}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Main Objectives:</span>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60 whitespace-pre-line">
                {project?.mainObjectives || 'Not specified'}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Core Modules:</span>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                {project?.mainModules || 'Not specified'}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Technical Architecture Remarks:</span>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                {project?.technicalRemarks || 'No technical remarks added yet.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Documentation Hub */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Academic Document Checklist & Version History
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Submit shared Google Drive or GitHub repository URLs. Mentors and supervisors evaluate deliverables here.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSubmitLinkForm({
                    documentId: student.documents?.[0]?.id || '',
                    submissionTitle: '',
                    submissionUrl: '',
                    submissionNote: '',
                  });
                  setIsSubmitLinkOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Deliverable Link</span>
              </button>
            </div>
          </div>

          {/* Google Drive Reminder Notice */}
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Google Drive Sharing Notice:</strong> Always set permissions on your document to <em>&quot;Anyone with the link can view/comment&quot;</em> before submitting the link so academic supervisors can read and evaluate your work.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Document Title</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Deliverable Link</th>
                  <th className="py-2.5 px-3">Reviewer & Feedback</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(student.documents || []).map((doc) => {
                  const hasUrl = Boolean(doc.submissionUrl);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{doc.documentName}</span>
                        {doc.submissionTitle && doc.submissionTitle !== doc.documentName && (
                          <span className="text-[10px] text-slate-400 italic">{doc.submissionTitle}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-cyan-600">v{doc.currentVersion}</td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            doc.status === 'APPROVED'
                              ? 'success'
                              : doc.status === 'CORRECTION_REQUIRED' || doc.status === 'REVISION_REQUIRED' || doc.status === 'REJECTED'
                              ? 'danger'
                              : doc.status === 'READY_FOR_REVIEW' || doc.status === 'UNDER_REVIEW'
                              ? 'info'
                              : doc.status === 'SUBMITTED' || doc.status === 'RESUBMITTED'
                              ? 'cyan'
                              : 'default'
                          }
                        >
                          {doc.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        {hasUrl ? (
                          <a
                            href={doc.submissionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-700 hover:text-cyan-800 font-mono text-[11px] font-medium flex items-center gap-1.5 underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[180px]">{doc.submissionUrl}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No link submitted</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs">
                        {doc.reviewerFeedback ? (
                          <div className="text-[11px]">
                            <span className="font-semibold block text-slate-800">{doc.reviewerFeedback}</span>
                            {doc.reviewedBy && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                By {doc.reviewedBy.fullName} ({doc.reviewedBy.role})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Awaiting review</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setSubmitLinkForm({
                              documentId: doc.id,
                              submissionTitle: doc.documentName,
                              submissionUrl: doc.submissionUrl || '',
                              submissionNote: '',
                            });
                            setIsSubmitLinkOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 cursor-pointer transition-colors"
                        >
                          {hasUrl ? 'Update Link' : 'Submit Link'}
                        </button>
                        {(isAdmin || isSupervisor || isMentor) && hasUrl && (
                          <button
                            onClick={() => {
                              setReviewSubmissionForm({
                                documentId: doc.id,
                                status: 'APPROVED',
                                reviewerFeedback: doc.reviewerFeedback || '',
                                correctionDeadline: '',
                              });
                              setIsReviewSubmissionOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer transition-colors"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Tasks & Weekly Progress */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Sprint Tasks & Progress Log
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNewTaskOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Task
              </button>
              <button
                onClick={() => setIsWeeklyProgressOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Submit Weekly Report
              </button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Sprint Tasks</h4>
            <div className="space-y-3">
              {(project?.tasks || []).map((t) => (
                <div key={t.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{t.title}</span>
                      {t.description && <span className="text-[11px] text-slate-600 block">{t.description}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.status === 'COMPLETED' ? 'success' : t.status === 'SUBMITTED_FOR_REVIEW' ? 'info' : 'cyan'}>
                        {t.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-cyan-600">{t.completionPercentage || 0}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all"
                      style={{ width: `${t.completionPercentage || 0}%` }}
                    />
                  </div>

                  {/* GitHub Evidence and Notes */}
                  {(t.githubRepoUrl || t.githubCommitOrPrUrl || t.studentProgressNote) && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                      {t.githubRepoUrl && (
                        <div className="flex items-center gap-1.5 text-cyan-700">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <a href={t.githubRepoUrl} target="_blank" rel="noreferrer" className="underline font-mono text-[11px]">
                            {t.githubRepoUrl}
                          </a>
                        </div>
                      )}
                      {t.githubCommitOrPrUrl && (
                        <div className="flex items-center gap-1.5 text-blue-700">
                          <GitCommit className="w-3.5 h-3.5" />
                          <a href={t.githubCommitOrPrUrl} target="_blank" rel="noreferrer" className="underline font-mono text-[11px]">
                            Commit / PR: {t.githubCommitOrPrUrl}
                          </a>
                        </div>
                      )}
                      {t.studentProgressNote && (
                        <p className="text-slate-600 text-[11px] italic mt-1">&quot;{t.studentProgressNote}&quot;</p>
                      )}
                    </div>
                  )}

                  {t.mentorFeedback && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800">
                      <strong>Mentor Feedback:</strong> {t.mentorFeedback}
                    </div>
                  )}

                  {/* Task Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'None'} | Mentor: {t.assignedMentor?.fullName || 'Assigned'}
                    </span>
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          setTaskProgressForm({
                            taskId: t.id,
                            title: t.title,
                            completionPercentage: t.completionPercentage || 0,
                            githubRepoUrl: t.githubRepoUrl || '',
                            githubCommitOrPrUrl: t.githubCommitOrPrUrl || '',
                            studentProgressNote: t.studentProgressNote || '',
                          });
                          setIsTaskProgressOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-cyan-600 hover:bg-cyan-500 cursor-pointer"
                      >
                        Update Progress
                      </button>
                      {(isAdmin || isSupervisor || isMentor) && (
                        <button
                          onClick={() => {
                            setVerifyTaskForm({
                              taskId: t.id,
                              title: t.title,
                              status: 'COMPLETED',
                              mentorFeedback: t.mentorFeedback || '',
                            });
                            setIsVerifyTaskOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
                        >
                          Verify Evidence
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Progress History */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Weekly Reports</h4>
            <div className="space-y-4">
              {(student.weeklyProgresses || []).map((w) => (
                <div key={w.id} className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Week {w.weekNumber} ({new Date(w.weekStartDate).toLocaleDateString()} – {new Date(w.weekEndDate).toLocaleDateString()})
                    </span>
                    <Badge variant={w.status === 'COMPLETED' ? 'success' : 'cyan'}>{w.status}</Badge>
                  </div>
                  <div>
                    <strong className="text-slate-700 block">Completed Work:</strong>
                    <p className="text-slate-600">{w.completedActivities}</p>
                  </div>
                  {w.githubEvidenceUrl && (
                    <div className="flex items-center gap-1.5 text-cyan-700">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <a href={w.githubEvidenceUrl} target="_blank" rel="noreferrer" className="underline font-mono text-[11px]">
                        GitHub Proof: {w.githubEvidenceUrl}
                      </a>
                    </div>
                  )}
                  {w.problemsBlockers && (
                    <div>
                      <strong className="text-rose-700 block">Blockers:</strong>
                      <p className="text-slate-600">{w.problemsBlockers}</p>
                    </div>
                  )}
                  {w.supervisorFeedback && (
                    <div className="p-2.5 rounded-lg bg-cyan-50/60 border border-cyan-200/60">
                      <strong className="text-cyan-900 block">Supervisor Feedback:</strong>
                      <p className="text-cyan-800">{w.supervisorFeedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Evaluations & Feedback */}
      {activeTab === 'evaluations' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Academic Milestones & Supervisor Evaluations
          </h3>
          <div className="space-y-3">
            {(student.evaluations || []).map((ev) => (
              <div key={ev.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{ev.evaluationTitle}</span>
                  <div className="flex items-center gap-2">
                    {ev.marksRating && (
                      <span className="font-mono font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                        Rating: {ev.marksRating}/100
                      </span>
                    )}
                    <Badge variant={ev.status === 'COMPLETED' ? 'success' : 'default'}>{ev.status}</Badge>
                  </div>
                </div>
                {ev.feedback && (
                  <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                    {ev.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Meetings */}
      {activeTab === 'meetings' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Meetings & Development Demos
            </h3>
            <button
              onClick={() => setIsMeetingOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs"
            >
              Schedule Meeting
            </button>
          </div>
          <div className="space-y-3">
            {(student.meetings || []).map((m) => (
              <div key={m.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {m.meetingType.replace(/_/g, ' ')} – {new Date(m.meetingDate).toLocaleString()}
                  </span>
                  <Badge variant={m.status === 'COMPLETED' ? 'success' : 'info'}>{m.status}</Badge>
                </div>
                <p className="text-slate-600">{m.discussionSummary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Payments */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Fee Agreement & Installment Schedule
            </h3>
            {isAdmin && (
              <button
                onClick={() => setIsPaymentOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
              >
                Record Payment
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500 block">Total Agreed Fee</span>
              <span className="text-lg font-bold text-slate-900">LKR {student.feeAgreement?.finalPayableAmount?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Files */}
      {activeTab === 'files' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Attached Workspace Files</h3>
          <p className="text-xs text-slate-500">Access submitted documentation files and attachments.</p>
        </div>
      )}

      {/* Tab 9: Activity History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Audit Trail & Event History
          </h3>
          <div className="space-y-2.5">
            {(student.activityHistory || []).map((act) => (
              <div key={act.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{act.action}</span>
                  <span className="text-slate-500 ml-2">by {act.actorName} ({act.actorRole})</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  {new Date(act.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Submit External URL Modal */}
      <Modal isOpen={isSubmitLinkOpen} onClose={() => setIsSubmitLinkOpen(false)} title="Submit Deliverable Link (Google Drive / GitHub)">
        <form onSubmit={handleSubmitDocLink} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Select Deliverable *</label>
            <select
              required
              value={submitLinkForm.documentId}
              onChange={(e) => {
                const doc = student.documents?.find((d) => d.id === e.target.value);
                setSubmitLinkForm({
                  ...submitLinkForm,
                  documentId: e.target.value,
                  submissionTitle: doc?.documentName || '',
                });
              }}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="">Choose document deliverable...</option>
              {(student.documents || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.documentName} (v{d.currentVersion} – {d.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Deliverable Title / Topic</label>
            <input
              type="text"
              value={submitLinkForm.submissionTitle}
              onChange={(e) => setSubmitLinkForm({ ...submitLinkForm, submissionTitle: e.target.value })}
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
              value={submitLinkForm.submissionUrl}
              onChange={(e) => setSubmitLinkForm({ ...submitLinkForm, submissionUrl: e.target.value })}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono focus:bg-white focus:border-cyan-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              IMPORTANT: Ensure file access on Google Drive is set to &quot;Anyone with the link can view&quot;.
            </p>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Notes / Summary of Changes</label>
            <textarea
              rows={3}
              value={submitLinkForm.submissionNote}
              onChange={(e) => setSubmitLinkForm({ ...submitLinkForm, submissionNote: e.target.value })}
              placeholder="Provide a summary of sections updated or addressed..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsSubmitLinkOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md cursor-pointer"
            >
              Submit Link
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Submission Modal */}
      <Modal isOpen={isReviewSubmissionOpen} onClose={() => setIsReviewSubmissionOpen(false)} title="Review Deliverable Submission">
        <form onSubmit={handleReviewSubmissionSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Review Decision *</label>
            <select
              value={reviewSubmissionForm.status}
              onChange={(e) => setReviewSubmissionForm({ ...reviewSubmissionForm, status: e.target.value as DocumentStatus })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="APPROVED">APPROVED (Meets academic requirements)</option>
              <option value="CORRECTION_REQUIRED">CORRECTION REQUIRED (Action items for student)</option>
              <option value="UNDER_REVIEW">UNDER REVIEW (Currently evaluating)</option>
              <option value="REJECTED">REJECTED (Does not meet standards)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Feedback & Correction Instructions *</label>
            <textarea
              rows={4}
              required
              value={reviewSubmissionForm.reviewerFeedback}
              onChange={(e) => setReviewSubmissionForm({ ...reviewSubmissionForm, reviewerFeedback: e.target.value })}
              placeholder="Specific feedback, corrections, or approval notes..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsReviewSubmissionOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md cursor-pointer"
            >
              Submit Decision
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Task Progress Modal */}
      <Modal isOpen={isTaskProgressOpen} onClose={() => setIsTaskProgressOpen(false)} title={`Update Task: ${taskProgressForm.title}`}>
        <form onSubmit={handleTaskProgressSubmit} className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <label className="text-slate-700">Completion Percentage</label>
              <span className="text-cyan-700 font-mono font-bold">{taskProgressForm.completionPercentage}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={taskProgressForm.completionPercentage}
              onChange={(e) => setTaskProgressForm({ ...taskProgressForm, completionPercentage: Number(e.target.value) })}
              className="w-full cursor-pointer accent-cyan-600"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">GitHub Repository URL</label>
            <input
              type="url"
              value={taskProgressForm.githubRepoUrl}
              onChange={(e) => setTaskProgressForm({ ...taskProgressForm, githubRepoUrl: e.target.value })}
              placeholder="https://github.com/..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">GitHub Commit / Pull Request URL</label>
            <input
              type="url"
              value={taskProgressForm.githubCommitOrPrUrl}
              onChange={(e) => setTaskProgressForm({ ...taskProgressForm, githubCommitOrPrUrl: e.target.value })}
              placeholder="https://github.com/.../commit/..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Progress Notes</label>
            <textarea
              rows={2}
              value={taskProgressForm.studentProgressNote}
              onChange={(e) => setTaskProgressForm({ ...taskProgressForm, studentProgressNote: e.target.value })}
              placeholder="Describe work completed on this sprint task..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsTaskProgressOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md cursor-pointer"
            >
              Save Progress
            </button>
          </div>
        </form>
      </Modal>

      {/* Verify Task Modal */}
      <Modal isOpen={isVerifyTaskOpen} onClose={() => setIsVerifyTaskOpen(false)} title={`Verify: ${verifyTaskForm.title}`}>
        <form onSubmit={handleVerifyTaskSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Verification Status *</label>
            <select
              value={verifyTaskForm.status}
              onChange={(e) => setVerifyTaskForm({ ...verifyTaskForm, status: e.target.value as TaskStatus })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="COMPLETED">COMPLETED (Evidence verified)</option>
              <option value="CORRECTION_REQUIRED">CORRECTION REQUIRED (Revisions needed)</option>
              <option value="IN_PROGRESS">IN PROGRESS (Work ongoing)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Mentor Feedback *</label>
            <textarea
              rows={3}
              required
              value={verifyTaskForm.mentorFeedback}
              onChange={(e) => setVerifyTaskForm({ ...verifyTaskForm, mentorFeedback: e.target.value })}
              placeholder="Feedback on code implementation, test cases, or design..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsVerifyTaskOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md cursor-pointer"
            >
              Save Verification
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Supporting Mentor Modal */}
      <Modal isOpen={isAddSupportingMentorOpen} onClose={() => setIsAddSupportingMentorOpen(false)} title="Add Supporting Mentor">
        <form onSubmit={handleAddSupportingMentor} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Select Mentor *</label>
            <select
              required
              value={supportingMentorId}
              onChange={(e) => setSupportingMentorId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden"
            >
              <option value="">-- Choose Supporting Mentor --</option>
              {mentorsList
                .filter((m) => m.id !== student.assignedMentorId && !student.supportingMentors?.some((sm) => sm.id === m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.email})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsAddSupportingMentorOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md cursor-pointer"
            >
              Assign Supporting Mentor
            </button>
          </div>
        </form>
      </Modal>

      {/* Daily Progress Modal */}
      <Modal isOpen={isDailyProgressOpen} onClose={() => setIsDailyProgressOpen(false)} title="Record Daily Mentoring Progress">
        <form onSubmit={handleDailySubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Module / Task</label>
            <input
              type="text"
              required
              placeholder="e.g. POS Checkout Controller & Barcode Validation"
              value={dailyForm.moduleTask}
              onChange={(e) => setDailyForm({ ...dailyForm, moduleTask: e.target.value })}
              className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Work Planned</label>
              <textarea
                rows={2}
                required
                value={dailyForm.workPlanned}
                onChange={(e) => setDailyForm({ ...dailyForm, workPlanned: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Work Completed</label>
              <textarea
                rows={2}
                required
                value={dailyForm.workCompleted}
                onChange={(e) => setDailyForm({ ...dailyForm, workCompleted: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Mistakes / Bugs Identified</label>
              <textarea
                rows={2}
                placeholder="Specific errors or design flaws observed..."
                value={dailyForm.mistakesIdentified}
                onChange={(e) => setDailyForm({ ...dailyForm, mistakesIdentified: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Corrections Required</label>
              <textarea
                rows={2}
                placeholder="Actionable instructions for the student..."
                value={dailyForm.correctionsRequired}
                onChange={(e) => setDailyForm({ ...dailyForm, correctionsRequired: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Next Action Step</label>
            <input
              type="text"
              placeholder="Immediate next milestone..."
              value={dailyForm.nextAction}
              onChange={(e) => setDailyForm({ ...dailyForm, nextAction: e.target.value })}
              className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsDailyProgressOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 cursor-pointer"
            >
              Save Daily Progress
            </button>
          </div>
        </form>
      </Modal>

      {/* Weekly Progress Modal */}
      <Modal isOpen={isWeeklyProgressOpen} onClose={() => setIsWeeklyProgressOpen(false)} title="Submit Weekly Progress Report">
        <form onSubmit={handleWeeklySubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Week Starting Date *</label>
            <input
              type="date"
              required
              value={weeklyForm.weekStartDate}
              onChange={(e) => setWeeklyForm({ ...weeklyForm, weekStartDate: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Completed Activities This Week *</label>
            <textarea
              rows={3}
              required
              value={weeklyForm.completedActivities}
              onChange={(e) => setWeeklyForm({ ...weeklyForm, completedActivities: e.target.value })}
              placeholder="List completed features, modules, research, or documentation..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">GitHub Evidence URL (Repository / PR / Commit)</label>
            <input
              type="url"
              value={weeklyForm.githubEvidenceUrl}
              onChange={(e) => setWeeklyForm({ ...weeklyForm, githubEvidenceUrl: e.target.value })}
              placeholder="https://github.com/..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Planned Activities</label>
              <textarea
                rows={2}
                value={weeklyForm.plannedActivities}
                onChange={(e) => setWeeklyForm({ ...weeklyForm, plannedActivities: e.target.value })}
                placeholder="What was originally planned..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Challenges & Blockers</label>
              <textarea
                rows={2}
                value={weeklyForm.challenges}
                onChange={(e) => setWeeklyForm({ ...weeklyForm, challenges: e.target.value })}
                placeholder="Technical issues or roadblocks faced..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Next Week Plan</label>
            <input
              type="text"
              value={weeklyForm.nextWeekPlan}
              onChange={(e) => setWeeklyForm({ ...weeklyForm, nextWeekPlan: e.target.value })}
              placeholder="Targets for the upcoming week..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsWeeklyProgressOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 cursor-pointer"
            >
              Submit Report
            </button>
          </div>
        </form>
      </Modal>

      {/* Task Creation Modal */}
      <Modal isOpen={isNewTaskOpen} onClose={() => setIsNewTaskOpen(false)} title="Create Sprint Task">
        <form onSubmit={handleTaskSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="e.g. Implement JWT Refresh Tokens and RBAC Middleware"
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Description</label>
            <textarea
              rows={2}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              placeholder="Technical specifications and acceptance criteria..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Priority</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Due Date</label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsNewTaskOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>

      {/* Supervisor Correction Modal */}
      <Modal isOpen={isCorrectionOpen} onClose={() => setIsCorrectionOpen(false)} title="Assign Supervisor Correction">
        <form onSubmit={handleCorrectionSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Issue / Mistake Identified *</label>
            <textarea
              rows={2}
              required
              value={correctionForm.issueDescription}
              onChange={(e) => setCorrectionForm({ ...correctionForm, issueDescription: e.target.value })}
              placeholder="e.g. Chapter 4 database ER diagram contains unnormalized relationships."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Correction Instruction *</label>
            <textarea
              rows={2}
              required
              value={correctionForm.correctionInstruction}
              onChange={(e) => setCorrectionForm({ ...correctionForm, correctionInstruction: e.target.value })}
              placeholder="e.g. Separate order-items into child entity and re-submit."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Target Deadline</label>
            <input
              type="date"
              value={correctionForm.deadline}
              onChange={(e) => setCorrectionForm({ ...correctionForm, deadline: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsCorrectionOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer"
            >
              Issue Directive
            </button>
          </div>
        </form>
      </Modal>

      {/* Mentor Reassignment Modal (Admin only) */}
      <Modal isOpen={isReassignOpen} onClose={() => setIsReassignOpen(false)} title="Reassign Primary Mentor">
        <form onSubmit={handleReassignSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">New Primary Mentor *</label>
            <select
              required
              value={reassignForm.newMentorId}
              onChange={(e) => setReassignForm({ ...reassignForm, newMentorId: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden"
            >
              <option value="">-- Choose New Mentor --</option>
              {mentorsList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Reason for Reassignment</label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Workload balancing or specialization requirement."
              value={reassignForm.reason}
              onChange={(e) => setReassignForm({ ...reassignForm, reason: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsReassignOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer"
            >
              Confirm Reassignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

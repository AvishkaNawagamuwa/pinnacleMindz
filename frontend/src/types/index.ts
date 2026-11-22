export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'MENTOR' | 'STUDENT';
export type StudentStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'DROPPED' | 'DEACTIVATED';
export type DevelopmentStage =
  | 'PROPOSAL'
  | 'SRS_DESIGN'
  | 'IMPLEMENTATION'
  | 'TESTING'
  | 'DOCUMENTATION'
  | 'VIVA_PREPARATION'
  | 'COMPLETED';

export type DocumentStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'READY_FOR_REVIEW'
  | 'REVISION_REQUIRED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'NOT_APPLICABLE';

export type WeeklyStatus =
  | 'NOT_STARTED'
  | 'ON_TRACK'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'NEEDS_ATTENTION'
  | 'BLOCKED'
  | 'COMPLETED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus =
  | 'NOT_STARTED'
  | 'TO_DO'
  | 'IN_PROGRESS'
  | 'SUBMITTED_FOR_REVIEW'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'REVISION_REQUIRED'
  | 'COMPLETED';

export type CorrectionStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED';
export type MeetingType =
  | 'PROJECT_DISCUSSION'
  | 'WEEKLY_REVIEW'
  | 'CODE_REVIEW'
  | 'DEVELOPMENT_DEMO'
  | 'DOCUMENTATION_REVIEW'
  | 'VIVA_PREPARATION'
  | 'SUPERVISOR_MEETING';

export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type EvaluationStage =
  | 'PROJECT_IDEA_APPROVAL'
  | 'SCOPE_APPROVAL'
  | 'INITIAL_EVALUATION'
  | 'PROGRESS_EVALUATION'
  | 'INTERIM_EVALUATION'
  | 'FINAL_EVALUATION'
  | 'VIVA_PREPARATION'
  | 'FINAL_SUBMISSION';

export type EvaluationStatus = 'SCHEDULED' | 'COMPLETED' | 'POSTPONED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'OTHER';
export type PaymentPlan = 'FULL' | 'INSTALLMENTS';

export interface User {
  id: string;
  email: string;
  username?: string;
  fullName: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  isActive?: boolean;
  studentId?: string;
  studentProfile?: {
    id: string;
    studentId: string;
    registrationNumber: string;
  };
}

export interface Student {
  id: string;
  studentId: string;
  registrationNumber: string;
  fullName: string;
  email: string;
  contactNumber: string;
  whatsappNumber?: string;
  university: string;
  degreeProgramme: string;
  batch: string;
  academicYear?: string;
  currentAddress?: string;
  status: StudentStatus;
  isActive?: boolean;
  remarks?: string;
  assignedSupervisorId?: string;
  assignedSupervisor?: { id: string; fullName: string; email?: string; phone?: string };
  assignedMentorId?: string;
  assignedMentor?: { id: string; fullName: string; email?: string; phone?: string };
  supportingMentors?: { id: string; fullName: string; email?: string; phone?: string }[];
  project?: Project;
  documents?: StudentDocument[];
  dailyProgresses?: DailyProgress[];
  weeklyProgresses?: WeeklyProgress[];
  corrections?: Correction[];
  meetings?: Meeting[];
  evaluations?: Evaluation[];
  feeAgreement?: FeeAgreement;
  mentorAssignmentHistory?: MentorAssignmentHistory[];
  activityHistory?: ActivityLog[];
  isMyStudent?: boolean;
  paymentSummary?: {
    finalPayable?: number;
    totalPaid?: number;
    balance?: number;
    status?: string;
    indicatorOnly?: boolean;
  };
  activeCorrectionsCount?: number;
  documentsCount?: number;
  lastUpdated?: string;
  createdAt?: string;
}

export interface Project {
  id: string;
  projectId: string;
  studentId: string;
  title: string;
  idea?: string;
  problemStatement?: string;
  proposedSolution?: string;
  mainObjectives?: string;
  mainModules?: string;
  techStack?: string;
  category?: string;
  startDate?: string;
  expectedCompletionDate?: string;
  actualCompletionDate?: string;
  currentStage: DevelopmentStage;
  completionPercentage: number;
  githubRepoUrl?: string;
  demoUrl?: string;
  technicalRemarks?: string;
  milestones?: ProjectMilestone[];
  tasks?: ProjectTask[];
  history?: ProjectHistory[];
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  stage: DevelopmentStage;
  weight: number;
  dueDate?: string;
  completedDate?: string;
  status: TaskStatus;
  orderIndex: number;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  milestoneId?: string;
  moduleName?: string;
  title: string;
  description?: string;
  assignedMentorId?: string;
  assignedMentor?: { id?: string; fullName: string; email?: string };
  responsiblePerson?: string;
  priority: Priority;
  startDate?: string;
  dueDate?: string;
  completionDate?: string;
  status: TaskStatus;
  feedback?: string;
  completionPercentage: number;
  githubRepoUrl?: string;
  githubCommitOrPrUrl?: string;
  studentProgressNote?: string;
  mentorFeedback?: string;
  comments?: TaskComment[];
  project?: {
    id?: string;
    title: string;
    currentStage?: DevelopmentStage;
    student: { id: string; studentId: string; fullName: string; registrationNumber: string };
  };
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  author: { fullName: string; role: Role };
  content: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface ProjectHistory {
  id: string;
  projectId: string;
  fieldChanged: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  changedById: string;
  createdAt: string;
}

export interface DocumentTypeRequirement {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  academicStage: DevelopmentStage;
  isRequired: boolean;
  submissionInstructions?: string;
  defaultDeadlineDays: number;
  allowedUrlTypes: string;
  targetBatch?: string;
  targetStage?: DevelopmentStage;
  isActive: boolean;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    studentDocuments: number;
  };
}

export interface StudentDocument {
  id: string;
  studentId: string;
  documentTypeId: string;
  documentName: string;
  documentType: string;
  assignedMentorId?: string;
  submissionDeadline?: string;
  status: DocumentStatus;
  currentVersion: number;
  submittedDate?: string;
  approvedDate?: string;
  submissionTitle?: string;
  submissionUrl?: string;
  submissionNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewerFeedback?: string;
  reviewedById?: string;
  reviewedBy?: { fullName: string; role: Role };
  documentTypeConfig?: DocumentTypeRequirement;
  versions?: DocumentVersion[];
  student?: { id: string; studentId: string; fullName: string; registrationNumber: string; batch?: string };
}

export interface DocumentVersion {
  id: string;
  studentDocumentId: string;
  versionNumber: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  externalUrl?: string;
  submissionNote?: string;
  uploadedById: string;
  uploadedBy?: { fullName: string; role: Role };
  changeSummary?: string;
  submittedDate: string;
  reviewedById?: string;
  reviewDate?: string;
  reviewerComments?: string;
  requiredCorrections?: string;
  status: DocumentStatus;
}

export interface DailyProgress {
  id: string;
  studentId: string;
  mentorId: string;
  mentor?: { fullName: string };
  student?: { fullName: string; studentId: string; registrationNumber: string };
  date: string;
  moduleTask: string;
  workPlanned: string;
  workCompleted: string;
  currentStatus: string;
  problemsEncountered?: string;
  mistakesIdentified?: string;
  correctionsRequired?: string;
  nextAction?: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface WeeklyProgress {
  id: string;
  studentId: string;
  mentorId?: string;
  mentor?: { fullName: string };
  student?: { fullName: string; studentId: string; registrationNumber: string; batch?: string };
  weekNumber: number;
  year: number;
  weekStartDate: string;
  weekEndDate: string;
  plannedActivities: string;
  completedActivities: string;
  currentActivities?: string;
  challenges?: string;
  incompleteActivities?: string;
  problemsBlockers?: string;
  githubEvidenceUrl?: string;
  reviewStatus?: string;
  reviewedById?: string;
  reviewedAt?: string;
  reviewer?: { fullName: string; role: Role };
  supervisorFeedback?: string;
  nextWeekPlan?: string;
  mentorNotes?: string;
  status: WeeklyStatus;
  dailyEntries?: DailyProgress[];
  createdAt: string;
  updatedAt: string;
}

export interface Correction {
  id: string;
  studentId: string;
  student?: { id: string; studentId: string; fullName: string; registrationNumber: string };
  taskId?: string;
  task?: { id: string; title: string };
  studentDocumentId?: string;
  studentDocument?: { id: string; documentName: string };
  supervisorId: string;
  supervisor?: { fullName: string };
  assignedMentorId: string;
  assignedMentor?: { fullName: string };
  issueDescription: string;
  correctionInstruction: string;
  dateIdentified: string;
  deadline?: string;
  status: CorrectionStatus;
  resolutionNote?: string;
  resolvedAt?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  studentId: string;
  student?: { id: string; studentId: string; fullName: string; registrationNumber: string };
  mentorId: string;
  mentor?: { fullName: string };
  supervisorId?: string;
  supervisor?: { fullName: string };
  meetingDate: string;
  meetingType: MeetingType;
  discussionSummary: string;
  demonstratedFeatures?: string;
  issuesIdentified?: string;
  decisionsMade?: string;
  nextMeetingDate?: string;
  followUpTasks?: string;
  status: MeetingStatus;
}

export interface Evaluation {
  id: string;
  studentId: string;
  student?: { id: string; studentId: string; fullName: string; registrationNumber: string; project?: { title: string } };
  evaluatorId: string;
  evaluator?: { fullName: string; role: Role };
  stage: EvaluationStage;
  evaluationTitle: string;
  scheduledDate: string;
  completionDate?: string;
  status: EvaluationStatus;
  marksRating?: number;
  feedback?: string;
  areasForImprovement?: string;
  nextSteps?: string;
  formAttachmentUrl?: string;
  rubricScores?: any;
}

export interface FeeAgreement {
  id: string;
  studentId: string;
  totalAgreedFee: number;
  discount: number;
  finalPayableAmount: number;
  paymentPlan: PaymentPlan;
  initialPayment: number;
  numberOfInstallments: number;
  remarks?: string;
  status?: string;
  installments?: PaymentInstallment[];
  payments?: Payment[];
}

export interface PaymentInstallment {
  id: string;
  feeAgreementId: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidDate?: string;
}

export interface Payment {
  id: string;
  paymentId: string;
  feeAgreementId: string;
  studentId: string;
  student?: { id: string; studentId: string; fullName: string; registrationNumber: string };
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  receiptNumber: string;
  recordedById: string;
  recordedBy?: { fullName: string };
  remarks?: string;
  isVoided?: boolean;
  voidReason?: string;
}

export interface MentorAssignmentHistory {
  id: string;
  studentId: string;
  previousMentorId?: string;
  previousMentor?: { fullName: string };
  newMentorId: string;
  newMentor?: { fullName: string };
  changedBy?: { fullName: string };
  reason?: string;
  assignedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

export interface InstituteSettings {
  id: string;
  instituteName: string;
  subtitle: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  expectedReportingFrequencyDays: number;
  supervisorCanEditPayments: boolean;
  mentorsCanViewPaymentIndicator: boolean;
  defaultBatches?: string[];
}

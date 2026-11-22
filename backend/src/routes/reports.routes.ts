import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { Role } from '@prisma/client';
import { PdfService } from '../services/pdfService.js';
import ExcelJS from 'exceljs';

export const reportsRouter = Router();

// GET /api/reports/student-progress-pdf/:studentId - Stream branded A4 PDF report
reportsRouter.get('/student-progress-pdf/:studentId', authenticate, async (req, res): Promise<void> => {
  try {
    const studentId = req.params.studentId;
    const pdfBuffer = await PdfService.generateStudentProgressReport(studentId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="progress_report_${studentId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Generate progress PDF error:', error);
    res.status(500).json({ message: 'Failed to generate project progress report' });
  }
});

// GET /api/reports/mentor-performance - Mentor Workload, Tasks, Progress Updates
reportsRouter.get('/mentor-performance', authenticate, requireRoles(Role.ADMIN, Role.SUPERVISOR), async (req, res) => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: Role.MENTOR, isActive: true },
      include: {
        mentoredStudents: {
          include: {
            project: { select: { currentStage: true, completionPercentage: true } },
            weeklyProgresses: { orderBy: { weekStartDate: 'desc' }, take: 1 },
          },
        },
        supportingMentoredStudents: {
          include: {
            student: {
              include: {
                project: { select: { currentStage: true, completionPercentage: true } },
                weeklyProgresses: { orderBy: { weekStartDate: 'desc' }, take: 1 },
              },
            },
          },
        },
        tasksAssigned: true,
        assignedCorrections: true,
      },
    });

    const report = mentors.map((m) => {
      const primaryStudents = m.mentoredStudents;
      const supportingStudents = m.supportingMentoredStudents.map((sm) => sm.student);
      const allAssigned = [...primaryStudents, ...supportingStudents];
      const totalStudents = allAssigned.length;

      const completedProjects = allAssigned.filter((s) => s.project?.currentStage === 'COMPLETED').length;
      const activeProjects = totalStudents - completedProjects;

      const completedTasks = m.tasksAssigned.filter((t) => t.status === 'COMPLETED').length;
      const totalTasks = m.tasksAssigned.length;

      const resolvedCorrections = m.assignedCorrections.filter((c) => c.status === 'RESOLVED' || c.status === 'VERIFIED').length;
      const openCorrections = m.assignedCorrections.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;

      // Update compliance
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const studentsWithRecentUpdate = allAssigned.filter((s) => {
        const lastWeekly = s.weeklyProgresses[0];
        return lastWeekly && lastWeekly.createdAt >= oneWeekAgo;
      }).length;

      return {
        mentorId: m.id,
        mentorName: m.fullName,
        email: m.email,
        phone: m.phone,
        totalAssigned: totalStudents,
        activeProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100,
        openCorrections,
        resolvedCorrections,
        recentUpdateComplianceRate: activeProjects > 0 ? Math.round((studentsWithRecentUpdate / activeProjects) * 100) : 100,
      };
    });

    res.json({ mentorReports: report });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate mentor performance report' });
  }
});

// GET /api/reports/documentation-status - Documentation audit across all students
reportsRouter.get('/documentation-status', authenticate, async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: {
        assignedMentor: { select: { fullName: true } },
        project: { select: { title: true } },
        documents: {
          select: {
            id: true,
            documentName: true,
            documentType: true,
            status: true,
            currentVersion: true,
            submissionDeadline: true,
            approvedDate: true,
            submissionUrl: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { studentId: 'asc' },
    });

    const docAudit = students.map((s) => {
      const totalDocs = s.documents.length;
      const approvedDocs = s.documents.filter((d) => d.status === 'APPROVED').length;
      const submittedDocs = s.documents.filter((d) => ['SUBMITTED', 'READY_FOR_REVIEW', 'RESUBMITTED'].includes(d.status)).length;
      const pendingDocs = s.documents.filter((d) => ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'CORRECTION_REQUIRED', 'REVISION_REQUIRED'].includes(d.status)).length;

      return {
        studentId: s.studentId,
        studentName: s.fullName,
        registrationNumber: s.registrationNumber,
        mentor: s.assignedMentor?.fullName || 'Unassigned',
        projectTitle: s.project?.title,
        totalDocs,
        approvedDocs,
        submittedDocs,
        pendingDocs,
        completionRate: totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0,
        documents: s.documents,
      };
    });

    res.json({ docAudit });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate documentation status report' });
  }
});

// GET /api/reports/document-submissions - Specific submissions report
reportsRouter.get('/document-submissions', authenticate, async (req, res) => {
  try {
    const submissions = await prisma.studentDocument.findMany({
      where: {
        submissionUrl: { not: null },
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true, batch: true } },
        assignedMentor: { select: { fullName: true } },
        reviewedBy: { select: { fullName: true, role: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });

    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve document submissions report' });
  }
});

// GET /api/reports/task-audit - Task completion and GitHub tracking audit
reportsRouter.get('/task-audit', authenticate, async (req, res) => {
  try {
    const tasks = await prisma.projectTask.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        project: {
          select: {
            title: true,
            student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true, batch: true } },
          },
        },
        assignedMentor: { select: { fullName: true } },
      },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const inReviewTasks = tasks.filter((t) => t.status === 'SUBMITTED_FOR_REVIEW').length;
    const withGithubEvidence = tasks.filter((t) => Boolean(t.githubRepoUrl || t.githubCommitOrPrUrl)).length;

    res.json({
      summary: {
        totalTasks,
        completedTasks,
        inReviewTasks,
        withGithubEvidence,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      tasks,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate task audit report' });
  }
});

// GET /api/reports/deadlines - Overdue and upcoming milestones and tasks
reportsRouter.get('/deadlines', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const next14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const [overdueTasks, upcomingTasks, upcomingMilestones] = await Promise.all([
      prisma.projectTask.findMany({
        where: {
          status: { in: ['TO_DO', 'IN_PROGRESS', 'NOT_STARTED', 'CORRECTION_REQUIRED'] },
          dueDate: { lt: now },
        },
        include: {
          project: { select: { student: { select: { fullName: true, studentId: true } }, title: true } },
          assignedMentor: { select: { fullName: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.projectTask.findMany({
        where: {
          status: { in: ['TO_DO', 'IN_PROGRESS', 'NOT_STARTED'] },
          dueDate: { gte: now, lte: next14Days },
        },
        include: {
          project: { select: { student: { select: { fullName: true, studentId: true } }, title: true } },
          assignedMentor: { select: { fullName: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.projectMilestone.findMany({
        where: {
          status: { in: ['TO_DO', 'IN_PROGRESS'] },
          dueDate: { gte: now, lte: next14Days },
        },
        include: {
          project: { select: { student: { select: { fullName: true, studentId: true } }, title: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    res.json({
      overdueTasks,
      upcomingTasks,
      upcomingMilestones,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve deadlines report' });
  }
});

// GET /api/reports/export-csv - Export dataset to Excel/CSV
reportsRouter.get('/export-csv', authenticate, requireRoles(Role.ADMIN, Role.SUPERVISOR), async (req, res): Promise<void> => {
  try {
    const { type = 'students' } = req.query;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export Data');

    if (type === 'students') {
      worksheet.columns = [
        { header: 'Student ID', key: 'studentId', width: 16 },
        { header: 'Full Name', key: 'fullName', width: 25 },
        { header: 'Reg Number', key: 'regNo', width: 18 },
        { header: 'University', key: 'uni', width: 30 },
        { header: 'Degree', key: 'degree', width: 25 },
        { header: 'Batch', key: 'batch', width: 10 },
        { header: 'Academic Year', key: 'academicYear', width: 16 },
        { header: 'Project Title', key: 'project', width: 35 },
        { header: 'Stage', key: 'stage', width: 18 },
        { header: 'Progress %', key: 'progress', width: 12 },
        { header: 'Primary Mentor', key: 'mentor', width: 20 },
        { header: 'Supervisor', key: 'supervisor', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Active Account', key: 'isActive', width: 14 },
      ];

      const students = await prisma.student.findMany({
        include: {
          project: true,
          assignedMentor: true,
          assignedSupervisor: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const s of students) {
        worksheet.addRow({
          studentId: s.studentId,
          fullName: s.fullName,
          regNo: s.registrationNumber,
          uni: s.university,
          degree: s.degreeProgramme,
          batch: s.batch,
          academicYear: s.academicYear || '',
          project: s.project?.title || '',
          stage: s.project?.currentStage || '',
          progress: `${s.project?.completionPercentage || 0}%`,
          mentor: s.assignedMentor?.fullName || 'Unassigned',
          supervisor: s.assignedSupervisor?.fullName || 'Unassigned',
          status: s.status,
          isActive: s.isActive ? 'Active' : 'Deactivated',
        });
      }
    } else if (type === 'payments') {
      worksheet.columns = [
        { header: 'Receipt No', key: 'receipt', width: 18 },
        { header: 'Payment Date', key: 'date', width: 15 },
        { header: 'Student Name', key: 'name', width: 25 },
        { header: 'Reg Number', key: 'regNo', width: 18 },
        { header: 'Amount (LKR)', key: 'amount', width: 15 },
        { header: 'Payment Method', key: 'method', width: 18 },
        { header: 'Ref Number', key: 'ref', width: 20 },
        { header: 'Recorded By', key: 'recordedBy', width: 20 },
        { header: 'Remarks', key: 'remarks', width: 30 },
      ];

      const payments = await prisma.payment.findMany({
        where: { isVoided: false },
        include: { student: true, recordedBy: true },
        orderBy: { paymentDate: 'desc' },
      });

      for (const p of payments) {
        worksheet.addRow({
          receipt: p.receiptNumber,
          date: new Date(p.paymentDate).toLocaleDateString(),
          name: p.student.fullName,
          regNo: p.student.registrationNumber,
          amount: p.amount,
          method: p.paymentMethod,
          ref: p.referenceNumber || '',
          recordedBy: p.recordedBy.fullName,
          remarks: p.remarks || '',
        });
      }
    } else if (type === 'submissions') {
      worksheet.columns = [
        { header: 'Student ID', key: 'studentId', width: 16 },
        { header: 'Student Name', key: 'studentName', width: 25 },
        { header: 'Document Title', key: 'docTitle', width: 30 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Version', key: 'version', width: 10 },
        { header: 'Submission URL', key: 'url', width: 45 },
        { header: 'Submitted At', key: 'submittedAt', width: 18 },
        { header: 'Reviewer Feedback', key: 'feedback', width: 35 },
      ];

      const docs = await prisma.studentDocument.findMany({
        where: { submissionUrl: { not: null } },
        include: { student: true },
        orderBy: { submittedAt: 'desc' },
      });

      for (const d of docs) {
        worksheet.addRow({
          studentId: d.student.studentId,
          studentName: d.student.fullName,
          docTitle: d.submissionTitle || d.documentName,
          status: d.status,
          version: `v${d.currentVersion}`,
          url: d.submissionUrl || '',
          submittedAt: d.submittedAt ? new Date(d.submittedAt).toLocaleDateString() : '',
          feedback: d.reviewerFeedback || '',
        });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Failed to export report' });
  }
});

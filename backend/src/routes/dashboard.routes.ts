import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { Role } from '@prisma/client';
import { subDays } from 'date-fns';

export const dashboardRouter = Router();

// GET /api/dashboard/admin - Comprehensive Institute Admin Dashboard
dashboardRouter.get('/admin', authenticate, async (req, res) => {
  try {
    const settings = (await prisma.instituteSettings.findFirst()) || {
      expectedReportingFrequencyDays: 7,
    };

    const thresholdDate = subDays(new Date(), settings.expectedReportingFrequencyDays);

    const [
      totalRegistered,
      activeStudents,
      completedProjects,
      pendingDocs,
      overdueTasks,
      upcomingDeadlinesCount,
      allFeeAgreements,
      allPayments,
      mentorsWorkload,
      projectsByStage,
      recentActivities,
      upcomingDemos,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.project.count({ where: { currentStage: 'COMPLETED' } }),
      prisma.studentDocument.count({ where: { status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'REVISION_REQUIRED'] } } }),
      prisma.projectTask.count({ where: { status: { in: ['TO_DO', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } } }),
      prisma.projectTask.count({
        where: {
          status: { in: ['TO_DO', 'IN_PROGRESS'] },
          dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.studentFeeAgreement.findMany({
        select: { finalPayableAmount: true },
      }),
      prisma.payment.findMany({
        where: { isVoided: false },
        select: { amount: true, paymentDate: true },
      }),
      prisma.user.findMany({
        where: { role: Role.MENTOR, isActive: true },
        select: {
          id: true,
          fullName: true,
          _count: {
            select: {
              mentoredStudents: true,
            },
          },
        },
      }),
      prisma.project.groupBy({
        by: ['currentStage'],
        _count: true,
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.meeting.findMany({
        where: {
          meetingDate: { gte: new Date() },
          status: 'SCHEDULED',
        },
        orderBy: { meetingDate: 'asc' },
        take: 5,
        include: {
          student: { select: { fullName: true, studentId: true } },
          mentor: { select: { fullName: true } },
        },
      }),
    ]);

    const totalExpectedFees = allFeeAgreements.reduce((sum, fa) => sum + fa.finalPayableAmount, 0);
    const totalCollectedPayments = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalances = Math.max(0, totalExpectedFees - totalCollectedPayments);

    // Students with missing updates
    const activeStudentsList = await prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: {
        weeklyProgresses: { orderBy: { weekStartDate: 'desc' }, take: 1 },
        dailyProgresses: { orderBy: { date: 'desc' }, take: 1 },
        assignedMentor: { select: { fullName: true } },
        project: { select: { title: true } },
      },
    });

    const studentsRequiringAttention = activeStudentsList
      .map((s) => {
        const lastDate = s.weeklyProgresses[0]?.createdAt || s.dailyProgresses[0]?.date || s.registrationDate;
        const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: s.id,
          studentId: s.studentId,
          fullName: s.fullName,
          projectTitle: s.project?.title,
          assignedMentor: s.assignedMentor?.fullName || 'Unassigned',
          daysSinceLastUpdate: daysSince,
          missingUpdate: daysSince >= settings.expectedReportingFrequencyDays,
        };
      })
      .filter((s) => s.missingUpdate);

    // Monthly payments chart data
    const monthlyMap: Record<string, number> = {};
    for (const p of allPayments) {
      const monthStr = new Date(p.paymentDate).toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + p.amount;
    }

    const paymentCollectionsChart = Object.entries(monthlyMap).map(([month, amount]) => ({
      month,
      amount,
    }));

    res.json({
      summaryCards: {
        totalRegistered,
        activeStudents,
        completedProjects,
        pendingDocs,
        overdueTasks,
        upcomingDeadlines: upcomingDeadlinesCount,
        totalExpectedFees,
        totalCollectedPayments,
        outstandingBalances,
        studentsRequiringAttentionCount: studentsRequiringAttention.length,
      },
      charts: {
        studentsByMentor: mentorsWorkload.map((m) => ({
          mentorName: m.fullName.replace(/\s*\(Demo \d+\)/, ''),
          studentCount: m._count.mentoredStudents,
        })),
        projectStages: projectsByStage.map((ps) => ({
          stage: ps.currentStage.replace(/_/g, ' '),
          count: ps._count,
        })),
        paymentCollectionsChart,
      },
      recentActivities,
      upcomingDemos,
      studentsRequiringAttention: studentsRequiringAttention.slice(0, 5),
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Failed to retrieve admin dashboard metrics' });
  }
});

// GET /api/dashboard/supervisor - Supervisor Monitoring Dashboard
dashboardRouter.get('/supervisor', authenticate, async (req, res) => {
  try {
    const settings = (await prisma.instituteSettings.findFirst()) || {
      expectedReportingFrequencyDays: 7,
    };

    const [
      totalSupervised,
      pendingReviewsCount,
      overdueMilestonesCount,
      openCorrectionsCount,
      projects,
      mentorsWorkload,
      recentSubmissions,
      upcomingAcademicDeadlines,
    ] = await Promise.all([
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.studentDocument.count({ where: { status: 'READY_FOR_REVIEW' } }),
      prisma.projectMilestone.count({ where: { status: { in: ['TO_DO', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } } }),
      prisma.correction.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.project.findMany({
        select: {
          completionPercentage: true,
          currentStage: true,
        },
      }),
      prisma.user.findMany({
        where: { role: Role.MENTOR, isActive: true },
        select: {
          id: true,
          fullName: true,
          mentoredStudents: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              weeklyProgresses: { orderBy: { weekStartDate: 'desc' }, take: 1 },
            },
          },
        },
      }),
      prisma.studentDocument.findMany({
        where: { status: 'READY_FOR_REVIEW' },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: {
          student: { select: { fullName: true, studentId: true, registrationNumber: true } },
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      }),
      prisma.evaluation.findMany({
        where: { status: 'SCHEDULED' },
        orderBy: { scheduledDate: 'asc' },
        take: 5,
        include: {
          student: { select: { fullName: true, studentId: true, project: { select: { title: true } } } },
        },
      }),
    ]);

    const overallCompletion =
      projects.length > 0
        ? projects.reduce((acc, p) => acc + p.completionPercentage, 0) / projects.length
        : 0;

    // Mentor workload & compliance
    const mentorPerformance = mentorsWorkload.map((m) => {
      const activeCount = m.mentoredStudents.length;
      let missingCount = 0;
      const threshold = subDays(new Date(), settings.expectedReportingFrequencyDays);

      for (const st of m.mentoredStudents) {
        const lastWeekly = st.weeklyProgresses[0];
        if (!lastWeekly || lastWeekly.createdAt < threshold) {
          missingCount++;
        }
      }

      return {
        mentorName: m.fullName,
        activeProjects: activeCount,
        missingWeeklyUpdates: missingCount,
        complianceRate: activeCount > 0 ? Math.round(((activeCount - missingCount) / activeCount) * 100) : 100,
      };
    });

    res.json({
      totalSupervised,
      overallCompletion: Math.round(overallCompletion * 10) / 10,
      pendingReviewsCount,
      overdueMilestonesCount,
      openCorrectionsCount,
      mentorPerformance,
      recentSubmissions,
      upcomingAcademicDeadlines,
    });
  } catch (error) {
    console.error('Supervisor dashboard error:', error);
    res.status(500).json({ message: 'Failed to retrieve supervisor dashboard' });
  }
});

// GET /api/dashboard/mentor - Mentor Personal Work Dashboard
dashboardRouter.get('/mentor', authenticate, async (req, res) => {
  try {
    const mentorId = req.user!.id;
    const now = new Date();
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      assignedStudents,
      myActiveTasks,
      tasksDueThisWeek,
      pendingDocs,
      upcomingDemos,
      feedbackNeedingAction,
    ] = await Promise.all([
      prisma.student.findMany({
        where: { assignedMentorId: mentorId, status: 'ACTIVE' },
        include: {
          project: { select: { id: true, title: true, currentStage: true, completionPercentage: true } },
          weeklyProgresses: { orderBy: { weekStartDate: 'desc' }, take: 1 },
          corrections: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
        },
      }),
      prisma.projectTask.findMany({
        where: {
          assignedMentorId: mentorId,
          status: { in: ['TO_DO', 'IN_PROGRESS'] },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
        include: {
          project: { select: { student: { select: { fullName: true } } } },
        },
      }),
      prisma.projectTask.count({
        where: {
          assignedMentorId: mentorId,
          status: { in: ['TO_DO', 'IN_PROGRESS'] },
          dueDate: { gte: now, lte: endOfWeek },
        },
      }),
      prisma.studentDocument.count({
        where: {
          assignedMentorId: mentorId,
          status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'REVISION_REQUIRED'] },
        },
      }),
      prisma.meeting.findMany({
        where: {
          mentorId,
          meetingDate: { gte: now },
          status: 'SCHEDULED',
        },
        orderBy: { meetingDate: 'asc' },
        take: 4,
        include: {
          student: { select: { fullName: true } },
        },
      }),
      prisma.correction.findMany({
        where: {
          assignedMentorId: mentorId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        orderBy: { deadline: 'asc' },
        include: {
          student: { select: { fullName: true } },
          supervisor: { select: { fullName: true } },
        },
      }),
    ]);

    res.json({
      totalAssignedStudents: assignedStudents.length,
      activeProjectsCount: assignedStudents.length,
      tasksDueThisWeek,
      pendingDocsCount: pendingDocs,
      assignedStudents: assignedStudents.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        fullName: s.fullName,
        registrationNumber: s.registrationNumber,
        projectTitle: s.project?.title,
        currentStage: s.project?.currentStage,
        completionPercentage: s.project?.completionPercentage,
        openCorrections: s.corrections.length,
        lastReportDate: s.weeklyProgresses[0]?.createdAt,
      })),
      myActiveTasks,
      upcomingDemos,
      feedbackNeedingAction,
    });
  } catch (error) {
    console.error('Mentor dashboard error:', error);
    res.status(500).json({ message: 'Failed to retrieve mentor dashboard' });
  }
});

// GET /api/dashboard/student - Student Personal Project Dashboard
dashboardRouter.get('/student', authenticate, async (req, res): Promise<void> => {
  try {
    const student: any = await prisma.student.findFirst({
      where: { userId: req.user!.id },
      include: {
        project: {
          include: {
            milestones: { orderBy: { orderIndex: 'asc' } },
            tasks: { where: { status: { in: ['TO_DO', 'IN_PROGRESS'] } }, orderBy: { dueDate: 'asc' }, take: 6 },
          },
        },
        assignedMentor: { select: { fullName: true, email: true, phone: true } },
        assignedSupervisor: { select: { fullName: true, email: true, phone: true } },
        documents: {
          select: { id: true, documentName: true, status: true },
        },
        corrections: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          select: { id: true, issueDescription: true, correctionInstruction: true, deadline: true, status: true },
        },
        meetings: {
          where: { meetingDate: { gte: new Date() }, status: 'SCHEDULED' },
          orderBy: { meetingDate: 'asc' },
          take: 3,
        },
        feeAgreement: {
          include: {
            payments: { where: { isVoided: false }, select: { amount: true } },
            installments: { orderBy: { installmentNumber: 'asc' } },
          },
        },
      },
    });

    if (!student) {
      res.status(404).json({ message: 'No student record associated with this account.' });
      return;
    }

    const totalPaid = (student.feeAgreement?.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
    const finalPayable = student.feeAgreement?.finalPayableAmount || 0;
    const balance = Math.max(0, finalPayable - totalPaid);

    const approvedDocs = student.documents.filter((d: any) => d.status === 'APPROVED').length;
    const totalDocs = student.documents.length;

    res.json({
      studentId: student.id,
      studentCode: student.studentId,
      fullName: student.fullName,
      registrationNumber: student.registrationNumber,
      batch: student.batch,
      university: student.university,
      degreeProgramme: student.degreeProgramme,
      mentor: student.assignedMentor,
      supervisor: student.assignedSupervisor,
      project: student.project,
      activeTasks: student.project?.tasks || [],
      pendingCorrections: student.corrections,
      upcomingMeetings: student.meetings,
      docsSummary: {
        approved: approvedDocs,
        total: totalDocs,
        percentage: totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0,
      },
      paymentSummary: {
        totalPayable: finalPayable,
        totalPaid,
        balance,
        status: totalPaid >= finalPayable ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID',
      },
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ message: 'Failed to retrieve student dashboard' });
  }
});

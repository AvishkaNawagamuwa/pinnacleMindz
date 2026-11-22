import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, checkStudentAccess, requireRoles } from '../middleware/auth.js';
import { WeeklyStatus, NotificationType, Role } from '@prisma/client';
import { getISOWeek, getYear } from 'date-fns';
export const progressRouter = Router();
// GET /api/progress/daily - List daily progress logs
progressRouter.get('/daily', authenticate, async (req, res) => {
    try {
        const { studentId, mentorId, date, limit = '30' } = req.query;
        const where = {};
        if (studentId)
            where.studentId = String(studentId);
        if (mentorId)
            where.mentorId = String(mentorId);
        if (date) {
            const d = new Date(String(date));
            const nextD = new Date(d);
            nextD.setDate(d.getDate() + 1);
            where.date = { gte: d, lt: nextD };
        }
        if (req.user.role === Role.MENTOR && !studentId) {
            where.OR = [
                { mentorId: req.user.id },
                { student: { supportingMentors: { some: { mentorId: req.user.id } } } },
            ];
        }
        if (req.user.role === Role.STUDENT) {
            const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
            if (!student) {
                res.json({ logs: [] });
                return;
            }
            where.studentId = student.id;
        }
        const logs = await prisma.dailyProgress.findMany({
            where,
            orderBy: { date: 'desc' },
            take: parseInt(limit, 10),
            include: {
                mentor: { select: { fullName: true } },
                student: { select: { fullName: true, studentId: true, registrationNumber: true } },
            },
        });
        res.json({ logs });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve daily progress logs' });
    }
});
// POST /api/progress/daily - Add daily progress entry
progressRouter.post('/daily', authenticate, async (req, res) => {
    try {
        const { studentId, date = new Date(), moduleTask, workPlanned, workCompleted, currentStatus = 'In Progress', problemsEncountered, mistakesIdentified, correctionsRequired, nextAction, attachmentUrl, } = req.body;
        if (!studentId || !moduleTask || !workPlanned || !workCompleted) {
            res.status(400).json({ message: 'studentId, moduleTask, workPlanned, and workCompleted are required' });
            return;
        }
        const access = await checkStudentAccess(req, studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const entry = await prisma.dailyProgress.create({
            data: {
                studentId,
                mentorId: req.user.id,
                date: new Date(date),
                moduleTask,
                workPlanned,
                workCompleted,
                currentStatus,
                problemsEncountered,
                mistakesIdentified,
                correctionsRequired,
                nextAction,
                attachmentUrl,
            },
            include: {
                student: { select: { fullName: true, assignedSupervisorId: true } },
            },
        });
        // Notify supervisor if critical mistake was recorded
        if (mistakesIdentified && entry.student.assignedSupervisorId) {
            await prisma.notification.create({
                data: {
                    userId: entry.student.assignedSupervisorId,
                    title: `Progress Note: Mistake Identified for ${entry.student.fullName}`,
                    message: `Mentor recorded mistake/correction in ${moduleTask}: "${mistakesIdentified}"`,
                    type: NotificationType.SUPERVISOR_FEEDBACK,
                    linkUrl: `/students/${studentId}`,
                },
            });
        }
        res.status(201).json({ message: 'Daily progress recorded successfully', entry });
    }
    catch (error) {
        console.error('Daily progress error:', error);
        res.status(500).json({ message: 'Failed to record daily progress' });
    }
});
// GET /api/progress/weekly - List weekly progress reports
progressRouter.get('/weekly', authenticate, async (req, res) => {
    try {
        const { studentId, mentorId, status, limit = '30' } = req.query;
        const where = {};
        if (studentId)
            where.studentId = String(studentId);
        if (mentorId)
            where.mentorId = String(mentorId);
        if (status)
            where.status = status;
        if (req.user.role === Role.MENTOR && !studentId) {
            where.OR = [
                { mentorId: req.user.id },
                { student: { supportingMentors: { some: { mentorId: req.user.id } } } },
            ];
        }
        if (req.user.role === Role.STUDENT) {
            const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
            if (!student) {
                res.json({ reports: [] });
                return;
            }
            where.studentId = student.id;
        }
        const reports = await prisma.weeklyProgress.findMany({
            where,
            orderBy: { weekStartDate: 'desc' },
            take: parseInt(limit, 10),
            include: {
                mentor: { select: { fullName: true } },
                reviewedBy: { select: { fullName: true, role: true } },
                student: { select: { fullName: true, studentId: true, registrationNumber: true, batch: true } },
                supervisorFeedbacks: {
                    include: { supervisor: { select: { fullName: true } } },
                },
            },
        });
        res.json({ reports });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve weekly progress' });
    }
});
// POST /api/progress/weekly/student-submit - Student submits weekly update with GitHub evidence
progressRouter.post('/weekly/student-submit', authenticate, async (req, res) => {
    try {
        const { studentId, weekStartDate, plannedActivities, completedActivities, currentActivities, challenges, githubEvidenceUrl, nextWeekPlan, } = req.body;
        let targetStudentId = studentId;
        if (req.user.role === Role.STUDENT) {
            const selfStudent = await prisma.student.findFirst({ where: { userId: req.user.id } });
            if (!selfStudent) {
                res.status(404).json({ message: 'Student profile not found' });
                return;
            }
            targetStudentId = selfStudent.id;
        }
        if (!targetStudentId || !weekStartDate || !plannedActivities || !completedActivities) {
            res.status(400).json({ message: 'weekStartDate, plannedActivities, and completedActivities are required.' });
            return;
        }
        const access = await checkStudentAccess(req, targetStudentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const student = await prisma.student.findUnique({
            where: { id: targetStudentId },
            select: { fullName: true, assignedMentorId: true, supportingMentors: true },
        });
        const startDate = new Date(weekStartDate);
        const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
        const weekNumber = getISOWeek(startDate);
        const year = getYear(startDate);
        const report = await prisma.weeklyProgress.upsert({
            where: {
                studentId_year_weekNumber: {
                    studentId: targetStudentId,
                    year,
                    weekNumber,
                },
            },
            update: {
                plannedActivities,
                completedActivities,
                currentActivities: currentActivities || null,
                challenges: challenges || null,
                githubEvidenceUrl: githubEvidenceUrl ? githubEvidenceUrl.trim() : null,
                nextWeekPlan: nextWeekPlan || null,
                status: WeeklyStatus.IN_PROGRESS,
                reviewStatus: 'PENDING',
            },
            create: {
                studentId: targetStudentId,
                mentorId: student?.assignedMentorId || req.user.id,
                weekStartDate: startDate,
                weekEndDate: endDate,
                weekNumber,
                year,
                plannedActivities,
                completedActivities,
                currentActivities: currentActivities || null,
                challenges: challenges || null,
                githubEvidenceUrl: githubEvidenceUrl ? githubEvidenceUrl.trim() : null,
                nextWeekPlan: nextWeekPlan || null,
                status: WeeklyStatus.IN_PROGRESS,
                reviewStatus: 'PENDING',
            },
        });
        // Notify mentor
        if (student?.assignedMentorId) {
            await prisma.notification.create({
                data: {
                    userId: student.assignedMentorId,
                    title: `Weekly Progress Submitted: ${student.fullName}`,
                    message: `${student.fullName} submitted weekly report for Week ${weekNumber} (${year}).`,
                    type: NotificationType.MISSING_UPDATE,
                    linkUrl: `/weekly-progress`,
                },
            });
        }
        res.json({ message: 'Weekly progress report submitted successfully', report });
    }
    catch (error) {
        console.error('Student weekly progress error:', error);
        res.status(500).json({ message: 'Failed to submit weekly progress report' });
    }
});
// POST /api/progress/weekly/:id/review - Mentor / Supervisor reviews weekly progress
progressRouter.post('/weekly/:id/review', authenticate, requireRoles(Role.ADMIN, Role.SUPERVISOR, Role.MENTOR), async (req, res) => {
    try {
        const reportId = req.params.id;
        const { reviewStatus, mentorNotes } = req.body;
        if (!reviewStatus || !['APPROVED', 'REVISION_REQUESTED'].includes(reviewStatus)) {
            res.status(400).json({ message: 'reviewStatus must be APPROVED or REVISION_REQUESTED' });
            return;
        }
        const report = await prisma.weeklyProgress.findUnique({
            where: { id: reportId },
            include: {
                student: { select: { id: true, fullName: true, userId: true } },
            },
        });
        if (!report) {
            res.status(404).json({ message: 'Weekly progress report not found' });
            return;
        }
        const nextWeeklyStatus = reviewStatus === 'APPROVED' ? WeeklyStatus.COMPLETED : WeeklyStatus.BLOCKED;
        const updated = await prisma.weeklyProgress.update({
            where: { id: reportId },
            data: {
                reviewStatus,
                mentorNotes: mentorNotes || undefined,
                status: nextWeeklyStatus,
                reviewedById: req.user.id,
                reviewedAt: new Date(),
            },
        });
        // Notify student
        if (report.student.userId) {
            await prisma.notification.create({
                data: {
                    userId: report.student.userId,
                    title: `Weekly Report ${reviewStatus === 'APPROVED' ? 'Approved' : 'Revision Requested'}`,
                    message: `Your weekly progress report for Week ${report.weekNumber} was marked as ${reviewStatus}. Notes: "${mentorNotes || 'Reviewed'}"`,
                    type: NotificationType.SUPERVISOR_FEEDBACK,
                    linkUrl: `/weekly-progress`,
                },
            });
        }
        res.json({ message: `Weekly progress review recorded as ${reviewStatus}`, report: updated });
    }
    catch (error) {
        console.error('Weekly progress review error:', error);
        res.status(500).json({ message: 'Failed to record weekly progress review' });
    }
});
// POST /api/progress/weekly - Mentor / Supervisor adds or updates general weekly report
progressRouter.post('/weekly', authenticate, async (req, res) => {
    try {
        const { studentId, weekStartDate, weekEndDate, plannedActivities, completedActivities, incompleteActivities, problemsBlockers, supervisorFeedback, nextWeekPlan, mentorNotes, status = 'IN_PROGRESS', } = req.body;
        if (!studentId || !weekStartDate || !plannedActivities || !completedActivities) {
            res.status(400).json({ message: 'Missing required weekly progress fields' });
            return;
        }
        const access = await checkStudentAccess(req, studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const startDate = new Date(weekStartDate);
        const endDate = weekEndDate ? new Date(weekEndDate) : new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
        const weekNumber = getISOWeek(startDate);
        const year = getYear(startDate);
        const report = await prisma.weeklyProgress.upsert({
            where: {
                studentId_year_weekNumber: {
                    studentId,
                    year,
                    weekNumber,
                },
            },
            update: {
                plannedActivities,
                completedActivities,
                incompleteActivities,
                problemsBlockers,
                supervisorFeedback,
                nextWeekPlan,
                mentorNotes,
                status: status,
            },
            create: {
                studentId,
                mentorId: req.user.id,
                weekStartDate: startDate,
                weekEndDate: endDate,
                weekNumber,
                year,
                plannedActivities,
                completedActivities,
                incompleteActivities,
                problemsBlockers,
                supervisorFeedback,
                nextWeekPlan,
                mentorNotes,
                status: status,
            },
        });
        res.status(201).json({ message: 'Weekly progress saved', report });
    }
    catch (error) {
        console.error('Weekly progress error:', error);
        res.status(500).json({ message: 'Failed to save weekly progress' });
    }
});

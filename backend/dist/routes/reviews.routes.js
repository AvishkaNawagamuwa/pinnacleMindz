import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { CorrectionStatus, NotificationType, Role } from '@prisma/client';
export const reviewsRouter = Router();
// GET /api/reviews/corrections - List corrections with filters
reviewsRouter.get('/corrections', authenticate, async (req, res) => {
    try {
        const { studentId, status, mentorId, supervisorId } = req.query;
        const where = {};
        if (studentId)
            where.studentId = String(studentId);
        if (status)
            where.status = status;
        if (mentorId)
            where.assignedMentorId = String(mentorId);
        if (supervisorId)
            where.supervisorId = String(supervisorId);
        if (req.user.role === Role.MENTOR && !studentId) {
            where.assignedMentorId = req.user.id;
        }
        if (req.user.role === Role.STUDENT) {
            const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
            if (!student) {
                res.json({ corrections: [] });
                return;
            }
            where.studentId = student.id;
        }
        const corrections = await prisma.correction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true } },
                supervisor: { select: { fullName: true } },
                assignedMentor: { select: { fullName: true } },
                task: { select: { id: true, title: true } },
                studentDocument: { select: { id: true, documentName: true } },
            },
        });
        res.json({ corrections });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve corrections' });
    }
});
// POST /api/reviews/corrections - Supervisor creates correction
reviewsRouter.post('/corrections', authenticate, requireRoles(Role.ADMIN, Role.SUPERVISOR), async (req, res) => {
    try {
        const { studentId, taskId, studentDocumentId, issueDescription, correctionInstruction, deadline, } = req.body;
        if (!studentId || !issueDescription || !correctionInstruction) {
            res.status(400).json({ message: 'studentId, issueDescription, and correctionInstruction are required' });
            return;
        }
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, fullName: true, assignedMentorId: true },
        });
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        const correction = await prisma.correction.create({
            data: {
                studentId,
                taskId: taskId || null,
                studentDocumentId: studentDocumentId || null,
                supervisorId: req.user.id,
                assignedMentorId: student.assignedMentorId || req.user.id,
                issueDescription: issueDescription.trim(),
                correctionInstruction: correctionInstruction.trim(),
                deadline: deadline ? new Date(deadline) : null,
                status: CorrectionStatus.OPEN,
            },
            include: {
                supervisor: { select: { fullName: true } },
            },
        });
        // Notify mentor
        if (student.assignedMentorId) {
            await prisma.notification.create({
                data: {
                    userId: student.assignedMentorId,
                    title: `New Correction Assigned: ${student.fullName}`,
                    message: `Supervisor assigned correction: "${issueDescription}". Deadline: ${deadline ? new Date(deadline).toLocaleDateString() : 'Immediate'}.`,
                    type: NotificationType.CORRECTION,
                    linkUrl: `/students/${studentId}`,
                },
            });
        }
        res.status(201).json({ message: 'Correction created', correction });
    }
    catch (error) {
        console.error('Create correction error:', error);
        res.status(500).json({ message: 'Failed to create correction' });
    }
});
// PUT /api/reviews/corrections/:id - Update correction status
reviewsRouter.put('/corrections/:id', authenticate, async (req, res) => {
    try {
        const correctionId = req.params.id;
        const { status, resolutionNote } = req.body;
        const correction = await prisma.correction.findUnique({
            where: { id: correctionId },
            include: { student: true },
        });
        if (!correction) {
            res.status(404).json({ message: 'Correction not found' });
            return;
        }
        // Role-based rule:
        // Mentors can set status to RESOLVED and add resolutionNote
        // Supervisors / Admins can set status to VERIFIED or reopen to OPEN / IN_PROGRESS
        if (status === CorrectionStatus.VERIFIED && req.user.role !== Role.ADMIN && req.user.role !== Role.SUPERVISOR) {
            res.status(403).json({ message: 'Only supervisors or administrators can verify and close corrections.' });
            return;
        }
        const updated = await prisma.correction.update({
            where: { id: correctionId },
            data: {
                status: status,
                resolutionNote: resolutionNote !== undefined ? resolutionNote : undefined,
                resolvedAt: status === CorrectionStatus.RESOLVED ? new Date() : undefined,
                verifiedAt: status === CorrectionStatus.VERIFIED ? new Date() : undefined,
            },
        });
        // Notify supervisor when mentor marks RESOLVED
        if (status === CorrectionStatus.RESOLVED && correction.supervisorId) {
            await prisma.notification.create({
                data: {
                    userId: correction.supervisorId,
                    title: `Correction Resolved: ${correction.student.fullName}`,
                    message: `Mentor resolved correction on "${correction.issueDescription}". Ready for verification.`,
                    type: NotificationType.CORRECTION,
                    linkUrl: `/students/${correction.studentId}`,
                },
            });
        }
        res.json({ message: 'Correction updated', correction: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update correction' });
    }
});
// POST /api/reviews/feedback - Add supervisor feedback
reviewsRouter.post('/feedback', authenticate, requireRoles(Role.ADMIN, Role.SUPERVISOR), async (req, res) => {
    try {
        const { studentId, weeklyProgressId, studentDocumentId, feedbackType, comments, mistakesIdentified, priority = 'MEDIUM' } = req.body;
        if (!studentId || !comments) {
            res.status(400).json({ message: 'studentId and comments are required' });
            return;
        }
        const feedback = await prisma.supervisorFeedback.create({
            data: {
                studentId,
                supervisorId: req.user.id,
                weeklyProgressId: weeklyProgressId || null,
                studentDocumentId: studentDocumentId || null,
                feedbackType: feedbackType || 'Supervisor Directive',
                comments,
                mistakesIdentified,
                priority: priority,
            },
            include: {
                student: { select: { fullName: true, assignedMentorId: true } },
            },
        });
        if (feedback.student.assignedMentorId) {
            await prisma.notification.create({
                data: {
                    userId: feedback.student.assignedMentorId,
                    title: `Supervisor Feedback for ${feedback.student.fullName}`,
                    message: comments.slice(0, 100) + '...',
                    type: NotificationType.SUPERVISOR_FEEDBACK,
                    linkUrl: `/students/${studentId}`,
                },
            });
        }
        res.status(201).json({ message: 'Supervisor feedback submitted', feedback });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to submit feedback' });
    }
});

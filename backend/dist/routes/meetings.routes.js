import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, checkStudentAccess } from '../middleware/auth.js';
import { Role } from '@prisma/client';
export const meetingsRouter = Router();
// GET /api/meetings - List meetings with calendar filters
meetingsRouter.get('/', authenticate, async (req, res) => {
    try {
        const { studentId, mentorId, supervisorId, startDate, endDate, status } = req.query;
        const where = {};
        if (studentId)
            where.studentId = String(studentId);
        if (mentorId)
            where.mentorId = String(mentorId);
        if (supervisorId)
            where.supervisorId = String(supervisorId);
        if (status)
            where.status = status;
        if (startDate && endDate) {
            where.meetingDate = {
                gte: new Date(String(startDate)),
                lte: new Date(String(endDate)),
            };
        }
        if (req.user.role === Role.MENTOR && !studentId) {
            where.mentorId = req.user.id;
        }
        if (req.user.role === Role.STUDENT) {
            const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
            if (!student) {
                res.json({ meetings: [] });
                return;
            }
            where.studentId = student.id;
        }
        const meetings = await prisma.meeting.findMany({
            where,
            orderBy: { meetingDate: 'asc' },
            include: {
                student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true } },
                mentor: { select: { fullName: true } },
                supervisor: { select: { fullName: true } },
            },
        });
        res.json({ meetings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve meetings' });
    }
});
// POST /api/meetings - Schedule new meeting / demo session
meetingsRouter.post('/', authenticate, async (req, res) => {
    try {
        const { studentId, supervisorId, meetingDate, meetingType = 'PROJECT_DISCUSSION', discussionSummary, demonstratedFeatures, issuesIdentified, decisionsMade, nextMeetingDate, followUpTasks, } = req.body;
        if (!studentId || !meetingDate || !discussionSummary) {
            res.status(400).json({ message: 'studentId, meetingDate, and discussionSummary are required' });
            return;
        }
        const access = await checkStudentAccess(req, studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { fullName: true, assignedSupervisorId: true },
        });
        const meeting = await prisma.meeting.create({
            data: {
                studentId,
                mentorId: req.user.id,
                supervisorId: supervisorId || student?.assignedSupervisorId || null,
                meetingDate: new Date(meetingDate),
                meetingType: meetingType,
                discussionSummary,
                demonstratedFeatures,
                issuesIdentified,
                decisionsMade,
                nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : null,
                followUpTasks,
            },
            include: {
                student: { select: { fullName: true } },
            },
        });
        res.status(201).json({ message: 'Meeting scheduled successfully', meeting });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to schedule meeting' });
    }
});
// PUT /api/meetings/:id - Update meeting details or status
meetingsRouter.put('/:id', authenticate, async (req, res) => {
    try {
        const meetingId = req.params.id;
        const { status, discussionSummary, demonstratedFeatures, issuesIdentified, decisionsMade, nextMeetingDate, followUpTasks } = req.body;
        const updated = await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                status: status ? status : undefined,
                discussionSummary: discussionSummary !== undefined ? discussionSummary : undefined,
                demonstratedFeatures: demonstratedFeatures !== undefined ? demonstratedFeatures : undefined,
                issuesIdentified: issuesIdentified !== undefined ? issuesIdentified : undefined,
                decisionsMade: decisionsMade !== undefined ? decisionsMade : undefined,
                nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : undefined,
                followUpTasks: followUpTasks !== undefined ? followUpTasks : undefined,
            },
        });
        res.json({ message: 'Meeting record updated', meeting: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update meeting' });
    }
});

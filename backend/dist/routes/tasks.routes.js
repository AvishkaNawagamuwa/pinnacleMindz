"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const client_1 = require("@prisma/client");
exports.tasksRouter = (0, express_1.Router)();
// GET /api/tasks - List tasks with view filters (Kanban, Table, Calendar)
exports.tasksRouter.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { studentId, projectId, status, priority, mentorId, search } = req.query;
        const where = {};
        if (studentId)
            where.project = { studentId: String(studentId) };
        if (projectId)
            where.projectId = String(projectId);
        if (status)
            where.status = status;
        if (priority)
            where.priority = priority;
        if (mentorId)
            where.assignedMentorId = String(mentorId);
        if (search) {
            where.OR = [
                { title: { contains: String(search), mode: 'insensitive' } },
                { description: { contains: String(search), mode: 'insensitive' } },
                { moduleName: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        if (req.user.role === client_1.Role.MENTOR && !studentId && !projectId) {
            where.OR = [
                { assignedMentorId: req.user.id },
                { project: { student: { supportingMentors: { some: { mentorId: req.user.id } } } } },
            ];
        }
        if (req.user.role === client_1.Role.STUDENT) {
            const student = await prisma_js_1.prisma.student.findFirst({ where: { userId: req.user.id } });
            if (!student) {
                res.json({ tasks: [] });
                return;
            }
            where.project = { studentId: student.id };
        }
        const tasks = await prisma_js_1.prisma.projectTask.findMany({
            where,
            orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
            include: {
                project: {
                    select: {
                        id: true,
                        title: true,
                        currentStage: true,
                        student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true } },
                    },
                },
                milestone: { select: { id: true, title: true, stage: true } },
                assignedMentor: { select: { id: true, fullName: true, email: true } },
                comments: {
                    include: { author: { select: { fullName: true, role: true } } },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        res.json({ tasks });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve tasks' });
    }
});
// POST /api/tasks - Create new task
exports.tasksRouter.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { projectId, studentId, milestoneId, moduleName, title, description, priority = 'MEDIUM', startDate, dueDate, responsiblePerson = 'Student', assignedMentorId, } = req.body;
        if (!title || (!projectId && !studentId)) {
            res.status(400).json({ message: 'Title and projectId/studentId are required' });
            return;
        }
        let targetProjectId = projectId;
        if (!targetProjectId && studentId) {
            const student = await prisma_js_1.prisma.student.findUnique({
                where: { id: studentId },
                include: { project: true },
            });
            if (!student?.project) {
                res.status(404).json({ message: 'Project not found for this student' });
                return;
            }
            targetProjectId = student.project.id;
        }
        const project = await prisma_js_1.prisma.project.findUnique({
            where: { id: targetProjectId },
            include: { student: true },
        });
        if (!project) {
            res.status(404).json({ message: 'Project not found' });
            return;
        }
        const access = await (0, auth_js_1.checkStudentAccess)(req, project.studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const taskMentorId = assignedMentorId || (req.user.role === client_1.Role.MENTOR ? req.user.id : project.student.assignedMentorId);
        const task = await prisma_js_1.prisma.projectTask.create({
            data: {
                projectId: targetProjectId,
                milestoneId: milestoneId || null,
                moduleName,
                title: title.trim(),
                description,
                priority: priority,
                status: client_1.TaskStatus.NOT_STARTED,
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                responsiblePerson,
                assignedMentorId: taskMentorId || undefined,
                completionPercentage: 0,
            },
            include: {
                project: { select: { student: { select: { id: true, fullName: true, userId: true } } } },
            },
        });
        // Notify student
        if (task.project?.student?.userId) {
            await prisma_js_1.prisma.notification.create({
                data: {
                    userId: task.project.student.userId,
                    title: `New Task Assigned: ${title}`,
                    message: `A new task "${title}" has been assigned to your project.`,
                    type: client_1.NotificationType.SYSTEM,
                    linkUrl: `/tasks`,
                },
            });
        }
        res.status(201).json({ message: 'Task created', task });
    }
    catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ message: 'Failed to create task' });
    }
});
// PUT /api/tasks/:id/student-progress - Student updates progress, percentage, & GitHub evidence
exports.tasksRouter.put('/:id/student-progress', auth_js_1.authenticate, async (req, res) => {
    try {
        const taskId = req.params.id;
        const { completionPercentage, githubRepoUrl, githubCommitOrPrUrl, studentProgressNote, status } = req.body;
        const task = await prisma_js_1.prisma.projectTask.findUnique({
            where: { id: taskId },
            include: {
                project: {
                    include: {
                        student: { select: { id: true, fullName: true, assignedMentorId: true, assignedSupervisorId: true } },
                    },
                },
            },
        });
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }
        const access = await (0, auth_js_1.checkStudentAccess)(req, task.project.studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const parsedPercent = completionPercentage !== undefined ? Math.min(100, Math.max(0, Number(completionPercentage))) : task.completionPercentage;
        const nextStatus = status
            ? status
            : parsedPercent === 100
                ? client_1.TaskStatus.SUBMITTED_FOR_REVIEW
                : parsedPercent > 0
                    ? client_1.TaskStatus.IN_PROGRESS
                    : task.status;
        const updated = await prisma_js_1.prisma.projectTask.update({
            where: { id: taskId },
            data: {
                completionPercentage: parsedPercent,
                githubRepoUrl: githubRepoUrl ? githubRepoUrl.trim() : undefined,
                githubCommitOrPrUrl: githubCommitOrPrUrl ? githubCommitOrPrUrl.trim() : undefined,
                studentProgressNote: studentProgressNote ? studentProgressNote.trim() : undefined,
                status: nextStatus,
            },
        });
        // Notify mentor
        const mentorId = task.assignedMentorId || task.project.student.assignedMentorId;
        if (mentorId) {
            await prisma_js_1.prisma.notification.create({
                data: {
                    userId: mentorId,
                    title: `Task Progress Updated: ${task.title}`,
                    message: `${task.project.student.fullName} updated progress on "${task.title}" to ${parsedPercent}%. Status: ${nextStatus}.`,
                    type: client_1.NotificationType.SYSTEM,
                    linkUrl: `/tasks`,
                },
            });
        }
        res.json({ message: 'Task progress updated successfully', task: updated });
    }
    catch (error) {
        console.error('Update task progress error:', error);
        res.status(500).json({ message: 'Failed to update task progress' });
    }
});
// POST /api/tasks/:id/verify - Mentor / Supervisor verifies evidence and marks complete or correction
exports.tasksRouter.post('/:id/verify', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN, client_1.Role.SUPERVISOR, client_1.Role.MENTOR), async (req, res) => {
    try {
        const taskId = req.params.id;
        const { status, mentorFeedback } = req.body;
        const allowedStatuses = [
            client_1.TaskStatus.COMPLETED,
            client_1.TaskStatus.REVISION_REQUIRED,
            client_1.TaskStatus.IN_PROGRESS,
        ];
        if (!status || !allowedStatuses.includes(status)) {
            res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(', ')}` });
            return;
        }
        const task = await prisma_js_1.prisma.projectTask.findUnique({
            where: { id: taskId },
            include: {
                project: {
                    include: {
                        student: { select: { id: true, fullName: true, userId: true } },
                        tasks: true,
                    },
                },
            },
        });
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }
        const isCompleted = status === client_1.TaskStatus.COMPLETED;
        const updated = await prisma_js_1.prisma.projectTask.update({
            where: { id: taskId },
            data: {
                status: status,
                mentorFeedback: mentorFeedback || null,
                completionPercentage: isCompleted ? 100 : status === client_1.TaskStatus.REVISION_REQUIRED ? Math.min(task.completionPercentage, 80) : task.completionPercentage,
                completionDate: isCompleted ? new Date() : null,
            },
        });
        // Recalculate project overall progress
        const allTasks = task.project.tasks;
        const completedTasksCount = allTasks.filter((t) => t.id === taskId ? isCompleted : t.status === client_1.TaskStatus.COMPLETED).length;
        const overallProgress = allTasks.length > 0 ? Math.round((completedTasksCount / allTasks.length) * 100) : 0;
        await prisma_js_1.prisma.project.update({
            where: { id: task.projectId },
            data: { completionPercentage: overallProgress },
        });
        // Notify student
        if (task.project.student.userId) {
            await prisma_js_1.prisma.notification.create({
                data: {
                    userId: task.project.student.userId,
                    title: `Task Review: ${task.title}`,
                    message: `Your mentor marked task "${task.title}" as ${status}. Feedback: "${mentorFeedback || 'Reviewed'}"`,
                    type: isCompleted ? client_1.NotificationType.SUPERVISOR_FEEDBACK : client_1.NotificationType.CORRECTION,
                    linkUrl: `/tasks`,
                },
            });
        }
        res.json({ message: `Task verified as ${status}`, task: updated, overallProjectProgress: overallProgress });
    }
    catch (error) {
        console.error('Verify task error:', error);
        res.status(500).json({ message: 'Failed to verify task' });
    }
});
// PUT /api/tasks/:id - General task update
exports.tasksRouter.put('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const taskId = req.params.id;
        const task = await prisma_js_1.prisma.projectTask.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }
        const access = await (0, auth_js_1.checkStudentAccess)(req, task.project.studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const { status, title, description, priority, dueDate, feedback, completionPercentage } = req.body;
        const updated = await prisma_js_1.prisma.projectTask.update({
            where: { id: taskId },
            data: {
                status: status ? status : undefined,
                title: title !== undefined ? title : undefined,
                description: description !== undefined ? description : undefined,
                priority: priority ? priority : undefined,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                feedback: feedback !== undefined ? feedback : undefined,
                completionPercentage: completionPercentage !== undefined ? Number(completionPercentage) : undefined,
                completionDate: status === client_1.TaskStatus.COMPLETED ? new Date() : status ? null : undefined,
            },
        });
        res.json({ message: 'Task updated', task: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update task' });
    }
});
// POST /api/tasks/:id/comments - Add task comment
exports.tasksRouter.post('/:id/comments', auth_js_1.authenticate, async (req, res) => {
    try {
        const taskId = req.params.id;
        const { content, attachmentUrl } = req.body;
        if (!content) {
            res.status(400).json({ message: 'Comment content is required' });
            return;
        }
        const comment = await prisma_js_1.prisma.taskComment.create({
            data: {
                taskId,
                authorId: req.user.id,
                content,
                attachmentUrl,
            },
            include: {
                author: { select: { fullName: true, role: true } },
            },
        });
        res.status(201).json({ message: 'Comment posted', comment });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to post comment' });
    }
});
// DELETE /api/tasks/:id
exports.tasksRouter.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const taskId = req.params.id;
        const task = await prisma_js_1.prisma.projectTask.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }
        const access = await (0, auth_js_1.checkStudentAccess)(req, task.project.studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        await prisma_js_1.prisma.projectTask.delete({ where: { id: taskId } });
        res.json({ message: 'Task deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to delete task' });
    }
});

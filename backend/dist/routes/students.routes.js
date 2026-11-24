"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentsRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.studentsRouter = (0, express_1.Router)();
// GET /api/students - List students with search, filters, pagination
exports.studentsRouter.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { search, mentorId, supervisorId, batch, status, stage, mode = 'all', // 'my' (mentor's assigned only), 'all' (directory or admin list)
        page = '1', limit = '50', } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 50;
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search) {
            const q = String(search).trim();
            where.OR = [
                { fullName: { contains: q, mode: 'insensitive' } },
                { registrationNumber: { contains: q, mode: 'insensitive' } },
                { studentId: { contains: q, mode: 'insensitive' } },
                { project: { title: { contains: q, mode: 'insensitive' } } },
            ];
        }
        if (mentorId) {
            where.OR = [
                { assignedMentorId: String(mentorId) },
                { supportingMentors: { some: { mentorId: String(mentorId) } } },
            ];
        }
        if (supervisorId)
            where.assignedSupervisorId = String(supervisorId);
        if (batch)
            where.batch = String(batch);
        if (status)
            where.status = status;
        if (stage) {
            where.project = {
                ...where.project,
                currentStage: stage,
            };
        }
        // Role-specific filtering
        const isMentor = req.user.role === client_1.Role.MENTOR;
        if (isMentor && mode === 'my') {
            where.OR = [
                { assignedMentorId: req.user.id },
                { supportingMentors: { some: { mentorId: req.user.id } } },
            ];
        }
        // Student role can only see themselves
        if (req.user.role === client_1.Role.STUDENT) {
            const selfStudent = await prisma_js_1.prisma.student.findFirst({
                where: { userId: req.user.id },
                select: { id: true },
            });
            if (!selfStudent) {
                res.json({ students: [], pagination: { total: 0, page: 1, limit: limitNum, totalPages: 0 } });
                return;
            }
            where.id = selfStudent.id;
        }
        const [total, students] = await Promise.all([
            prisma_js_1.prisma.student.count({ where }),
            prisma_js_1.prisma.student.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    project: {
                        select: {
                            id: true,
                            projectId: true,
                            title: true,
                            currentStage: true,
                            completionPercentage: true,
                            techStack: true,
                        },
                    },
                    assignedMentor: { select: { id: true, fullName: true, email: true } },
                    assignedSupervisor: { select: { id: true, fullName: true, email: true } },
                    supportingMentors: {
                        include: {
                            mentor: { select: { id: true, fullName: true, email: true } },
                        },
                    },
                    feeAgreement: {
                        include: {
                            payments: {
                                where: { isVoided: false },
                                select: { amount: true },
                            },
                        },
                    },
                    _count: {
                        select: {
                            documents: true,
                            dailyProgresses: true,
                            weeklyProgresses: true,
                            corrections: { where: { status: { not: 'VERIFIED' } } },
                        },
                    },
                },
            }),
        ]);
        // Format list and sanitize fields if mentor viewing unassigned students in directory
        const sanitizedStudents = students.map((s) => {
            const isAssignedToReqMentor = isMentor &&
                (s.assignedMentorId === req.user.id ||
                    s.supportingMentors.some((sm) => sm.mentorId === req.user.id));
            const canSeeFull = req.user.role === client_1.Role.ADMIN ||
                req.user.role === client_1.Role.SUPER_ADMIN ||
                req.user.role === client_1.Role.SUPERVISOR ||
                isAssignedToReqMentor;
            let paymentSummary = null;
            if (canSeeFull && s.feeAgreement) {
                const totalPaid = s.feeAgreement.payments.reduce((acc, p) => acc + p.amount, 0);
                paymentSummary = {
                    finalPayable: s.feeAgreement.finalPayableAmount,
                    totalPaid,
                    balance: s.feeAgreement.finalPayableAmount - totalPaid,
                    status: totalPaid >= s.feeAgreement.finalPayableAmount ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID',
                };
            }
            else if (isMentor) {
                paymentSummary = { indicatorOnly: true };
            }
            return {
                id: s.id,
                studentId: s.studentId,
                registrationNumber: s.registrationNumber,
                fullName: s.fullName,
                degreeProgramme: s.degreeProgramme,
                university: s.university,
                batch: s.batch,
                academicYear: s.academicYear,
                status: s.status,
                isActive: s.isActive,
                project: s.project,
                assignedMentor: s.assignedMentor,
                assignedSupervisor: s.assignedSupervisor,
                supportingMentors: s.supportingMentors.map((sm) => sm.mentor),
                isMyStudent: isAssignedToReqMentor,
                email: canSeeFull ? s.email : undefined,
                contactNumber: canSeeFull ? s.contactNumber : undefined,
                whatsappNumber: canSeeFull ? s.whatsappNumber : undefined,
                paymentSummary,
                activeCorrectionsCount: s._count.corrections,
                documentsCount: s._count.documents,
                lastUpdated: s.updatedAt,
            };
        });
        res.json({
            students: sanitizedStudents,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('List students error:', error);
        res.status(500).json({ message: 'Failed to retrieve students list' });
    }
});
// POST /api/students - Register new student (Admin / Super Admin only)
exports.studentsRouter.post('/', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const { registrationNumber, fullName, email, username, contactNumber, whatsappNumber, university = 'University of Colombo School of Computing (UCSC)', degreeProgramme = 'Bachelor of Information Technology (BIT)', batch = '2026', academicYear = 'Level 3 / Year 3', currentAddress, assignedSupervisorId, assignedMentorId, supportingMentorIds = [], remarks, projectTitle, projectIdea, problemStatement, proposedSolution, mainObjectives, mainModules, techStack, category, totalAgreedFee = 65000, discount = 0, initialPayment = 0, numberOfInstallments = 3, paymentMethod = 'BANK_TRANSFER', referenceNumber, } = req.body;
        if (!registrationNumber || !fullName || !email || !contactNumber || !projectTitle) {
            res.status(400).json({ message: 'Missing required student or project information.' });
            return;
        }
        const trimmedReg = registrationNumber.trim();
        const trimmedEmail = email.toLowerCase().trim();
        const studentUsername = username ? username.trim() : trimmedReg;
        // Check unique constraints (registrationNumber, email, username)
        const existing = await prisma_js_1.prisma.student.findFirst({
            where: {
                OR: [{ registrationNumber: trimmedReg }, { email: trimmedEmail }],
            },
        });
        if (existing) {
            res.status(400).json({ message: 'Student with this registration number or email already exists.' });
            return;
        }
        const existingUser = await prisma_js_1.prisma.user.findFirst({
            where: {
                OR: [{ email: trimmedEmail }, { username: studentUsername }],
            },
        });
        if (existingUser) {
            res.status(400).json({ message: 'A user account with this email or username already exists.' });
            return;
        }
        // Generate automatic Student ID
        const count = await prisma_js_1.prisma.student.count();
        const studentIdCode = `PM-${batch}-${String(count + 1).padStart(3, '0')}`;
        const projectIdCode = `PRJ-${batch}-${String(count + 1).padStart(3, '0')}`;
        // Create student user login credentials
        const defaultStudentPassword = await bcryptjs_1.default.hash('Student@123', 10);
        const studentUser = await prisma_js_1.prisma.user.create({
            data: {
                email: trimmedEmail,
                username: studentUsername,
                passwordHash: defaultStudentPassword,
                fullName: fullName.trim(),
                role: client_1.Role.STUDENT,
                phone: contactNumber,
                isActive: true,
            },
        });
        // Transaction for atomic creation
        const newStudent = await prisma_js_1.prisma.$transaction(async (tx) => {
            // 1. Create Student
            const student = await tx.student.create({
                data: {
                    studentId: studentIdCode,
                    registrationNumber: trimmedReg,
                    fullName: fullName.trim(),
                    email: trimmedEmail,
                    contactNumber,
                    whatsappNumber,
                    university,
                    degreeProgramme,
                    batch,
                    academicYear,
                    currentAddress,
                    assignedSupervisorId: assignedSupervisorId || null,
                    assignedMentorId: assignedMentorId || null,
                    remarks,
                    userId: studentUser.id,
                    isActive: true,
                    status: client_1.StudentStatus.ACTIVE,
                },
            });
            // 1b. Assign Supporting Mentors
            if (Array.isArray(supportingMentorIds) && supportingMentorIds.length > 0) {
                for (const mentorId of supportingMentorIds) {
                    if (mentorId && mentorId !== assignedMentorId) {
                        await tx.studentMentorAssignment.create({
                            data: {
                                studentId: student.id,
                                mentorId,
                                isPrimary: false,
                            },
                        });
                    }
                }
            }
            // 2. Create Project
            const project = await tx.project.create({
                data: {
                    projectId: projectIdCode,
                    studentId: student.id,
                    title: projectTitle.trim(),
                    idea: projectIdea,
                    problemStatement,
                    proposedSolution,
                    mainObjectives,
                    mainModules,
                    techStack,
                    category: category || 'Web & Enterprise Application',
                    currentStage: client_1.DevelopmentStage.PROPOSAL,
                    completionPercentage: 0.0,
                },
            });
            // 3. Create default milestones
            const defaultMilestones = [
                { title: 'Project Proposal & Scope Freeze', stage: client_1.DevelopmentStage.PROPOSAL, weight: 10.0, orderIndex: 1 },
                { title: 'Software Requirements Specification (SRS)', stage: client_1.DevelopmentStage.SRS_DESIGN, weight: 15.0, orderIndex: 2 },
                { title: 'System Architecture & Database Design', stage: client_1.DevelopmentStage.SRS_DESIGN, weight: 15.0, orderIndex: 3 },
                { title: 'Core Backend Development & APIs', stage: client_1.DevelopmentStage.IMPLEMENTATION, weight: 20.0, orderIndex: 4 },
                { title: 'Frontend UI Implementation & Integration', stage: client_1.DevelopmentStage.IMPLEMENTATION, weight: 20.0, orderIndex: 5 },
                { title: 'Testing, Security Audit & UAT', stage: client_1.DevelopmentStage.TESTING, weight: 10.0, orderIndex: 6 },
                { title: 'Final Dissertation & Viva Preparation', stage: client_1.DevelopmentStage.DOCUMENTATION, weight: 10.0, orderIndex: 7 },
            ];
            for (const m of defaultMilestones) {
                await tx.projectMilestone.create({
                    data: {
                        projectId: project.id,
                        title: m.title,
                        stage: m.stage,
                        weight: m.weight,
                        orderIndex: m.orderIndex,
                    },
                });
            }
            // 4. Create master document checklist from active DocumentTypes
            const activeDocTypes = await tx.documentType.findMany({
                where: { isActive: true },
                orderBy: { orderIndex: 'asc' },
            });
            for (const dt of activeDocTypes) {
                await tx.studentDocument.create({
                    data: {
                        studentId: student.id,
                        documentTypeId: dt.id,
                        documentName: dt.name,
                        documentType: dt.code,
                        assignedMentorId: assignedMentorId || null,
                        status: client_1.DocumentStatus.NOT_STARTED,
                    },
                });
            }
            // 5. Create Fee Agreement & Installments
            const finalPayable = Math.max(0, Number(totalAgreedFee) - Number(discount));
            const feeAgreement = await tx.studentFeeAgreement.create({
                data: {
                    studentId: student.id,
                    totalAgreedFee: Number(totalAgreedFee),
                    discount: Number(discount),
                    finalPayableAmount: finalPayable,
                    paymentPlan: numberOfInstallments > 1 ? client_1.PaymentPlan.INSTALLMENTS : client_1.PaymentPlan.FULL,
                    initialPayment: Number(initialPayment),
                    numberOfInstallments: Number(numberOfInstallments),
                },
            });
            // Split installments
            const installmentAmount = Math.round(finalPayable / numberOfInstallments);
            for (let i = 1; i <= numberOfInstallments; i++) {
                const dueDate = new Date();
                dueDate.setMonth(dueDate.getMonth() + (i - 1) * 2);
                await tx.paymentInstallment.create({
                    data: {
                        feeAgreementId: feeAgreement.id,
                        installmentNumber: i,
                        amount: i === numberOfInstallments ? finalPayable - installmentAmount * (numberOfInstallments - 1) : installmentAmount,
                        dueDate,
                        status: i === 1 && initialPayment > 0 ? client_1.InstallmentStatus.PAID : client_1.InstallmentStatus.PENDING,
                        paidDate: i === 1 && initialPayment > 0 ? new Date() : null,
                    },
                });
            }
            // Record initial payment if provided
            if (Number(initialPayment) > 0) {
                const receiptNumber = `PM-RCP-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
                await tx.payment.create({
                    data: {
                        paymentId: `RCP-${batch}-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
                        feeAgreementId: feeAgreement.id,
                        studentId: student.id,
                        amount: Number(initialPayment),
                        paymentMethod: paymentMethod,
                        referenceNumber,
                        receiptNumber,
                        recordedById: req.user.id,
                        remarks: 'Registration / Initial payment',
                    },
                });
            }
            // 6. Notify assigned mentor
            if (assignedMentorId) {
                await tx.notification.create({
                    data: {
                        userId: assignedMentorId,
                        title: `New Student Assigned: ${fullName}`,
                        message: `You have been assigned as primary mentor for ${fullName} (${projectTitle}).`,
                        type: client_1.NotificationType.MENTOR_ASSIGNMENT,
                        linkUrl: `/students/${student.id}`,
                    },
                });
            }
            // 7. Activity Log
            await tx.activityLog.create({
                data: {
                    actorId: req.user.id,
                    actorName: req.user.fullName,
                    actorRole: req.user.role,
                    action: 'REGISTER_STUDENT',
                    entityType: 'Student',
                    entityId: student.id,
                    details: { studentId: studentIdCode, regNumber: trimmedReg, title: projectTitle },
                },
            });
            return student;
        });
        res.status(201).json({
            message: 'Student registered successfully',
            student: newStudent,
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: error.message || 'Failed to register student.' });
    }
});
// GET /api/students/:id - Complete Student Workspace
exports.studentsRouter.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        let studentId = req.params.id;
        if (studentId === 'me' || studentId === 'my-workspace') {
            const selfStudent = await prisma_js_1.prisma.student.findFirst({
                where: { userId: req.user.id },
                select: { id: true },
            });
            if (!selfStudent) {
                res.status(404).json({ message: 'No student record associated with this user.' });
                return;
            }
            studentId = selfStudent.id;
        }
        // Resolve student record by id OR userId
        const found = await prisma_js_1.prisma.student.findFirst({
            where: {
                OR: [
                    { id: studentId },
                    { userId: studentId },
                ],
            },
            select: { id: true },
        });
        if (!found) {
            res.status(404).json({ message: 'Student record not found.' });
            return;
        }
        const actualStudentId = found.id;
        const access = await (0, auth_js_1.checkStudentAccess)(req, actualStudentId, 'read');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const student = await prisma_js_1.prisma.student.findUnique({
            where: { id: actualStudentId },
            include: {
                project: {
                    include: {
                        milestones: { orderBy: { orderIndex: 'asc' } },
                        tasks: {
                            orderBy: { dueDate: 'asc' },
                            include: {
                                comments: {
                                    include: { author: { select: { fullName: true, role: true } } },
                                    orderBy: { createdAt: 'desc' },
                                },
                                assignedMentor: { select: { fullName: true } },
                            },
                        },
                        history: { orderBy: { createdAt: 'desc' } },
                    },
                },
                assignedMentor: { select: { id: true, fullName: true, email: true, phone: true } },
                assignedSupervisor: { select: { id: true, fullName: true, email: true, phone: true } },
                supportingMentors: {
                    include: {
                        mentor: { select: { id: true, fullName: true, email: true, phone: true } },
                    },
                },
                mentorAssignmentHistory: {
                    orderBy: { assignedAt: 'desc' },
                },
                documents: {
                    orderBy: { documentTypeConfig: { orderIndex: 'asc' } },
                    include: {
                        documentTypeConfig: true,
                        reviewedBy: { select: { fullName: true, role: true } },
                        versions: {
                            orderBy: { versionNumber: 'desc' },
                            include: { uploadedBy: { select: { fullName: true, role: true } } },
                        },
                    },
                },
                dailyProgresses: {
                    orderBy: { date: 'desc' },
                    include: { mentor: { select: { fullName: true } } },
                },
                weeklyProgresses: {
                    orderBy: { weekStartDate: 'desc' },
                    include: {
                        mentor: { select: { fullName: true } },
                        reviewedBy: { select: { fullName: true } },
                    },
                },
                corrections: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        supervisor: { select: { fullName: true } },
                        assignedMentor: { select: { fullName: true } },
                    },
                },
                meetings: {
                    orderBy: { meetingDate: 'desc' },
                    include: {
                        mentor: { select: { fullName: true } },
                        supervisor: { select: { fullName: true } },
                    },
                },
                evaluations: {
                    orderBy: { scheduledDate: 'desc' },
                    include: { evaluator: { select: { fullName: true } } },
                },
                feeAgreement: {
                    include: {
                        installments: { orderBy: { installmentNumber: 'asc' } },
                        payments: {
                            where: { isVoided: false },
                            orderBy: { paymentDate: 'desc' },
                            include: { recordedBy: { select: { fullName: true } } },
                        },
                    },
                },
            },
        });
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        // Role-based protection on financial data:
        const userRole = req.user.role;
        let safeFeeAgreement = student.feeAgreement;
        if (userRole === client_1.Role.MENTOR) {
            if (student.feeAgreement) {
                const totalPaid = student.feeAgreement.payments.reduce((acc, p) => acc + p.amount, 0);
                safeFeeAgreement = {
                    id: student.feeAgreement.id,
                    studentId: student.feeAgreement.studentId,
                    totalAgreedFee: 0,
                    discount: 0,
                    finalPayableAmount: 0,
                    paymentPlan: student.feeAgreement.paymentPlan,
                    initialPayment: 0,
                    numberOfInstallments: 0,
                    remarks: null,
                    createdAt: student.feeAgreement.createdAt,
                    updatedAt: student.feeAgreement.updatedAt,
                    installments: [],
                    payments: [],
                    status: totalPaid >= student.feeAgreement.finalPayableAmount ? 'FULLY_PAID' : totalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
                };
            }
        }
        // Fetch activity history
        const activities = await prisma_js_1.prisma.activityLog.findMany({
            where: {
                OR: [
                    { entityId: student.id },
                    { entityId: student.project?.id },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
        res.json({
            student: {
                ...student,
                supportingMentors: student.supportingMentors.map((sm) => sm.mentor),
                feeAgreement: safeFeeAgreement,
                activityHistory: activities,
            },
        });
    }
    catch (error) {
        console.error('Fetch student error:', error);
        res.status(500).json({ message: 'Failed to retrieve student workspace' });
    }
});
// PUT /api/students/:id - Update student record (Admin / Supervisor / Self basic)
exports.studentsRouter.put('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const studentId = req.params.id;
        const access = await (0, auth_js_1.checkStudentAccess)(req, studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const { fullName, registrationNumber, contactNumber, whatsappNumber, currentAddress, status, remarks, university, degreeProgramme, batch, academicYear, assignedSupervisorId, assignedMentorId, } = req.body;
        const isAdmin = req.user.role === client_1.Role.ADMIN || req.user.role === client_1.Role.SUPER_ADMIN;
        const existingStudent = await prisma_js_1.prisma.student.findUnique({
            where: { id: studentId },
        });
        if (!existingStudent) {
            res.status(404).json({ message: 'Student not found.' });
            return;
        }
        // Track mentor reassignment if mentor changed by Admin
        if (isAdmin && assignedMentorId && assignedMentorId !== existingStudent.assignedMentorId) {
            await prisma_js_1.prisma.mentorAssignmentHistory.create({
                data: {
                    studentId,
                    previousMentorId: existingStudent.assignedMentorId,
                    newMentorId: assignedMentorId,
                    changedById: req.user.id,
                    reason: 'Reassigned via student update profile form',
                },
            });
            // Update documents & tasks assigned mentor
            await prisma_js_1.prisma.studentDocument.updateMany({
                where: { studentId },
                data: { assignedMentorId },
            });
        }
        const updated = await prisma_js_1.prisma.student.update({
            where: { id: studentId },
            data: {
                fullName: fullName ? fullName.trim() : undefined,
                registrationNumber: isAdmin && registrationNumber ? registrationNumber.trim() : undefined,
                contactNumber,
                whatsappNumber,
                currentAddress,
                status: isAdmin && status ? status : undefined,
                remarks: isAdmin ? remarks : undefined,
                university: isAdmin ? university : undefined,
                degreeProgramme: isAdmin ? degreeProgramme : undefined,
                batch: isAdmin ? batch : undefined,
                academicYear: isAdmin ? academicYear : undefined,
                assignedSupervisorId: isAdmin ? assignedSupervisorId : undefined,
                assignedMentorId: isAdmin ? assignedMentorId : undefined,
            },
        });
        await prisma_js_1.prisma.activityLog.create({
            data: {
                actorId: req.user.id,
                actorName: req.user.fullName,
                actorRole: req.user.role,
                action: 'UPDATE_STUDENT_PROFILE',
                entityType: 'Student',
                entityId: studentId,
                details: { changes: req.body },
            },
        });
        res.json({ message: 'Student profile updated successfully', student: updated });
    }
    catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ message: 'Failed to update student profile' });
    }
});
// PUT /api/students/:id/status - Activate or Deactivate student (Admin only)
exports.studentsRouter.put('/:id/status', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const studentId = req.params.id;
        const { status, isActive } = req.body;
        const student = await prisma_js_1.prisma.student.findUnique({
            where: { id: studentId },
            include: { user: true },
        });
        if (!student) {
            res.status(404).json({ message: 'Student not found.' });
            return;
        }
        const newIsActive = isActive !== undefined ? Boolean(isActive) : status !== client_1.StudentStatus.DEACTIVATED;
        const newStatus = status ? status : newIsActive ? client_1.StudentStatus.ACTIVE : client_1.StudentStatus.DEACTIVATED;
        await prisma_js_1.prisma.$transaction(async (tx) => {
            await tx.student.update({
                where: { id: studentId },
                data: {
                    status: newStatus,
                    isActive: newIsActive,
                },
            });
            // Synchronize with User account to block/allow login
            if (student.userId) {
                await tx.user.update({
                    where: { id: student.userId },
                    data: { isActive: newIsActive },
                });
            }
            await tx.activityLog.create({
                data: {
                    actorId: req.user.id,
                    actorName: req.user.fullName,
                    actorRole: req.user.role,
                    action: newIsActive ? 'ACTIVATE_STUDENT' : 'DEACTIVATE_STUDENT',
                    entityType: 'Student',
                    entityId: studentId,
                    details: { previousStatus: student.status, newStatus, isActive: newIsActive },
                },
            });
        });
        res.json({
            message: `Student account ${newIsActive ? 'activated' : 'deactivated'} successfully.`,
            isActive: newIsActive,
            status: newStatus,
        });
    }
    catch (error) {
        console.error('Update student status error:', error);
        res.status(500).json({ message: 'Failed to update student status' });
    }
});
// POST /api/students/:id/supporting-mentors - Add supporting mentor
exports.studentsRouter.post('/:id/supporting-mentors', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN, client_1.Role.SUPERVISOR), async (req, res) => {
    try {
        const studentId = req.params.id;
        const { mentorId } = req.body;
        if (!mentorId) {
            res.status(400).json({ message: 'Mentor ID is required.' });
            return;
        }
        const mentor = await prisma_js_1.prisma.user.findFirst({
            where: { id: mentorId, role: client_1.Role.MENTOR, isActive: true },
        });
        if (!mentor) {
            res.status(404).json({ message: 'Active mentor not found.' });
            return;
        }
        const existing = await prisma_js_1.prisma.studentMentorAssignment.findUnique({
            where: {
                studentId_mentorId: {
                    studentId,
                    mentorId,
                },
            },
        });
        if (existing) {
            res.status(400).json({ message: 'Mentor is already assigned to this student.' });
            return;
        }
        const assignment = await prisma_js_1.prisma.studentMentorAssignment.create({
            data: {
                studentId,
                mentorId,
                isPrimary: false,
            },
            include: {
                mentor: { select: { id: true, fullName: true, email: true } },
            },
        });
        await prisma_js_1.prisma.notification.create({
            data: {
                userId: mentorId,
                title: 'Assigned as Supporting Mentor',
                message: `You have been added as a supporting mentor for student.`,
                type: client_1.NotificationType.MENTOR_ASSIGNMENT,
                linkUrl: `/students/${studentId}`,
            },
        });
        res.status(201).json({ message: 'Supporting mentor assigned successfully', assignment });
    }
    catch (error) {
        console.error('Add supporting mentor error:', error);
        res.status(500).json({ message: 'Failed to assign supporting mentor.' });
    }
});
// DELETE /api/students/:id/supporting-mentors/:mentorId - Remove supporting mentor
exports.studentsRouter.delete('/:id/supporting-mentors/:mentorId', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN, client_1.Role.SUPERVISOR), async (req, res) => {
    try {
        const { id: studentId, mentorId } = req.params;
        await prisma_js_1.prisma.studentMentorAssignment.deleteMany({
            where: {
                studentId,
                mentorId,
            },
        });
        res.json({ message: 'Supporting mentor removed successfully.' });
    }
    catch (error) {
        console.error('Remove supporting mentor error:', error);
        res.status(500).json({ message: 'Failed to remove supporting mentor.' });
    }
});
// POST /api/students/:id/assign-mentor - Reassign primary mentor (Admin only)
exports.studentsRouter.post('/:id/assign-mentor', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const studentId = req.params.id;
        const { newMentorId, reason } = req.body;
        if (!newMentorId) {
            res.status(400).json({ message: 'New mentor ID is required' });
            return;
        }
        const student = await prisma_js_1.prisma.student.findUnique({
            where: { id: studentId },
            include: { project: true },
        });
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        const previousMentorId = student.assignedMentorId;
        await prisma_js_1.prisma.$transaction(async (tx) => {
            // 1. Update Student
            await tx.student.update({
                where: { id: studentId },
                data: { assignedMentorId: newMentorId },
            });
            // 2. Record Assignment History
            await tx.mentorAssignmentHistory.create({
                data: {
                    studentId,
                    previousMentorId,
                    newMentorId,
                    changedById: req.user.id,
                    reason: reason || 'Administrative mentor reallocation',
                },
            });
            // 3. Update documents assigned mentor
            await tx.studentDocument.updateMany({
                where: { studentId },
                data: { assignedMentorId: newMentorId },
            });
            // 4. Update pending tasks assigned mentor
            if (student.project) {
                await tx.projectTask.updateMany({
                    where: {
                        projectId: student.project.id,
                        status: { in: ['TO_DO', 'IN_PROGRESS', 'NOT_STARTED'] },
                    },
                    data: { assignedMentorId: newMentorId },
                });
            }
            // 5. Notify new mentor
            await tx.notification.create({
                data: {
                    userId: newMentorId,
                    title: `Student Reassigned: ${student.fullName}`,
                    message: `You are now the primary mentor for ${student.fullName}. Reason: ${reason || 'Reassigned by Admin'}`,
                    type: client_1.NotificationType.MENTOR_ASSIGNMENT,
                    linkUrl: `/students/${studentId}`,
                },
            });
            // 6. Audit Log
            await tx.activityLog.create({
                data: {
                    actorId: req.user.id,
                    actorName: req.user.fullName,
                    actorRole: req.user.role,
                    action: 'REASSIGN_MENTOR',
                    entityType: 'Student',
                    entityId: studentId,
                    details: { previousMentorId, newMentorId, reason },
                },
            });
        });
        res.json({ message: 'Primary mentor successfully reassigned' });
    }
    catch (error) {
        console.error('Mentor reassignment error:', error);
        res.status(500).json({ message: 'Failed to reassign mentor' });
    }
});

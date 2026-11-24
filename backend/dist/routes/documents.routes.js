"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const upload_js_1 = require("../middleware/upload.js");
const client_1 = require("@prisma/client");
exports.documentsRouter = (0, express_1.Router)();
// ==========================================
// MASTER DOCUMENT REQUIREMENTS (Super Admin / Admin)
// ==========================================
// GET /api/documents/requirements - List all master requirements
exports.documentsRouter.get('/requirements', auth_js_1.authenticate, async (req, res) => {
    try {
        const requirements = await prisma_js_1.prisma.documentType.findMany({
            orderBy: { orderIndex: 'asc' },
            include: {
                _count: {
                    select: { studentDocuments: true },
                },
            },
        });
        res.json({ requirements });
    }
    catch (error) {
        console.error('List requirements error:', error);
        res.status(500).json({ message: 'Failed to retrieve document requirements' });
    }
});
// POST /api/documents/requirements - Create requirement & auto-assign to students
exports.documentsRouter.post('/requirements', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const { code, name, description, category = 'General', academicStage = client_1.DevelopmentStage.PROPOSAL, submissionInstructions, defaultDeadlineDays = 30, allowedUrlTypes = 'Google Drive, GitHub, Web URL', targetBatch, targetStage, isRequired = true, autoAssignAllActive = true, } = req.body;
        if (!code || !name) {
            res.status(400).json({ message: 'Requirement code and title are required.' });
            return;
        }
        const trimmedCode = code.toUpperCase().trim();
        const existing = await prisma_js_1.prisma.documentType.findUnique({
            where: { code: trimmedCode },
        });
        if (existing) {
            res.status(400).json({ message: `A document requirement with code "${trimmedCode}" already exists.` });
            return;
        }
        const count = await prisma_js_1.prisma.documentType.count();
        const createdReq = await prisma_js_1.prisma.$transaction(async (tx) => {
            // 1. Create requirement
            const reqDoc = await tx.documentType.create({
                data: {
                    code: trimmedCode,
                    name: name.trim(),
                    description: description || null,
                    category,
                    academicStage: academicStage,
                    submissionInstructions: submissionInstructions || 'Submit shared Google Drive or GitHub repository URL. Ensure view permissions are granted.',
                    defaultDeadlineDays: Number(defaultDeadlineDays) || 30,
                    allowedUrlTypes,
                    targetBatch: targetBatch || null,
                    targetStage: targetStage ? targetStage : null,
                    isActive: true,
                    orderIndex: count + 1,
                },
            });
            // 2. Auto-assign to applicable active students
            if (autoAssignAllActive) {
                const studentWhere = { isActive: true };
                if (targetBatch)
                    studentWhere.batch = targetBatch;
                const targetStudents = await tx.student.findMany({
                    where: studentWhere,
                    select: { id: true, assignedMentorId: true },
                });
                for (const student of targetStudents) {
                    // Check if student already has this requirement
                    const existingAssignment = await tx.studentDocument.findFirst({
                        where: {
                            studentId: student.id,
                            documentTypeId: reqDoc.id,
                        },
                    });
                    if (!existingAssignment) {
                        await tx.studentDocument.create({
                            data: {
                                studentId: student.id,
                                documentTypeId: reqDoc.id,
                                documentName: reqDoc.name,
                                documentType: reqDoc.code,
                                assignedMentorId: student.assignedMentorId,
                                status: client_1.DocumentStatus.NOT_STARTED,
                            },
                        });
                    }
                }
            }
            await tx.activityLog.create({
                data: {
                    actorId: req.user.id,
                    actorName: req.user.fullName,
                    actorRole: req.user.role,
                    action: 'CREATE_DOCUMENT_REQUIREMENT',
                    entityType: 'DocumentType',
                    entityId: reqDoc.id,
                    details: { code: trimmedCode, title: name, category, academicStage },
                },
            });
            return reqDoc;
        });
        res.status(201).json({
            message: 'Master document requirement created and assigned to applicable students.',
            requirement: createdReq,
        });
    }
    catch (error) {
        console.error('Create requirement error:', error);
        res.status(500).json({ message: error.message || 'Failed to create document requirement' });
    }
});
// PUT /api/documents/requirements/:id - Update requirement details
exports.documentsRouter.put('/requirements/:id', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const id = req.params.id;
        const { name, description, category, academicStage, submissionInstructions, defaultDeadlineDays, allowedUrlTypes, orderIndex, isActive, } = req.body;
        const updated = await prisma_js_1.prisma.documentType.update({
            where: { id },
            data: {
                name: name ? name.trim() : undefined,
                description,
                category,
                academicStage: academicStage ? academicStage : undefined,
                submissionInstructions,
                defaultDeadlineDays: defaultDeadlineDays !== undefined ? Number(defaultDeadlineDays) : undefined,
                allowedUrlTypes,
                orderIndex: orderIndex !== undefined ? Number(orderIndex) : undefined,
                isActive: isActive !== undefined ? Boolean(isActive) : undefined,
            },
        });
        // Also sync documentName on unsubmitted student documents
        if (name) {
            await prisma_js_1.prisma.studentDocument.updateMany({
                where: {
                    documentTypeId: id,
                    status: { in: [client_1.DocumentStatus.NOT_STARTED, client_1.DocumentStatus.PENDING] },
                },
                data: { documentName: name.trim() },
            });
        }
        res.json({ message: 'Requirement updated successfully', requirement: updated });
    }
    catch (error) {
        console.error('Update requirement error:', error);
        res.status(500).json({ message: 'Failed to update requirement' });
    }
});
// PUT /api/documents/requirements/:id/status - Toggle requirement active/inactive
exports.documentsRouter.put('/requirements/:id/status', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const id = req.params.id;
        const { isActive } = req.body;
        const updated = await prisma_js_1.prisma.documentType.update({
            where: { id },
            data: { isActive: Boolean(isActive) },
        });
        res.json({ message: `Requirement ${updated.isActive ? 'activated' : 'deactivated'}`, requirement: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to toggle requirement status' });
    }
});
// ==========================================
// STUDENT DOCUMENT SUBMISSIONS & REVIEWS
// ==========================================
// GET /api/documents - List documents with filters
exports.documentsRouter.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { studentId, status, mentorId, search } = req.query;
        const where = {};
        if (studentId)
            where.studentId = String(studentId);
        if (status)
            where.status = status;
        if (mentorId)
            where.assignedMentorId = String(mentorId);
        if (search) {
            where.OR = [
                { documentName: { contains: String(search), mode: 'insensitive' } },
                { submissionTitle: { contains: String(search), mode: 'insensitive' } },
                { student: { fullName: { contains: String(search), mode: 'insensitive' } } },
            ];
        }
        // Role filtering: mentor sees assigned
        if (req.user.role === client_1.Role.MENTOR && !studentId) {
            where.OR = [
                { assignedMentorId: req.user.id },
                { student: { supportingMentors: { some: { mentorId: req.user.id } } } },
            ];
        }
        if (req.user.role === client_1.Role.STUDENT) {
            const student = await prisma_js_1.prisma.student.findFirst({ where: { userId: req.user.id } });
            if (!student) {
                res.json({ documents: [] });
                return;
            }
            where.studentId = student.id;
        }
        const documents = await prisma_js_1.prisma.studentDocument.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true, batch: true } },
                documentTypeConfig: true,
                reviewedBy: { select: { fullName: true, role: true } },
                versions: {
                    orderBy: { versionNumber: 'desc' },
                    take: 1,
                    include: { uploadedBy: { select: { fullName: true, role: true } } },
                },
            },
        });
        res.json({ documents });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to list documents' });
    }
});
// POST /api/documents/:id/submit-url - Student submits external Google Drive / GitHub link
exports.documentsRouter.post('/:id/submit-url', auth_js_1.authenticate, async (req, res) => {
    try {
        const documentId = req.params.id;
        const { submissionTitle, submissionUrl, submissionNote } = req.body;
        if (!submissionUrl || !submissionUrl.trim()) {
            res.status(400).json({ message: 'Document URL (e.g. Google Drive link or repository URL) is required.' });
            return;
        }
        const trimmedUrl = submissionUrl.trim();
        // Basic URL validation
        try {
            new URL(trimmedUrl);
        }
        catch {
            res.status(400).json({ message: 'Invalid URL format. Please provide a valid external URL (e.g., https://drive.google.com/...)' });
            return;
        }
        const document = await prisma_js_1.prisma.studentDocument.findUnique({
            where: { id: documentId },
            include: {
                student: {
                    include: {
                        assignedMentor: true,
                        assignedSupervisor: true,
                        supportingMentors: true,
                    },
                },
            },
        });
        if (!document) {
            res.status(404).json({ message: 'Document record not found' });
            return;
        }
        const access = await (0, auth_js_1.checkStudentAccess)(req, document.studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const nextVersion = document.currentVersion + 1;
        const isResubmission = document.status === client_1.DocumentStatus.CORRECTION_REQUIRED || document.status === client_1.DocumentStatus.REVISION_REQUIRED;
        const nextStatus = isResubmission ? client_1.DocumentStatus.RESUBMITTED : client_1.DocumentStatus.SUBMITTED;
        const [updatedDoc, newVersion] = await prisma_js_1.prisma.$transaction([
            // 1. Update StudentDocument
            prisma_js_1.prisma.studentDocument.update({
                where: { id: documentId },
                data: {
                    submissionTitle: submissionTitle ? submissionTitle.trim() : document.documentName,
                    submissionUrl: trimmedUrl,
                    submissionNote: submissionNote ? submissionNote.trim() : null,
                    submittedAt: new Date(),
                    submittedDate: new Date(),
                    currentVersion: nextVersion,
                    status: nextStatus,
                },
            }),
            // 2. Create DocumentVersion record with external link
            prisma_js_1.prisma.documentVersion.create({
                data: {
                    studentDocumentId: documentId,
                    versionNumber: nextVersion,
                    fileUrl: trimmedUrl,
                    fileName: submissionTitle || `${document.documentName} (v${nextVersion})`,
                    fileSize: 0,
                    fileType: 'link/external',
                    externalUrl: trimmedUrl,
                    submissionNote: submissionNote ? submissionNote.trim() : null,
                    changeSummary: submissionNote || `Version ${nextVersion} submission via Google Drive / URL`,
                    uploadedById: req.user.id,
                    status: nextStatus,
                },
            }),
        ]);
        // 3. Notify mentor & supervisor
        const notificationReceivers = [
            document.student.assignedMentorId,
            document.student.assignedSupervisorId,
            ...document.student.supportingMentors.map((sm) => sm.mentorId),
        ].filter(Boolean);
        for (const recId of notificationReceivers) {
            await prisma_js_1.prisma.notification.create({
                data: {
                    userId: recId,
                    title: `Document ${isResubmission ? 'Resubmitted' : 'Submitted'}: ${document.documentName}`,
                    message: `${document.student.fullName} submitted ${document.documentName} (Version ${nextVersion}). Please review and provide feedback.`,
                    type: client_1.NotificationType.DOCUMENT_SUBMISSION,
                    linkUrl: `/students/${document.studentId}`,
                },
            });
        }
        // 4. Audit Log
        await prisma_js_1.prisma.activityLog.create({
            data: {
                actorId: req.user.id,
                actorName: req.user.fullName,
                actorRole: req.user.role,
                action: 'SUBMIT_DOCUMENT_URL',
                entityType: 'StudentDocument',
                entityId: documentId,
                details: { url: trimmedUrl, version: nextVersion, title: submissionTitle },
            },
        });
        res.json({
            message: `Document submitted successfully as Version ${nextVersion}`,
            document: updatedDoc,
            version: newVersion,
        });
    }
    catch (error) {
        console.error('Submit document URL error:', error);
        res.status(500).json({ message: 'Failed to submit document URL' });
    }
});
// POST /api/documents/:id/review-submission - Mentor / Supervisor review & feedback
exports.documentsRouter.post('/:id/review-submission', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN, client_1.Role.SUPERVISOR, client_1.Role.MENTOR), async (req, res) => {
    try {
        const documentId = req.params.id;
        const { status, reviewerFeedback, requiredCorrections, correctionDeadline } = req.body;
        const allowedStatuses = [
            client_1.DocumentStatus.APPROVED,
            client_1.DocumentStatus.CORRECTION_REQUIRED,
            client_1.DocumentStatus.UNDER_REVIEW,
            client_1.DocumentStatus.REJECTED,
        ];
        if (!status || !allowedStatuses.includes(status)) {
            res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(', ')}` });
            return;
        }
        const document = await prisma_js_1.prisma.studentDocument.findUnique({
            where: { id: documentId },
            include: {
                student: { select: { id: true, fullName: true, userId: true, assignedMentorId: true } },
                versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
            },
        });
        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }
        const latestVersion = document.versions[0];
        const isApproved = status === client_1.DocumentStatus.APPROVED;
        await prisma_js_1.prisma.$transaction(async (tx) => {
            // 1. Update StudentDocument
            await tx.studentDocument.update({
                where: { id: documentId },
                data: {
                    status: status,
                    reviewerFeedback: reviewerFeedback || requiredCorrections || null,
                    reviewedById: req.user.id,
                    reviewedAt: new Date(),
                    approvedDate: isApproved ? new Date() : null,
                },
            });
            // 2. Update DocumentVersion
            if (latestVersion) {
                await tx.documentVersion.update({
                    where: { id: latestVersion.id },
                    data: {
                        reviewedById: req.user.id,
                        reviewDate: new Date(),
                        reviewerComments: reviewerFeedback || requiredCorrections || null,
                        status: status,
                    },
                });
            }
            // 3. If correction required, record in Correction table
            if (status === client_1.DocumentStatus.CORRECTION_REQUIRED) {
                await tx.correction.create({
                    data: {
                        studentId: document.studentId,
                        studentDocumentId: document.id,
                        supervisorId: req.user.id,
                        assignedMentorId: document.student.assignedMentorId || req.user.id,
                        issueDescription: `Correction requested on: ${document.documentName}`,
                        correctionInstruction: reviewerFeedback || requiredCorrections || 'Please revise document and submit updated link.',
                        deadline: correctionDeadline ? new Date(correctionDeadline) : null,
                    },
                });
            }
            // 4. Notify student
            if (document.student.userId) {
                await tx.notification.create({
                    data: {
                        userId: document.student.userId,
                        title: `Document ${status}: ${document.documentName}`,
                        message: `Your reviewer marked ${document.documentName} as ${status}. Feedback: "${reviewerFeedback || 'Reviewed'}"`,
                        type: status === client_1.DocumentStatus.APPROVED ? client_1.NotificationType.SUPERVISOR_FEEDBACK : client_1.NotificationType.CORRECTION,
                        linkUrl: `/students/${document.studentId}`,
                    },
                });
            }
            // 5. Audit Log
            await tx.activityLog.create({
                data: {
                    actorId: req.user.id,
                    actorName: req.user.fullName,
                    actorRole: req.user.role,
                    action: 'REVIEW_DOCUMENT_SUBMISSION',
                    entityType: 'StudentDocument',
                    entityId: documentId,
                    details: { status, feedback: reviewerFeedback },
                },
            });
        });
        res.json({ message: `Review recorded as ${status} successfully.` });
    }
    catch (error) {
        console.error('Review document submission error:', error);
        res.status(500).json({ message: 'Failed to record document review.' });
    }
});
// POST /api/documents/:id/upload - Upload file and create new version (Local file upload fallback)
exports.documentsRouter.post('/:id/upload', auth_js_1.authenticate, upload_js_1.upload.single('file'), async (req, res) => {
    try {
        const documentId = req.params.id;
        const document = await prisma_js_1.prisma.studentDocument.findUnique({
            where: { id: documentId },
            include: { student: { include: { assignedSupervisor: true } } },
        });
        if (!document) {
            res.status(404).json({ message: 'Document record not found' });
            return;
        }
        const access = await (0, auth_js_1.checkStudentAccess)(req, document.studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded.' });
            return;
        }
        const { changeSummary } = req.body;
        const nextVersion = document.currentVersion + 1;
        const fileUrl = `/uploads/${req.file.filename}`;
        const [updatedDoc, version] = await prisma_js_1.prisma.$transaction([
            prisma_js_1.prisma.studentDocument.update({
                where: { id: documentId },
                data: {
                    currentVersion: nextVersion,
                    status: client_1.DocumentStatus.SUBMITTED,
                    submittedDate: new Date(),
                },
            }),
            prisma_js_1.prisma.documentVersion.create({
                data: {
                    studentDocumentId: documentId,
                    versionNumber: nextVersion,
                    fileUrl,
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    fileType: req.file.mimetype,
                    uploadedById: req.user.id,
                    changeSummary: changeSummary || `Version ${nextVersion} upload`,
                    status: client_1.DocumentStatus.SUBMITTED,
                },
            }),
        ]);
        res.json({
            message: `Document version ${nextVersion} uploaded successfully`,
            document: updatedDoc,
            version,
        });
    }
    catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ message: 'Failed to upload document version' });
    }
});

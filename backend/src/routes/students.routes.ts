import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, requireRoles, checkStudentAccess } from '../middleware/auth.js';
import {
  Role,
  StudentStatus,
  DevelopmentStage,
  TaskStatus,
  DocumentStatus,
  PaymentPlan,
  PaymentMethod,
  InstallmentStatus,
  NotificationType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

export const studentsRouter = Router();

// GET /api/students - List students with search, filters, pagination
studentsRouter.get('/', authenticate, async (req, res) => {
  try {
    const {
      search,
      mentorId,
      supervisorId,
      batch,
      status,
      stage,
      mode = 'all', // 'my' (mentor's assigned only), 'all' (directory or admin list)
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

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

    if (supervisorId) where.assignedSupervisorId = String(supervisorId);
    if (batch) where.batch = String(batch);
    if (status) where.status = status as StudentStatus;
    if (stage) {
      where.project = {
        ...where.project,
        currentStage: stage as DevelopmentStage,
      };
    }

    // Role-specific filtering
    const isMentor = req.user!.role === Role.MENTOR;
    if (isMentor && mode === 'my') {
      where.OR = [
        { assignedMentorId: req.user!.id },
        { supportingMentors: { some: { mentorId: req.user!.id } } },
      ];
    }

    // Student role can only see themselves
    if (req.user!.role === Role.STUDENT) {
      const selfStudent = await prisma.student.findFirst({
        where: { userId: req.user!.id },
        select: { id: true },
      });
      if (!selfStudent) {
        res.json({ students: [], pagination: { total: 0, page: 1, limit: limitNum, totalPages: 0 } });
        return;
      }
      where.id = selfStudent.id;
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
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
      const isAssignedToReqMentor =
        isMentor &&
        (s.assignedMentorId === req.user!.id ||
          s.supportingMentors.some((sm) => sm.mentorId === req.user!.id));
      const canSeeFull =
        req.user!.role === Role.ADMIN ||
        req.user!.role === Role.SUPER_ADMIN ||
        req.user!.role === Role.SUPERVISOR ||
        isAssignedToReqMentor;

      let paymentSummary: any = null;
      if (canSeeFull && s.feeAgreement) {
        const totalPaid = s.feeAgreement.payments.reduce((acc: number, p: any) => acc + p.amount, 0);
        paymentSummary = {
          finalPayable: s.feeAgreement.finalPayableAmount,
          totalPaid,
          balance: s.feeAgreement.finalPayableAmount - totalPaid,
          status: totalPaid >= s.feeAgreement.finalPayableAmount ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID',
        };
      } else if (isMentor) {
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
  } catch (error: any) {
    console.error('List students error:', error);
    res.status(500).json({ message: 'Failed to retrieve students list' });
  }
});

// POST /api/students - Register new student (Admin / Super Admin only)
studentsRouter.post('/', authenticate, requireRoles(Role.ADMIN), async (req, res): Promise<void> => {
  try {
    const {
      registrationNumber,
      fullName,
      email,
      username,
      contactNumber,
      whatsappNumber,
      university = 'University of Colombo School of Computing (UCSC)',
      degreeProgramme = 'Bachelor of Information Technology (BIT)',
      batch = '2026',
      academicYear = 'Level 3 / Year 3',
      currentAddress,
      assignedSupervisorId,
      assignedMentorId,
      supportingMentorIds = [],
      remarks,
      projectTitle,
      projectIdea,
      problemStatement,
      proposedSolution,
      mainObjectives,
      mainModules,
      techStack,
      category,
      totalAgreedFee = 65000,
      discount = 0,
      initialPayment = 0,
      numberOfInstallments = 3,
      paymentMethod = 'BANK_TRANSFER',
      referenceNumber,
    } = req.body;

    if (!registrationNumber || !fullName || !email || !contactNumber || !projectTitle) {
      res.status(400).json({ message: 'Missing required student or project information.' });
      return;
    }

    const trimmedReg = registrationNumber.trim();
    const trimmedEmail = email.toLowerCase().trim();
    const studentUsername = username ? username.trim() : trimmedReg;

    // Check unique constraints (registrationNumber, email, username)
    const existing = await prisma.student.findFirst({
      where: {
        OR: [{ registrationNumber: trimmedReg }, { email: trimmedEmail }],
      },
    });

    if (existing) {
      res.status(400).json({ message: 'Student with this registration number or email already exists.' });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: trimmedEmail }, { username: studentUsername }],
      },
    });

    if (existingUser) {
      res.status(400).json({ message: 'A user account with this email or username already exists.' });
      return;
    }

    // Generate automatic Student ID
    const count = await prisma.student.count();
    const studentIdCode = `PM-${batch}-${String(count + 1).padStart(3, '0')}`;
    const projectIdCode = `PRJ-${batch}-${String(count + 1).padStart(3, '0')}`;

    // Create student user login credentials
    const defaultStudentPassword = await bcrypt.hash('Student@123', 10);
    const studentUser = await prisma.user.create({
      data: {
        email: trimmedEmail,
        username: studentUsername,
        passwordHash: defaultStudentPassword,
        fullName: fullName.trim(),
        role: Role.STUDENT,
        phone: contactNumber,
        isActive: true,
      },
    });

    // Transaction for atomic creation
    const newStudent = await prisma.$transaction(async (tx) => {
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
          status: StudentStatus.ACTIVE,
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
          currentStage: DevelopmentStage.PROPOSAL,
          completionPercentage: 0.0,
        },
      });

      // 3. Create default milestones
      const defaultMilestones = [
        { title: 'Project Proposal & Scope Freeze', stage: DevelopmentStage.PROPOSAL, weight: 10.0, orderIndex: 1 },
        { title: 'Software Requirements Specification (SRS)', stage: DevelopmentStage.SRS_DESIGN, weight: 15.0, orderIndex: 2 },
        { title: 'System Architecture & Database Design', stage: DevelopmentStage.SRS_DESIGN, weight: 15.0, orderIndex: 3 },
        { title: 'Core Backend Development & APIs', stage: DevelopmentStage.IMPLEMENTATION, weight: 20.0, orderIndex: 4 },
        { title: 'Frontend UI Implementation & Integration', stage: DevelopmentStage.IMPLEMENTATION, weight: 20.0, orderIndex: 5 },
        { title: 'Testing, Security Audit & UAT', stage: DevelopmentStage.TESTING, weight: 10.0, orderIndex: 6 },
        { title: 'Final Dissertation & Viva Preparation', stage: DevelopmentStage.DOCUMENTATION, weight: 10.0, orderIndex: 7 },
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
            status: DocumentStatus.NOT_STARTED,
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
          paymentPlan: numberOfInstallments > 1 ? PaymentPlan.INSTALLMENTS : PaymentPlan.FULL,
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
            status: i === 1 && initialPayment > 0 ? InstallmentStatus.PAID : InstallmentStatus.PENDING,
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
            paymentMethod: paymentMethod as PaymentMethod,
            referenceNumber,
            receiptNumber,
            recordedById: req.user!.id,
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
            type: NotificationType.MENTOR_ASSIGNMENT,
            linkUrl: `/students/${student.id}`,
          },
        });
      }

      // 7. Activity Log
      await tx.activityLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.fullName,
          actorRole: req.user!.role,
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
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Failed to register student.' });
  }
});

// GET /api/students/:id - Complete Student Workspace
studentsRouter.get('/:id', authenticate, async (req, res): Promise<void> => {
  try {
    let studentId = req.params.id;

    if (studentId === 'me' || studentId === 'my-workspace') {
      const selfStudent = await prisma.student.findFirst({
        where: { userId: req.user!.id },
        select: { id: true },
      });
      if (!selfStudent) {
        res.status(404).json({ message: 'No student record associated with this user.' });
        return;
      }
      studentId = selfStudent.id;
    }

    // Resolve student record by id OR userId
    const found = await prisma.student.findFirst({
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
    const access = await checkStudentAccess(req, actualStudentId, 'read');

    if (!access.allowed) {
      res.status(403).json({ message: access.reason || 'Forbidden' });
      return;
    }

    const student = await prisma.student.findUnique({
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
    const userRole = req.user!.role;
    let safeFeeAgreement = student.feeAgreement;

    if (userRole === Role.MENTOR) {
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
        } as any;
      }
    }

    // Fetch activity history
    const activities = await prisma.activityLog.findMany({
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
  } catch (error: any) {
    console.error('Fetch student error:', error);
    res.status(500).json({ message: 'Failed to retrieve student workspace' });
  }
});

// PUT /api/students/:id - Update student record (Admin / Supervisor / Self basic)
studentsRouter.put('/:id', authenticate, async (req, res): Promise<void> => {
  try {
    const studentId = req.params.id;
    const access = await checkStudentAccess(req, studentId, 'write');

    if (!access.allowed) {
      res.status(403).json({ message: access.reason || 'Forbidden' });
      return;
    }

    const {
      fullName,
      registrationNumber,
      contactNumber,
      whatsappNumber,
      currentAddress,
      status,
      remarks,
      university,
      degreeProgramme,
      batch,
      academicYear,
      assignedSupervisorId,
      assignedMentorId,
    } = req.body;

    const isAdmin = req.user!.role === Role.ADMIN || req.user!.role === Role.SUPER_ADMIN;

    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!existingStudent) {
      res.status(404).json({ message: 'Student not found.' });
      return;
    }

    // Track mentor reassignment if mentor changed by Admin
    if (isAdmin && assignedMentorId && assignedMentorId !== existingStudent.assignedMentorId) {
      await prisma.mentorAssignmentHistory.create({
        data: {
          studentId,
          previousMentorId: existingStudent.assignedMentorId,
          newMentorId: assignedMentorId,
          changedById: req.user!.id,
          reason: 'Reassigned via student update profile form',
        },
      });

      // Update documents & tasks assigned mentor
      await prisma.studentDocument.updateMany({
        where: { studentId },
        data: { assignedMentorId },
      });
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        fullName: fullName ? fullName.trim() : undefined,
        registrationNumber: isAdmin && registrationNumber ? registrationNumber.trim() : undefined,
        contactNumber,
        whatsappNumber,
        currentAddress,
        status: isAdmin && status ? (status as StudentStatus) : undefined,
        remarks: isAdmin ? remarks : undefined,
        university: isAdmin ? university : undefined,
        degreeProgramme: isAdmin ? degreeProgramme : undefined,
        batch: isAdmin ? batch : undefined,
        academicYear: isAdmin ? academicYear : undefined,
        assignedSupervisorId: isAdmin ? assignedSupervisorId : undefined,
        assignedMentorId: isAdmin ? assignedMentorId : undefined,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.fullName,
        actorRole: req.user!.role,
        action: 'UPDATE_STUDENT_PROFILE',
        entityType: 'Student',
        entityId: studentId,
        details: { changes: req.body },
      },
    });

    res.json({ message: 'Student profile updated successfully', student: updated });
  } catch (error: any) {
    console.error('Update student error:', error);
    res.status(500).json({ message: 'Failed to update student profile' });
  }
});

// PUT /api/students/:id/status - Activate or Deactivate student (Admin only)
studentsRouter.put('/:id/status', authenticate, requireRoles(Role.ADMIN), async (req, res): Promise<void> => {
  try {
    const studentId = req.params.id;
    const { status, isActive } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      res.status(404).json({ message: 'Student not found.' });
      return;
    }

    const newIsActive = isActive !== undefined ? Boolean(isActive) : status !== StudentStatus.DEACTIVATED;
    const newStatus = status ? (status as StudentStatus) : newIsActive ? StudentStatus.ACTIVE : StudentStatus.DEACTIVATED;

    await prisma.$transaction(async (tx) => {
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
          actorId: req.user!.id,
          actorName: req.user!.fullName,
          actorRole: req.user!.role,
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
  } catch (error: any) {
    console.error('Update student status error:', error);
    res.status(500).json({ message: 'Failed to update student status' });
  }
});

// POST /api/students/:id/supporting-mentors - Add supporting mentor
studentsRouter.post('/:id/supporting-mentors', authenticate, requireRoles(Role.ADMIN, Role.SUPERVISOR), async (req, res): Promise<void> => {
  try {
    const studentId = req.params.id;
    const { mentorId } = req.body;

    if (!mentorId) {
      res.status(400).json({ message: 'Mentor ID is required.' });
      return;
    }

    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, role: Role.MENTOR, isActive: true },
    });

    if (!mentor) {
      res.status(404).json({ message: 'Active mentor not found.' });
      return;
    }

    const existing = await prisma.studentMentorAssignment.findUnique({
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

    const assignment = await prisma.studentMentorAssignment.create({
      data: {
        studentId,
        mentorId,
        isPrimary: false,
      },
      include: {
        mentor: { select: { id: true, fullName: true, email: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: mentorId,
        title: 'Assigned as Supporting Mentor',
        message: `You have been added as a supporting mentor for student.`,
        type: NotificationType.MENTOR_ASSIGNMENT,
        linkUrl: `/students/${studentId}`,
      },
    });

    res.status(201).json({ message: 'Supporting mentor assigned successfully', assignment });
  } catch (error: any) {
    console.error('Add supporting mentor error:', error);
    res.status(500).json({ message: 'Failed to assign supporting mentor.' });
  }
});

// DELETE /api/students/:id/supporting-mentors/:mentorId - Remove supporting mentor
studentsRouter.delete('/:id/supporting-mentors/:mentorId', authenticate, requireRoles(Role.ADMIN, Role.SUPERVISOR), async (req, res): Promise<void> => {
  try {
    const { id: studentId, mentorId } = req.params;

    await prisma.studentMentorAssignment.deleteMany({
      where: {
        studentId,
        mentorId,
      },
    });

    res.json({ message: 'Supporting mentor removed successfully.' });
  } catch (error: any) {
    console.error('Remove supporting mentor error:', error);
    res.status(500).json({ message: 'Failed to remove supporting mentor.' });
  }
});

// POST /api/students/:id/assign-mentor - Reassign primary mentor (Admin only)
studentsRouter.post('/:id/assign-mentor', authenticate, requireRoles(Role.ADMIN), async (req, res): Promise<void> => {
  try {
    const studentId = req.params.id;
    const { newMentorId, reason } = req.body;

    if (!newMentorId) {
      res.status(400).json({ message: 'New mentor ID is required' });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { project: true },
    });

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    const previousMentorId = student.assignedMentorId;

    await prisma.$transaction(async (tx) => {
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
          changedById: req.user!.id,
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
          type: NotificationType.MENTOR_ASSIGNMENT,
          linkUrl: `/students/${studentId}`,
        },
      });

      // 6. Audit Log
      await tx.activityLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.fullName,
          actorRole: req.user!.role,
          action: 'REASSIGN_MENTOR',
          entityType: 'Student',
          entityId: studentId,
          details: { previousMentorId, newMentorId, reason },
        },
      });
    });

    res.json({ message: 'Primary mentor successfully reassigned' });
  } catch (error: any) {
    console.error('Mentor reassignment error:', error);
    res.status(500).json({ message: 'Failed to reassign mentor' });
  }
});

"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_express17 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_cookie_parser = __toESM(require("cookie-parser"));
var import_morgan = __toESM(require("morgan"));
var import_dotenv = __toESM(require("dotenv"));
var import_path3 = __toESM(require("path"));

// src/routes/auth.routes.ts
var import_express = require("express");
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"));

// src/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  datasources: databaseUrl ? { db: { url: databaseUrl } } : void 0,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/middleware/auth.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var import_client2 = require("@prisma/client");
var authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      res.status(401).json({ message: "Authentication required. Please log in." });
      return;
    }
    const secret = process.env.JWT_SECRET || "pinnacle-mindz-secret";
    const decoded = import_jsonwebtoken.default.verify(token, secret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, fullName: true, isActive: true }
    });
    if (!user || !user.isActive) {
      res.status(401).json({ message: "User account is inactive or no longer exists." });
      return;
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    };
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired session token." });
  }
};
var requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }
    const userRole = req.user.role;
    if (userRole === import_client2.Role.SUPER_ADMIN) {
      return next();
    }
    if (!roles.includes(userRole)) {
      res.status(403).json({
        message: `Forbidden: Access requires one of [${roles.join(", ")}] role(s). Your role is ${userRole}.`
      });
      return;
    }
    next();
  };
};
var checkStudentAccess = async (req, studentId, mode = "read") => {
  if (!req.user) return { allowed: false, reason: "Unauthenticated" };
  if (req.user.role === import_client2.Role.SUPER_ADMIN || req.user.role === import_client2.Role.ADMIN) return { allowed: true, fullAccess: true };
  if (req.user.role === import_client2.Role.SUPERVISOR) {
    return { allowed: true, fullAccess: true };
  }
  const student = await prisma.student.findFirst({
    where: studentId === "me" ? { userId: req.user.id } : {
      OR: [
        { id: studentId },
        { userId: studentId }
      ]
    },
    select: {
      id: true,
      assignedMentorId: true,
      userId: true,
      supportingMentors: { select: { mentorId: true } }
    }
  });
  if (!student) return { allowed: false, reason: "Student not found" };
  if (req.user.role === import_client2.Role.MENTOR) {
    const isPrimary = student.assignedMentorId === req.user.id;
    const isSupporting = student.supportingMentors.some((m) => m.mentorId === req.user.id);
    if (isPrimary || isSupporting) {
      return { allowed: true, fullAccess: true };
    }
    if (mode === "write") {
      return {
        allowed: false,
        reason: "Forbidden: Mentors cannot modify students assigned to other mentors."
      };
    }
    return { allowed: true, fullAccess: false };
  }
  if (req.user.role === import_client2.Role.STUDENT) {
    const isSelf = student.userId === req.user.id || student.id === req.user.id;
    if (isSelf) return { allowed: true, fullAccess: true };
    return { allowed: false, reason: "Forbidden: You cannot access other students." };
  }
  return { allowed: false, reason: "Unauthorized role" };
};

// src/routes/auth.routes.ts
var authRouter = (0, import_express.Router)();
var loginRateLimitMap = /* @__PURE__ */ new Map();
authRouter.post("/login", async (req, res) => {
  try {
    const rawIdentifier = (req.body.email || req.body.username || req.body.identifier || "").trim();
    const identifier = rawIdentifier.toLowerCase();
    const rawPassword = req.body.password || "";
    const cleanPassword = rawPassword.trim();
    console.log(`[AUTH] Login attempt for identifier: "${identifier}" (raw: "${rawIdentifier}"), password length: ${rawPassword.length}`);
    if (!identifier || !rawPassword) {
      res.status(400).json({ message: "Username/Email and password are required." });
      return;
    }
    const rateLimit = loginRateLimitMap.get(identifier);
    if (rateLimit && rateLimit.blockedUntil && Date.now() < rateLimit.blockedUntil) {
      const waitMinutes = Math.ceil((rateLimit.blockedUntil - Date.now()) / 6e4);
      res.status(429).json({
        message: `Too many failed login attempts. Account temporarily locked. Please try again after ${waitMinutes} minute(s).`
      });
      return;
    }
    const hasDb = Boolean(
      process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL
    );
    if (!hasDb) {
      res.status(503).json({
        message: "Database not connected on Vercel. Please create a database in Vercel Storage or set DATABASE_URL in Project Settings."
      });
      return;
    }
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
          { username: rawIdentifier }
        ]
      },
      include: {
        studentProfile: {
          select: { id: true, studentId: true, registrationNumber: true }
        }
      }
    });
    if (!user) {
      console.warn(`[AUTH] User not found for identifier: "${identifier}"`);
      const current = loginRateLimitMap.get(identifier) || { attempts: 0 };
      current.attempts += 1;
      if (current.attempts >= 5) {
        current.blockedUntil = Date.now() + 15 * 60 * 1e3;
      }
      loginRateLimitMap.set(identifier, current);
      res.status(401).json({ message: "Invalid credentials. User not found." });
      return;
    }
    if (!user.isActive) {
      console.warn(`[AUTH] User "${user.email}" is deactivated.`);
      res.status(403).json({ message: "This account has been deactivated. Please contact the administrator." });
      return;
    }
    let isMatch = await import_bcryptjs.default.compare(rawPassword, user.passwordHash);
    if (!isMatch && cleanPassword !== rawPassword) {
      isMatch = await import_bcryptjs.default.compare(cleanPassword, user.passwordHash);
    }
    if (!isMatch) {
      const capitalized = cleanPassword.charAt(0).toUpperCase() + cleanPassword.slice(1);
      if (capitalized !== cleanPassword) {
        isMatch = await import_bcryptjs.default.compare(capitalized, user.passwordHash);
      }
    }
    if (!isMatch && cleanPassword.toLowerCase() !== cleanPassword) {
      isMatch = await import_bcryptjs.default.compare(cleanPassword.toLowerCase(), user.passwordHash);
    }
    if (!isMatch) {
      console.warn(`[AUTH] Password mismatch for user: "${user.email}"`);
      const current = loginRateLimitMap.get(identifier) || { attempts: 0 };
      current.attempts += 1;
      if (current.attempts >= 5) {
        current.blockedUntil = Date.now() + 15 * 60 * 1e3;
      }
      loginRateLimitMap.set(identifier, current);
      res.status(401).json({ message: "Invalid credentials. Incorrect password." });
      return;
    }
    console.log(`[AUTH] Login successful for user: "${user.email}" (${user.role})`);
    loginRateLimitMap.delete(identifier);
    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
        details: { email: user.email, username: user.username },
        ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1"
      }
    });
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    };
    const secret = process.env.JWT_SECRET || "pinnacle-mindz-secret";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    const token = import_jsonwebtoken2.default.sign(payload, secret, { expiresIn });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
    });
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        studentId: user.studentProfile?.id,
        studentProfile: user.studentProfile
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    const isDbError = error.message?.includes("database") || error.message?.includes("Can't reach database") || error.code?.startsWith("P");
    const msg = isDbError ? "Database connection error: Could not connect to PostgreSQL. Please verify your DATABASE_URL in Vercel Project Settings." : error.message || "Internal server error during login.";
    res.status(500).json({ message: msg });
  }
});
authRouter.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});
authRouter.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        studentProfile: {
          select: { id: true, studentId: true, registrationNumber: true }
        }
      }
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      user: {
        ...user,
        studentId: user.studentProfile?.id
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve profile" });
  }
});
authRouter.post("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "Both current and new password are required." });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: "New password must be at least 6 characters." });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const isMatch = await import_bcryptjs.default.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: "Current password is incorrect." });
      return;
    }
    const newHash = await import_bcryptjs.default.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update password" });
  }
});

// src/routes/students.routes.ts
var import_express2 = require("express");
var import_client3 = require("@prisma/client");
var import_bcryptjs2 = __toESM(require("bcryptjs"));
var studentsRouter = (0, import_express2.Router)();
studentsRouter.get("/", authenticate, async (req, res) => {
  try {
    const {
      search,
      mentorId,
      supervisorId,
      batch,
      status,
      stage,
      mode = "all",
      // 'my' (mentor's assigned only), 'all' (directory or admin list)
      page = "1",
      limit = "50"
    } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { registrationNumber: { contains: q, mode: "insensitive" } },
        { studentId: { contains: q, mode: "insensitive" } },
        { project: { title: { contains: q, mode: "insensitive" } } }
      ];
    }
    if (mentorId) {
      where.OR = [
        { assignedMentorId: String(mentorId) },
        { supportingMentors: { some: { mentorId: String(mentorId) } } }
      ];
    }
    if (supervisorId) where.assignedSupervisorId = String(supervisorId);
    if (batch) where.batch = String(batch);
    if (status) where.status = status;
    if (stage) {
      where.project = {
        ...where.project,
        currentStage: stage
      };
    }
    const isMentor = req.user.role === import_client3.Role.MENTOR;
    if (isMentor && mode === "my") {
      where.OR = [
        { assignedMentorId: req.user.id },
        { supportingMentors: { some: { mentorId: req.user.id } } }
      ];
    }
    if (req.user.role === import_client3.Role.STUDENT) {
      const selfStudent = await prisma.student.findFirst({
        where: { userId: req.user.id },
        select: { id: true }
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
        orderBy: { createdAt: "desc" },
        include: {
          project: {
            select: {
              id: true,
              projectId: true,
              title: true,
              currentStage: true,
              completionPercentage: true,
              techStack: true
            }
          },
          assignedMentor: { select: { id: true, fullName: true, email: true } },
          assignedSupervisor: { select: { id: true, fullName: true, email: true } },
          supportingMentors: {
            include: {
              mentor: { select: { id: true, fullName: true, email: true } }
            }
          },
          feeAgreement: {
            include: {
              payments: {
                where: { isVoided: false },
                select: { amount: true }
              }
            }
          },
          _count: {
            select: {
              documents: true,
              dailyProgresses: true,
              weeklyProgresses: true,
              corrections: { where: { status: { not: "VERIFIED" } } }
            }
          }
        }
      })
    ]);
    const sanitizedStudents = students.map((s) => {
      const isAssignedToReqMentor = isMentor && (s.assignedMentorId === req.user.id || s.supportingMentors.some((sm) => sm.mentorId === req.user.id));
      const canSeeFull = req.user.role === import_client3.Role.ADMIN || req.user.role === import_client3.Role.SUPER_ADMIN || req.user.role === import_client3.Role.SUPERVISOR || isAssignedToReqMentor;
      let paymentSummary = null;
      if (canSeeFull && s.feeAgreement) {
        const totalPaid = s.feeAgreement.payments.reduce((acc, p) => acc + p.amount, 0);
        paymentSummary = {
          finalPayable: s.feeAgreement.finalPayableAmount,
          totalPaid,
          balance: s.feeAgreement.finalPayableAmount - totalPaid,
          status: totalPaid >= s.feeAgreement.finalPayableAmount ? "PAID" : totalPaid > 0 ? "PARTIAL" : "UNPAID"
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
        email: canSeeFull ? s.email : void 0,
        contactNumber: canSeeFull ? s.contactNumber : void 0,
        whatsappNumber: canSeeFull ? s.whatsappNumber : void 0,
        paymentSummary,
        activeCorrectionsCount: s._count.corrections,
        documentsCount: s._count.documents,
        lastUpdated: s.updatedAt
      };
    });
    res.json({
      students: sanitizedStudents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("List students error:", error);
    res.status(500).json({ message: "Failed to retrieve students list" });
  }
});
studentsRouter.post("/", authenticate, requireRoles(import_client3.Role.ADMIN), async (req, res) => {
  try {
    const {
      registrationNumber,
      fullName,
      email,
      username,
      contactNumber,
      whatsappNumber,
      university = "University of Colombo School of Computing (UCSC)",
      degreeProgramme = "Bachelor of Information Technology (BIT)",
      batch = "2026",
      academicYear = "Level 3 / Year 3",
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
      totalAgreedFee = 65e3,
      discount = 0,
      initialPayment = 0,
      numberOfInstallments = 3,
      paymentMethod = "BANK_TRANSFER",
      referenceNumber
    } = req.body;
    if (!registrationNumber || !fullName || !email || !contactNumber || !projectTitle) {
      res.status(400).json({ message: "Missing required student or project information." });
      return;
    }
    const trimmedReg = registrationNumber.trim();
    const trimmedEmail = email.toLowerCase().trim();
    const studentUsername = username ? username.trim() : trimmedReg;
    const existing = await prisma.student.findFirst({
      where: {
        OR: [{ registrationNumber: trimmedReg }, { email: trimmedEmail }]
      }
    });
    if (existing) {
      res.status(400).json({ message: "Student with this registration number or email already exists." });
      return;
    }
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: trimmedEmail }, { username: studentUsername }]
      }
    });
    if (existingUser) {
      res.status(400).json({ message: "A user account with this email or username already exists." });
      return;
    }
    const count = await prisma.student.count();
    const studentIdCode = `PM-${batch}-${String(count + 1).padStart(3, "0")}`;
    const projectIdCode = `PRJ-${batch}-${String(count + 1).padStart(3, "0")}`;
    const defaultStudentPassword = await import_bcryptjs2.default.hash("Student@123", 10);
    const studentUser = await prisma.user.create({
      data: {
        email: trimmedEmail,
        username: studentUsername,
        passwordHash: defaultStudentPassword,
        fullName: fullName.trim(),
        role: import_client3.Role.STUDENT,
        phone: contactNumber,
        isActive: true
      }
    });
    const newStudent = await prisma.$transaction(async (tx) => {
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
          status: import_client3.StudentStatus.ACTIVE
        }
      });
      if (Array.isArray(supportingMentorIds) && supportingMentorIds.length > 0) {
        for (const mentorId of supportingMentorIds) {
          if (mentorId && mentorId !== assignedMentorId) {
            await tx.studentMentorAssignment.create({
              data: {
                studentId: student.id,
                mentorId,
                isPrimary: false
              }
            });
          }
        }
      }
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
          category: category || "Web & Enterprise Application",
          currentStage: import_client3.DevelopmentStage.PROPOSAL,
          completionPercentage: 0
        }
      });
      const defaultMilestones = [
        { title: "Project Proposal & Scope Freeze", stage: import_client3.DevelopmentStage.PROPOSAL, weight: 10, orderIndex: 1 },
        { title: "Software Requirements Specification (SRS)", stage: import_client3.DevelopmentStage.SRS_DESIGN, weight: 15, orderIndex: 2 },
        { title: "System Architecture & Database Design", stage: import_client3.DevelopmentStage.SRS_DESIGN, weight: 15, orderIndex: 3 },
        { title: "Core Backend Development & APIs", stage: import_client3.DevelopmentStage.IMPLEMENTATION, weight: 20, orderIndex: 4 },
        { title: "Frontend UI Implementation & Integration", stage: import_client3.DevelopmentStage.IMPLEMENTATION, weight: 20, orderIndex: 5 },
        { title: "Testing, Security Audit & UAT", stage: import_client3.DevelopmentStage.TESTING, weight: 10, orderIndex: 6 },
        { title: "Final Dissertation & Viva Preparation", stage: import_client3.DevelopmentStage.DOCUMENTATION, weight: 10, orderIndex: 7 }
      ];
      for (const m of defaultMilestones) {
        await tx.projectMilestone.create({
          data: {
            projectId: project.id,
            title: m.title,
            stage: m.stage,
            weight: m.weight,
            orderIndex: m.orderIndex
          }
        });
      }
      const activeDocTypes = await tx.documentType.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: "asc" }
      });
      for (const dt of activeDocTypes) {
        await tx.studentDocument.create({
          data: {
            studentId: student.id,
            documentTypeId: dt.id,
            documentName: dt.name,
            documentType: dt.code,
            assignedMentorId: assignedMentorId || null,
            status: import_client3.DocumentStatus.NOT_STARTED
          }
        });
      }
      const finalPayable = Math.max(0, Number(totalAgreedFee) - Number(discount));
      const feeAgreement = await tx.studentFeeAgreement.create({
        data: {
          studentId: student.id,
          totalAgreedFee: Number(totalAgreedFee),
          discount: Number(discount),
          finalPayableAmount: finalPayable,
          paymentPlan: numberOfInstallments > 1 ? import_client3.PaymentPlan.INSTALLMENTS : import_client3.PaymentPlan.FULL,
          initialPayment: Number(initialPayment),
          numberOfInstallments: Number(numberOfInstallments)
        }
      });
      const installmentAmount = Math.round(finalPayable / numberOfInstallments);
      for (let i = 1; i <= numberOfInstallments; i++) {
        const dueDate = /* @__PURE__ */ new Date();
        dueDate.setMonth(dueDate.getMonth() + (i - 1) * 2);
        await tx.paymentInstallment.create({
          data: {
            feeAgreementId: feeAgreement.id,
            installmentNumber: i,
            amount: i === numberOfInstallments ? finalPayable - installmentAmount * (numberOfInstallments - 1) : installmentAmount,
            dueDate,
            status: i === 1 && initialPayment > 0 ? import_client3.InstallmentStatus.PAID : import_client3.InstallmentStatus.PENDING,
            paidDate: i === 1 && initialPayment > 0 ? /* @__PURE__ */ new Date() : null
          }
        });
      }
      if (Number(initialPayment) > 0) {
        const receiptNumber = `PM-RCP-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
        await tx.payment.create({
          data: {
            paymentId: `RCP-${batch}-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
            feeAgreementId: feeAgreement.id,
            studentId: student.id,
            amount: Number(initialPayment),
            paymentMethod,
            referenceNumber,
            receiptNumber,
            recordedById: req.user.id,
            remarks: "Registration / Initial payment"
          }
        });
      }
      if (assignedMentorId) {
        await tx.notification.create({
          data: {
            userId: assignedMentorId,
            title: `New Student Assigned: ${fullName}`,
            message: `You have been assigned as primary mentor for ${fullName} (${projectTitle}).`,
            type: import_client3.NotificationType.MENTOR_ASSIGNMENT,
            linkUrl: `/students/${student.id}`
          }
        });
      }
      await tx.activityLog.create({
        data: {
          actorId: req.user.id,
          actorName: req.user.fullName,
          actorRole: req.user.role,
          action: "REGISTER_STUDENT",
          entityType: "Student",
          entityId: student.id,
          details: { studentId: studentIdCode, regNumber: trimmedReg, title: projectTitle }
        }
      });
      return student;
    });
    res.status(201).json({
      message: "Student registered successfully",
      student: newStudent
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: error.message || "Failed to register student." });
  }
});
studentsRouter.get("/:id", authenticate, async (req, res) => {
  try {
    let studentId = req.params.id;
    if (studentId === "me" || studentId === "my-workspace") {
      const selfStudent = await prisma.student.findFirst({
        where: { userId: req.user.id },
        select: { id: true }
      });
      if (!selfStudent) {
        res.status(404).json({ message: "No student record associated with this user." });
        return;
      }
      studentId = selfStudent.id;
    }
    const found = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { userId: studentId }
        ]
      },
      select: { id: true }
    });
    if (!found) {
      res.status(404).json({ message: "Student record not found." });
      return;
    }
    const actualStudentId = found.id;
    const access = await checkStudentAccess(req, actualStudentId, "read");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    const student = await prisma.student.findUnique({
      where: { id: actualStudentId },
      include: {
        project: {
          include: {
            milestones: { orderBy: { orderIndex: "asc" } },
            tasks: {
              orderBy: { dueDate: "asc" },
              include: {
                comments: {
                  include: { author: { select: { fullName: true, role: true } } },
                  orderBy: { createdAt: "desc" }
                },
                assignedMentor: { select: { fullName: true } }
              }
            },
            history: { orderBy: { createdAt: "desc" } }
          }
        },
        assignedMentor: { select: { id: true, fullName: true, email: true, phone: true } },
        assignedSupervisor: { select: { id: true, fullName: true, email: true, phone: true } },
        supportingMentors: {
          include: {
            mentor: { select: { id: true, fullName: true, email: true, phone: true } }
          }
        },
        mentorAssignmentHistory: {
          orderBy: { assignedAt: "desc" }
        },
        documents: {
          orderBy: { documentTypeConfig: { orderIndex: "asc" } },
          include: {
            documentTypeConfig: true,
            reviewedBy: { select: { fullName: true, role: true } },
            versions: {
              orderBy: { versionNumber: "desc" },
              include: { uploadedBy: { select: { fullName: true, role: true } } }
            }
          }
        },
        dailyProgresses: {
          orderBy: { date: "desc" },
          include: { mentor: { select: { fullName: true } } }
        },
        weeklyProgresses: {
          orderBy: { weekStartDate: "desc" },
          include: {
            mentor: { select: { fullName: true } },
            reviewedBy: { select: { fullName: true } }
          }
        },
        corrections: {
          orderBy: { createdAt: "desc" },
          include: {
            supervisor: { select: { fullName: true } },
            assignedMentor: { select: { fullName: true } }
          }
        },
        meetings: {
          orderBy: { meetingDate: "desc" },
          include: {
            mentor: { select: { fullName: true } },
            supervisor: { select: { fullName: true } }
          }
        },
        evaluations: {
          orderBy: { scheduledDate: "desc" },
          include: { evaluator: { select: { fullName: true } } }
        },
        feeAgreement: {
          include: {
            installments: { orderBy: { installmentNumber: "asc" } },
            payments: {
              where: { isVoided: false },
              orderBy: { paymentDate: "desc" },
              include: { recordedBy: { select: { fullName: true } } }
            }
          }
        }
      }
    });
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }
    const userRole = req.user.role;
    let safeFeeAgreement = student.feeAgreement;
    if (userRole === import_client3.Role.MENTOR) {
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
          status: totalPaid >= student.feeAgreement.finalPayableAmount ? "FULLY_PAID" : totalPaid > 0 ? "PARTIALLY_PAID" : "UNPAID"
        };
      }
    }
    const activities = await prisma.activityLog.findMany({
      where: {
        OR: [
          { entityId: student.id },
          { entityId: student.project?.id }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 30
    });
    res.json({
      student: {
        ...student,
        supportingMentors: student.supportingMentors.map((sm) => sm.mentor),
        feeAgreement: safeFeeAgreement,
        activityHistory: activities
      }
    });
  } catch (error) {
    console.error("Fetch student error:", error);
    res.status(500).json({ message: "Failed to retrieve student workspace" });
  }
});
studentsRouter.put("/:id", authenticate, async (req, res) => {
  try {
    const studentId = req.params.id;
    const access = await checkStudentAccess(req, studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
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
      assignedMentorId
    } = req.body;
    const isAdmin = req.user.role === import_client3.Role.ADMIN || req.user.role === import_client3.Role.SUPER_ADMIN;
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId }
    });
    if (!existingStudent) {
      res.status(404).json({ message: "Student not found." });
      return;
    }
    if (isAdmin && assignedMentorId && assignedMentorId !== existingStudent.assignedMentorId) {
      await prisma.mentorAssignmentHistory.create({
        data: {
          studentId,
          previousMentorId: existingStudent.assignedMentorId,
          newMentorId: assignedMentorId,
          changedById: req.user.id,
          reason: "Reassigned via student update profile form"
        }
      });
      await prisma.studentDocument.updateMany({
        where: { studentId },
        data: { assignedMentorId }
      });
    }
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        fullName: fullName ? fullName.trim() : void 0,
        registrationNumber: isAdmin && registrationNumber ? registrationNumber.trim() : void 0,
        contactNumber,
        whatsappNumber,
        currentAddress,
        status: isAdmin && status ? status : void 0,
        remarks: isAdmin ? remarks : void 0,
        university: isAdmin ? university : void 0,
        degreeProgramme: isAdmin ? degreeProgramme : void 0,
        batch: isAdmin ? batch : void 0,
        academicYear: isAdmin ? academicYear : void 0,
        assignedSupervisorId: isAdmin ? assignedSupervisorId : void 0,
        assignedMentorId: isAdmin ? assignedMentorId : void 0
      }
    });
    await prisma.activityLog.create({
      data: {
        actorId: req.user.id,
        actorName: req.user.fullName,
        actorRole: req.user.role,
        action: "UPDATE_STUDENT_PROFILE",
        entityType: "Student",
        entityId: studentId,
        details: { changes: req.body }
      }
    });
    res.json({ message: "Student profile updated successfully", student: updated });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ message: "Failed to update student profile" });
  }
});
studentsRouter.put("/:id/status", authenticate, requireRoles(import_client3.Role.ADMIN), async (req, res) => {
  try {
    const studentId = req.params.id;
    const { status, isActive } = req.body;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true }
    });
    if (!student) {
      res.status(404).json({ message: "Student not found." });
      return;
    }
    const newIsActive = isActive !== void 0 ? Boolean(isActive) : status !== import_client3.StudentStatus.DEACTIVATED;
    const newStatus = status ? status : newIsActive ? import_client3.StudentStatus.ACTIVE : import_client3.StudentStatus.DEACTIVATED;
    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: studentId },
        data: {
          status: newStatus,
          isActive: newIsActive
        }
      });
      if (student.userId) {
        await tx.user.update({
          where: { id: student.userId },
          data: { isActive: newIsActive }
        });
      }
      await tx.activityLog.create({
        data: {
          actorId: req.user.id,
          actorName: req.user.fullName,
          actorRole: req.user.role,
          action: newIsActive ? "ACTIVATE_STUDENT" : "DEACTIVATE_STUDENT",
          entityType: "Student",
          entityId: studentId,
          details: { previousStatus: student.status, newStatus, isActive: newIsActive }
        }
      });
    });
    res.json({
      message: `Student account ${newIsActive ? "activated" : "deactivated"} successfully.`,
      isActive: newIsActive,
      status: newStatus
    });
  } catch (error) {
    console.error("Update student status error:", error);
    res.status(500).json({ message: "Failed to update student status" });
  }
});
studentsRouter.post("/:id/supporting-mentors", authenticate, requireRoles(import_client3.Role.ADMIN, import_client3.Role.SUPERVISOR), async (req, res) => {
  try {
    const studentId = req.params.id;
    const { mentorId } = req.body;
    if (!mentorId) {
      res.status(400).json({ message: "Mentor ID is required." });
      return;
    }
    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, role: import_client3.Role.MENTOR, isActive: true }
    });
    if (!mentor) {
      res.status(404).json({ message: "Active mentor not found." });
      return;
    }
    const existing = await prisma.studentMentorAssignment.findUnique({
      where: {
        studentId_mentorId: {
          studentId,
          mentorId
        }
      }
    });
    if (existing) {
      res.status(400).json({ message: "Mentor is already assigned to this student." });
      return;
    }
    const assignment = await prisma.studentMentorAssignment.create({
      data: {
        studentId,
        mentorId,
        isPrimary: false
      },
      include: {
        mentor: { select: { id: true, fullName: true, email: true } }
      }
    });
    await prisma.notification.create({
      data: {
        userId: mentorId,
        title: "Assigned as Supporting Mentor",
        message: `You have been added as a supporting mentor for student.`,
        type: import_client3.NotificationType.MENTOR_ASSIGNMENT,
        linkUrl: `/students/${studentId}`
      }
    });
    res.status(201).json({ message: "Supporting mentor assigned successfully", assignment });
  } catch (error) {
    console.error("Add supporting mentor error:", error);
    res.status(500).json({ message: "Failed to assign supporting mentor." });
  }
});
studentsRouter.delete("/:id/supporting-mentors/:mentorId", authenticate, requireRoles(import_client3.Role.ADMIN, import_client3.Role.SUPERVISOR), async (req, res) => {
  try {
    const { id: studentId, mentorId } = req.params;
    await prisma.studentMentorAssignment.deleteMany({
      where: {
        studentId,
        mentorId
      }
    });
    res.json({ message: "Supporting mentor removed successfully." });
  } catch (error) {
    console.error("Remove supporting mentor error:", error);
    res.status(500).json({ message: "Failed to remove supporting mentor." });
  }
});
studentsRouter.post("/:id/assign-mentor", authenticate, requireRoles(import_client3.Role.ADMIN), async (req, res) => {
  try {
    const studentId = req.params.id;
    const { newMentorId, reason } = req.body;
    if (!newMentorId) {
      res.status(400).json({ message: "New mentor ID is required" });
      return;
    }
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { project: true }
    });
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }
    const previousMentorId = student.assignedMentorId;
    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: studentId },
        data: { assignedMentorId: newMentorId }
      });
      await tx.mentorAssignmentHistory.create({
        data: {
          studentId,
          previousMentorId,
          newMentorId,
          changedById: req.user.id,
          reason: reason || "Administrative mentor reallocation"
        }
      });
      await tx.studentDocument.updateMany({
        where: { studentId },
        data: { assignedMentorId: newMentorId }
      });
      if (student.project) {
        await tx.projectTask.updateMany({
          where: {
            projectId: student.project.id,
            status: { in: ["TO_DO", "IN_PROGRESS", "NOT_STARTED"] }
          },
          data: { assignedMentorId: newMentorId }
        });
      }
      await tx.notification.create({
        data: {
          userId: newMentorId,
          title: `Student Reassigned: ${student.fullName}`,
          message: `You are now the primary mentor for ${student.fullName}. Reason: ${reason || "Reassigned by Admin"}`,
          type: import_client3.NotificationType.MENTOR_ASSIGNMENT,
          linkUrl: `/students/${studentId}`
        }
      });
      await tx.activityLog.create({
        data: {
          actorId: req.user.id,
          actorName: req.user.fullName,
          actorRole: req.user.role,
          action: "REASSIGN_MENTOR",
          entityType: "Student",
          entityId: studentId,
          details: { previousMentorId, newMentorId, reason }
        }
      });
    });
    res.json({ message: "Primary mentor successfully reassigned" });
  } catch (error) {
    console.error("Mentor reassignment error:", error);
    res.status(500).json({ message: "Failed to reassign mentor" });
  }
});

// src/routes/projects.routes.ts
var import_express3 = require("express");
var projectsRouter = (0, import_express3.Router)();
projectsRouter.put("/:id", authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, studentId: true, title: true, currentStage: true, techStack: true }
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    const access = await checkStudentAccess(req, project.studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    const {
      title,
      idea,
      problemStatement,
      proposedSolution,
      mainObjectives,
      mainModules,
      techStack,
      category,
      currentStage,
      completionPercentage,
      githubRepoUrl,
      demoUrl,
      technicalRemarks,
      changeReason
    } = req.body;
    if (title && title !== project.title) {
      await prisma.projectHistory.create({
        data: {
          projectId: project.id,
          fieldChanged: "title",
          oldValue: project.title,
          newValue: title,
          reason: changeReason || "Project title refined",
          changedById: req.user.id
        }
      });
    }
    if (currentStage && currentStage !== project.currentStage) {
      await prisma.projectHistory.create({
        data: {
          projectId: project.id,
          fieldChanged: "currentStage",
          oldValue: project.currentStage,
          newValue: currentStage,
          reason: changeReason || "Stage transitioned",
          changedById: req.user.id
        }
      });
    }
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        title,
        idea,
        problemStatement,
        proposedSolution,
        mainObjectives,
        mainModules,
        techStack,
        category,
        currentStage,
        completionPercentage: completionPercentage !== void 0 ? Number(completionPercentage) : void 0,
        githubRepoUrl,
        demoUrl,
        technicalRemarks
      }
    });
    res.json({ message: "Project updated successfully", project: updated });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ message: "Failed to update project details" });
  }
});
projectsRouter.post("/:id/milestones", authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    const access = await checkStudentAccess(req, project.studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    const { title, description, stage, weight = 10, dueDate, orderIndex } = req.body;
    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId,
        title,
        description,
        stage,
        weight: Number(weight),
        dueDate: dueDate ? new Date(dueDate) : null,
        orderIndex: Number(orderIndex) || 0
      }
    });
    res.status(201).json({ message: "Milestone created", milestone });
  } catch (error) {
    res.status(500).json({ message: "Failed to create milestone" });
  }
});
projectsRouter.put("/:id/milestones/:mId", authenticate, async (req, res) => {
  try {
    const { id: projectId, mId: milestoneId } = req.params;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    const access = await checkStudentAccess(req, project.studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    const { status, title, description, dueDate, weight } = req.body;
    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        status,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : void 0,
        weight: weight !== void 0 ? Number(weight) : void 0,
        completedDate: status === "COMPLETED" ? /* @__PURE__ */ new Date() : null
      }
    });
    const allMilestones = await prisma.projectMilestone.findMany({ where: { projectId } });
    const totalWeight = allMilestones.reduce((acc, m) => acc + m.weight, 0);
    const completedWeight = allMilestones.filter((m) => m.status === "COMPLETED").reduce((acc, m) => acc + m.weight, 0);
    const calcPercentage = totalWeight > 0 ? Math.min(100, completedWeight / totalWeight * 100) : 0;
    await prisma.project.update({
      where: { id: projectId },
      data: { completionPercentage: Math.round(calcPercentage * 10) / 10 }
    });
    res.json({ message: "Milestone updated and progress recalculated", milestone: updated, calculatedProgress: calcPercentage });
  } catch (error) {
    res.status(500).json({ message: "Failed to update milestone" });
  }
});
projectsRouter.post("/:id/recalculate-progress", authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;
    const allMilestones = await prisma.projectMilestone.findMany({ where: { projectId } });
    const totalWeight = allMilestones.reduce((acc, m) => acc + m.weight, 0);
    const completedWeight = allMilestones.filter((m) => m.status === "COMPLETED").reduce((acc, m) => acc + m.weight, 0);
    const calcPercentage = totalWeight > 0 ? Math.min(100, completedWeight / totalWeight * 100) : 0;
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { completionPercentage: Math.round(calcPercentage * 10) / 10 }
    });
    res.json({ completionPercentage: updated.completionPercentage });
  } catch (error) {
    res.status(500).json({ message: "Failed to calculate progress" });
  }
});

// src/routes/documents.routes.ts
var import_express4 = require("express");

// src/middleware/upload.ts
var import_multer = __toESM(require("multer"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var uploadDir = import_path.default.resolve(process.cwd(), process.env.UPLOAD_DIR || "../uploads");
if (!import_fs.default.existsSync(uploadDir)) {
  import_fs.default.mkdirSync(uploadDir, { recursive: true });
}
var storage = import_multer.default.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = import_path.default.extname(file.originalname);
    const basename = import_path.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${basename}_${uniqueSuffix}${ext}`);
  }
});
var upload = (0, import_multer.default)({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
    // 25 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".zip", ".xlsx", ".csv"];
    const ext = import_path.default.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} is not allowed. Allowed types: ${allowedExtensions.join(", ")}`));
    }
  }
});

// src/routes/documents.routes.ts
var import_client4 = require("@prisma/client");
var documentsRouter = (0, import_express4.Router)();
documentsRouter.get("/requirements", authenticate, async (req, res) => {
  try {
    const requirements = await prisma.documentType.findMany({
      orderBy: { orderIndex: "asc" },
      include: {
        _count: {
          select: { studentDocuments: true }
        }
      }
    });
    res.json({ requirements });
  } catch (error) {
    console.error("List requirements error:", error);
    res.status(500).json({ message: "Failed to retrieve document requirements" });
  }
});
documentsRouter.post("/requirements", authenticate, requireRoles(import_client4.Role.ADMIN), async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      category = "General",
      academicStage = import_client4.DevelopmentStage.PROPOSAL,
      submissionInstructions,
      defaultDeadlineDays = 30,
      allowedUrlTypes = "Google Drive, GitHub, Web URL",
      targetBatch,
      targetStage,
      isRequired = true,
      autoAssignAllActive = true
    } = req.body;
    if (!code || !name) {
      res.status(400).json({ message: "Requirement code and title are required." });
      return;
    }
    const trimmedCode = code.toUpperCase().trim();
    const existing = await prisma.documentType.findUnique({
      where: { code: trimmedCode }
    });
    if (existing) {
      res.status(400).json({ message: `A document requirement with code "${trimmedCode}" already exists.` });
      return;
    }
    const count = await prisma.documentType.count();
    const createdReq = await prisma.$transaction(async (tx) => {
      const reqDoc = await tx.documentType.create({
        data: {
          code: trimmedCode,
          name: name.trim(),
          description: description || null,
          category,
          academicStage,
          submissionInstructions: submissionInstructions || "Submit shared Google Drive or GitHub repository URL. Ensure view permissions are granted.",
          defaultDeadlineDays: Number(defaultDeadlineDays) || 30,
          allowedUrlTypes,
          targetBatch: targetBatch || null,
          targetStage: targetStage ? targetStage : null,
          isActive: true,
          orderIndex: count + 1
        }
      });
      if (autoAssignAllActive) {
        const studentWhere = { isActive: true };
        if (targetBatch) studentWhere.batch = targetBatch;
        const targetStudents = await tx.student.findMany({
          where: studentWhere,
          select: { id: true, assignedMentorId: true }
        });
        for (const student of targetStudents) {
          const existingAssignment = await tx.studentDocument.findFirst({
            where: {
              studentId: student.id,
              documentTypeId: reqDoc.id
            }
          });
          if (!existingAssignment) {
            await tx.studentDocument.create({
              data: {
                studentId: student.id,
                documentTypeId: reqDoc.id,
                documentName: reqDoc.name,
                documentType: reqDoc.code,
                assignedMentorId: student.assignedMentorId,
                status: import_client4.DocumentStatus.NOT_STARTED
              }
            });
          }
        }
      }
      await tx.activityLog.create({
        data: {
          actorId: req.user.id,
          actorName: req.user.fullName,
          actorRole: req.user.role,
          action: "CREATE_DOCUMENT_REQUIREMENT",
          entityType: "DocumentType",
          entityId: reqDoc.id,
          details: { code: trimmedCode, title: name, category, academicStage }
        }
      });
      return reqDoc;
    });
    res.status(201).json({
      message: "Master document requirement created and assigned to applicable students.",
      requirement: createdReq
    });
  } catch (error) {
    console.error("Create requirement error:", error);
    res.status(500).json({ message: error.message || "Failed to create document requirement" });
  }
});
documentsRouter.put("/requirements/:id", authenticate, requireRoles(import_client4.Role.ADMIN), async (req, res) => {
  try {
    const id = req.params.id;
    const {
      name,
      description,
      category,
      academicStage,
      submissionInstructions,
      defaultDeadlineDays,
      allowedUrlTypes,
      orderIndex,
      isActive
    } = req.body;
    const updated = await prisma.documentType.update({
      where: { id },
      data: {
        name: name ? name.trim() : void 0,
        description,
        category,
        academicStage: academicStage ? academicStage : void 0,
        submissionInstructions,
        defaultDeadlineDays: defaultDeadlineDays !== void 0 ? Number(defaultDeadlineDays) : void 0,
        allowedUrlTypes,
        orderIndex: orderIndex !== void 0 ? Number(orderIndex) : void 0,
        isActive: isActive !== void 0 ? Boolean(isActive) : void 0
      }
    });
    if (name) {
      await prisma.studentDocument.updateMany({
        where: {
          documentTypeId: id,
          status: { in: [import_client4.DocumentStatus.NOT_STARTED, import_client4.DocumentStatus.PENDING] }
        },
        data: { documentName: name.trim() }
      });
    }
    res.json({ message: "Requirement updated successfully", requirement: updated });
  } catch (error) {
    console.error("Update requirement error:", error);
    res.status(500).json({ message: "Failed to update requirement" });
  }
});
documentsRouter.put("/requirements/:id/status", authenticate, requireRoles(import_client4.Role.ADMIN), async (req, res) => {
  try {
    const id = req.params.id;
    const { isActive } = req.body;
    const updated = await prisma.documentType.update({
      where: { id },
      data: { isActive: Boolean(isActive) }
    });
    res.json({ message: `Requirement ${updated.isActive ? "activated" : "deactivated"}`, requirement: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle requirement status" });
  }
});
documentsRouter.get("/", authenticate, async (req, res) => {
  try {
    const { studentId, status, mentorId, search } = req.query;
    const where = {};
    if (studentId) where.studentId = String(studentId);
    if (status) where.status = status;
    if (mentorId) where.assignedMentorId = String(mentorId);
    if (search) {
      where.OR = [
        { documentName: { contains: String(search), mode: "insensitive" } },
        { submissionTitle: { contains: String(search), mode: "insensitive" } },
        { student: { fullName: { contains: String(search), mode: "insensitive" } } }
      ];
    }
    if (req.user.role === import_client4.Role.MENTOR && !studentId) {
      where.OR = [
        { assignedMentorId: req.user.id },
        { student: { supportingMentors: { some: { mentorId: req.user.id } } } }
      ];
    }
    if (req.user.role === import_client4.Role.STUDENT) {
      const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
      if (!student) {
        res.json({ documents: [] });
        return;
      }
      where.studentId = student.id;
    }
    const documents = await prisma.studentDocument.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true, batch: true } },
        documentTypeConfig: true,
        reviewedBy: { select: { fullName: true, role: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: { uploadedBy: { select: { fullName: true, role: true } } }
        }
      }
    });
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ message: "Failed to list documents" });
  }
});
documentsRouter.post("/:id/submit-url", authenticate, async (req, res) => {
  try {
    const documentId = req.params.id;
    const { submissionTitle, submissionUrl, submissionNote } = req.body;
    if (!submissionUrl || !submissionUrl.trim()) {
      res.status(400).json({ message: "Document URL (e.g. Google Drive link or repository URL) is required." });
      return;
    }
    const trimmedUrl = submissionUrl.trim();
    try {
      new URL(trimmedUrl);
    } catch {
      res.status(400).json({ message: "Invalid URL format. Please provide a valid external URL (e.g., https://drive.google.com/...)" });
      return;
    }
    const document = await prisma.studentDocument.findUnique({
      where: { id: documentId },
      include: {
        student: {
          include: {
            assignedMentor: true,
            assignedSupervisor: true,
            supportingMentors: true
          }
        }
      }
    });
    if (!document) {
      res.status(404).json({ message: "Document record not found" });
      return;
    }
    const access = await checkStudentAccess(req, document.studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    const nextVersion = document.currentVersion + 1;
    const isResubmission = document.status === import_client4.DocumentStatus.CORRECTION_REQUIRED || document.status === import_client4.DocumentStatus.REVISION_REQUIRED;
    const nextStatus = isResubmission ? import_client4.DocumentStatus.RESUBMITTED : import_client4.DocumentStatus.SUBMITTED;
    const [updatedDoc, newVersion] = await prisma.$transaction([
      // 1. Update StudentDocument
      prisma.studentDocument.update({
        where: { id: documentId },
        data: {
          submissionTitle: submissionTitle ? submissionTitle.trim() : document.documentName,
          submissionUrl: trimmedUrl,
          submissionNote: submissionNote ? submissionNote.trim() : null,
          submittedAt: /* @__PURE__ */ new Date(),
          submittedDate: /* @__PURE__ */ new Date(),
          currentVersion: nextVersion,
          status: nextStatus
        }
      }),
      // 2. Create DocumentVersion record with external link
      prisma.documentVersion.create({
        data: {
          studentDocumentId: documentId,
          versionNumber: nextVersion,
          fileUrl: trimmedUrl,
          fileName: submissionTitle || `${document.documentName} (v${nextVersion})`,
          fileSize: 0,
          fileType: "link/external",
          externalUrl: trimmedUrl,
          submissionNote: submissionNote ? submissionNote.trim() : null,
          changeSummary: submissionNote || `Version ${nextVersion} submission via Google Drive / URL`,
          uploadedById: req.user.id,
          status: nextStatus
        }
      })
    ]);
    const notificationReceivers = [
      document.student.assignedMentorId,
      document.student.assignedSupervisorId,
      ...document.student.supportingMentors.map((sm) => sm.mentorId)
    ].filter(Boolean);
    for (const recId of notificationReceivers) {
      await prisma.notification.create({
        data: {
          userId: recId,
          title: `Document ${isResubmission ? "Resubmitted" : "Submitted"}: ${document.documentName}`,
          message: `${document.student.fullName} submitted ${document.documentName} (Version ${nextVersion}). Please review and provide feedback.`,
          type: import_client4.NotificationType.DOCUMENT_SUBMISSION,
          linkUrl: `/students/${document.studentId}`
        }
      });
    }
    await prisma.activityLog.create({
      data: {
        actorId: req.user.id,
        actorName: req.user.fullName,
        actorRole: req.user.role,
        action: "SUBMIT_DOCUMENT_URL",
        entityType: "StudentDocument",
        entityId: documentId,
        details: { url: trimmedUrl, version: nextVersion, title: submissionTitle }
      }
    });
    res.json({
      message: `Document submitted successfully as Version ${nextVersion}`,
      document: updatedDoc,
      version: newVersion
    });
  } catch (error) {
    console.error("Submit document URL error:", error);
    res.status(500).json({ message: "Failed to submit document URL" });
  }
});
documentsRouter.post("/:id/review-submission", authenticate, requireRoles(import_client4.Role.ADMIN, import_client4.Role.SUPERVISOR, import_client4.Role.MENTOR), async (req, res) => {
  try {
    const documentId = req.params.id;
    const { status, reviewerFeedback, requiredCorrections, correctionDeadline } = req.body;
    const allowedStatuses = [
      import_client4.DocumentStatus.APPROVED,
      import_client4.DocumentStatus.CORRECTION_REQUIRED,
      import_client4.DocumentStatus.UNDER_REVIEW,
      import_client4.DocumentStatus.REJECTED
    ];
    if (!status || !allowedStatuses.includes(status)) {
      res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(", ")}` });
      return;
    }
    const document = await prisma.studentDocument.findUnique({
      where: { id: documentId },
      include: {
        student: { select: { id: true, fullName: true, userId: true, assignedMentorId: true } },
        versions: { orderBy: { versionNumber: "desc" }, take: 1 }
      }
    });
    if (!document) {
      res.status(404).json({ message: "Document not found" });
      return;
    }
    const latestVersion = document.versions[0];
    const isApproved = status === import_client4.DocumentStatus.APPROVED;
    await prisma.$transaction(async (tx) => {
      await tx.studentDocument.update({
        where: { id: documentId },
        data: {
          status,
          reviewerFeedback: reviewerFeedback || requiredCorrections || null,
          reviewedById: req.user.id,
          reviewedAt: /* @__PURE__ */ new Date(),
          approvedDate: isApproved ? /* @__PURE__ */ new Date() : null
        }
      });
      if (latestVersion) {
        await tx.documentVersion.update({
          where: { id: latestVersion.id },
          data: {
            reviewedById: req.user.id,
            reviewDate: /* @__PURE__ */ new Date(),
            reviewerComments: reviewerFeedback || requiredCorrections || null,
            status
          }
        });
      }
      if (status === import_client4.DocumentStatus.CORRECTION_REQUIRED) {
        await tx.correction.create({
          data: {
            studentId: document.studentId,
            studentDocumentId: document.id,
            supervisorId: req.user.id,
            assignedMentorId: document.student.assignedMentorId || req.user.id,
            issueDescription: `Correction requested on: ${document.documentName}`,
            correctionInstruction: reviewerFeedback || requiredCorrections || "Please revise document and submit updated link.",
            deadline: correctionDeadline ? new Date(correctionDeadline) : null
          }
        });
      }
      if (document.student.userId) {
        await tx.notification.create({
          data: {
            userId: document.student.userId,
            title: `Document ${status}: ${document.documentName}`,
            message: `Your reviewer marked ${document.documentName} as ${status}. Feedback: "${reviewerFeedback || "Reviewed"}"`,
            type: status === import_client4.DocumentStatus.APPROVED ? import_client4.NotificationType.SUPERVISOR_FEEDBACK : import_client4.NotificationType.CORRECTION,
            linkUrl: `/students/${document.studentId}`
          }
        });
      }
      await tx.activityLog.create({
        data: {
          actorId: req.user.id,
          actorName: req.user.fullName,
          actorRole: req.user.role,
          action: "REVIEW_DOCUMENT_SUBMISSION",
          entityType: "StudentDocument",
          entityId: documentId,
          details: { status, feedback: reviewerFeedback }
        }
      });
    });
    res.json({ message: `Review recorded as ${status} successfully.` });
  } catch (error) {
    console.error("Review document submission error:", error);
    res.status(500).json({ message: "Failed to record document review." });
  }
});
documentsRouter.post("/:id/upload", authenticate, upload.single("file"), async (req, res) => {
  try {
    const documentId = req.params.id;
    const document = await prisma.studentDocument.findUnique({
      where: { id: documentId },
      include: { student: { include: { assignedSupervisor: true } } }
    });
    if (!document) {
      res.status(404).json({ message: "Document record not found" });
      return;
    }
    const access = await checkStudentAccess(req, document.studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded." });
      return;
    }
    const { changeSummary } = req.body;
    const nextVersion = document.currentVersion + 1;
    const fileUrl = `/uploads/${req.file.filename}`;
    const [updatedDoc, version] = await prisma.$transaction([
      prisma.studentDocument.update({
        where: { id: documentId },
        data: {
          currentVersion: nextVersion,
          status: import_client4.DocumentStatus.SUBMITTED,
          submittedDate: /* @__PURE__ */ new Date()
        }
      }),
      prisma.documentVersion.create({
        data: {
          studentDocumentId: documentId,
          versionNumber: nextVersion,
          fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          uploadedById: req.user.id,
          changeSummary: changeSummary || `Version ${nextVersion} upload`,
          status: import_client4.DocumentStatus.SUBMITTED
        }
      })
    ]);
    res.json({
      message: `Document version ${nextVersion} uploaded successfully`,
      document: updatedDoc,
      version
    });
  } catch (error) {
    console.error("Document upload error:", error);
    res.status(500).json({ message: "Failed to upload document version" });
  }
});

// src/routes/progress.routes.ts
var import_express5 = require("express");
var import_client5 = require("@prisma/client");
var import_date_fns = require("date-fns");
var progressRouter = (0, import_express5.Router)();
progressRouter.get("/daily", authenticate, async (req, res) => {
  try {
    const { studentId, mentorId, date, limit = "30" } = req.query;
    const where = {};
    if (studentId) where.studentId = String(studentId);
    if (mentorId) where.mentorId = String(mentorId);
    if (date) {
      const d = new Date(String(date));
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);
      where.date = { gte: d, lt: nextD };
    }
    if (req.user.role === import_client5.Role.MENTOR && !studentId) {
      where.OR = [
        { mentorId: req.user.id },
        { student: { supportingMentors: { some: { mentorId: req.user.id } } } }
      ];
    }
    if (req.user.role === import_client5.Role.STUDENT) {
      const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
      if (!student) {
        res.json({ logs: [] });
        return;
      }
      where.studentId = student.id;
    }
    const logs = await prisma.dailyProgress.findMany({
      where,
      orderBy: { date: "desc" },
      take: parseInt(limit, 10),
      include: {
        mentor: { select: { fullName: true } },
        student: { select: { fullName: true, studentId: true, registrationNumber: true } }
      }
    });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve daily progress logs" });
  }
});
progressRouter.post("/daily", authenticate, async (req, res) => {
  try {
    const {
      studentId,
      date = /* @__PURE__ */ new Date(),
      moduleTask,
      workPlanned,
      workCompleted,
      currentStatus = "In Progress",
      problemsEncountered,
      mistakesIdentified,
      correctionsRequired,
      nextAction,
      attachmentUrl
    } = req.body;
    if (!studentId || !moduleTask || !workPlanned || !workCompleted) {
      res.status(400).json({ message: "studentId, moduleTask, workPlanned, and workCompleted are required" });
      return;
    }
    const access = await checkStudentAccess(req, studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
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
        attachmentUrl
      },
      include: {
        student: { select: { fullName: true, assignedSupervisorId: true } }
      }
    });
    if (mistakesIdentified && entry.student.assignedSupervisorId) {
      await prisma.notification.create({
        data: {
          userId: entry.student.assignedSupervisorId,
          title: `Progress Note: Mistake Identified for ${entry.student.fullName}`,
          message: `Mentor recorded mistake/correction in ${moduleTask}: "${mistakesIdentified}"`,
          type: import_client5.NotificationType.SUPERVISOR_FEEDBACK,
          linkUrl: `/students/${studentId}`
        }
      });
    }
    res.status(201).json({ message: "Daily progress recorded successfully", entry });
  } catch (error) {
    console.error("Daily progress error:", error);
    res.status(500).json({ message: "Failed to record daily progress" });
  }
});
progressRouter.get("/weekly", authenticate, async (req, res) => {
  try {
    const { studentId, mentorId, status, limit = "30" } = req.query;
    const where = {};
    if (studentId) where.studentId = String(studentId);
    if (mentorId) where.mentorId = String(mentorId);
    if (status) where.status = status;
    if (req.user.role === import_client5.Role.MENTOR && !studentId) {
      where.OR = [
        { mentorId: req.user.id },
        { student: { supportingMentors: { some: { mentorId: req.user.id } } } }
      ];
    }
    if (req.user.role === import_client5.Role.STUDENT) {
      const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
      if (!student) {
        res.json({ reports: [] });
        return;
      }
      where.studentId = student.id;
    }
    const reports = await prisma.weeklyProgress.findMany({
      where,
      orderBy: { weekStartDate: "desc" },
      take: parseInt(limit, 10),
      include: {
        mentor: { select: { fullName: true } },
        reviewedBy: { select: { fullName: true, role: true } },
        student: { select: { fullName: true, studentId: true, registrationNumber: true, batch: true } },
        supervisorFeedbacks: {
          include: { supervisor: { select: { fullName: true } } }
        }
      }
    });
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve weekly progress" });
  }
});
progressRouter.post("/weekly/student-submit", authenticate, async (req, res) => {
  try {
    const {
      studentId,
      weekStartDate,
      plannedActivities,
      completedActivities,
      currentActivities,
      challenges,
      githubEvidenceUrl,
      nextWeekPlan
    } = req.body;
    let targetStudentId = studentId;
    if (req.user.role === import_client5.Role.STUDENT) {
      const selfStudent = await prisma.student.findFirst({ where: { userId: req.user.id } });
      if (!selfStudent) {
        res.status(404).json({ message: "Student profile not found" });
        return;
      }
      targetStudentId = selfStudent.id;
    }
    if (!targetStudentId || !weekStartDate || !plannedActivities || !completedActivities) {
      res.status(400).json({ message: "weekStartDate, plannedActivities, and completedActivities are required." });
      return;
    }
    const access = await checkStudentAccess(req, targetStudentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    const student = await prisma.student.findUnique({
      where: { id: targetStudentId },
      select: { fullName: true, assignedMentorId: true, supportingMentors: true }
    });
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1e3);
    const weekNumber = (0, import_date_fns.getISOWeek)(startDate);
    const year = (0, import_date_fns.getYear)(startDate);
    const report = await prisma.weeklyProgress.upsert({
      where: {
        studentId_year_weekNumber: {
          studentId: targetStudentId,
          year,
          weekNumber
        }
      },
      update: {
        plannedActivities,
        completedActivities,
        currentActivities: currentActivities || null,
        challenges: challenges || null,
        githubEvidenceUrl: githubEvidenceUrl ? githubEvidenceUrl.trim() : null,
        nextWeekPlan: nextWeekPlan || null,
        status: import_client5.WeeklyStatus.IN_PROGRESS,
        reviewStatus: "PENDING"
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
        status: import_client5.WeeklyStatus.IN_PROGRESS,
        reviewStatus: "PENDING"
      }
    });
    if (student?.assignedMentorId) {
      await prisma.notification.create({
        data: {
          userId: student.assignedMentorId,
          title: `Weekly Progress Submitted: ${student.fullName}`,
          message: `${student.fullName} submitted weekly report for Week ${weekNumber} (${year}).`,
          type: import_client5.NotificationType.MISSING_UPDATE,
          linkUrl: `/weekly-progress`
        }
      });
    }
    res.json({ message: "Weekly progress report submitted successfully", report });
  } catch (error) {
    console.error("Student weekly progress error:", error);
    res.status(500).json({ message: "Failed to submit weekly progress report" });
  }
});
progressRouter.post("/weekly/:id/review", authenticate, requireRoles(import_client5.Role.ADMIN, import_client5.Role.SUPERVISOR, import_client5.Role.MENTOR), async (req, res) => {
  try {
    const reportId = req.params.id;
    const { reviewStatus, mentorNotes } = req.body;
    if (!reviewStatus || !["APPROVED", "REVISION_REQUESTED"].includes(reviewStatus)) {
      res.status(400).json({ message: "reviewStatus must be APPROVED or REVISION_REQUESTED" });
      return;
    }
    const report = await prisma.weeklyProgress.findUnique({
      where: { id: reportId },
      include: {
        student: { select: { id: true, fullName: true, userId: true } }
      }
    });
    if (!report) {
      res.status(404).json({ message: "Weekly progress report not found" });
      return;
    }
    const nextWeeklyStatus = reviewStatus === "APPROVED" ? import_client5.WeeklyStatus.COMPLETED : import_client5.WeeklyStatus.BLOCKED;
    const updated = await prisma.weeklyProgress.update({
      where: { id: reportId },
      data: {
        reviewStatus,
        mentorNotes: mentorNotes || void 0,
        status: nextWeeklyStatus,
        reviewedById: req.user.id,
        reviewedAt: /* @__PURE__ */ new Date()
      }
    });
    if (report.student.userId) {
      await prisma.notification.create({
        data: {
          userId: report.student.userId,
          title: `Weekly Report ${reviewStatus === "APPROVED" ? "Approved" : "Revision Requested"}`,
          message: `Your weekly progress report for Week ${report.weekNumber} was marked as ${reviewStatus}. Notes: "${mentorNotes || "Reviewed"}"`,
          type: import_client5.NotificationType.SUPERVISOR_FEEDBACK,
          linkUrl: `/weekly-progress`
        }
      });
    }
    res.json({ message: `Weekly progress review recorded as ${reviewStatus}`, report: updated });
  } catch (error) {
    console.error("Weekly progress review error:", error);
    res.status(500).json({ message: "Failed to record weekly progress review" });
  }
});
progressRouter.post("/weekly", authenticate, async (req, res) => {
  try {
    const {
      studentId,
      weekStartDate,
      weekEndDate,
      plannedActivities,
      completedActivities,
      incompleteActivities,
      problemsBlockers,
      supervisorFeedback,
      nextWeekPlan,
      mentorNotes,
      status = "IN_PROGRESS"
    } = req.body;
    if (!studentId || !weekStartDate || !plannedActivities || !completedActivities) {
      res.status(400).json({ message: "Missing required weekly progress fields" });
      return;
    }
    const access = await checkStudentAccess(req, studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    const startDate = new Date(weekStartDate);
    const endDate = weekEndDate ? new Date(weekEndDate) : new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1e3);
    const weekNumber = (0, import_date_fns.getISOWeek)(startDate);
    const year = (0, import_date_fns.getYear)(startDate);
    const report = await prisma.weeklyProgress.upsert({
      where: {
        studentId_year_weekNumber: {
          studentId,
          year,
          weekNumber
        }
      },
      update: {
        plannedActivities,
        completedActivities,
        incompleteActivities,
        problemsBlockers,
        supervisorFeedback,
        nextWeekPlan,
        mentorNotes,
        status
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
        status
      }
    });
    res.status(201).json({ message: "Weekly progress saved", report });
  } catch (error) {
    console.error("Weekly progress error:", error);
    res.status(500).json({ message: "Failed to save weekly progress" });
  }
});

// src/routes/tasks.routes.ts
var import_express6 = require("express");
var import_client6 = require("@prisma/client");
var tasksRouter = (0, import_express6.Router)();
tasksRouter.get("/", authenticate, async (req, res) => {
  try {
    const { studentId, projectId, status, priority, mentorId, search } = req.query;
    const where = {};
    if (studentId) where.project = { studentId: String(studentId) };
    if (projectId) where.projectId = String(projectId);
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (mentorId) where.assignedMentorId = String(mentorId);
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } },
        { moduleName: { contains: String(search), mode: "insensitive" } }
      ];
    }
    if (req.user.role === import_client6.Role.MENTOR && !studentId && !projectId) {
      where.OR = [
        { assignedMentorId: req.user.id },
        { project: { student: { supportingMentors: { some: { mentorId: req.user.id } } } } }
      ];
    }
    if (req.user.role === import_client6.Role.STUDENT) {
      const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
      if (!student) {
        res.json({ tasks: [] });
        return;
      }
      where.project = { studentId: student.id };
    }
    const tasks = await prisma.projectTask.findMany({
      where,
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      include: {
        project: {
          select: {
            id: true,
            title: true,
            currentStage: true,
            student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true } }
          }
        },
        milestone: { select: { id: true, title: true, stage: true } },
        assignedMentor: { select: { id: true, fullName: true, email: true } },
        comments: {
          include: { author: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: "desc" }
        }
      }
    });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve tasks" });
  }
});
tasksRouter.post("/", authenticate, async (req, res) => {
  try {
    const {
      projectId,
      studentId,
      milestoneId,
      moduleName,
      title,
      description,
      priority = "MEDIUM",
      startDate,
      dueDate,
      responsiblePerson = "Student",
      assignedMentorId
    } = req.body;
    if (!title || !projectId && !studentId) {
      res.status(400).json({ message: "Title and projectId/studentId are required" });
      return;
    }
    let targetProjectId = projectId;
    if (!targetProjectId && studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { project: true }
      });
      if (!student?.project) {
        res.status(404).json({ message: "Project not found for this student" });
        return;
      }
      targetProjectId = student.project.id;
    }
    const project = await prisma.project.findUnique({
      where: { id: targetProjectId },
      include: { student: true }
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    const access = await checkStudentAccess(req, project.studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    const taskMentorId = assignedMentorId || (req.user.role === import_client6.Role.MENTOR ? req.user.id : project.student.assignedMentorId);
    const task = await prisma.projectTask.create({
      data: {
        projectId: targetProjectId,
        milestoneId: milestoneId || null,
        moduleName,
        title: title.trim(),
        description,
        priority,
        status: import_client6.TaskStatus.NOT_STARTED,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        responsiblePerson,
        assignedMentorId: taskMentorId || void 0,
        completionPercentage: 0
      },
      include: {
        project: { select: { student: { select: { id: true, fullName: true, userId: true } } } }
      }
    });
    if (task.project?.student?.userId) {
      await prisma.notification.create({
        data: {
          userId: task.project.student.userId,
          title: `New Task Assigned: ${title}`,
          message: `A new task "${title}" has been assigned to your project.`,
          type: import_client6.NotificationType.SYSTEM,
          linkUrl: `/tasks`
        }
      });
    }
    res.status(201).json({ message: "Task created", task });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});
tasksRouter.put("/:id/student-progress", authenticate, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { completionPercentage, githubRepoUrl, githubCommitOrPrUrl, studentProgressNote, status } = req.body;
    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            student: { select: { id: true, fullName: true, assignedMentorId: true, assignedSupervisorId: true } }
          }
        }
      }
    });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    const access = await checkStudentAccess(req, task.project.studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    const parsedPercent = completionPercentage !== void 0 ? Math.min(100, Math.max(0, Number(completionPercentage))) : task.completionPercentage;
    const nextStatus = status ? status : parsedPercent === 100 ? import_client6.TaskStatus.SUBMITTED_FOR_REVIEW : parsedPercent > 0 ? import_client6.TaskStatus.IN_PROGRESS : task.status;
    const updated = await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        completionPercentage: parsedPercent,
        githubRepoUrl: githubRepoUrl ? githubRepoUrl.trim() : void 0,
        githubCommitOrPrUrl: githubCommitOrPrUrl ? githubCommitOrPrUrl.trim() : void 0,
        studentProgressNote: studentProgressNote ? studentProgressNote.trim() : void 0,
        status: nextStatus
      }
    });
    const mentorId = task.assignedMentorId || task.project.student.assignedMentorId;
    if (mentorId) {
      await prisma.notification.create({
        data: {
          userId: mentorId,
          title: `Task Progress Updated: ${task.title}`,
          message: `${task.project.student.fullName} updated progress on "${task.title}" to ${parsedPercent}%. Status: ${nextStatus}.`,
          type: import_client6.NotificationType.SYSTEM,
          linkUrl: `/tasks`
        }
      });
    }
    res.json({ message: "Task progress updated successfully", task: updated });
  } catch (error) {
    console.error("Update task progress error:", error);
    res.status(500).json({ message: "Failed to update task progress" });
  }
});
tasksRouter.post("/:id/verify", authenticate, requireRoles(import_client6.Role.ADMIN, import_client6.Role.SUPERVISOR, import_client6.Role.MENTOR), async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status, mentorFeedback } = req.body;
    const allowedStatuses = [
      import_client6.TaskStatus.COMPLETED,
      import_client6.TaskStatus.REVISION_REQUIRED,
      import_client6.TaskStatus.IN_PROGRESS
    ];
    if (!status || !allowedStatuses.includes(status)) {
      res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(", ")}` });
      return;
    }
    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            student: { select: { id: true, fullName: true, userId: true } },
            tasks: true
          }
        }
      }
    });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    const isCompleted = status === import_client6.TaskStatus.COMPLETED;
    const updated = await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        status,
        mentorFeedback: mentorFeedback || null,
        completionPercentage: isCompleted ? 100 : status === import_client6.TaskStatus.REVISION_REQUIRED ? Math.min(task.completionPercentage, 80) : task.completionPercentage,
        completionDate: isCompleted ? /* @__PURE__ */ new Date() : null
      }
    });
    const allTasks = task.project.tasks;
    const completedTasksCount = allTasks.filter((t) => t.id === taskId ? isCompleted : t.status === import_client6.TaskStatus.COMPLETED).length;
    const overallProgress = allTasks.length > 0 ? Math.round(completedTasksCount / allTasks.length * 100) : 0;
    await prisma.project.update({
      where: { id: task.projectId },
      data: { completionPercentage: overallProgress }
    });
    if (task.project.student.userId) {
      await prisma.notification.create({
        data: {
          userId: task.project.student.userId,
          title: `Task Review: ${task.title}`,
          message: `Your mentor marked task "${task.title}" as ${status}. Feedback: "${mentorFeedback || "Reviewed"}"`,
          type: isCompleted ? import_client6.NotificationType.SUPERVISOR_FEEDBACK : import_client6.NotificationType.CORRECTION,
          linkUrl: `/tasks`
        }
      });
    }
    res.json({ message: `Task verified as ${status}`, task: updated, overallProjectProgress: overallProgress });
  } catch (error) {
    console.error("Verify task error:", error);
    res.status(500).json({ message: "Failed to verify task" });
  }
});
tasksRouter.put("/:id", authenticate, async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: { project: true }
    });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    const access = await checkStudentAccess(req, task.project.studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    const { status, title, description, priority, dueDate, feedback, completionPercentage } = req.body;
    const updated = await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        status: status ? status : void 0,
        title: title !== void 0 ? title : void 0,
        description: description !== void 0 ? description : void 0,
        priority: priority ? priority : void 0,
        dueDate: dueDate ? new Date(dueDate) : void 0,
        feedback: feedback !== void 0 ? feedback : void 0,
        completionPercentage: completionPercentage !== void 0 ? Number(completionPercentage) : void 0,
        completionDate: status === import_client6.TaskStatus.COMPLETED ? /* @__PURE__ */ new Date() : status ? null : void 0
      }
    });
    res.json({ message: "Task updated", task: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update task" });
  }
});
tasksRouter.post("/:id/comments", authenticate, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { content, attachmentUrl } = req.body;
    if (!content) {
      res.status(400).json({ message: "Comment content is required" });
      return;
    }
    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: req.user.id,
        content,
        attachmentUrl
      },
      include: {
        author: { select: { fullName: true, role: true } }
      }
    });
    res.status(201).json({ message: "Comment posted", comment });
  } catch (error) {
    res.status(500).json({ message: "Failed to post comment" });
  }
});
tasksRouter.delete("/:id", authenticate, async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: { project: true }
    });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    const access = await checkStudentAccess(req, task.project.studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    await prisma.projectTask.delete({ where: { id: taskId } });
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task" });
  }
});

// src/routes/reviews.routes.ts
var import_express7 = require("express");
var import_client7 = require("@prisma/client");
var reviewsRouter = (0, import_express7.Router)();
reviewsRouter.get("/corrections", authenticate, async (req, res) => {
  try {
    const { studentId, status, mentorId, supervisorId } = req.query;
    const where = {};
    if (studentId) where.studentId = String(studentId);
    if (status) where.status = status;
    if (mentorId) where.assignedMentorId = String(mentorId);
    if (supervisorId) where.supervisorId = String(supervisorId);
    if (req.user.role === import_client7.Role.MENTOR && !studentId) {
      where.assignedMentorId = req.user.id;
    }
    if (req.user.role === import_client7.Role.STUDENT) {
      const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
      if (!student) {
        res.json({ corrections: [] });
        return;
      }
      where.studentId = student.id;
    }
    const corrections = await prisma.correction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true } },
        supervisor: { select: { fullName: true } },
        assignedMentor: { select: { fullName: true } },
        task: { select: { id: true, title: true } },
        studentDocument: { select: { id: true, documentName: true } }
      }
    });
    res.json({ corrections });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve corrections" });
  }
});
reviewsRouter.post("/corrections", authenticate, requireRoles(import_client7.Role.ADMIN, import_client7.Role.SUPERVISOR), async (req, res) => {
  try {
    const {
      studentId,
      taskId,
      studentDocumentId,
      issueDescription,
      correctionInstruction,
      deadline
    } = req.body;
    if (!studentId || !issueDescription || !correctionInstruction) {
      res.status(400).json({ message: "studentId, issueDescription, and correctionInstruction are required" });
      return;
    }
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true, assignedMentorId: true }
    });
    if (!student) {
      res.status(404).json({ message: "Student not found" });
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
        status: import_client7.CorrectionStatus.OPEN
      },
      include: {
        supervisor: { select: { fullName: true } }
      }
    });
    if (student.assignedMentorId) {
      await prisma.notification.create({
        data: {
          userId: student.assignedMentorId,
          title: `New Correction Assigned: ${student.fullName}`,
          message: `Supervisor assigned correction: "${issueDescription}". Deadline: ${deadline ? new Date(deadline).toLocaleDateString() : "Immediate"}.`,
          type: import_client7.NotificationType.CORRECTION,
          linkUrl: `/students/${studentId}`
        }
      });
    }
    res.status(201).json({ message: "Correction created", correction });
  } catch (error) {
    console.error("Create correction error:", error);
    res.status(500).json({ message: "Failed to create correction" });
  }
});
reviewsRouter.put("/corrections/:id", authenticate, async (req, res) => {
  try {
    const correctionId = req.params.id;
    const { status, resolutionNote } = req.body;
    const correction = await prisma.correction.findUnique({
      where: { id: correctionId },
      include: { student: true }
    });
    if (!correction) {
      res.status(404).json({ message: "Correction not found" });
      return;
    }
    if (status === import_client7.CorrectionStatus.VERIFIED && req.user.role !== import_client7.Role.ADMIN && req.user.role !== import_client7.Role.SUPERVISOR) {
      res.status(403).json({ message: "Only supervisors or administrators can verify and close corrections." });
      return;
    }
    const updated = await prisma.correction.update({
      where: { id: correctionId },
      data: {
        status,
        resolutionNote: resolutionNote !== void 0 ? resolutionNote : void 0,
        resolvedAt: status === import_client7.CorrectionStatus.RESOLVED ? /* @__PURE__ */ new Date() : void 0,
        verifiedAt: status === import_client7.CorrectionStatus.VERIFIED ? /* @__PURE__ */ new Date() : void 0
      }
    });
    if (status === import_client7.CorrectionStatus.RESOLVED && correction.supervisorId) {
      await prisma.notification.create({
        data: {
          userId: correction.supervisorId,
          title: `Correction Resolved: ${correction.student.fullName}`,
          message: `Mentor resolved correction on "${correction.issueDescription}". Ready for verification.`,
          type: import_client7.NotificationType.CORRECTION,
          linkUrl: `/students/${correction.studentId}`
        }
      });
    }
    res.json({ message: "Correction updated", correction: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update correction" });
  }
});
reviewsRouter.post("/feedback", authenticate, requireRoles(import_client7.Role.ADMIN, import_client7.Role.SUPERVISOR), async (req, res) => {
  try {
    const { studentId, weeklyProgressId, studentDocumentId, feedbackType, comments, mistakesIdentified, priority = "MEDIUM" } = req.body;
    if (!studentId || !comments) {
      res.status(400).json({ message: "studentId and comments are required" });
      return;
    }
    const feedback = await prisma.supervisorFeedback.create({
      data: {
        studentId,
        supervisorId: req.user.id,
        weeklyProgressId: weeklyProgressId || null,
        studentDocumentId: studentDocumentId || null,
        feedbackType: feedbackType || "Supervisor Directive",
        comments,
        mistakesIdentified,
        priority
      },
      include: {
        student: { select: { fullName: true, assignedMentorId: true } }
      }
    });
    if (feedback.student.assignedMentorId) {
      await prisma.notification.create({
        data: {
          userId: feedback.student.assignedMentorId,
          title: `Supervisor Feedback for ${feedback.student.fullName}`,
          message: comments.slice(0, 100) + "...",
          type: import_client7.NotificationType.SUPERVISOR_FEEDBACK,
          linkUrl: `/students/${studentId}`
        }
      });
    }
    res.status(201).json({ message: "Supervisor feedback submitted", feedback });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit feedback" });
  }
});

// src/routes/meetings.routes.ts
var import_express8 = require("express");
var import_client8 = require("@prisma/client");
var meetingsRouter = (0, import_express8.Router)();
meetingsRouter.get("/", authenticate, async (req, res) => {
  try {
    const { studentId, mentorId, supervisorId, startDate, endDate, status } = req.query;
    const where = {};
    if (studentId) where.studentId = String(studentId);
    if (mentorId) where.mentorId = String(mentorId);
    if (supervisorId) where.supervisorId = String(supervisorId);
    if (status) where.status = status;
    if (startDate && endDate) {
      where.meetingDate = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }
    if (req.user.role === import_client8.Role.MENTOR && !studentId) {
      where.mentorId = req.user.id;
    }
    if (req.user.role === import_client8.Role.STUDENT) {
      const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
      if (!student) {
        res.json({ meetings: [] });
        return;
      }
      where.studentId = student.id;
    }
    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { meetingDate: "asc" },
      include: {
        student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true } },
        mentor: { select: { fullName: true } },
        supervisor: { select: { fullName: true } }
      }
    });
    res.json({ meetings });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve meetings" });
  }
});
meetingsRouter.post("/", authenticate, async (req, res) => {
  try {
    const {
      studentId,
      supervisorId,
      meetingDate,
      meetingType = "PROJECT_DISCUSSION",
      discussionSummary,
      demonstratedFeatures,
      issuesIdentified,
      decisionsMade,
      nextMeetingDate,
      followUpTasks
    } = req.body;
    if (!studentId || !meetingDate || !discussionSummary) {
      res.status(400).json({ message: "studentId, meetingDate, and discussionSummary are required" });
      return;
    }
    const access = await checkStudentAccess(req, studentId, "write");
    if (!access.allowed) {
      res.status(403).json({ message: access.reason || "Forbidden" });
      return;
    }
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { fullName: true, assignedSupervisorId: true }
    });
    const meeting = await prisma.meeting.create({
      data: {
        studentId,
        mentorId: req.user.id,
        supervisorId: supervisorId || student?.assignedSupervisorId || null,
        meetingDate: new Date(meetingDate),
        meetingType,
        discussionSummary,
        demonstratedFeatures,
        issuesIdentified,
        decisionsMade,
        nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : null,
        followUpTasks
      },
      include: {
        student: { select: { fullName: true } }
      }
    });
    res.status(201).json({ message: "Meeting scheduled successfully", meeting });
  } catch (error) {
    res.status(500).json({ message: "Failed to schedule meeting" });
  }
});
meetingsRouter.put("/:id", authenticate, async (req, res) => {
  try {
    const meetingId = req.params.id;
    const { status, discussionSummary, demonstratedFeatures, issuesIdentified, decisionsMade, nextMeetingDate, followUpTasks } = req.body;
    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: status ? status : void 0,
        discussionSummary: discussionSummary !== void 0 ? discussionSummary : void 0,
        demonstratedFeatures: demonstratedFeatures !== void 0 ? demonstratedFeatures : void 0,
        issuesIdentified: issuesIdentified !== void 0 ? issuesIdentified : void 0,
        decisionsMade: decisionsMade !== void 0 ? decisionsMade : void 0,
        nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : void 0,
        followUpTasks: followUpTasks !== void 0 ? followUpTasks : void 0
      }
    });
    res.json({ message: "Meeting record updated", meeting: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update meeting" });
  }
});

// src/routes/evaluations.routes.ts
var import_express9 = require("express");
var import_client9 = require("@prisma/client");
var evaluationsRouter = (0, import_express9.Router)();
evaluationsRouter.get("/", authenticate, async (req, res) => {
  try {
    const { studentId, stage, status } = req.query;
    const where = {};
    if (studentId) where.studentId = String(studentId);
    if (stage) where.stage = stage;
    if (status) where.status = status;
    if (req.user.role === import_client9.Role.STUDENT) {
      const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
      if (!student) {
        res.json({ evaluations: [] });
        return;
      }
      where.studentId = student.id;
    }
    const evaluations = await prisma.evaluation.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            registrationNumber: true,
            assignedMentor: { select: { fullName: true } },
            project: { select: { title: true } }
          }
        },
        evaluator: { select: { fullName: true, role: true } }
      }
    });
    res.json({ evaluations });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve evaluations" });
  }
});
evaluationsRouter.post("/", authenticate, requireRoles(import_client9.Role.ADMIN, import_client9.Role.SUPERVISOR), async (req, res) => {
  try {
    const {
      studentId,
      stage,
      evaluationTitle,
      scheduledDate,
      status = "SCHEDULED",
      marksRating,
      feedback,
      areasForImprovement,
      nextSteps,
      formAttachmentUrl,
      rubricScores
    } = req.body;
    if (!studentId || !stage || !evaluationTitle || !scheduledDate) {
      res.status(400).json({ message: "studentId, stage, evaluationTitle, and scheduledDate are required" });
      return;
    }
    const evaluation = await prisma.evaluation.create({
      data: {
        studentId,
        evaluatorId: req.user.id,
        stage,
        evaluationTitle,
        scheduledDate: new Date(scheduledDate),
        completionDate: status === "COMPLETED" ? /* @__PURE__ */ new Date() : null,
        status,
        marksRating: marksRating !== void 0 ? Number(marksRating) : null,
        feedback,
        areasForImprovement,
        nextSteps,
        formAttachmentUrl,
        rubricScores: rubricScores || void 0
      },
      include: {
        student: { select: { fullName: true, assignedMentorId: true } }
      }
    });
    if (evaluation.student.assignedMentorId) {
      await prisma.notification.create({
        data: {
          userId: evaluation.student.assignedMentorId,
          title: `Evaluation Update: ${evaluationTitle}`,
          message: `Evaluation ${evaluationTitle} scheduled/updated for ${evaluation.student.fullName}.`,
          type: import_client9.NotificationType.EVALUATION,
          linkUrl: `/students/${studentId}`
        }
      });
    }
    res.status(201).json({ message: "Evaluation recorded successfully", evaluation });
  } catch (error) {
    res.status(500).json({ message: "Failed to record evaluation" });
  }
});
evaluationsRouter.put("/:id", authenticate, requireRoles(import_client9.Role.ADMIN, import_client9.Role.SUPERVISOR), async (req, res) => {
  try {
    const evaluationId = req.params.id;
    const { status, marksRating, feedback, areasForImprovement, nextSteps, rubricScores, scheduledDate } = req.body;
    const updated = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: status ? status : void 0,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : void 0,
        completionDate: status === "COMPLETED" ? /* @__PURE__ */ new Date() : void 0,
        marksRating: marksRating !== void 0 ? Number(marksRating) : void 0,
        feedback: feedback !== void 0 ? feedback : void 0,
        areasForImprovement: areasForImprovement !== void 0 ? areasForImprovement : void 0,
        nextSteps: nextSteps !== void 0 ? nextSteps : void 0,
        rubricScores: rubricScores !== void 0 ? rubricScores : void 0
      }
    });
    res.json({ message: "Evaluation updated", evaluation: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update evaluation" });
  }
});

// src/routes/payments.routes.ts
var import_express10 = require("express");
var import_client10 = require("@prisma/client");

// src/services/pdfService.ts
var import_date_fns2 = require("date-fns");
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
function getLogoPath() {
  const possiblePaths = [
    import_path2.default.resolve(process.cwd(), "src/assets/logo.png"),
    import_path2.default.resolve(process.cwd(), "backend/src/assets/logo.png"),
    import_path2.default.resolve(process.cwd(), "../logo.png"),
    import_path2.default.resolve(process.cwd(), "logo.png")
  ];
  for (const p of possiblePaths) {
    if (import_fs2.default.existsSync(p)) return p;
  }
  return null;
}
var PdfService = class {
  /**
   * Generates a branded, professional A4 Student Project Progress Report
   */
  static async generateStudentProgressReport(studentId) {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { userId: studentId }
        ]
      },
      include: {
        project: {
          include: {
            milestones: { orderBy: { orderIndex: "asc" } },
            tasks: { orderBy: { dueDate: "asc" } }
          }
        },
        assignedMentor: true,
        assignedSupervisor: true,
        documents: {
          include: {
            versions: { orderBy: { versionNumber: "desc" }, take: 1 }
          },
          orderBy: { documentTypeConfig: { orderIndex: "asc" } }
        },
        dailyProgresses: {
          orderBy: { date: "desc" },
          take: 5
        },
        weeklyProgresses: {
          orderBy: { weekStartDate: "desc" },
          take: 3
        },
        corrections: {
          orderBy: { createdAt: "desc" }
        },
        feeAgreement: {
          include: { payments: { where: { isVoided: false } } }
        }
      }
    });
    if (!student) {
      throw new Error("Student not found");
    }
    const settings = await prisma.instituteSettings.findFirst() || {
      instituteName: "Pinnacle Mindz",
      subtitle: "Project Guidance & Progress Management",
      contactEmail: "contact@pinnaclemindz.com",
      contactPhone: "+94 77 890 1234",
      address: "Colombo, Sri Lanka"
    };
    const { default: PDFDocument } = await import("pdfkit");
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 40, left: 45, right: 45 },
        bufferPages: true
      });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);
      doc.rect(0, 0, doc.page.width, 95).fill("#0b1329");
      doc.rect(0, 92, doc.page.width, 4).fill("#06b6d4");
      const logo = getLogoPath();
      if (logo) {
        try {
          doc.image(logo, 45, 18, { width: 56, height: 56 });
          doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold");
          doc.text("PINNACLE MINDZ", 110, 22, { characterSpacing: 2 });
          doc.fillColor("#38bdf8").fontSize(8.5).font("Helvetica");
          doc.text(settings.subtitle.toUpperCase(), 110, 46, { characterSpacing: 1.5 });
          doc.fillColor("#94a3b8").fontSize(7.5);
          doc.text(`${settings.address} | Tel: ${settings.contactPhone}`, 110, 62);
        } catch {
          doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold");
          doc.text("PINNACLE MINDZ", 45, 25, { characterSpacing: 2 });
          doc.fillColor("#38bdf8").fontSize(9).font("Helvetica");
          doc.text(settings.subtitle.toUpperCase(), 45, 50, { characterSpacing: 1.5 });
          doc.fillColor("#94a3b8").fontSize(8);
          doc.text(`${settings.address} | Tel: ${settings.contactPhone}`, 45, 65);
        }
      } else {
        doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold");
        doc.text("PINNACLE MINDZ", 45, 25, { characterSpacing: 2 });
        doc.fillColor("#38bdf8").fontSize(9).font("Helvetica");
        doc.text(settings.subtitle.toUpperCase(), 45, 50, { characterSpacing: 1.5 });
        doc.fillColor("#94a3b8").fontSize(8);
        doc.text(`${settings.address} | Tel: ${settings.contactPhone}`, 45, 65);
      }
      doc.roundedRect(doc.page.width - 210, 25, 165, 45, 4).fill("#162347");
      doc.fillColor("#00f0ff").fontSize(11).font("Helvetica-Bold");
      doc.text("PROJECT PROGRESS REPORT", doc.page.width - 200, 33, { width: 145, align: "center" });
      doc.fillColor("#94a3b8").fontSize(7.5).font("Helvetica");
      doc.text(`Generated: ${(0, import_date_fns2.format)(/* @__PURE__ */ new Date(), "dd MMM yyyy, HH:mm")}`, doc.page.width - 200, 50, { width: 145, align: "center" });
      doc.y = 115;
      doc.fillColor("#0f172a").fontSize(12).font("Helvetica-Bold").text("1. STUDENT & ACADEMIC PROJECT OVERVIEW", 45, doc.y);
      doc.moveDown(0.3);
      const tableTop = doc.y;
      doc.roundedRect(45, tableTop, doc.page.width - 90, 78, 5).strokeColor("#e2e8f0").fillColor("#f8fafc").fillAndStroke();
      doc.fillColor("#475569").fontSize(8.5).font("Helvetica-Bold");
      doc.text("Student Name:", 55, tableTop + 8);
      doc.fillColor("#0f172a").font("Helvetica").text(student.fullName, 140, tableTop + 8);
      doc.fillColor("#475569").font("Helvetica-Bold").text("Registration No:", 330, tableTop + 8);
      doc.fillColor("#0f172a").font("Helvetica").text(student.registrationNumber, 420, tableTop + 8);
      doc.fillColor("#475569").font("Helvetica-Bold").text("Degree / Batch:", 55, tableTop + 24);
      doc.fillColor("#0f172a").font("Helvetica").text(`${student.degreeProgramme} (${student.batch})`, 140, tableTop + 24);
      doc.fillColor("#475569").font("Helvetica-Bold").text("University:", 330, tableTop + 24);
      doc.fillColor("#0f172a").font("Helvetica").text(student.university, 420, tableTop + 24, { width: 120 });
      doc.fillColor("#475569").font("Helvetica-Bold").text("Assigned Mentor:", 55, tableTop + 42);
      doc.fillColor("#0369a1").font("Helvetica-Bold").text(student.assignedMentor?.fullName || "Not Assigned", 140, tableTop + 42);
      doc.fillColor("#475569").font("Helvetica-Bold").text("Supervisor:", 330, tableTop + 42);
      doc.fillColor("#0f172a").font("Helvetica").text(student.assignedSupervisor?.fullName || "Institute Academic Board", 420, tableTop + 42);
      doc.fillColor("#475569").font("Helvetica-Bold").text("Project Title:", 55, tableTop + 60);
      doc.fillColor("#0f172a").font("Helvetica-Bold").text(student.project?.title || "Untitled Project", 140, tableTop + 60, { width: 380 });
      doc.y = tableTop + 90;
      const progressBoxY = doc.y;
      doc.roundedRect(45, progressBoxY, doc.page.width - 90, 36, 4).fillColor("#0b1329").fill();
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold").text("DEVELOPMENT STAGE:", 55, progressBoxY + 12);
      doc.fillColor("#38bdf8").text(`${student.project?.currentStage || "PROPOSAL"}`, 185, progressBoxY + 12);
      doc.fillColor("#ffffff").text("OVERALL PROGRESS:", 330, progressBoxY + 12);
      const completionPct = student.project?.completionPercentage || 0;
      doc.fillColor("#00f0ff").text(`${completionPct.toFixed(1)}%`, 460, progressBoxY + 12);
      const barX = 55;
      const barY = progressBoxY + 25;
      const barWidth = doc.page.width - 110;
      doc.rect(barX, barY, barWidth, 4).fillColor("#1e293b").fill();
      doc.rect(barX, barY, barWidth * completionPct / 100, 4).fillColor("#06b6d4").fill();
      doc.y = progressBoxY + 46;
      doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("2. PROJECT DOCUMENTATION AUDIT CHECKLIST", 45, doc.y);
      doc.moveDown(0.3);
      const docTableHeaderY = doc.y;
      doc.rect(45, docTableHeaderY, doc.page.width - 90, 18).fillColor("#e2e8f0").fill();
      doc.fillColor("#334155").fontSize(8).font("Helvetica-Bold");
      doc.text("DOCUMENT / ARTIFACT", 55, docTableHeaderY + 5);
      doc.text("VERSION", 250, docTableHeaderY + 5);
      doc.text("STATUS", 330, docTableHeaderY + 5);
      doc.text("SUBMITTED / APPROVED", 430, docTableHeaderY + 5);
      let curY = docTableHeaderY + 18;
      doc.font("Helvetica").fontSize(8);
      for (const d of student.documents.slice(0, 8)) {
        doc.rect(45, curY, doc.page.width - 90, 16).fillColor(curY % 32 === 0 ? "#f8fafc" : "#ffffff").fill();
        doc.fillColor("#0f172a").text(d.documentName, 55, curY + 4, { width: 190, ellipsis: true });
        doc.fillColor("#64748b").text(`v${d.currentVersion}`, 255, curY + 4);
        let statusColor = "#64748b";
        if (d.status === "APPROVED") statusColor = "#15803d";
        else if (d.status === "SUBMITTED") statusColor = "#0369a1";
        else if (d.status === "REVISION_REQUIRED") statusColor = "#b91c1c";
        else if (d.status === "IN_PROGRESS") statusColor = "#b45309";
        doc.fillColor(statusColor).font("Helvetica-Bold").text(d.status.replace(/_/g, " "), 330, curY + 4);
        doc.font("Helvetica").fillColor("#475569").text(
          d.approvedDate ? (0, import_date_fns2.format)(new Date(d.approvedDate), "dd/MM/yyyy") : d.submittedDate ? (0, import_date_fns2.format)(new Date(d.submittedDate), "dd/MM/yyyy") : "Pending",
          430,
          curY + 4
        );
        curY += 16;
      }
      doc.y = curY + 10;
      if (doc.y > 600) {
        doc.addPage();
        doc.y = 40;
      }
      doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("3. LATEST WEEKLY PROGRESS & MENTOR EVALUATION", 45, doc.y);
      doc.moveDown(0.3);
      const latestWeek = student.weeklyProgresses[0];
      if (latestWeek) {
        const weekBoxY = doc.y;
        doc.roundedRect(45, weekBoxY, doc.page.width - 90, 90, 4).strokeColor("#cbd5e1").fillColor("#f8fafc").fillAndStroke();
        doc.fillColor("#0369a1").fontSize(8.5).font("Helvetica-Bold");
        doc.text(
          `Week ${latestWeek.weekNumber} (${(0, import_date_fns2.format)(new Date(latestWeek.weekStartDate), "dd MMM")} \u2013 ${(0, import_date_fns2.format)(new Date(latestWeek.weekEndDate), "dd MMM yyyy")}) \u2014 Status: ${latestWeek.status}`,
          55,
          weekBoxY + 8
        );
        doc.fillColor("#334155").fontSize(8).font("Helvetica-Bold").text("Completed Work:", 55, weekBoxY + 22);
        doc.fillColor("#0f172a").font("Helvetica").text(latestWeek.completedActivities, 140, weekBoxY + 22, { width: 390, height: 20 });
        doc.fillColor("#b91c1c").font("Helvetica-Bold").text("Blockers / Mistakes:", 55, weekBoxY + 44);
        doc.fillColor("#0f172a").font("Helvetica").text(latestWeek.problemsBlockers || "None reported.", 140, weekBoxY + 44, { width: 390, height: 18 });
        doc.fillColor("#15803d").font("Helvetica-Bold").text("Supervisor Guidance:", 55, weekBoxY + 66);
        doc.fillColor("#0f172a").font("Helvetica").text(latestWeek.supervisorFeedback || "Proceed with next planned sprint milestone.", 140, weekBoxY + 66, { width: 390, height: 18 });
        doc.y = weekBoxY + 100;
      } else {
        doc.fillColor("#64748b").fontSize(8.5).font("Helvetica").text("No weekly progress reports submitted yet.", 55, doc.y);
        doc.y += 20;
      }
      doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("4. ACTIVE CORRECTIONS & ACTION POINTS", 45, doc.y);
      doc.moveDown(0.3);
      const activeCorrections = student.corrections.filter((c) => c.status !== "VERIFIED");
      if (activeCorrections.length > 0) {
        for (const c of activeCorrections.slice(0, 3)) {
          doc.rect(45, doc.y, doc.page.width - 90, 28).fillColor("#fff1f2").strokeColor("#fecdd3").fillAndStroke();
          doc.fillColor("#9f1239").fontSize(8).font("Helvetica-Bold").text(`[${c.status}] Issue: ${c.issueDescription}`, 55, doc.y + 4, { width: 480 });
          doc.fillColor("#4c0519").font("Helvetica").text(`Instruction: ${c.correctionInstruction}`, 55, doc.y + 15, { width: 480 });
          doc.y += 32;
        }
      } else {
        doc.fillColor("#166534").fontSize(8.5).font("Helvetica").text("No pending supervisor corrections. All prior feedback verified.", 55, doc.y);
        doc.y += 18;
      }
      const sigY = Math.max(doc.y + 25, doc.page.height - 95);
      doc.moveTo(45, sigY).lineTo(185, sigY).strokeColor("#94a3b8").stroke();
      doc.moveTo(225, sigY).lineTo(365, sigY).strokeColor("#94a3b8").stroke();
      doc.moveTo(405, sigY).lineTo(545, sigY).strokeColor("#94a3b8").stroke();
      doc.fillColor("#475569").fontSize(7.5).font("Helvetica");
      doc.text("Assigned Mentor Signature", 45, sigY + 5, { width: 140, align: "center" });
      doc.text("Academic Supervisor Signature", 225, sigY + 5, { width: 140, align: "center" });
      doc.text("Institute Director Approval", 405, sigY + 5, { width: 140, align: "center" });
      doc.fillColor("#94a3b8").fontSize(7).text(
        "CONFIDENTIAL: Pinnacle Mindz Academic Management System. Strictly for internal guidance and university submission evaluation purposes.",
        45,
        doc.page.height - 30,
        { align: "center", width: doc.page.width - 90 }
      );
      doc.end();
    });
  }
  /**
   * Generates an official payment receipt PDF
   */
  static async generatePaymentReceiptPdf(paymentId) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        student: true,
        feeAgreement: {
          include: { payments: { where: { isVoided: false } } }
        },
        recordedBy: true
      }
    });
    if (!payment) {
      throw new Error("Payment not found");
    }
    const settings = await prisma.instituteSettings.findFirst() || {
      instituteName: "Pinnacle Mindz",
      subtitle: "Project Guidance & Progress Management",
      contactEmail: "contact@pinnaclemindz.com",
      contactPhone: "+94 77 890 1234",
      address: "Colombo, Sri Lanka"
    };
    const totalPaid = payment.feeAgreement.payments.reduce((acc, p) => acc + p.amount, 0);
    const balanceRemaining = payment.feeAgreement.finalPayableAmount - totalPaid;
    const { default: PDFDocument } = await import("pdfkit");
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 40, left: 50, right: 50 }
      });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);
      doc.rect(0, 0, doc.page.width, 100).fill("#0b1329");
      doc.rect(0, 96, doc.page.width, 4).fill("#06b6d4");
      const logo = getLogoPath();
      if (logo) {
        try {
          doc.image(logo, 50, 18, { width: 60, height: 60 });
          doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold").text("PINNACLE MINDZ", 120, 24, { characterSpacing: 2 });
          doc.fillColor("#38bdf8").fontSize(8.5).font("Helvetica").text(settings.subtitle.toUpperCase(), 120, 50);
          doc.fillColor("#94a3b8").fontSize(7.5).text(`${settings.address} | Tel: ${settings.contactPhone}`, 120, 66);
        } catch {
          doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text("PINNACLE MINDZ", 50, 25, { characterSpacing: 2 });
          doc.fillColor("#38bdf8").fontSize(9).font("Helvetica").text(settings.subtitle.toUpperCase(), 50, 52);
          doc.fillColor("#94a3b8").fontSize(8).text(`${settings.address} | Tel: ${settings.contactPhone}`, 50, 68);
        }
      } else {
        doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text("PINNACLE MINDZ", 50, 25, { characterSpacing: 2 });
        doc.fillColor("#38bdf8").fontSize(9).font("Helvetica").text(settings.subtitle.toUpperCase(), 50, 52);
        doc.fillColor("#94a3b8").fontSize(8).text(`${settings.address} | Tel: ${settings.contactPhone}`, 50, 68);
      }
      doc.roundedRect(doc.page.width - 200, 25, 150, 48, 4).fill("#162347");
      doc.fillColor("#00f0ff").fontSize(13).font("Helvetica-Bold").text("OFFICIAL RECEIPT", doc.page.width - 195, 33, { width: 140, align: "center" });
      doc.fillColor("#ffffff").fontSize(9).text(payment.receiptNumber, doc.page.width - 195, 52, { width: 140, align: "center" });
      doc.y = 130;
      const metaY = doc.y;
      doc.roundedRect(50, metaY, doc.page.width - 100, 65, 4).strokeColor("#e2e8f0").fillColor("#f8fafc").fillAndStroke();
      doc.fillColor("#475569").fontSize(9).font("Helvetica-Bold").text("Receipt Date:", 65, metaY + 12);
      doc.fillColor("#0f172a").font("Helvetica").text((0, import_date_fns2.format)(new Date(payment.paymentDate), "dd MMMM yyyy"), 145, metaY + 12);
      doc.fillColor("#475569").font("Helvetica-Bold").text("Payment Method:", 330, metaY + 12);
      doc.fillColor("#0f172a").font("Helvetica").text(payment.paymentMethod.replace(/_/g, " "), 430, metaY + 12);
      doc.fillColor("#475569").font("Helvetica-Bold").text("Received From:", 65, metaY + 32);
      doc.fillColor("#0f172a").font("Helvetica-Bold").text(payment.student.fullName, 145, metaY + 32);
      doc.fillColor("#475569").font("Helvetica-Bold").text("Ref / Transaction:", 330, metaY + 32);
      doc.fillColor("#0f172a").font("Helvetica").text(payment.referenceNumber || "N/A (Cash)", 430, metaY + 32);
      doc.fillColor("#475569").font("Helvetica-Bold").text("Student Reg No:", 65, metaY + 48);
      doc.fillColor("#0f172a").font("Helvetica").text(payment.student.registrationNumber, 145, metaY + 48);
      doc.y = metaY + 85;
      const itemHeaderY = doc.y;
      doc.rect(50, itemHeaderY, doc.page.width - 100, 24).fillColor("#0f172a").fill();
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
      doc.text("DESCRIPTION / PARTICULARS", 65, itemHeaderY + 7);
      doc.text("AMOUNT (LKR)", doc.page.width - 160, itemHeaderY + 7, { width: 100, align: "right" });
      const rowY = itemHeaderY + 24;
      doc.rect(50, rowY, doc.page.width - 100, 40).strokeColor("#e2e8f0").fillColor("#ffffff").fillAndStroke();
      doc.fillColor("#0f172a").fontSize(9).font("Helvetica");
      doc.text(
        `Final Year Project Guidance & Mentoring Fee Payment
Remarks: ${payment.remarks || "Standard course installment fee"}`,
        65,
        rowY + 8,
        { width: 340 }
      );
      doc.font("Helvetica-Bold").text(
        `LKR ${payment.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        doc.page.width - 160,
        rowY + 12,
        { width: 100, align: "right" }
      );
      const summaryY = rowY + 50;
      doc.roundedRect(doc.page.width - 270, summaryY, 220, 90, 4).strokeColor("#cbd5e1").fillColor("#f8fafc").fillAndStroke();
      doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text("Total Agreed Course Fee:", doc.page.width - 260, summaryY + 10);
      doc.fillColor("#0f172a").text(`LKR ${payment.feeAgreement.finalPayableAmount.toLocaleString()}`, doc.page.width - 130, summaryY + 10, { width: 70, align: "right" });
      doc.fillColor("#475569").text("Amount Received This Receipt:", doc.page.width - 260, summaryY + 28);
      doc.fillColor("#16a34a").font("Helvetica-Bold").text(`LKR ${payment.amount.toLocaleString()}`, doc.page.width - 130, summaryY + 28, { width: 70, align: "right" });
      doc.fillColor("#475569").font("Helvetica").text("Cumulative Amount Paid:", doc.page.width - 260, summaryY + 46);
      doc.fillColor("#0f172a").text(`LKR ${totalPaid.toLocaleString()}`, doc.page.width - 130, summaryY + 46, { width: 70, align: "right" });
      doc.moveTo(doc.page.width - 260, summaryY + 62).lineTo(doc.page.width - 60, summaryY + 62).strokeColor("#94a3b8").stroke();
      doc.fillColor("#b91c1c").font("Helvetica-Bold").text("Remaining Balance Due:", doc.page.width - 260, summaryY + 70);
      doc.text(`LKR ${balanceRemaining.toLocaleString()}`, doc.page.width - 130, summaryY + 70, { width: 70, align: "right" });
      const signY = summaryY + 130;
      doc.moveTo(50, signY).lineTo(200, signY).strokeColor("#94a3b8").stroke();
      doc.moveTo(doc.page.width - 200, signY).lineTo(doc.page.width - 50, signY).strokeColor("#94a3b8").stroke();
      doc.fillColor("#475569").fontSize(8).font("Helvetica");
      doc.text(`Recorded By: ${payment.recordedBy.fullName}`, 50, signY + 6);
      doc.text("Authorized Finance Signature & Seal", doc.page.width - 200, signY + 6, { width: 150, align: "center" });
      doc.end();
    });
  }
};

// src/routes/payments.routes.ts
var paymentsRouter = (0, import_express10.Router)();
var authorizePaymentAccess = async (req, res, next) => {
  if (req.user.role === import_client10.Role.ADMIN) return next();
  if (req.user.role === import_client10.Role.SUPERVISOR) {
    return next();
  }
  if (req.user.role === import_client10.Role.STUDENT) {
    if (req.params.id) {
      const payment = await prisma.payment.findUnique({
        where: { id: req.params.id },
        select: { student: { select: { userId: true } } }
      });
      if (payment && payment.student?.userId === req.user.id) {
        return next();
      }
    }
  }
  return res.status(403).json({ message: "Forbidden: You do not have access to financial records." });
};
paymentsRouter.get("/dashboard", authenticate, authorizePaymentAccess, async (req, res) => {
  try {
    const feeAgreements = await prisma.studentFeeAgreement.findMany({
      include: {
        payments: { where: { isVoided: false } },
        installments: true,
        student: { select: { fullName: true, studentId: true, registrationNumber: true } }
      }
    });
    let totalExpectedRevenue = 0;
    let totalCollectedRevenue = 0;
    const pendingInstallments = [];
    const overdueInstallments = [];
    const now = /* @__PURE__ */ new Date();
    for (const fa of feeAgreements) {
      totalExpectedRevenue += fa.finalPayableAmount;
      const studentPaid = fa.payments.reduce((acc, p) => acc + p.amount, 0);
      totalCollectedRevenue += studentPaid;
      for (const inst of fa.installments) {
        if (inst.status !== "PAID") {
          const isOverdue = new Date(inst.dueDate) < now;
          const instData = {
            id: inst.id,
            student: fa.student,
            installmentNumber: inst.installmentNumber,
            amount: inst.amount,
            dueDate: inst.dueDate,
            isOverdue
          };
          if (isOverdue) overdueInstallments.push(instData);
          else pendingInstallments.push(instData);
        }
      }
    }
    const outstandingBalance = Math.max(0, totalExpectedRevenue - totalCollectedRevenue);
    const payments = await prisma.payment.findMany({
      where: { isVoided: false },
      orderBy: { paymentDate: "asc" },
      select: { amount: true, paymentDate: true }
    });
    const monthlyMap = {};
    for (const p of payments) {
      const monthKey = new Date(p.paymentDate).toLocaleString("default", { month: "short", year: "numeric" });
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + p.amount;
    }
    const monthlyCollections = Object.entries(monthlyMap).map(([month, amount]) => ({
      month,
      amount
    }));
    res.json({
      totalExpectedRevenue,
      totalCollectedRevenue,
      outstandingBalance,
      collectionRate: totalExpectedRevenue > 0 ? totalCollectedRevenue / totalExpectedRevenue * 100 : 0,
      monthlyCollections,
      overdueInstallmentsCount: overdueInstallments.length,
      overdueInstallments,
      pendingInstallments
    });
  } catch (error) {
    console.error("Payment dashboard error:", error);
    res.status(500).json({ message: "Failed to retrieve payment dashboard metrics" });
  }
});
paymentsRouter.get("/", authenticate, authorizePaymentAccess, async (req, res) => {
  try {
    const { studentId, search, limit = "100" } = req.query;
    const where = {};
    if (studentId) where.studentId = String(studentId);
    if (search) {
      where.OR = [
        { receiptNumber: { contains: String(search), mode: "insensitive" } },
        { referenceNumber: { contains: String(search), mode: "insensitive" } },
        { student: { fullName: { contains: String(search), mode: "insensitive" } } },
        { student: { registrationNumber: { contains: String(search), mode: "insensitive" } } }
      ];
    }
    const payments = await prisma.payment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      take: parseInt(limit, 10),
      include: {
        student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true } },
        recordedBy: { select: { fullName: true } },
        feeAgreement: { select: { finalPayableAmount: true } }
      }
    });
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve payments" });
  }
});
paymentsRouter.post("/", authenticate, requireRoles(import_client10.Role.ADMIN), async (req, res) => {
  try {
    const {
      studentId,
      amount,
      paymentMethod = "BANK_TRANSFER",
      referenceNumber,
      receiptNumber,
      paymentDate = /* @__PURE__ */ new Date(),
      remarks
    } = req.body;
    if (!studentId || !amount || Number(amount) <= 0) {
      res.status(400).json({ message: "studentId and valid payment amount are required." });
      return;
    }
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        feeAgreement: {
          include: {
            installments: { orderBy: { installmentNumber: "asc" } },
            payments: { where: { isVoided: false } }
          }
        }
      }
    });
    if (!student || !student.feeAgreement) {
      res.status(404).json({ message: "Student or fee agreement record not found." });
      return;
    }
    let finalReceiptNumber = receiptNumber?.trim();
    if (!finalReceiptNumber) {
      finalReceiptNumber = `PM-RCP-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
    } else {
      const existingReceipt = await prisma.payment.findUnique({
        where: { receiptNumber: finalReceiptNumber }
      });
      if (existingReceipt) {
        res.status(400).json({ message: `Receipt number "${finalReceiptNumber}" is already in use.` });
        return;
      }
    }
    const paymentIdCode = `RCP-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
    const newPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentId: paymentIdCode,
          feeAgreementId: student.feeAgreement.id,
          studentId: student.id,
          amount: Number(amount),
          paymentMethod,
          referenceNumber,
          receiptNumber: finalReceiptNumber,
          paymentDate: new Date(paymentDate),
          recordedById: req.user.id,
          remarks
        },
        include: {
          student: true,
          recordedBy: true
        }
      });
      const unpaidInstallment = student.feeAgreement.installments.find(
        (inst) => inst.status !== import_client10.InstallmentStatus.PAID
      );
      if (unpaidInstallment) {
        await tx.paymentInstallment.update({
          where: { id: unpaidInstallment.id },
          data: { status: import_client10.InstallmentStatus.PAID, paidDate: /* @__PURE__ */ new Date() }
        });
      }
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          actorId: req.user.id,
          action: "CREATED",
          newState: { amount: payment.amount, receiptNumber: payment.receiptNumber, method: payment.paymentMethod },
          note: `Payment recorded by ${req.user.fullName}`
        }
      });
      await tx.activityLog.create({
        data: {
          actorId: req.user.id,
          actorName: req.user.fullName,
          actorRole: req.user.role,
          action: "RECORD_PAYMENT",
          entityType: "Payment",
          entityId: payment.id,
          details: { amount: payment.amount, receiptNumber: payment.receiptNumber, student: student.fullName }
        }
      });
      return payment;
    });
    res.status(201).json({ message: "Payment recorded successfully", payment: newPayment });
  } catch (error) {
    console.error("Record payment error:", error);
    res.status(500).json({ message: error.message || "Failed to record payment" });
  }
});
paymentsRouter.put("/:id/void", authenticate, requireRoles(import_client10.Role.ADMIN), async (req, res) => {
  try {
    const paymentId = req.params.id;
    const { voidReason } = req.body;
    if (!voidReason) {
      res.status(400).json({ message: "Reason for voiding transaction is required for audit purposes." });
      return;
    }
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });
    if (!payment) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }
    if (payment.isVoided) {
      res.status(400).json({ message: "Payment is already voided" });
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          isVoided: true,
          voidReason
        }
      });
      await tx.paymentAuditLog.create({
        data: {
          paymentId,
          actorId: req.user.id,
          action: "VOIDED",
          previousState: { isVoided: false },
          newState: { isVoided: true, voidReason },
          note: `Transaction voided by ${req.user.fullName}: ${voidReason}`
        }
      });
      return p;
    });
    res.json({ message: "Payment voided and audit recorded", payment: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to void payment" });
  }
});
paymentsRouter.get("/:id/receipt-pdf", authenticate, authorizePaymentAccess, async (req, res) => {
  try {
    const paymentId = req.params.id;
    const pdfBuffer = await PdfService.generatePaymentReceiptPdf(paymentId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="receipt_${paymentId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Receipt error:", error);
    res.status(500).json({ message: "Failed to generate PDF receipt" });
  }
});

// src/routes/dashboard.routes.ts
var import_express11 = require("express");
var import_client11 = require("@prisma/client");
var import_date_fns3 = require("date-fns");
var dashboardRouter = (0, import_express11.Router)();
dashboardRouter.get("/admin", authenticate, async (req, res) => {
  try {
    const settings = await prisma.instituteSettings.findFirst() || {
      expectedReportingFrequencyDays: 7
    };
    const thresholdDate = (0, import_date_fns3.subDays)(/* @__PURE__ */ new Date(), settings.expectedReportingFrequencyDays);
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
      upcomingDemos
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.project.count({ where: { currentStage: "COMPLETED" } }),
      prisma.studentDocument.count({ where: { status: { in: ["NOT_STARTED", "IN_PROGRESS", "READY_FOR_REVIEW", "REVISION_REQUIRED"] } } }),
      prisma.projectTask.count({ where: { status: { in: ["TO_DO", "IN_PROGRESS"] }, dueDate: { lt: /* @__PURE__ */ new Date() } } }),
      prisma.projectTask.count({
        where: {
          status: { in: ["TO_DO", "IN_PROGRESS"] },
          dueDate: { gte: /* @__PURE__ */ new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3) }
        }
      }),
      prisma.studentFeeAgreement.findMany({
        select: { finalPayableAmount: true }
      }),
      prisma.payment.findMany({
        where: { isVoided: false },
        select: { amount: true, paymentDate: true }
      }),
      prisma.user.findMany({
        where: { role: import_client11.Role.MENTOR, isActive: true },
        select: {
          id: true,
          fullName: true,
          _count: {
            select: {
              mentoredStudents: true
            }
          }
        }
      }),
      prisma.project.groupBy({
        by: ["currentStage"],
        _count: true
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      prisma.meeting.findMany({
        where: {
          meetingDate: { gte: /* @__PURE__ */ new Date() },
          status: "SCHEDULED"
        },
        orderBy: { meetingDate: "asc" },
        take: 5,
        include: {
          student: { select: { fullName: true, studentId: true } },
          mentor: { select: { fullName: true } }
        }
      })
    ]);
    const totalExpectedFees = allFeeAgreements.reduce((sum, fa) => sum + fa.finalPayableAmount, 0);
    const totalCollectedPayments = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalances = Math.max(0, totalExpectedFees - totalCollectedPayments);
    const activeStudentsList = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      include: {
        weeklyProgresses: { orderBy: { weekStartDate: "desc" }, take: 1 },
        dailyProgresses: { orderBy: { date: "desc" }, take: 1 },
        assignedMentor: { select: { fullName: true } },
        project: { select: { title: true } }
      }
    });
    const studentsRequiringAttention = activeStudentsList.map((s) => {
      const lastDate = s.weeklyProgresses[0]?.createdAt || s.dailyProgresses[0]?.date || s.registrationDate;
      const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1e3 * 60 * 60 * 24));
      return {
        id: s.id,
        studentId: s.studentId,
        fullName: s.fullName,
        projectTitle: s.project?.title,
        assignedMentor: s.assignedMentor?.fullName || "Unassigned",
        daysSinceLastUpdate: daysSince,
        missingUpdate: daysSince >= settings.expectedReportingFrequencyDays
      };
    }).filter((s) => s.missingUpdate);
    const monthlyMap = {};
    for (const p of allPayments) {
      const monthStr = new Date(p.paymentDate).toLocaleString("default", { month: "short", year: "numeric" });
      monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + p.amount;
    }
    const paymentCollectionsChart = Object.entries(monthlyMap).map(([month, amount]) => ({
      month,
      amount
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
        studentsRequiringAttentionCount: studentsRequiringAttention.length
      },
      charts: {
        studentsByMentor: mentorsWorkload.map((m) => ({
          mentorName: m.fullName.replace(/\s*\(Demo \d+\)/, ""),
          studentCount: m._count.mentoredStudents
        })),
        projectStages: projectsByStage.map((ps) => ({
          stage: ps.currentStage.replace(/_/g, " "),
          count: ps._count
        })),
        paymentCollectionsChart
      },
      recentActivities,
      upcomingDemos,
      studentsRequiringAttention: studentsRequiringAttention.slice(0, 5)
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Failed to retrieve admin dashboard metrics" });
  }
});
dashboardRouter.get("/supervisor", authenticate, async (req, res) => {
  try {
    const settings = await prisma.instituteSettings.findFirst() || {
      expectedReportingFrequencyDays: 7
    };
    const [
      totalSupervised,
      pendingReviewsCount,
      overdueMilestonesCount,
      openCorrectionsCount,
      projects,
      mentorsWorkload,
      recentSubmissions,
      upcomingAcademicDeadlines
    ] = await Promise.all([
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.studentDocument.count({ where: { status: "READY_FOR_REVIEW" } }),
      prisma.projectMilestone.count({ where: { status: { in: ["TO_DO", "IN_PROGRESS"] }, dueDate: { lt: /* @__PURE__ */ new Date() } } }),
      prisma.correction.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.project.findMany({
        select: {
          completionPercentage: true,
          currentStage: true
        }
      }),
      prisma.user.findMany({
        where: { role: import_client11.Role.MENTOR, isActive: true },
        select: {
          id: true,
          fullName: true,
          mentoredStudents: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              weeklyProgresses: { orderBy: { weekStartDate: "desc" }, take: 1 }
            }
          }
        }
      }),
      prisma.studentDocument.findMany({
        where: { status: "READY_FOR_REVIEW" },
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: {
          student: { select: { fullName: true, studentId: true, registrationNumber: true } },
          versions: { orderBy: { versionNumber: "desc" }, take: 1 }
        }
      }),
      prisma.evaluation.findMany({
        where: { status: "SCHEDULED" },
        orderBy: { scheduledDate: "asc" },
        take: 5,
        include: {
          student: { select: { fullName: true, studentId: true, project: { select: { title: true } } } }
        }
      })
    ]);
    const overallCompletion = projects.length > 0 ? projects.reduce((acc, p) => acc + p.completionPercentage, 0) / projects.length : 0;
    const mentorPerformance = mentorsWorkload.map((m) => {
      const activeCount = m.mentoredStudents.length;
      let missingCount = 0;
      const threshold = (0, import_date_fns3.subDays)(/* @__PURE__ */ new Date(), settings.expectedReportingFrequencyDays);
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
        complianceRate: activeCount > 0 ? Math.round((activeCount - missingCount) / activeCount * 100) : 100
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
      upcomingAcademicDeadlines
    });
  } catch (error) {
    console.error("Supervisor dashboard error:", error);
    res.status(500).json({ message: "Failed to retrieve supervisor dashboard" });
  }
});
dashboardRouter.get("/mentor", authenticate, async (req, res) => {
  try {
    const mentorId = req.user.id;
    const now = /* @__PURE__ */ new Date();
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3);
    const [
      assignedStudents,
      myActiveTasks,
      tasksDueThisWeek,
      pendingDocs,
      upcomingDemos,
      feedbackNeedingAction
    ] = await Promise.all([
      prisma.student.findMany({
        where: { assignedMentorId: mentorId, status: "ACTIVE" },
        include: {
          project: { select: { id: true, title: true, currentStage: true, completionPercentage: true } },
          weeklyProgresses: { orderBy: { weekStartDate: "desc" }, take: 1 },
          corrections: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }
        }
      }),
      prisma.projectTask.findMany({
        where: {
          assignedMentorId: mentorId,
          status: { in: ["TO_DO", "IN_PROGRESS"] }
        },
        orderBy: { dueDate: "asc" },
        take: 10,
        include: {
          project: { select: { student: { select: { fullName: true } } } }
        }
      }),
      prisma.projectTask.count({
        where: {
          assignedMentorId: mentorId,
          status: { in: ["TO_DO", "IN_PROGRESS"] },
          dueDate: { gte: now, lte: endOfWeek }
        }
      }),
      prisma.studentDocument.count({
        where: {
          assignedMentorId: mentorId,
          status: { in: ["NOT_STARTED", "IN_PROGRESS", "REVISION_REQUIRED"] }
        }
      }),
      prisma.meeting.findMany({
        where: {
          mentorId,
          meetingDate: { gte: now },
          status: "SCHEDULED"
        },
        orderBy: { meetingDate: "asc" },
        take: 4,
        include: {
          student: { select: { fullName: true } }
        }
      }),
      prisma.correction.findMany({
        where: {
          assignedMentorId: mentorId,
          status: { in: ["OPEN", "IN_PROGRESS"] }
        },
        orderBy: { deadline: "asc" },
        include: {
          student: { select: { fullName: true } },
          supervisor: { select: { fullName: true } }
        }
      })
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
        lastReportDate: s.weeklyProgresses[0]?.createdAt
      })),
      myActiveTasks,
      upcomingDemos,
      feedbackNeedingAction
    });
  } catch (error) {
    console.error("Mentor dashboard error:", error);
    res.status(500).json({ message: "Failed to retrieve mentor dashboard" });
  }
});
dashboardRouter.get("/student", authenticate, async (req, res) => {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user.id },
      include: {
        project: {
          include: {
            milestones: { orderBy: { orderIndex: "asc" } },
            tasks: { where: { status: { in: ["TO_DO", "IN_PROGRESS"] } }, orderBy: { dueDate: "asc" }, take: 6 }
          }
        },
        assignedMentor: { select: { fullName: true, email: true, phone: true } },
        assignedSupervisor: { select: { fullName: true, email: true, phone: true } },
        documents: {
          select: { id: true, documentName: true, status: true }
        },
        corrections: {
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
          select: { id: true, issueDescription: true, correctionInstruction: true, deadline: true, status: true }
        },
        meetings: {
          where: { meetingDate: { gte: /* @__PURE__ */ new Date() }, status: "SCHEDULED" },
          orderBy: { meetingDate: "asc" },
          take: 3
        },
        feeAgreement: {
          include: {
            payments: { where: { isVoided: false }, select: { amount: true } },
            installments: { orderBy: { installmentNumber: "asc" } }
          }
        }
      }
    });
    if (!student) {
      res.status(404).json({ message: "No student record associated with this account." });
      return;
    }
    const totalPaid = (student.feeAgreement?.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const finalPayable = student.feeAgreement?.finalPayableAmount || 0;
    const balance = Math.max(0, finalPayable - totalPaid);
    const approvedDocs = student.documents.filter((d) => d.status === "APPROVED").length;
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
        percentage: totalDocs > 0 ? Math.round(approvedDocs / totalDocs * 100) : 0
      },
      paymentSummary: {
        totalPayable: finalPayable,
        totalPaid,
        balance,
        status: totalPaid >= finalPayable ? "PAID" : totalPaid > 0 ? "PARTIAL" : "UNPAID"
      }
    });
  } catch (error) {
    console.error("Student dashboard error:", error);
    res.status(500).json({ message: "Failed to retrieve student dashboard" });
  }
});

// src/routes/reports.routes.ts
var import_express12 = require("express");
var import_client12 = require("@prisma/client");
var import_exceljs = __toESM(require("exceljs"));
var reportsRouter = (0, import_express12.Router)();
reportsRouter.get("/student-progress-pdf/:studentId", authenticate, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const pdfBuffer = await PdfService.generateStudentProgressReport(studentId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="progress_report_${studentId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Generate progress PDF error:", error);
    res.status(500).json({ message: "Failed to generate project progress report" });
  }
});
reportsRouter.get("/mentor-performance", authenticate, requireRoles(import_client12.Role.ADMIN, import_client12.Role.SUPERVISOR), async (req, res) => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: import_client12.Role.MENTOR, isActive: true },
      include: {
        mentoredStudents: {
          include: {
            project: { select: { currentStage: true, completionPercentage: true } },
            weeklyProgresses: { orderBy: { weekStartDate: "desc" }, take: 1 }
          }
        },
        supportingMentoredStudents: {
          include: {
            student: {
              include: {
                project: { select: { currentStage: true, completionPercentage: true } },
                weeklyProgresses: { orderBy: { weekStartDate: "desc" }, take: 1 }
              }
            }
          }
        },
        tasksAssigned: true,
        assignedCorrections: true
      }
    });
    const report = mentors.map((m) => {
      const primaryStudents = m.mentoredStudents;
      const supportingStudents = m.supportingMentoredStudents.map((sm) => sm.student);
      const allAssigned = [...primaryStudents, ...supportingStudents];
      const totalStudents = allAssigned.length;
      const completedProjects = allAssigned.filter((s) => s.project?.currentStage === "COMPLETED").length;
      const activeProjects = totalStudents - completedProjects;
      const completedTasks = m.tasksAssigned.filter((t) => t.status === "COMPLETED").length;
      const totalTasks = m.tasksAssigned.length;
      const resolvedCorrections = m.assignedCorrections.filter((c) => c.status === "RESOLVED" || c.status === "VERIFIED").length;
      const openCorrections = m.assignedCorrections.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS").length;
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
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
        taskCompletionRate: totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 100,
        openCorrections,
        resolvedCorrections,
        recentUpdateComplianceRate: activeProjects > 0 ? Math.round(studentsWithRecentUpdate / activeProjects * 100) : 100
      };
    });
    res.json({ mentorReports: report });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate mentor performance report" });
  }
});
reportsRouter.get("/documentation-status", authenticate, async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: { status: "ACTIVE" },
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
            submittedAt: true
          }
        }
      },
      orderBy: { studentId: "asc" }
    });
    const docAudit = students.map((s) => {
      const totalDocs = s.documents.length;
      const approvedDocs = s.documents.filter((d) => d.status === "APPROVED").length;
      const submittedDocs = s.documents.filter((d) => ["SUBMITTED", "READY_FOR_REVIEW", "RESUBMITTED"].includes(d.status)).length;
      const pendingDocs = s.documents.filter((d) => ["NOT_STARTED", "PENDING", "IN_PROGRESS", "CORRECTION_REQUIRED", "REVISION_REQUIRED"].includes(d.status)).length;
      return {
        studentId: s.studentId,
        studentName: s.fullName,
        registrationNumber: s.registrationNumber,
        mentor: s.assignedMentor?.fullName || "Unassigned",
        projectTitle: s.project?.title,
        totalDocs,
        approvedDocs,
        submittedDocs,
        pendingDocs,
        completionRate: totalDocs > 0 ? Math.round(approvedDocs / totalDocs * 100) : 0,
        documents: s.documents
      };
    });
    res.json({ docAudit });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate documentation status report" });
  }
});
reportsRouter.get("/document-submissions", authenticate, async (req, res) => {
  try {
    const submissions = await prisma.studentDocument.findMany({
      where: {
        submissionUrl: { not: null }
      },
      orderBy: { submittedAt: "desc" },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            registrationNumber: true,
            batch: true,
            assignedMentor: { select: { fullName: true } }
          }
        },
        reviewedBy: { select: { fullName: true, role: true } },
        versions: { orderBy: { versionNumber: "desc" } }
      }
    });
    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve document submissions report" });
  }
});
reportsRouter.get("/task-audit", authenticate, async (req, res) => {
  try {
    const tasks = await prisma.projectTask.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        project: {
          select: {
            title: true,
            student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true, batch: true } }
          }
        },
        assignedMentor: { select: { fullName: true } }
      }
    });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
    const inReviewTasks = tasks.filter((t) => t.status === "SUBMITTED_FOR_REVIEW").length;
    const withGithubEvidence = tasks.filter((t) => Boolean(t.githubRepoUrl || t.githubCommitOrPrUrl)).length;
    res.json({
      summary: {
        totalTasks,
        completedTasks,
        inReviewTasks,
        withGithubEvidence,
        completionRate: totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0
      },
      tasks
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate task audit report" });
  }
});
reportsRouter.get("/deadlines", authenticate, async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const next14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1e3);
    const [overdueTasks, upcomingTasks, upcomingMilestones] = await Promise.all([
      prisma.projectTask.findMany({
        where: {
          status: { in: ["TO_DO", "IN_PROGRESS", "NOT_STARTED", "REVISION_REQUIRED"] },
          dueDate: { lt: now }
        },
        include: {
          project: { select: { student: { select: { fullName: true, studentId: true } }, title: true } },
          assignedMentor: { select: { fullName: true } }
        },
        orderBy: { dueDate: "asc" }
      }),
      prisma.projectTask.findMany({
        where: {
          status: { in: ["TO_DO", "IN_PROGRESS", "NOT_STARTED"] },
          dueDate: { gte: now, lte: next14Days }
        },
        include: {
          project: { select: { student: { select: { fullName: true, studentId: true } }, title: true } },
          assignedMentor: { select: { fullName: true } }
        },
        orderBy: { dueDate: "asc" }
      }),
      prisma.projectMilestone.findMany({
        where: {
          status: { in: ["TO_DO", "IN_PROGRESS"] },
          dueDate: { gte: now, lte: next14Days }
        },
        include: {
          project: { select: { student: { select: { fullName: true, studentId: true } }, title: true } }
        },
        orderBy: { dueDate: "asc" }
      })
    ]);
    res.json({
      overdueTasks,
      upcomingTasks,
      upcomingMilestones
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve deadlines report" });
  }
});
reportsRouter.get("/export-csv", authenticate, requireRoles(import_client12.Role.ADMIN, import_client12.Role.SUPERVISOR), async (req, res) => {
  try {
    const { type = "students" } = req.query;
    const workbook = new import_exceljs.default.Workbook();
    const worksheet = workbook.addWorksheet("Export Data");
    if (type === "students") {
      worksheet.columns = [
        { header: "Student ID", key: "studentId", width: 16 },
        { header: "Full Name", key: "fullName", width: 25 },
        { header: "Reg Number", key: "regNo", width: 18 },
        { header: "University", key: "uni", width: 30 },
        { header: "Degree", key: "degree", width: 25 },
        { header: "Batch", key: "batch", width: 10 },
        { header: "Academic Year", key: "academicYear", width: 16 },
        { header: "Project Title", key: "project", width: 35 },
        { header: "Stage", key: "stage", width: 18 },
        { header: "Progress %", key: "progress", width: 12 },
        { header: "Primary Mentor", key: "mentor", width: 20 },
        { header: "Supervisor", key: "supervisor", width: 20 },
        { header: "Status", key: "status", width: 12 },
        { header: "Active Account", key: "isActive", width: 14 }
      ];
      const students = await prisma.student.findMany({
        include: {
          project: true,
          assignedMentor: true,
          assignedSupervisor: true
        },
        orderBy: { createdAt: "desc" }
      });
      for (const s of students) {
        worksheet.addRow({
          studentId: s.studentId,
          fullName: s.fullName,
          regNo: s.registrationNumber,
          uni: s.university,
          degree: s.degreeProgramme,
          batch: s.batch,
          academicYear: s.academicYear || "",
          project: s.project?.title || "",
          stage: s.project?.currentStage || "",
          progress: `${s.project?.completionPercentage || 0}%`,
          mentor: s.assignedMentor?.fullName || "Unassigned",
          supervisor: s.assignedSupervisor?.fullName || "Unassigned",
          status: s.status,
          isActive: s.isActive ? "Active" : "Deactivated"
        });
      }
    } else if (type === "payments") {
      worksheet.columns = [
        { header: "Receipt No", key: "receipt", width: 18 },
        { header: "Payment Date", key: "date", width: 15 },
        { header: "Student Name", key: "name", width: 25 },
        { header: "Reg Number", key: "regNo", width: 18 },
        { header: "Amount (LKR)", key: "amount", width: 15 },
        { header: "Payment Method", key: "method", width: 18 },
        { header: "Ref Number", key: "ref", width: 20 },
        { header: "Recorded By", key: "recordedBy", width: 20 },
        { header: "Remarks", key: "remarks", width: 30 }
      ];
      const payments = await prisma.payment.findMany({
        where: { isVoided: false },
        include: { student: true, recordedBy: true },
        orderBy: { paymentDate: "desc" }
      });
      for (const p of payments) {
        worksheet.addRow({
          receipt: p.receiptNumber,
          date: new Date(p.paymentDate).toLocaleDateString(),
          name: p.student.fullName,
          regNo: p.student.registrationNumber,
          amount: p.amount,
          method: p.paymentMethod,
          ref: p.referenceNumber || "",
          recordedBy: p.recordedBy.fullName,
          remarks: p.remarks || ""
        });
      }
    } else if (type === "submissions") {
      worksheet.columns = [
        { header: "Student ID", key: "studentId", width: 16 },
        { header: "Student Name", key: "studentName", width: 25 },
        { header: "Document Title", key: "docTitle", width: 30 },
        { header: "Status", key: "status", width: 18 },
        { header: "Version", key: "version", width: 10 },
        { header: "Submission URL", key: "url", width: 45 },
        { header: "Submitted At", key: "submittedAt", width: 18 },
        { header: "Reviewer Feedback", key: "feedback", width: 35 }
      ];
      const docs = await prisma.studentDocument.findMany({
        where: { submissionUrl: { not: null } },
        include: { student: true },
        orderBy: { submittedAt: "desc" }
      });
      for (const d of docs) {
        worksheet.addRow({
          studentId: d.student.studentId,
          studentName: d.student.fullName,
          docTitle: d.submissionTitle || d.documentName,
          status: d.status,
          version: `v${d.currentVersion}`,
          url: d.submissionUrl || "",
          submittedAt: d.submittedAt ? new Date(d.submittedAt).toLocaleDateString() : "",
          feedback: d.reviewerFeedback || ""
        });
      }
    }
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${type}_export_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Failed to export report" });
  }
});

// src/routes/notifications.routes.ts
var import_express13 = require("express");
var notificationsRouter = (0, import_express13.Router)();
notificationsRouter.get("/", authenticate, async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const where = { userId: req.user.id };
    if (unreadOnly === "true") where.isRead = false;
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      prisma.notification.count({
        where: { userId: req.user.id, isRead: false }
      })
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve notifications" });
  }
});
notificationsRouter.put("/:id/read", authenticate, async (req, res) => {
  try {
    const notifId = req.params.id;
    await prisma.notification.updateMany({
      where: { id: notifId, userId: req.user.id },
      data: { isRead: true }
    });
    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification" });
  }
});
notificationsRouter.put("/read-all", authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

// src/routes/users.routes.ts
var import_express14 = require("express");
var import_client13 = require("@prisma/client");
var import_bcryptjs3 = __toESM(require("bcryptjs"));
var usersRouter = (0, import_express14.Router)();
usersRouter.get("/", authenticate, async (req, res) => {
  try {
    const { role } = req.query;
    const where = {};
    if (role) where.role = role;
    else where.role = { in: [import_client13.Role.SUPER_ADMIN, import_client13.Role.ADMIN, import_client13.Role.SUPERVISOR, import_client13.Role.MENTOR] };
    const users = await prisma.user.findMany({
      where,
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            mentoredStudents: true,
            supportingMentoredStudents: true,
            supervisedStudents: true
          }
        }
      }
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Failed to list staff users" });
  }
});
usersRouter.get("/mentors-workload", authenticate, requireRoles(import_client13.Role.ADMIN), async (req, res) => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: import_client13.Role.MENTOR },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
        mentoredStudents: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            registrationNumber: true,
            status: true,
            project: { select: { title: true, currentStage: true, completionPercentage: true } },
            weeklyProgresses: { orderBy: { weekStartDate: "desc" }, take: 1 }
          }
        },
        supportingMentoredStudents: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                fullName: true,
                registrationNumber: true,
                status: true,
                project: { select: { title: true, currentStage: true, completionPercentage: true } },
                weeklyProgresses: { orderBy: { weekStartDate: "desc" }, take: 1 }
              }
            }
          }
        }
      }
    });
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
    const workload = mentors.map((m) => {
      const primaryStudents = m.mentoredStudents;
      const supportingStudents = m.supportingMentoredStudents.map((sm) => sm.student);
      const combined = [...primaryStudents, ...supportingStudents];
      const activeProjects = combined.filter((s) => s.status === "ACTIVE").length;
      const completedProjects = combined.filter((s) => s.project?.currentStage === "COMPLETED").length;
      const pendingUpdates = combined.filter((s) => {
        if (s.status !== "ACTIVE") return false;
        const lastWeekly = s.weeklyProgresses[0];
        return !lastWeekly || lastWeekly.createdAt < oneWeekAgo;
      }).length;
      return {
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        phone: m.phone,
        isActive: m.isActive,
        assignedStudentsCount: combined.length,
        primaryCount: primaryStudents.length,
        supportingCount: supportingStudents.length,
        activeProjects,
        completedProjects,
        pendingUpdates,
        students: combined
      };
    });
    res.json({ workload });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve workload metrics" });
  }
});
usersRouter.post("/", authenticate, requireRoles(import_client13.Role.ADMIN), async (req, res) => {
  try {
    const { email, username, password, fullName, role, phone } = req.body;
    if (!email || !password || !fullName || !role) {
      res.status(400).json({ message: "Email, password, fullName, and role are required." });
      return;
    }
    const trimmedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedEmail },
          ...username ? [{ username: username.trim() }] : []
        ]
      }
    });
    if (existing) {
      res.status(400).json({ message: "User with this email or username already exists." });
      return;
    }
    const passwordHash = await import_bcryptjs3.default.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        username: username ? username.trim() : trimmedEmail.split("@")[0],
        passwordHash,
        fullName: fullName.trim(),
        role,
        phone,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true
      }
    });
    await prisma.activityLog.create({
      data: {
        actorId: req.user.id,
        actorName: req.user.fullName,
        actorRole: req.user.role,
        action: "CREATE_STAFF_USER",
        entityType: "User",
        entityId: user.id,
        details: { email: user.email, role: user.role, name: user.fullName }
      }
    });
    res.status(201).json({ message: "Staff member created successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Failed to create staff member" });
  }
});
usersRouter.put("/:id", authenticate, requireRoles(import_client13.Role.ADMIN), async (req, res) => {
  try {
    const userId = req.params.id;
    const { fullName, phone, role, isActive, username } = req.body;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName ? fullName.trim() : void 0,
        username: username ? username.trim() : void 0,
        phone,
        role: role ? role : void 0,
        isActive: isActive !== void 0 ? Boolean(isActive) : void 0
      },
      select: { id: true, email: true, username: true, fullName: true, role: true, phone: true, isActive: true }
    });
    res.json({ message: "Staff user updated", user: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user" });
  }
});
usersRouter.put("/:id/reset-password", authenticate, requireRoles(import_client13.Role.ADMIN), async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters." });
      return;
    }
    const passwordHash = await import_bcryptjs3.default.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reset password" });
  }
});

// src/routes/settings.routes.ts
var import_express15 = require("express");
var import_client14 = require("@prisma/client");
var settingsRouter = (0, import_express15.Router)();
settingsRouter.get("/", authenticate, async (req, res) => {
  try {
    const settings = await prisma.instituteSettings.findFirst();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ message: "Failed to load institute settings" });
  }
});
settingsRouter.put("/", authenticate, requireRoles(import_client14.Role.ADMIN), async (req, res) => {
  try {
    const {
      instituteName,
      subtitle,
      contactEmail,
      contactPhone,
      address,
      expectedReportingFrequencyDays,
      supervisorCanEditPayments,
      mentorsCanViewPaymentIndicator,
      defaultBatches
    } = req.body;
    const existing = await prisma.instituteSettings.findFirst();
    const id = existing?.id || "default-settings";
    const updated = await prisma.instituteSettings.upsert({
      where: { id },
      update: {
        instituteName,
        subtitle,
        contactEmail,
        contactPhone,
        address,
        expectedReportingFrequencyDays: Number(expectedReportingFrequencyDays) || 7,
        supervisorCanEditPayments: Boolean(supervisorCanEditPayments),
        mentorsCanViewPaymentIndicator: Boolean(mentorsCanViewPaymentIndicator),
        defaultBatches: defaultBatches || void 0
      },
      create: {
        id,
        instituteName: instituteName || "Pinnacle Mindz",
        subtitle: subtitle || "Project Guidance & Progress Management",
        contactEmail: contactEmail || "contact@pinnaclemindz.com",
        contactPhone: contactPhone || "+94 77 890 1234",
        address: address || "Colombo, Sri Lanka",
        expectedReportingFrequencyDays: Number(expectedReportingFrequencyDays) || 7,
        supervisorCanEditPayments: Boolean(supervisorCanEditPayments),
        mentorsCanViewPaymentIndicator: Boolean(mentorsCanViewPaymentIndicator),
        defaultBatches: defaultBatches || ["2024", "2025", "2026", "2027"]
      }
    });
    res.json({ message: "Settings updated successfully", settings: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update settings" });
  }
});

// src/routes/activity.routes.ts
var import_express16 = require("express");
var import_client15 = require("@prisma/client");
var activityRouter = (0, import_express16.Router)();
activityRouter.get("/", authenticate, requireRoles(import_client15.Role.ADMIN, import_client15.Role.SUPERVISOR), async (req, res) => {
  try {
    const { entityType, entityId, action, search, page = "1", limit = "50" } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (entityType) where.entityType = String(entityType);
    if (entityId) where.entityId = String(entityId);
    if (action) where.action = String(action);
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { actorName: { contains: q, mode: "insensitive" } },
        { action: { contains: q, mode: "insensitive" } },
        { entityType: { contains: q, mode: "insensitive" } }
      ];
    }
    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          actor: { select: { fullName: true, email: true, role: true } }
        }
      })
    ]);
    res.json({
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load activity log" });
  }
});

// src/services/cronService.ts
var import_node_cron = __toESM(require("node-cron"));
var import_client16 = require("@prisma/client");
var import_date_fns4 = require("date-fns");
var CronService = class _CronService {
  static init() {
    console.log("\u23F0 Initializing automated background cron jobs for deadlines and missing reports...");
    import_node_cron.default.schedule("0 8 * * *", async () => {
      try {
        await _CronService.checkMissingWeeklyUpdates();
        await _CronService.checkOverdueTasksAndDeadlines();
      } catch (err) {
        console.error("Error in daily cron execution:", err);
      }
    });
  }
  /**
   * Scans all active students and checks if an update is missing
   * according to instituteSettings.expectedReportingFrequencyDays
   */
  static async checkMissingWeeklyUpdates() {
    const settings = await prisma.instituteSettings.findFirst() || {
      expectedReportingFrequencyDays: 7
    };
    const thresholdDate = (0, import_date_fns4.subDays)(/* @__PURE__ */ new Date(), settings.expectedReportingFrequencyDays);
    const activeStudents = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      include: {
        weeklyProgresses: {
          orderBy: { weekStartDate: "desc" },
          take: 1
        },
        dailyProgresses: {
          orderBy: { date: "desc" },
          take: 1
        },
        assignedMentor: true
      }
    });
    for (const student of activeStudents) {
      const latestWeekly = student.weeklyProgresses[0];
      const latestDaily = student.dailyProgresses[0];
      const lastUpdateDate = latestWeekly?.createdAt || latestDaily?.date || student.registrationDate;
      if (lastUpdateDate < thresholdDate && student.assignedMentorId) {
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: student.assignedMentorId,
            type: import_client16.NotificationType.MISSING_UPDATE,
            linkUrl: `/students/${student.id}`,
            createdAt: { gte: (0, import_date_fns4.subDays)(/* @__PURE__ */ new Date(), 3) }
          }
        });
        if (!existingNotif) {
          await prisma.notification.create({
            data: {
              userId: student.assignedMentorId,
              title: `Progress Missing: ${student.fullName}`,
              message: `No daily or weekly progress reported for ${student.fullName} (${student.registrationNumber}) in over ${settings.expectedReportingFrequencyDays} days.`,
              type: import_client16.NotificationType.MISSING_UPDATE,
              linkUrl: `/students/${student.id}`
            }
          });
        }
      }
    }
  }
  /**
   * Checks for overdue tasks and upcoming document deadlines
   */
  static async checkOverdueTasksAndDeadlines() {
    const now = /* @__PURE__ */ new Date();
    const overdueTasks = await prisma.projectTask.findMany({
      where: {
        status: { in: ["TO_DO", "IN_PROGRESS"] },
        dueDate: { lt: now }
      },
      include: {
        assignedMentor: true,
        project: { include: { student: true } }
      },
      take: 20
    });
    for (const task of overdueTasks) {
      if (task.assignedMentorId) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: task.assignedMentorId,
            type: import_client16.NotificationType.OVERDUE_TASK,
            createdAt: { gte: (0, import_date_fns4.subDays)(/* @__PURE__ */ new Date(), 2) }
          }
        });
        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: task.assignedMentorId,
              title: `Overdue Task: ${task.title}`,
              message: `Task for ${task.project.student.fullName} was due on ${task.dueDate?.toLocaleDateString()}.`,
              type: import_client16.NotificationType.OVERDUE_TASK,
              linkUrl: `/students/${task.project.student.id}`
            }
          });
        }
      }
    }
  }
};

// src/index.ts
import_dotenv.default.config();
var app = (0, import_express17.default)();
var PORT = process.env.PORT || 5e3;
app.use(
  (0, import_cors.default)({
    origin: (origin, callback) => callback(null, true),
    credentials: true
  })
);
app.use(import_express17.default.json({ limit: "20mb" }));
app.use(import_express17.default.urlencoded({ extended: true, limit: "20mb" }));
app.use((0, import_cookie_parser.default)());
app.use((0, import_morgan.default)("dev"));
var uploadDir2 = import_path3.default.resolve(process.cwd(), process.env.UPLOAD_DIR || "../uploads");
app.use("/uploads", import_express17.default.static(uploadDir2));
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    system: "Pinnacle Mindz - Project Guidance & Progress Management System",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/progress", progressRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/meetings", meetingsRouter);
app.use("/api/evaluations", evaluationsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/users", usersRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/activity", activityRouter);
app.use((err, req, res, next) => {
  console.error("Unhandled Application Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "An unexpected internal server error occurred.",
    error: process.env.NODE_ENV === "development" ? err : void 0
  });
});
if (!process.env.VERCEL) {
  CronService.init();
  app.listen(PORT, () => {
    console.log(`\u{1F680} Pinnacle Mindz Backend API running on port ${PORT}`);
    console.log(`\u{1F4C1} Upload storage directory: ${uploadDir2}`);
  });
}
var index_default = app;
module.exports = index_default; module.exports.default = index_default;

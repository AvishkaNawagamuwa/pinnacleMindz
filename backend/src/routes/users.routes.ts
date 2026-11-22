import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const usersRouter = Router();

// GET /api/users - List institute staff
usersRouter.get('/', authenticate, async (req, res) => {
  try {
    const { role } = req.query;
    const where: any = {};
    if (role) where.role = role as Role;
    else where.role = { in: [Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR, Role.MENTOR] };

    const users = await prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
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
            supervisedStudents: true,
          },
        },
      },
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list staff users' });
  }
});

// GET /api/users/mentors-workload - Workload balancing interface for Admin
usersRouter.get('/mentors-workload', authenticate, requireRoles(Role.ADMIN), async (req, res) => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: Role.MENTOR },
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
            weeklyProgresses: { orderBy: { weekStartDate: 'desc' }, take: 1 },
          },
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
                weeklyProgresses: { orderBy: { weekStartDate: 'desc' }, take: 1 },
              },
            },
          },
        },
      },
    });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const workload = mentors.map((m) => {
      const primaryStudents = m.mentoredStudents;
      const supportingStudents = m.supportingMentoredStudents.map((sm) => sm.student);
      const combined = [...primaryStudents, ...supportingStudents];

      const activeProjects = combined.filter((s) => s.status === 'ACTIVE').length;
      const completedProjects = combined.filter((s) => s.project?.currentStage === 'COMPLETED').length;
      const pendingUpdates = combined.filter((s) => {
        if (s.status !== 'ACTIVE') return false;
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
        students: combined,
      };
    });

    res.json({ workload });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve workload metrics' });
  }
});

// POST /api/users - Create new supervisor or mentor (Admin only)
usersRouter.post('/', authenticate, requireRoles(Role.ADMIN), async (req, res): Promise<void> => {
  try {
    const { email, username, password, fullName, role, phone } = req.body;

    if (!email || !password || !fullName || !role) {
      res.status(400).json({ message: 'Email, password, fullName, and role are required.' });
      return;
    }

    const trimmedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedEmail },
          ...(username ? [{ username: username.trim() }] : []),
        ],
      },
    });

    if (existing) {
      res.status(400).json({ message: 'User with this email or username already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        username: username ? username.trim() : trimmedEmail.split('@')[0],
        passwordHash,
        fullName: fullName.trim(),
        role: role as Role,
        phone,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.fullName,
        actorRole: req.user!.role,
        action: 'CREATE_STAFF_USER',
        entityType: 'User',
        entityId: user.id,
        details: { email: user.email, role: user.role, name: user.fullName },
      },
    });

    res.status(201).json({ message: 'Staff member created successfully', user });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create staff member' });
  }
});

// PUT /api/users/:id - Update user details or active status
usersRouter.put('/:id', authenticate, requireRoles(Role.ADMIN), async (req, res): Promise<void> => {
  try {
    const userId = req.params.id;
    const { fullName, phone, role, isActive, username } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName ? fullName.trim() : undefined,
        username: username ? username.trim() : undefined,
        phone,
        role: role ? (role as Role) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
      select: { id: true, email: true, username: true, fullName: true, role: true, phone: true, isActive: true },
    });

    res.json({ message: 'Staff user updated', user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// PUT /api/users/:id/reset-password - Admin reset password
usersRouter.put('/:id/reset-password', authenticate, requireRoles(Role.ADMIN), async (req, res): Promise<void> => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

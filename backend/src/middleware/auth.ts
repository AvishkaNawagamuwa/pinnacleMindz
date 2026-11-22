import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../prisma.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ message: 'Authentication required. Please log in.' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'pinnacle-mindz-secret';
    const decoded = jwt.verify(token, secret) as AuthUser;

    // Verify user is still active in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, fullName: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'User account is inactive or no longer exists.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired session token.' });
  }
};

export const requireRoles = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const userRole = req.user.role;
    // Super admin automatically satisfies ADMIN permissions
    if (userRole === Role.SUPER_ADMIN) {
      return next();
    }

    if (!roles.includes(userRole)) {
      res.status(403).json({
        message: `Forbidden: Access requires one of [${roles.join(', ')}] role(s). Your role is ${userRole}.`,
      });
      return;
    }

    next();
  };
};

/**
 * Object-level access control helper for student data
 * Mode 'read': allows mentors to view limited directory or full assigned student
 * Mode 'write': mentors can only modify their own assigned student!
 */
export const checkStudentAccess = async (
  req: Request,
  studentId: string,
  mode: 'read' | 'write' = 'read'
) => {
  if (!req.user) return { allowed: false, reason: 'Unauthenticated' };

  if (req.user.role === Role.SUPER_ADMIN || req.user.role === Role.ADMIN) return { allowed: true, fullAccess: true };
  if (req.user.role === Role.SUPERVISOR) {
    // Supervisors have full read and review write permissions
    return { allowed: true, fullAccess: true };
  }

  // Look up student by student.id OR student.userId (or 'me')
  const student = await prisma.student.findFirst({
    where: studentId === 'me'
      ? { userId: req.user.id }
      : {
          OR: [
            { id: studentId },
            { userId: studentId },
          ],
        },
    select: {
      id: true,
      assignedMentorId: true,
      userId: true,
      supportingMentors: { select: { mentorId: true } },
    },
  });

  if (!student) return { allowed: false, reason: 'Student not found' };

  if (req.user.role === Role.MENTOR) {
    const isPrimary = student.assignedMentorId === req.user.id;
    const isSupporting = student.supportingMentors.some((m) => m.mentorId === req.user!.id);
    if (isPrimary || isSupporting) {
      return { allowed: true, fullAccess: true };
    }
    if (mode === 'write') {
      return {
        allowed: false,
        reason: 'Forbidden: Mentors cannot modify students assigned to other mentors.',
      };
    }
    // Limited directory read only
    return { allowed: true, fullAccess: false };
  }

  if (req.user.role === Role.STUDENT) {
    const isSelf = student.userId === req.user.id || student.id === req.user.id;
    if (isSelf) return { allowed: true, fullAccess: true };
    return { allowed: false, reason: 'Forbidden: You cannot access other students.' };
  }

  return { allowed: false, reason: 'Unauthorized role' };
};

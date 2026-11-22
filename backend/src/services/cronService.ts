import cron from 'node-cron';
import { prisma } from '../prisma.js';
import { NotificationType } from '@prisma/client';
import { subDays } from 'date-fns';

export class CronService {
  static init() {
    console.log('⏰ Initializing automated background cron jobs for deadlines and missing reports...');

    // Run every day at 08:00 AM
    cron.schedule('0 8 * * *', async () => {
      try {
        await CronService.checkMissingWeeklyUpdates();
        await CronService.checkOverdueTasksAndDeadlines();
      } catch (err) {
        console.error('Error in daily cron execution:', err);
      }
    });
  }

  /**
   * Scans all active students and checks if an update is missing
   * according to instituteSettings.expectedReportingFrequencyDays
   */
  static async checkMissingWeeklyUpdates() {
    const settings = (await prisma.instituteSettings.findFirst()) || {
      expectedReportingFrequencyDays: 7,
    };

    const thresholdDate = subDays(new Date(), settings.expectedReportingFrequencyDays);

    const activeStudents = await prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: {
        weeklyProgresses: {
          orderBy: { weekStartDate: 'desc' },
          take: 1,
        },
        dailyProgresses: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        assignedMentor: true,
      },
    });

    for (const student of activeStudents) {
      const latestWeekly = student.weeklyProgresses[0];
      const latestDaily = student.dailyProgresses[0];

      const lastUpdateDate = latestWeekly?.createdAt || latestDaily?.date || student.registrationDate;

      if (lastUpdateDate < thresholdDate && student.assignedMentorId) {
        // Create notification for assigned mentor
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: student.assignedMentorId,
            type: NotificationType.MISSING_UPDATE,
            linkUrl: `/students/${student.id}`,
            createdAt: { gte: subDays(new Date(), 3) },
          },
        });

        if (!existingNotif) {
          await prisma.notification.create({
            data: {
              userId: student.assignedMentorId,
              title: `Progress Missing: ${student.fullName}`,
              message: `No daily or weekly progress reported for ${student.fullName} (${student.registrationNumber}) in over ${settings.expectedReportingFrequencyDays} days.`,
              type: NotificationType.MISSING_UPDATE,
              linkUrl: `/students/${student.id}`,
            },
          });
        }
      }
    }
  }

  /**
   * Checks for overdue tasks and upcoming document deadlines
   */
  static async checkOverdueTasksAndDeadlines() {
    const now = new Date();
    const overdueTasks = await prisma.projectTask.findMany({
      where: {
        status: { in: ['TO_DO', 'IN_PROGRESS'] },
        dueDate: { lt: now },
      },
      include: {
        assignedMentor: true,
        project: { include: { student: true } },
      },
      take: 20,
    });

    for (const task of overdueTasks) {
      if (task.assignedMentorId) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: task.assignedMentorId,
            type: NotificationType.OVERDUE_TASK,
            createdAt: { gte: subDays(new Date(), 2) },
          },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: task.assignedMentorId,
              title: `Overdue Task: ${task.title}`,
              message: `Task for ${task.project.student.fullName} was due on ${task.dueDate?.toLocaleDateString()}.`,
              type: NotificationType.OVERDUE_TASK,
              linkUrl: `/students/${task.project.student.id}`,
            },
          });
        }
      }
    }
  }
}

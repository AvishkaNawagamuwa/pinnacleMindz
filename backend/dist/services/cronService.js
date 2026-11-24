"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_js_1 = require("../prisma.js");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
class CronService {
    static init() {
        console.log('⏰ Initializing automated background cron jobs for deadlines and missing reports...');
        // Run every day at 08:00 AM
        node_cron_1.default.schedule('0 8 * * *', async () => {
            try {
                await CronService.checkMissingWeeklyUpdates();
                await CronService.checkOverdueTasksAndDeadlines();
            }
            catch (err) {
                console.error('Error in daily cron execution:', err);
            }
        });
    }
    /**
     * Scans all active students and checks if an update is missing
     * according to instituteSettings.expectedReportingFrequencyDays
     */
    static async checkMissingWeeklyUpdates() {
        const settings = (await prisma_js_1.prisma.instituteSettings.findFirst()) || {
            expectedReportingFrequencyDays: 7,
        };
        const thresholdDate = (0, date_fns_1.subDays)(new Date(), settings.expectedReportingFrequencyDays);
        const activeStudents = await prisma_js_1.prisma.student.findMany({
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
                const existingNotif = await prisma_js_1.prisma.notification.findFirst({
                    where: {
                        userId: student.assignedMentorId,
                        type: client_1.NotificationType.MISSING_UPDATE,
                        linkUrl: `/students/${student.id}`,
                        createdAt: { gte: (0, date_fns_1.subDays)(new Date(), 3) },
                    },
                });
                if (!existingNotif) {
                    await prisma_js_1.prisma.notification.create({
                        data: {
                            userId: student.assignedMentorId,
                            title: `Progress Missing: ${student.fullName}`,
                            message: `No daily or weekly progress reported for ${student.fullName} (${student.registrationNumber}) in over ${settings.expectedReportingFrequencyDays} days.`,
                            type: client_1.NotificationType.MISSING_UPDATE,
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
        const overdueTasks = await prisma_js_1.prisma.projectTask.findMany({
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
                const existing = await prisma_js_1.prisma.notification.findFirst({
                    where: {
                        userId: task.assignedMentorId,
                        type: client_1.NotificationType.OVERDUE_TASK,
                        createdAt: { gte: (0, date_fns_1.subDays)(new Date(), 2) },
                    },
                });
                if (!existing) {
                    await prisma_js_1.prisma.notification.create({
                        data: {
                            userId: task.assignedMentorId,
                            title: `Overdue Task: ${task.title}`,
                            message: `Task for ${task.project.student.fullName} was due on ${task.dueDate?.toLocaleDateString()}.`,
                            type: client_1.NotificationType.OVERDUE_TASK,
                            linkUrl: `/students/${task.project.student.id}`,
                        },
                    });
                }
            }
        }
    }
}
exports.CronService = CronService;

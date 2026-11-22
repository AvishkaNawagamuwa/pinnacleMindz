import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { authRouter } from './routes/auth.routes.js';
import { studentsRouter } from './routes/students.routes.js';
import { projectsRouter } from './routes/projects.routes.js';
import { documentsRouter } from './routes/documents.routes.js';
import { progressRouter } from './routes/progress.routes.js';
import { tasksRouter } from './routes/tasks.routes.js';
import { reviewsRouter } from './routes/reviews.routes.js';
import { meetingsRouter } from './routes/meetings.routes.js';
import { evaluationsRouter } from './routes/evaluations.routes.js';
import { paymentsRouter } from './routes/payments.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { activityRouter } from './routes/activity.routes.js';
import { CronService } from './services/cronService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Static files for persistent uploads
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || '../uploads');
app.use('/uploads', express.static(uploadDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Pinnacle Mindz - Project Guidance & Progress Management System',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/evaluations', evaluationsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/activity', activityRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
});

// Initialize background schedulers in non-serverless environments
if (!process.env.VERCEL) {
  CronService.init();

  app.listen(PORT, () => {
    console.log(`🚀 Pinnacle Mindz Backend API running on port ${PORT}`);
    console.log(`📁 Upload storage directory: ${uploadDir}`);
  });
}

export default app;

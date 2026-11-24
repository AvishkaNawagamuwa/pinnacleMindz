"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_routes_js_1 = require("./routes/auth.routes.js");
const students_routes_js_1 = require("./routes/students.routes.js");
const projects_routes_js_1 = require("./routes/projects.routes.js");
const documents_routes_js_1 = require("./routes/documents.routes.js");
const progress_routes_js_1 = require("./routes/progress.routes.js");
const tasks_routes_js_1 = require("./routes/tasks.routes.js");
const reviews_routes_js_1 = require("./routes/reviews.routes.js");
const meetings_routes_js_1 = require("./routes/meetings.routes.js");
const evaluations_routes_js_1 = require("./routes/evaluations.routes.js");
const payments_routes_js_1 = require("./routes/payments.routes.js");
const dashboard_routes_js_1 = require("./routes/dashboard.routes.js");
const reports_routes_js_1 = require("./routes/reports.routes.js");
const notifications_routes_js_1 = require("./routes/notifications.routes.js");
const users_routes_js_1 = require("./routes/users.routes.js");
const settings_routes_js_1 = require("./routes/settings.routes.js");
const activity_routes_js_1 = require("./routes/activity.routes.js");
const cronService_js_1 = require("./services/cronService.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
}));
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)('dev'));
// Static files for persistent uploads
const uploadDir = path_1.default.resolve(process.cwd(), process.env.UPLOAD_DIR || '../uploads');
app.use('/uploads', express_1.default.static(uploadDir));
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        system: 'Pinnacle Mindz - Project Guidance & Progress Management System',
        timestamp: new Date().toISOString(),
    });
});
// Mount Routes
app.use('/api/auth', auth_routes_js_1.authRouter);
app.use('/api/students', students_routes_js_1.studentsRouter);
app.use('/api/projects', projects_routes_js_1.projectsRouter);
app.use('/api/documents', documents_routes_js_1.documentsRouter);
app.use('/api/progress', progress_routes_js_1.progressRouter);
app.use('/api/tasks', tasks_routes_js_1.tasksRouter);
app.use('/api/reviews', reviews_routes_js_1.reviewsRouter);
app.use('/api/meetings', meetings_routes_js_1.meetingsRouter);
app.use('/api/evaluations', evaluations_routes_js_1.evaluationsRouter);
app.use('/api/payments', payments_routes_js_1.paymentsRouter);
app.use('/api/dashboard', dashboard_routes_js_1.dashboardRouter);
app.use('/api/reports', reports_routes_js_1.reportsRouter);
app.use('/api/notifications', notifications_routes_js_1.notificationsRouter);
app.use('/api/users', users_routes_js_1.usersRouter);
app.use('/api/settings', settings_routes_js_1.settingsRouter);
app.use('/api/activity', activity_routes_js_1.activityRouter);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Application Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'An unexpected internal server error occurred.',
        error: process.env.NODE_ENV === 'development' ? err : undefined,
    });
});
// Initialize background schedulers and listener in non-serverless environments
if (!process.env.VERCEL) {
    cronService_js_1.CronService.init();
    app.listen(PORT, () => {
        console.log(`🚀 Pinnacle Mindz Backend API running on port ${PORT}`);
        console.log(`📁 Upload storage directory: ${uploadDir}`);
    });
}
exports.default = app;

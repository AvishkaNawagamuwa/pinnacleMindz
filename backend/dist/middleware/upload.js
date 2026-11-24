"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const uploadDir = path_1.default.resolve(process.env.UPLOAD_DIR ||
    (process.env.VERCEL ? path_1.default.join(os_1.default.tmpdir(), 'uploads') : path_1.default.resolve(process.cwd(), '../uploads')));
try {
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
}
catch (err) {
    console.warn('⚠️ Warning: Could not create upload directory:', err?.message || err);
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs_1.default.existsSync(uploadDir)) {
                fs_1.default.mkdirSync(uploadDir, { recursive: true });
            }
        }
        catch (e) {
            // Ignore in read-only environments
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        const basename = path_1.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, `${basename}_${uniqueSuffix}${ext}`);
    },
});
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.zip', '.xlsx', '.csv'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error(`File type ${ext} is not allowed. Supported formats: PDF, DOC, DOCX, PNG, JPG, ZIP, XLSX, CSV`));
        }
    },
});

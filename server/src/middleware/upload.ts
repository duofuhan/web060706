import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { env } from '../config/env.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allow = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allow.includes(file.mimetype));
  },
});

export function imageUrl(_req: any, filename: string): string {
  const base = env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';
  return `${base}/uploads/${filename}`;
}

export function imageUrlPath(filename: string): string {
  return `/uploads/${filename}`;
}
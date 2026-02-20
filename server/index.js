import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { getDb } from './db/schema.js';
import authRoutes from './routes/auth.js';
import mediaRoutes from './routes/media.js';
import adminRoutes from './routes/admin.js';
import playlistRoutes from './routes/playlists.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ── Security middleware ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Let Vite dev server handle CSP
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Global rate limiter — 100 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down netrunner' },
}));

// Strict auth rate limiter — 10 attempts per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Try again later.' },
});

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ── Static files (uploads) ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'none'");
  },
}));

// ── Init DB ──
getDb();

// ── Routes ──
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/playlists', playlistRoutes);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ONLINE', system: 'PunkStation v1.0', timestamp: new Date().toISOString() });
});

// ── Error handler ──
app.use((err, req, res, _next) => {
  console.error('[SERVER] Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n⚡ PunkStation server ONLINE — port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

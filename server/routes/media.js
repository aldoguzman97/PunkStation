import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { getDb } from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';
import { mediaUpdateRules, commentRules, reportRules } from '../middleware/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure upload directory
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer config with security
const ALLOWED_TYPES = {
  'video/mp4': 'video', 'video/webm': 'video', 'video/ogg': 'video',
  'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image',
  'audio/mpeg': 'audio', 'audio/ogg': 'audio', 'audio/wav': 'audio',
};

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

const router = Router();

// GET /api/media — list media (public)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, type, search, sort = 'newest', user_id } = req.query;
    const offset = (Math.max(1, +page) - 1) * Math.min(50, Math.max(1, +limit));
    const safeLimit = Math.min(50, Math.max(1, +limit));

    let where = "WHERE m.status = 'active'";
    const params = [];

    if (type && ['video', 'image', 'audio'].includes(type)) {
      where += ' AND m.type = ?';
      params.push(type);
    }
    if (search) {
      where += ' AND (m.title LIKE ? OR m.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (user_id) {
      where += ' AND m.user_id = ?';
      params.push(user_id);
    }

    const orderMap = {
      newest: 'm.created_at DESC',
      oldest: 'm.created_at ASC',
      popular: 'm.views DESC',
      title: 'm.title ASC',
    };
    const order = orderMap[sort] || orderMap.newest;

    const total = db.prepare(`SELECT COUNT(*) as count FROM media m ${where}`).get(...params).count;

    const items = db.prepare(`
      SELECT m.*, u.username, u.avatar as user_avatar
      FROM media m
      JOIN users u ON m.user_id = u.id
      ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?
    `).all(...params, safeLimit, offset);

    res.json({
      items,
      pagination: {
        page: +page,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    console.error('[MEDIA] List error:', err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// GET /api/media/:id — single item
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const item = db.prepare(`
      SELECT m.*, u.username, u.avatar as user_avatar
      FROM media m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(req.params.id);

    if (!item) return res.status(404).json({ error: 'Not found' });

    // Increment views
    db.prepare('UPDATE media SET views = views + 1 WHERE id = ?').run(req.params.id);

    // Get comments
    const comments = db.prepare(`
      SELECT c.*, u.username, u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.media_id = ?
      ORDER BY c.created_at DESC
    `).all(req.params.id);

    // Get like count
    const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE media_id = ?').get(req.params.id).count;

    res.json({ ...item, views: item.views + 1, comments, likeCount });
  } catch (err) {
    console.error('[MEDIA] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// POST /api/media — upload
router.post('/', authenticate, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large (max 500MB)' });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    try {
      const db = getDb();
      const id = randomUUID();
      const type = ALLOWED_TYPES[req.file.mimetype];
      const title = req.body.title || req.file.originalname;
      const description = req.body.description || '';
      const tags = req.body.tags ? JSON.stringify(JSON.parse(req.body.tags)) : '[]';

      db.prepare(`
        INSERT INTO media (id, user_id, title, description, type, filename, size, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, title, description, type, req.file.filename, req.file.size, tags);

      const item = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
      res.status(201).json(item);
    } catch (err) {
      console.error('[MEDIA] Upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  });
});

// PUT /api/media/:id — update
router.put('/:id', authenticate, mediaUpdateRules, (req, res) => {
  try {
    const db = getDb();
    const item = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);

    if (!item) return res.status(404).json({ error: 'Not found' });
    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, tags } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.id);
    db.prepare(`UPDATE media SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('[MEDIA] Update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/media/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const item = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);

    if (!item) return res.status(404).json({ error: 'Not found' });
    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete file
    const filePath = path.join(UPLOADS_DIR, item.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[MEDIA] Delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// POST /api/media/:id/like
router.post('/:id/like', authenticate, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM likes WHERE user_id = ? AND media_id = ?').get(req.user.id, req.params.id);

    if (existing) {
      db.prepare('DELETE FROM likes WHERE user_id = ? AND media_id = ?').run(req.user.id, req.params.id);
      return res.json({ liked: false });
    }

    db.prepare('INSERT INTO likes (user_id, media_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    res.json({ liked: true });
  } catch (err) {
    console.error('[MEDIA] Like error:', err);
    res.status(500).json({ error: 'Like failed' });
  }
});

// POST /api/media/:id/comments
router.post('/:id/comments', authenticate, commentRules, (req, res) => {
  try {
    const db = getDb();
    const id = randomUUID();
    db.prepare('INSERT INTO comments (id, media_id, user_id, content) VALUES (?, ?, ?, ?)').run(
      id, req.params.id, req.user.id, req.body.content
    );

    const comment = db.prepare(`
      SELECT c.*, u.username, u.avatar as user_avatar
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(id);

    res.status(201).json(comment);
  } catch (err) {
    console.error('[MEDIA] Comment error:', err);
    res.status(500).json({ error: 'Comment failed' });
  }
});

// POST /api/media/:id/report
router.post('/:id/report', authenticate, reportRules, (req, res) => {
  try {
    const db = getDb();
    const id = randomUUID();
    db.prepare('INSERT INTO reports (id, reporter_id, media_id, reason) VALUES (?, ?, ?, ?)').run(
      id, req.user.id, req.params.id, req.body.reason
    );
    res.status(201).json({ message: 'Report submitted' });
  } catch (err) {
    console.error('[MEDIA] Report error:', err);
    res.status(500).json({ error: 'Report failed' });
  }
});

export default router;

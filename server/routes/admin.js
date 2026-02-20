import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { authenticate, requireAdmin, auditLog } from '../middleware/auth.js';

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  try {
    const db = getDb();

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalMedia = db.prepare('SELECT COUNT(*) as count FROM media').get().count;
    const totalViews = db.prepare('SELECT COALESCE(SUM(views), 0) as count FROM media').get().count;
    const pendingReports = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'").get().count;
    const flaggedMedia = db.prepare("SELECT COUNT(*) as count FROM media WHERE status = 'flagged'").get().count;
    const bannedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 1').get().count;

    // Media by type
    const mediaByType = db.prepare('SELECT type, COUNT(*) as count FROM media GROUP BY type').all();

    // Recent signups (last 7 days)
    const recentSignups = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE created_at > datetime('now', '-7 days')"
    ).get().count;

    // Storage used
    const storageUsed = db.prepare('SELECT COALESCE(SUM(size), 0) as bytes FROM media').get().bytes;

    res.json({
      totalUsers,
      totalMedia,
      totalViews,
      pendingReports,
      flaggedMedia,
      bannedUsers,
      mediaByType,
      recentSignups,
      storageUsed,
    });
  } catch (err) {
    console.error('[ADMIN] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 25, search, role } = req.query;
    const offset = (Math.max(1, +page) - 1) * Math.min(100, +limit);

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role && ['user', 'admin'].includes(role)) {
      where += ' AND role = ?';
      params.push(role);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params).count;

    const users = db.prepare(`
      SELECT id, username, email, role, avatar, bio, is_banned, created_at, updated_at
      FROM users ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, +limit, offset);

    // Attach media count per user
    const enriched = users.map(u => {
      const mediaCount = db.prepare('SELECT COUNT(*) as count FROM media WHERE user_id = ?').get(u.id).count;
      return { ...u, mediaCount };
    });

    res.json({ users: enriched, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    console.error('[ADMIN] Users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id/ban
router.put('/users/:id/ban', auditLog('ban_user', 'user'), (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot ban admin users' });

    db.prepare('UPDATE users SET is_banned = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'User banned' });
  } catch (err) {
    console.error('[ADMIN] Ban error:', err);
    res.status(500).json({ error: 'Ban failed' });
  }
});

// PUT /api/admin/users/:id/unban
router.put('/users/:id/unban', auditLog('unban_user', 'user'), (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE users SET is_banned = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'User unbanned' });
  } catch (err) {
    console.error('[ADMIN] Unban error:', err);
    res.status(500).json({ error: 'Unban failed' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', auditLog('change_role', 'user'), (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const db = getDb();
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    res.json({ message: `Role updated to ${role}` });
  } catch (err) {
    console.error('[ADMIN] Role error:', err);
    res.status(500).json({ error: 'Role update failed' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', auditLog('delete_user', 'user'), (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(403).json({ error: 'Cannot delete self' });

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('[ADMIN] Delete user error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// GET /api/admin/media — all media including non-active
router.get('/media', (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 25, status, type, search } = req.query;
    const offset = (Math.max(1, +page) - 1) * Math.min(100, +limit);
    const params = [];

    let where = 'WHERE 1=1';
    if (status) { where += ' AND m.status = ?'; params.push(status); }
    if (type) { where += ' AND m.type = ?'; params.push(type); }
    if (search) { where += ' AND (m.title LIKE ? OR m.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const total = db.prepare(`SELECT COUNT(*) as count FROM media m ${where}`).get(...params).count;

    const items = db.prepare(`
      SELECT m.*, u.username
      FROM media m JOIN users u ON m.user_id = u.id
      ${where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, +limit, offset);

    res.json({ items, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    console.error('[ADMIN] Media list error:', err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// PUT /api/admin/media/:id/status
router.put('/media/:id/status', auditLog('change_media_status', 'media'), (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'pending', 'flagged', 'removed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = getDb();
    db.prepare('UPDATE media SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: `Status updated to ${status}` });
  } catch (err) {
    console.error('[ADMIN] Media status error:', err);
    res.status(500).json({ error: 'Status update failed' });
  }
});

// GET /api/admin/reports
router.get('/reports', (req, res) => {
  try {
    const db = getDb();
    const { status = 'pending' } = req.query;

    const reports = db.prepare(`
      SELECT r.*, u.username as reporter_name,
        m.title as media_title, m.type as media_type
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      LEFT JOIN media m ON r.media_id = m.id
      WHERE r.status = ?
      ORDER BY r.created_at DESC
    `).all(status);

    res.json({ reports });
  } catch (err) {
    console.error('[ADMIN] Reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// PUT /api/admin/reports/:id
router.put('/reports/:id', auditLog('resolve_report', 'report'), (req, res) => {
  try {
    const { status } = req.body;
    if (!['reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = getDb();
    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Report updated' });
  } catch (err) {
    console.error('[ADMIN] Report update error:', err);
    res.status(500).json({ error: 'Report update failed' });
  }
});

// GET /api/admin/audit
router.get('/audit', (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, +page) - 1) * +limit;

    const logs = db.prepare(`
      SELECT a.*, u.username
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(+limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM audit_log').get().count;

    res.json({ logs, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    console.error('[ADMIN] Audit error:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;

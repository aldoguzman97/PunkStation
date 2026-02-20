import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getDb } from '../db/schema.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { registerRules, loginRules } from '../middleware/validate.js';

const router = Router();

// POST /api/auth/register
router.post('/register', registerRules, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const db = getDb();

    // Check uniqueness
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(id, username, email, passwordHash);

    const token = generateToken({ id, role: 'user' });

    res.status(201).json({
      token,
      user: { id, username, email, role: 'user', avatar: null, bio: '' },
    });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', loginRules, async (req, res) => {
  try {
    const { login, password } = req.body;
    const db = getDb();

    const user = db.prepare(
      'SELECT id, username, email, password_hash, role, avatar, bio, is_banned FROM users WHERE username = ? OR email = ?'
    ).get(login, login);

    if (!user) {
      // Constant-time comparison to prevent user enumeration
      await bcrypt.hash(password, 12);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { bio, avatar } = req.body;
    const db = getDb();

    const updates = [];
    const params = [];

    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.length > 500) {
        return res.status(400).json({ error: 'Bio must be under 500 characters' });
      }
      updates.push('bio = ?');
      params.push(bio);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(avatar);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.user.id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT id, username, email, role, avatar, bio, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: updated });
  } catch (err) {
    console.error('[AUTH] Profile update error:', err);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const db = getDb();
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, req.user.id);

    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('[AUTH] Password change error:', err);
    res.status(500).json({ error: 'Password change failed' });
  }
});

export default router;

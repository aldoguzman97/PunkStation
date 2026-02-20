import jwt from 'jsonwebtoken';
import { getDb } from '../db/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_TO_A_RANDOM_64_CHAR_SECRET_KEY_IN_PRODUCTION';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h', algorithm: 'HS256' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}

// Authenticate any logged-in user
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const db = getDb();
    const user = db.prepare('SELECT id, username, email, role, avatar, bio, is_banned, created_at FROM users WHERE id = ?').get(payload.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.is_banned) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Require admin role
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Audit logger
export function auditLog(action, targetType = null) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      if (res.statusCode < 400 && req.user) {
        try {
          const db = getDb();
          db.prepare(`
            INSERT INTO audit_log (user_id, action, target_type, target_id, ip_address)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            req.user.id,
            action,
            targetType,
            req.params.id || null,
            req.ip
          );
        } catch (_) { /* non-critical */ }
      }
      return originalJson(data);
    };
    next();
  };
}

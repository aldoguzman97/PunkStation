import { Router } from 'express';
import { randomUUID } from 'crypto';
import { nanoid } from 'nanoid';
import { getDb } from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/watchparty — create a watch party room
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { mediaId } = req.body;

    if (!mediaId) return res.status(400).json({ error: 'mediaId required' });

    const media = db.prepare('SELECT * FROM media WHERE id = ? AND status = ?').get(mediaId, 'active');
    if (!media) return res.status(404).json({ error: 'Media not found' });

    const id = randomUUID();
    const code = nanoid(8); // Short shareable code

    db.prepare(`
      INSERT INTO watch_rooms (id, code, host_id, media_id)
      VALUES (?, ?, ?, ?)
    `).run(id, code, req.user.id, mediaId);

    // Add host as member
    db.prepare(`
      INSERT INTO watch_room_members (room_id, user_id) VALUES (?, ?)
    `).run(id, req.user.id);

    const room = db.prepare(`
      SELECT wr.*, m.title as media_title, m.filename, m.type as media_type, m.duration,
             u.username as host_username
      FROM watch_rooms wr
      JOIN media m ON wr.media_id = m.id
      JOIN users u ON wr.host_id = u.id
      WHERE wr.id = ?
    `).get(id);

    res.status(201).json(room);
  } catch (err) {
    console.error('[WATCHPARTY] Create error:', err);
    res.status(500).json({ error: 'Failed to create watch party' });
  }
});

// GET /api/watchparty/join/:code — join a watch party by shareable code
router.get('/join/:code', authenticate, (req, res) => {
  try {
    const db = getDb();
    const room = db.prepare(`
      SELECT wr.*, m.title as media_title, m.filename, m.type as media_type, m.duration,
             m.thumbnail, u.username as host_username
      FROM watch_rooms wr
      JOIN media m ON wr.media_id = m.id
      JOIN users u ON wr.host_id = u.id
      WHERE wr.code = ? AND wr.is_active = 1
    `).get(req.params.code);

    if (!room) return res.status(404).json({ error: 'Watch party not found or ended' });

    // Count current members
    const memberCount = db.prepare('SELECT COUNT(*) as count FROM watch_room_members WHERE room_id = ?')
      .get(room.id).count;

    if (memberCount >= room.max_viewers) {
      return res.status(403).json({ error: 'Room is full' });
    }

    // Add member (ignore if already joined)
    db.prepare(`
      INSERT OR IGNORE INTO watch_room_members (room_id, user_id) VALUES (?, ?)
    `).run(room.id, req.user.id);

    // Get all members
    const members = db.prepare(`
      SELECT u.id, u.username, u.avatar
      FROM watch_room_members wrm
      JOIN users u ON wrm.user_id = u.id
      WHERE wrm.room_id = ?
    `).all(room.id);

    res.json({ ...room, members, memberCount: members.length });
  } catch (err) {
    console.error('[WATCHPARTY] Join error:', err);
    res.status(500).json({ error: 'Failed to join watch party' });
  }
});

// GET /api/watchparty/:id — get room details
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const room = db.prepare(`
      SELECT wr.*, m.title as media_title, m.filename, m.type as media_type, m.duration,
             m.thumbnail, u.username as host_username
      FROM watch_rooms wr
      JOIN media m ON wr.media_id = m.id
      JOIN users u ON wr.host_id = u.id
      WHERE wr.id = ?
    `).get(req.params.id);

    if (!room) return res.status(404).json({ error: 'Room not found' });

    const members = db.prepare(`
      SELECT u.id, u.username, u.avatar
      FROM watch_room_members wrm
      JOIN users u ON wrm.user_id = u.id
      WHERE wrm.room_id = ?
    `).all(room.id);

    res.json({ ...room, members, memberCount: members.length });
  } catch (err) {
    console.error('[WATCHPARTY] Get error:', err);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// DELETE /api/watchparty/:id — end a watch party (host only)
router.delete('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const room = db.prepare('SELECT * FROM watch_rooms WHERE id = ?').get(req.params.id);

    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the host can end the party' });
    }

    db.prepare('UPDATE watch_rooms SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Watch party ended' });
  } catch (err) {
    console.error('[WATCHPARTY] Delete error:', err);
    res.status(500).json({ error: 'Failed to end watch party' });
  }
});

// GET /api/watchparty — list my active watch parties
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const rooms = db.prepare(`
      SELECT wr.*, m.title as media_title, m.thumbnail, u.username as host_username,
        (SELECT COUNT(*) FROM watch_room_members WHERE room_id = wr.id) as member_count
      FROM watch_rooms wr
      JOIN media m ON wr.media_id = m.id
      JOIN users u ON wr.host_id = u.id
      WHERE wr.is_active = 1
        AND (wr.host_id = ? OR wr.id IN (SELECT room_id FROM watch_room_members WHERE user_id = ?))
      ORDER BY wr.created_at DESC
    `).all(req.user.id, req.user.id);

    res.json(rooms);
  } catch (err) {
    console.error('[WATCHPARTY] List error:', err);
    res.status(500).json({ error: 'Failed to list parties' });
  }
});

export default router;

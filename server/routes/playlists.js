import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/playlists — user's playlists
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const playlists = db.prepare(`
      SELECT p.*, COUNT(pi.media_id) as item_count
      FROM playlists p
      LEFT JOIN playlist_items pi ON p.id = pi.playlist_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all(req.user.id);

    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// POST /api/playlists
router.post('/', authenticate, (req, res) => {
  try {
    const { name, description = '', is_public = true } = req.body;
    if (!name || name.length > 200) {
      return res.status(400).json({ error: 'Name required (max 200 chars)' });
    }

    const db = getDb();
    const id = randomUUID();
    db.prepare('INSERT INTO playlists (id, user_id, name, description, is_public) VALUES (?, ?, ?, ?, ?)').run(
      id, req.user.id, name, description, is_public ? 1 : 0
    );

    res.status(201).json({ id, name, description, is_public });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// POST /api/playlists/:id/items
router.post('/:id/items', authenticate, (req, res) => {
  try {
    const { media_id } = req.body;
    const db = getDb();

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) as pos FROM playlist_items WHERE playlist_id = ?').get(req.params.id).pos;

    db.prepare('INSERT OR IGNORE INTO playlist_items (playlist_id, media_id, position) VALUES (?, ?, ?)').run(
      req.params.id, media_id, maxPos + 1
    );

    res.json({ message: 'Added to playlist' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to playlist' });
  }
});

// DELETE /api/playlists/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
    res.json({ message: 'Playlist deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

export default router;

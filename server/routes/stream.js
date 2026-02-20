import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db/schema.js';
import { transcodeVideo, getTranscodeStatus, HLS_DIR } from '../services/transcode.js';
import { authenticate } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const router = Router();

// GET /api/stream/:mediaId/status — transcoding status
router.get('/:mediaId/status', (req, res) => {
  try {
    const status = getTranscodeStatus(req.params.mediaId);
    if (!status) {
      return res.json({ status: 'none', hasHls: false });
    }
    const hlsDir = path.join(HLS_DIR, req.params.mediaId);
    const hasHls = fs.existsSync(path.join(hlsDir, 'master.m3u8'));
    res.json({ ...status, hasHls });
  } catch (err) {
    console.error('[STREAM] Status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// POST /api/stream/:mediaId/transcode — start transcoding
router.post('/:mediaId/transcode', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.mediaId);
    if (!media) return res.status(404).json({ error: 'Media not found' });
    if (media.type !== 'video') return res.status(400).json({ error: 'Only videos can be transcoded' });

    // Check if already transcoding
    const existing = getTranscodeStatus(req.params.mediaId);
    if (existing && (existing.status === 'processing' || existing.status === 'completed')) {
      return res.json({ message: 'Transcode already ' + existing.status, job: existing });
    }

    // Start transcoding in background
    res.json({ message: 'Transcoding started', mediaId: req.params.mediaId });

    // Run async (don't await — it returns immediately)
    transcodeVideo(req.params.mediaId).catch(err => {
      console.error('[STREAM] Background transcode failed:', err.message);
    });
  } catch (err) {
    console.error('[STREAM] Transcode error:', err);
    res.status(500).json({ error: 'Failed to start transcode' });
  }
});

// GET /api/stream/:mediaId/master.m3u8 — master playlist
router.get('/:mediaId/master.m3u8', (req, res) => {
  try {
    const filePath = path.join(HLS_DIR, req.params.mediaId, 'master.m3u8');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'HLS stream not ready' });
    }
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[STREAM] Master playlist error:', err);
    res.status(500).json({ error: 'Stream error' });
  }
});

// GET /api/stream/:mediaId/:filename — serve HLS segments and sub-playlists
router.get('/:mediaId/:filename', (req, res) => {
  try {
    const { mediaId, filename } = req.params;
    // Sanitize filename to prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.join(HLS_DIR, mediaId, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    if (safeName.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (safeName.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[STREAM] Segment error:', err);
    res.status(500).json({ error: 'Segment error' });
  }
});

export default router;

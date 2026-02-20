import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const HLS_DIR = path.join(__dirname, '..', 'uploads', 'hls');

// Quality presets (modeled after ClipBucket's multi-resolution approach)
const QUALITY_PRESETS = [
  { name: '360p', height: 360, videoBitrate: '800k', audioBitrate: '96k', maxrate: '856k', bufsize: '1200k' },
  { name: '480p', height: 480, videoBitrate: '1400k', audioBitrate: '128k', maxrate: '1498k', bufsize: '2100k' },
  { name: '720p', height: 720, videoBitrate: '2800k', audioBitrate: '128k', maxrate: '2996k', bufsize: '4200k' },
  { name: '1080p', height: 1080, videoBitrate: '5000k', audioBitrate: '192k', maxrate: '5350k', bufsize: '7500k' },
];

// Ensure HLS directory exists
if (!fs.existsSync(HLS_DIR)) {
  fs.mkdirSync(HLS_DIR, { recursive: true });
}

/**
 * Get video info using ffprobe (like ClipBucket's get_file_info)
 */
function getVideoInfo(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        videoCodec: videoStream?.codec_name || '',
        audioCodec: audioStream?.codec_name || '',
        bitrate: metadata.format.bit_rate || 0,
        size: metadata.format.size || 0,
      });
    });
  });
}

/**
 * Filter quality presets based on source resolution
 * (like ClipBucket's reindex_required_resolutions)
 */
function getApplicableQualities(sourceHeight) {
  return QUALITY_PRESETS.filter(q => q.height <= sourceHeight);
}

/**
 * Generate thumbnail at a specific timestamp
 */
function generateThumbnail(inputPath, outputPath, timestamp) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x360',
      })
      .on('end', () => resolve(outputPath))
      .on('error', reject);
  });
}

/**
 * Transcode a video to a specific HLS quality
 */
function transcodeToQuality(inputPath, outputDir, quality) {
  return new Promise((resolve, reject) => {
    const playlistName = `${quality.name}.m3u8`;
    const segmentPattern = `${quality.name}_%03d.ts`;

    ffmpeg(inputPath)
      .outputOptions([
        '-profile:v main',
        '-level 3.1',
        `-vf scale=-2:${quality.height}`,
        `-b:v ${quality.videoBitrate}`,
        `-maxrate ${quality.maxrate}`,
        `-bufsize ${quality.bufsize}`,
        `-b:a ${quality.audioBitrate}`,
        '-ar 48000',
        '-ac 2',
        '-c:v libx264',
        '-c:a aac',
        '-preset medium',
        '-g 48',
        '-keyint_min 48',
        '-sc_threshold 0',
        '-hls_time 6',
        '-hls_playlist_type vod',
        `-hls_segment_filename ${path.join(outputDir, segmentPattern)}`,
        '-f hls',
      ])
      .output(path.join(outputDir, playlistName))
      .on('end', () => resolve({ quality: quality.name, playlist: playlistName }))
      .on('error', reject)
      .run();
  });
}

/**
 * Generate master HLS playlist (adaptive bitrate)
 */
function generateMasterPlaylist(outputDir, qualities) {
  const bandwidthMap = {
    '360p': 800000,
    '480p': 1400000,
    '720p': 2800000,
    '1080p': 5000000,
  };

  const resolutionMap = {
    '360p': '640x360',
    '480p': '854x480',
    '720p': '1280x720',
    '1080p': '1920x1080',
  };

  let content = '#EXTM3U\n#EXT-X-VERSION:3\n';
  for (const q of qualities) {
    const bw = bandwidthMap[q.quality] || 1000000;
    const res = resolutionMap[q.quality] || '1280x720';
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bw},RESOLUTION=${res}\n`;
    content += `${q.playlist}\n`;
  }

  const masterPath = path.join(outputDir, 'master.m3u8');
  fs.writeFileSync(masterPath, content);
  return 'master.m3u8';
}

/**
 * Main transcoding pipeline (like ClipBucket's conversion queue)
 */
export async function transcodeVideo(mediaId) {
  const db = getDb();
  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId);
  if (!media || media.type !== 'video') {
    throw new Error('Invalid media or not a video');
  }

  const inputPath = path.join(UPLOADS_DIR, media.filename);
  if (!fs.existsSync(inputPath)) {
    throw new Error('Source file not found');
  }

  // Create transcode job
  const jobId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO transcode_jobs (id, media_id, status, started_at)
    VALUES (?, ?, 'processing', datetime('now'))
  `).run(jobId, mediaId);

  // Create output directory
  const outputDir = path.join(HLS_DIR, mediaId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Get source video info
    const info = await getVideoInfo(inputPath);
    console.log(`[TRANSCODE] ${mediaId}: ${info.width}x${info.height}, ${Math.round(info.duration)}s`);

    // Update media duration if not set
    if (!media.duration && info.duration) {
      db.prepare('UPDATE media SET duration = ? WHERE id = ?').run(info.duration, mediaId);
    }

    // Generate thumbnail
    try {
      const thumbTime = Math.min(info.duration * 0.25, 10);
      const thumbPath = path.join(UPLOADS_DIR, `thumb_${mediaId}.jpg`);
      await generateThumbnail(inputPath, thumbPath, thumbTime);
      db.prepare('UPDATE media SET thumbnail = ? WHERE id = ?').run(`thumb_${mediaId}.jpg`, mediaId);
    } catch (thumbErr) {
      console.warn('[TRANSCODE] Thumbnail generation failed:', thumbErr.message);
    }

    // Determine applicable qualities based on source resolution
    const applicableQualities = getApplicableQualities(info.height);
    if (applicableQualities.length === 0) {
      // Source is very low res — transcode to single lowest quality
      applicableQualities.push(QUALITY_PRESETS[0]);
    }

    // Transcode each quality level
    const completedQualities = [];
    for (let i = 0; i < applicableQualities.length; i++) {
      const quality = applicableQualities[i];
      console.log(`[TRANSCODE] ${mediaId}: Encoding ${quality.name} (${i + 1}/${applicableQualities.length})`);

      const progress = Math.round(((i + 1) / applicableQualities.length) * 100);
      db.prepare('UPDATE transcode_jobs SET progress = ? WHERE id = ?').run(progress, jobId);

      const result = await transcodeToQuality(inputPath, outputDir, quality);
      completedQualities.push(result);
    }

    // Generate master playlist
    const masterPlaylist = generateMasterPlaylist(outputDir, completedQualities);

    // Update job status
    db.prepare(`
      UPDATE transcode_jobs
      SET status = 'completed', progress = 100, qualities = ?, master_playlist = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(
      JSON.stringify(completedQualities.map(q => q.quality)),
      masterPlaylist,
      jobId
    );

    console.log(`[TRANSCODE] ${mediaId}: Complete — ${completedQualities.length} quality levels`);
    return { jobId, qualities: completedQualities, masterPlaylist };
  } catch (err) {
    console.error(`[TRANSCODE] ${mediaId}: Failed —`, err.message);
    db.prepare(`
      UPDATE transcode_jobs SET status = 'failed', error = ? WHERE id = ?
    `).run(err.message, jobId);
    throw err;
  }
}

/**
 * Get transcoding status for a media item
 */
export function getTranscodeStatus(mediaId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM transcode_jobs WHERE media_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(mediaId);
}

export { getVideoInfo, HLS_DIR };

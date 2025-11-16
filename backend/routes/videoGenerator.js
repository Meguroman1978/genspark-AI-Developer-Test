const express = require('express');
const router = express.Router();
const videoGeneratorService = require('../services/videoGeneratorService');

// Generate video endpoint
router.post('/generate', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.body.userId || 'default_user';
  const { theme, themeRomaji, referenceUrl, duration, videoTitle, videoDescription, privacyStatus, contentType, language, thumbnailBackground, videoFormat, videoService, visualMode } = req.body;

  // Validate input
  if (!theme || !duration) {
    return res.status(400).json({ error: 'Theme and duration are required' });
  }

  if (duration < 10 || duration > 120) {
    return res.status(400).json({ error: 'Duration must be between 10 and 120 seconds' });
  }

  // Get API keys
  db.get(
    'SELECT openai_key, elevenlabs_key, creatomate_key, creatomate_template_id, stability_ai_key, shotstack_key, youtube_credentials FROM api_keys WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    [userId],
    async (err, keys) => {
      if (err || !keys) {
        return res.status(400).json({ error: 'API keys not configured. Please set up your API keys first.' });
      }

      // Validate required keys
      if (!keys.openai_key || !keys.elevenlabs_key) {
        return res.status(400).json({ error: 'OpenAI and ElevenLabs API keys are required' });
      }

      // Create job record
      const now = new Date().toISOString();
      db.run(
        `INSERT INTO video_jobs (user_id, theme, duration, privacy_status, content_type, language, status, progress, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'processing', 'Starting...', ?, ?)`,
        [userId, theme, duration, privacyStatus || 'private', contentType || null, language || 'ja', now, now],
        function(err) {
          if (err) {
            console.error('Error creating video job:', err);
            return res.status(500).json({ error: 'Failed to create video job' });
          }

          const jobId = this.lastID;

          // Send immediate response with job ID
          res.json({
            jobId,
            message: 'Video generation started',
            status: 'processing'
          });

          // Start video generation in background
          videoGeneratorService.generateVideo({
            jobId,
            theme,
            themeRomaji: themeRomaji || null,  // ローマ字読み（オプション）
            referenceUrl: referenceUrl || null,  // 参照URL（オプション）
            duration,
            videoTitle: videoTitle || null,  // カスタムタイトル（オプション）
            videoDescription: videoDescription || null,  // カスタム説明文（オプション）
            privacyStatus: privacyStatus || 'private',
            contentType: contentType || null,
            language: language || 'ja',
            thumbnailBackground: thumbnailBackground || 'bg1_lantern_street',  // サムネイル背景
            videoFormat: videoFormat || 'normal',  // 'normal' (16:9) or 'shorts' (9:16)
            videoService: videoService || 'creatomate',  // 'creatomate', 'ffmpeg', or 'shotstack'
            visualMode: visualMode || 'images',  // 'images' (DALL-E) or 'stability-video' (Stability AI)
            keys: {
              openaiKey: keys.openai_key,
              elevenlabsKey: keys.elevenlabs_key,
              falAiKey: keys.fal_ai_key,
              creatomateKey: keys.creatomate_key,
              creatomateTemplateId: keys.creatomate_template_id,
              stabilityAiKey: keys.stability_ai_key,
              shotstackKey: keys.shotstack_key,
              youtubeCredentials: keys.youtube_credentials
            },
            db
          }).catch(error => {
            console.error('Video generation error:', error);
            db.run(
              'UPDATE video_jobs SET status = ?, error_message = ?, updated_at = ? WHERE id = ?',
              ['failed', error.message, new Date().toISOString(), jobId]
            );
          });
        }
      );
    }
  );
});

// Get job status
router.get('/status/:jobId', (req, res) => {
  const db = req.app.locals.db;
  const { jobId } = req.params;

  db.get(
    'SELECT id, theme, duration, status, progress, youtube_url, video_url, script_text, audio_url, image_urls, pexels_urls, error_message, created_at, updated_at FROM video_jobs WHERE id = ?',
    [jobId],
    (err, job) => {
      if (err) {
        console.error('Error fetching job status:', err);
        return res.status(500).json({ error: 'Failed to fetch job status' });
      }

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Parse JSON fields
      if (job.image_urls) {
        try {
          job.image_urls = JSON.parse(job.image_urls);
        } catch (e) {
          console.error('Error parsing image_urls:', e);
          job.image_urls = [];
        }
      }
      
      if (job.pexels_urls) {
        try {
          job.pexels_urls = JSON.parse(job.pexels_urls);
        } catch (e) {
          console.error('Error parsing pexels_urls:', e);
          job.pexels_urls = [];
        }
      }

      res.json(job);
    }
  );
});

// Get all jobs for user
router.get('/jobs', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.query.userId || 'default_user';

  db.all(
    'SELECT id, theme, duration, status, progress, youtube_url, video_url, script_text, audio_url, image_urls, pexels_urls, created_at FROM video_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 3',
    [userId],
    (err, jobs) => {
      if (err) {
        console.error('Error fetching jobs:', err);
        return res.status(500).json({ error: 'Failed to fetch jobs' });
      }

      res.json(jobs || []);
    }
  );
});

module.exports = router;

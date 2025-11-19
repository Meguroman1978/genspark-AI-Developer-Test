const express = require('express');
const router = express.Router();
const videoGeneratorService = require('../services/videoGeneratorService');

// Generate video endpoint
router.post('/generate', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.body.userId || 'default_user';
  const { theme, themeRomaji, referenceUrl, duration, imageCount, videoTitle, videoDescription, privacyStatus, contentType, language, thumbnailBackground, videoFormat, videoService, visualMode, bgmTrack, voiceType, narrationSpeed } = req.body;

  // Validate input
  if (!theme || !duration) {
    return res.status(400).json({ error: 'Theme and duration are required' });
  }

  if (duration < 10 || duration > 120) {
    return res.status(400).json({ error: 'Duration must be between 10 and 120 seconds' });
  }

  // Get API keys
  db.get(
    'SELECT openai_key, elevenlabs_key, fal_ai_key, creatomate_key, creatomate_template_id, stability_ai_key, shotstack_key, youtube_credentials FROM api_keys WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
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
            imageCount: imageCount || null,  // 画像生成枚数（null = 自動計算）
            videoTitle: videoTitle || null,  // カスタムタイトル（オプション）
            videoDescription: videoDescription || null,  // カスタム説明文（オプション）
            privacyStatus: privacyStatus || 'private',
            contentType: contentType || null,
            language: language || 'ja',
            thumbnailBackground: thumbnailBackground || 'bg1_lantern_street',  // サムネイル背景
            videoFormat: videoFormat || 'normal',  // 'normal' (16:9) or 'shorts' (9:16)
            videoService: videoService || 'creatomate',  // 'creatomate', 'ffmpeg', or 'shotstack'
            visualMode: visualMode || 'images',  // 'images' (DALL-E) or 'stability-video' (Stability AI)
            bgmTrack: bgmTrack || '陽だまりのリズム.mp3',  // BGM選択（デフォルト: 陽だまり）
            voiceType: voiceType || 'female',  // 'female' (女性) or 'male' (男性)
            narrationSpeed: narrationSpeed || 'normal',  // 'slow' (遅い), 'normal' (標準), or 'fast' (早口)
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
    'SELECT id, theme, duration, status, progress, youtube_url, video_url, script_text, audio_url, image_urls, pexels_urls, bgm_track, error_message, created_at, updated_at FROM video_jobs WHERE id = ?',
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

// BGM debugging endpoint - Extract and analyze BGM from video
router.get('/bgm-debug/:jobId', async (req, res) => {
  const db = req.app.locals.db;
  const { jobId } = req.params;
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const path = require('path');
  const fs = require('fs');
  
  const execPromise = promisify(exec);

  try {
    // Get job info
    db.get(
      'SELECT video_url, bgm_track FROM video_jobs WHERE id = ?',
      [jobId],
      async (err, job) => {
        if (err || !job) {
          return res.status(404).json({ error: 'Job not found' });
        }

        if (!job.video_url) {
          return res.status(404).json({ error: 'Video not yet generated' });
        }

        try {
          // Extract video filename from URL
          const videoFilename = job.video_url.split('/').pop();
          const videoPath = path.join(__dirname, '../../temp', videoFilename);

          if (!fs.existsSync(videoPath)) {
            return res.json({
              success: false,
              error: 'VIDEO_FILE_NOT_FOUND',
              message: 'Video file not found on server (may have been cleaned up)',
              bgmTrack: job.bgm_track || 'Unknown',
              videoUrl: job.video_url
            });
          }

          // Use ffprobe to check audio streams
          const { stdout: probeOutput } = await execPromise(
            `ffprobe -v quiet -print_format json -show_streams "${videoPath}"`
          );
          
          const probeData = JSON.parse(probeOutput);
          const audioStreams = probeData.streams.filter(s => s.codec_type === 'audio');
          
          console.log(`[BGM Debug ${jobId}] Audio streams found: ${audioStreams.length}`);
          
          if (audioStreams.length === 0) {
            return res.json({
              success: false,
              error: 'NO_AUDIO_STREAMS',
              message: 'No audio streams found in video',
              bgmTrack: job.bgm_track || 'Unknown',
              videoPath
            });
          }

          // Check if there are multiple audio streams (narration + BGM)
          if (audioStreams.length < 2) {
            return res.json({
              success: false,
              error: 'SINGLE_AUDIO_STREAM',
              message: 'Only one audio stream found - BGM may not be mixed properly',
              bgmTrack: job.bgm_track || 'Unknown',
              audioStreams: audioStreams.length,
              streamInfo: audioStreams.map(s => ({
                codec: s.codec_name,
                channels: s.channels,
                sampleRate: s.sample_rate
              }))
            });
          }

          // Extract BGM to temp file for playback
          const bgmOutputPath = path.join(__dirname, '../../temp', `bgm_${jobId}.mp3`);
          
          // Extract second audio stream (BGM) - Note: FFmpeg uses 0-based indexing for streams
          await execPromise(
            `ffmpeg -i "${videoPath}" -map 0:a:1 -c:a copy -y "${bgmOutputPath}"`
          );

          if (!fs.existsSync(bgmOutputPath)) {
            return res.json({
              success: false,
              error: 'BGM_EXTRACTION_FAILED',
              message: 'Failed to extract BGM stream from video',
              bgmTrack: job.bgm_track || 'Unknown',
              audioStreams: audioStreams.length
            });
          }

          // Return success with BGM URL
          const bgmUrl = `/temp/bgm_${jobId}.mp3`;
          return res.json({
            success: true,
            message: 'BGM successfully extracted from video',
            bgmTrack: job.bgm_track || 'Unknown',
            bgmUrl,
            audioStreams: audioStreams.length,
            streamInfo: audioStreams.map(s => ({
              codec: s.codec_name,
              channels: s.channels,
              sampleRate: s.sample_rate
            }))
          });

        } catch (error) {
          console.error(`[BGM Debug ${jobId}] Error:`, error);
          return res.json({
            success: false,
            error: 'EXTRACTION_ERROR',
            message: error.message,
            bgmTrack: job.bgm_track || 'Unknown'
          });
        }
      }
    );
  } catch (error) {
    console.error('BGM debug error:', error);
    res.status(500).json({ error: 'Failed to debug BGM' });
  }
});

module.exports = router;

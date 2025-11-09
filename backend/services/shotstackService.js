const axios = require('axios');

class ShotstackService {
  constructor() {
    this.baseUrl = 'https://api.shotstack.io/v1';
    this.stage = 'stage'; // Use 'v1' for production
  }

  async createVideo(config) {
    const { audioUrl, visualAssets, duration, theme, originalTheme, shotstackKey, jobId, publicUrl, language, thumbnailBackground, videoFormat } = config;
    const logPrefix = jobId ? `[Job ${jobId}]` : '[Shotstack]';
    const { getBackgroundConfig } = require('../config/backgroundConfig');

    try {
      console.log(`${logPrefix} 🎬 Creating video with Shotstack (20 free renders/month)...`);
      console.log(`${logPrefix} Audio URL: ${audioUrl}`);
      console.log(`${logPrefix} Visual assets: ${visualAssets.length}`);
      console.log(`${logPrefix} Duration: ${duration} seconds`);

      // Calculate timing
      const titleDuration = thumbnailBackground && thumbnailBackground !== 'none' ? 2 : 0;
      const contentDuration = duration;
      const safetyBuffer = 3;
      const totalDuration = titleDuration + contentDuration + safetyBuffer;

      console.log(`${logPrefix} Duration breakdown:`, {
        titleDuration,
        contentDuration,
        safetyBuffer,
        totalDuration
      });

      // Determine video format
      let width, height;
      if (videoFormat === 'shorts') {
        width = 1080;
        height = 1920;
      } else {
        width = 1920;
        height = 1080;
      }

      // Build Shotstack timeline
      const timeline = this.buildTimeline({
        audioUrl,
        visualAssets,
        titleDuration,
        contentDuration,
        totalDuration,
        theme: originalTheme || theme,
        publicUrl,
        language,
        thumbnailBackground,
        width,
        height,
        logPrefix
      });

      // Create render request
      const renderRequest = {
        timeline: timeline,
        output: {
          format: 'mp4',
          resolution: videoFormat === 'shorts' ? 'mobile' : 'hd',
          size: {
            width: width,
            height: height
          },
          fps: 30,
          quality: 'high'
        }
      };

      console.log(`${logPrefix} Sending render request to Shotstack...`);

      const response = await axios.post(
        `${this.baseUrl}/${this.stage}/render`,
        renderRequest,
        {
          headers: {
            'x-api-key': shotstackKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log(`${logPrefix} ✅ Render created successfully`);
      console.log(`${logPrefix} Render ID: ${response.data.response.id}`);

      // Wait for completion
      const videoUrl = await this.waitForRender(response.data.response.id, shotstackKey, jobId);
      console.log(`${logPrefix} ✅ Video completed: ${videoUrl}`);

      return videoUrl;
    } catch (error) {
      const errorDetail = this.parseError(error);
      console.error(`${logPrefix} ❌ Shotstack error:`, errorDetail);
      throw new Error(`Shotstack API failed: ${errorDetail.message}`);
    }
  }

  buildTimeline(config) {
    const { audioUrl, visualAssets, titleDuration, contentDuration, totalDuration, theme, publicUrl, language, thumbnailBackground, width, height, logPrefix } = config;
    const { getBackgroundConfig } = require('../config/backgroundConfig');

    const tracks = [];
    
    // Track 1: Audio track
    const audioTrack = {
      clips: [
        {
          asset: {
            type: 'audio',
            src: audioUrl
          },
          start: titleDuration,
          length: contentDuration + 3,
          volume: 1.0
        }
      ]
    };
    tracks.push(audioTrack);

    // Track 2: Visual assets (images)
    const imageCount = visualAssets.filter(a => a.type === 'image').length;
    const durationPerImage = (contentDuration + 3) / imageCount;

    const visualTrack = {
      clips: []
    };

    // Add title screen if background exists
    if (thumbnailBackground && thumbnailBackground !== 'none') {
      const bgConfig = getBackgroundConfig(thumbnailBackground);
      let titleBgUrl;
      if (bgConfig.filename === 'title_bg.jpg') {
        titleBgUrl = `${publicUrl}/temp/title_bg.jpg`;
      } else if (bgConfig.filename) {
        titleBgUrl = `${publicUrl}/temp/backgrounds/${bgConfig.filename}`;
      }

      if (titleBgUrl) {
        visualTrack.clips.push({
          asset: {
            type: 'image',
            src: titleBgUrl
          },
          start: 0,
          length: titleDuration,
          fit: 'cover',
          scale: 1.0,
          position: 'center'
        });
      }
    }

    // Add images
    let currentTime = titleDuration;
    visualAssets.forEach((asset, index) => {
      if (asset.type === 'image') {
        visualTrack.clips.push({
          asset: {
            type: 'image',
            src: asset.url
          },
          start: currentTime,
          length: durationPerImage,
          fit: 'cover',
          scale: 1.0,
          position: 'center'
        });
        currentTime += durationPerImage;
      }
    });

    tracks.push(visualTrack);

    // Track 3: Title text overlay (if title screen exists)
    if (thumbnailBackground && thumbnailBackground !== 'none') {
      const bgConfig = getBackgroundConfig(thumbnailBackground);
      const { toRomaji } = require('../utils/romajiConverter');
      const romajiTitle = toRomaji(theme);
      const capitalizedRomaji = romajiTitle
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      const textTrack = {
        clips: [
          // Japanese title
          {
            asset: {
              type: 'title',
              text: theme,
              style: 'minimal',
              color: bgConfig.textColor.fillColor,
              size: 'medium',
              background: 'transparent',
              position: 'center'
            },
            start: 0,
            length: titleDuration,
            position: 'center',
            offset: {
              x: 0,
              y: -0.1
            }
          },
          // Romaji title
          {
            asset: {
              type: 'title',
              text: capitalizedRomaji,
              style: 'minimal',
              color: bgConfig.textColor.fillColor,
              size: 'small',
              background: 'transparent',
              position: 'center'
            },
            start: 0,
            length: titleDuration,
            position: 'center',
            offset: {
              x: 0,
              y: 0.05
            }
          }
        ]
      };

      tracks.push(textTrack);
    }

    return {
      background: '#000000',
      tracks: tracks
    };
  }

  async waitForRender(renderId, apiKey, jobId, maxAttempts = 60) {
    const logPrefix = jobId ? `[Job ${jobId}]` : '[Shotstack]';

    console.log(`${logPrefix} ⏳ Waiting for render to complete...`);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/${this.stage}/render/${renderId}`,
          {
            headers: {
              'x-api-key': apiKey
            }
          }
        );

        const status = response.data.response.status;
        console.log(`${logPrefix} Render status (${i + 1}/${maxAttempts}): ${status}`);

        if (status === 'done') {
          console.log(`${logPrefix} ✅ Render succeeded!`);
          const videoUrl = response.data.response.url;
          console.log(`${logPrefix} Video URL: ${videoUrl}`);
          return videoUrl;
        } else if (status === 'failed') {
          const errorMsg = response.data.response.error || 'Unknown error';
          console.error(`${logPrefix} ❌ Render failed: ${errorMsg}`);
          throw new Error(`Render failed: ${errorMsg}`);
        }

        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`${logPrefix} ⚠️ Error checking render status (attempt ${i + 1}/${maxAttempts}):`, error.message);

        if (i === maxAttempts - 1) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    throw new Error(`Render timeout: Video did not complete within ${maxAttempts * 5} seconds`);
  }

  parseError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      let message = 'Unknown error';
      if (typeof data === 'object') {
        message = data.message || data.error || JSON.stringify(data);
      } else {
        message = String(data);
      }

      switch (status) {
        case 401:
          return {
            code: 401,
            message: 'Invalid API key. Please check your Shotstack API key.'
          };
        case 429:
          return {
            code: 429,
            message: 'Rate limit exceeded. Free tier: 20 renders/month.'
          };
        default:
          return {
            code: status,
            message: `Shotstack API error (${status}): ${message}`
          };
      }
    } else {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'Unknown error occurred'
      };
    }
  }
}

module.exports = new ShotstackService();

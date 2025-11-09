const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');

const execPromise = promisify(exec);

class FFmpegService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async createVideo(config) {
    const { audioUrl, visualAssets, duration, theme, originalTheme, publicUrl, language, thumbnailBackground, videoFormat, jobId } = config;
    const logPrefix = jobId ? `[Job ${jobId}]` : '[FFmpeg]';
    const { getBackgroundConfig } = require('../config/backgroundConfig');

    try {
      console.log(`${logPrefix} 🎬 Creating video with FFmpeg (FREE alternative)...`);
      console.log(`${logPrefix} Audio URL: ${audioUrl}`);
      console.log(`${logPrefix} Visual assets: ${visualAssets.length}`);
      console.log(`${logPrefix} Duration: ${duration} seconds`);
      console.log(`${logPrefix} Format: ${videoFormat}`);

      // Download audio file
      console.log(`${logPrefix} Downloading audio...`);
      const audioPath = await this.downloadFile(audioUrl, 'audio.mp3');
      console.log(`${logPrefix} ✅ Audio downloaded: ${audioPath}`);

      // Download images
      console.log(`${logPrefix} Downloading ${visualAssets.length} images...`);
      const imagePaths = [];
      for (let i = 0; i < visualAssets.length; i++) {
        if (visualAssets[i].type === 'image') {
          const imagePath = await this.downloadFile(visualAssets[i].url, `image_${i}.jpg`);
          imagePaths.push(imagePath);
        }
      }
      console.log(`${logPrefix} ✅ Downloaded ${imagePaths.length} images`);

      // Download title background if specified
      let titleBgPath = null;
      if (thumbnailBackground && thumbnailBackground !== 'none') {
        const bgConfig = getBackgroundConfig(thumbnailBackground);
        let titleBgUrl;
        if (bgConfig.filename === 'title_bg.jpg') {
          titleBgUrl = `${publicUrl}/temp/title_bg.jpg`;
        } else if (bgConfig.filename) {
          titleBgUrl = `${publicUrl}/temp/backgrounds/${bgConfig.filename}`;
        }
        
        if (titleBgUrl) {
          console.log(`${logPrefix} Downloading title background...`);
          titleBgPath = await this.downloadFile(titleBgUrl, 'title_bg.jpg');
          console.log(`${logPrefix} ✅ Title background downloaded`);
        }
      }

      // Determine video dimensions
      let width, height;
      if (videoFormat === 'shorts') {
        width = 1080;
        height = 1920;
      } else {
        width = 1920;
        height = 1080;
      }

      console.log(`${logPrefix} Video dimensions: ${width}x${height}`);

      // Calculate timing
      const titleDuration = titleBgPath ? 2 : 0; // 2 seconds for title screen if background exists
      const contentDuration = duration;
      const safetyBuffer = 3;
      const totalDuration = titleDuration + contentDuration + safetyBuffer;

      console.log(`${logPrefix} Duration breakdown:`, {
        titleDuration,
        contentDuration,
        safetyBuffer,
        totalDuration
      });

      // Generate video with FFmpeg
      const outputPath = path.join(this.tempDir, `video_${Date.now()}.mp4`);
      
      await this.generateVideoWithFFmpeg({
        imagePaths,
        audioPath,
        titleBgPath,
        outputPath,
        width,
        height,
        titleDuration,
        contentDuration,
        totalDuration,
        theme: originalTheme || theme,
        logPrefix
      });

      console.log(`${logPrefix} ✅ Video generated: ${outputPath}`);

      // Upload to temporary location and return URL
      const videoUrl = `${publicUrl}/temp/${path.basename(outputPath)}`;
      console.log(`${logPrefix} ✅ Video URL: ${videoUrl}`);

      // Cleanup downloaded files
      this.cleanupFiles([audioPath, ...imagePaths, titleBgPath]);

      return videoUrl;
    } catch (error) {
      console.error(`${logPrefix} ❌ FFmpeg error:`, error);
      throw new Error(`FFmpeg video generation failed: ${error.message}`);
    }
  }

  async generateVideoWithFFmpeg(config) {
    const { imagePaths, audioPath, titleBgPath, outputPath, width, height, titleDuration, contentDuration, totalDuration, theme, logPrefix } = config;

    // Create filter complex for FFmpeg
    const imageCount = imagePaths.length;
    const durationPerImage = (contentDuration + 3) / imageCount; // Add safety buffer to image duration

    let filterComplex = '';
    let inputs = [];

    // Add title screen if background exists
    let videoStartIndex = 0;
    if (titleBgPath) {
      inputs.push(`-loop 1 -t ${titleDuration} -i "${titleBgPath}"`);
      filterComplex += `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[title];`;
      videoStartIndex = 1;
    }

    // Add images
    for (let i = 0; i < imagePaths.length; i++) {
      const inputIndex = videoStartIndex + i;
      inputs.push(`-loop 1 -t ${durationPerImage} -i "${imagePaths[i]}"`);
      filterComplex += `[${inputIndex}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[img${i}];`;
    }

    // Concatenate all video segments
    if (titleBgPath) {
      filterComplex += `[title]`;
      for (let i = 0; i < imageCount; i++) {
        filterComplex += `[img${i}]`;
      }
      filterComplex += `concat=n=${imageCount + 1}:v=1:a=0[video];`;
    } else {
      for (let i = 0; i < imageCount; i++) {
        filterComplex += `[img${i}]`;
      }
      filterComplex += `concat=n=${imageCount}:v=1:a=0[video];`;
    }

    // Add audio with delay if title exists
    const audioIndex = videoStartIndex + imageCount;
    inputs.push(`-i "${audioPath}"`);
    if (titleBgPath) {
      filterComplex += `[${audioIndex}:a]adelay=${titleDuration * 1000}|${titleDuration * 1000},volume=10dB[audio]`;
    } else {
      filterComplex += `[${audioIndex}:a]volume=10dB[audio]`;
    }

    // Build FFmpeg command
    const ffmpegCommand = `ffmpeg ${inputs.join(' ')} \
      -filter_complex "${filterComplex}" \
      -map "[video]" -map "[audio]" \
      -c:v libx264 -preset fast -crf 22 \
      -c:a aac -b:a 192k \
      -t ${totalDuration} \
      -y "${outputPath}"`;

    console.log(`${logPrefix} Executing FFmpeg command...`);
    console.log(`${logPrefix} Command preview: ffmpeg [${inputs.length} inputs] -filter_complex [...] -t ${totalDuration} "${outputPath}"`);

    try {
      const { stdout, stderr } = await execPromise(ffmpegCommand, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      if (stderr && !stderr.includes('frame=')) {
        console.log(`${logPrefix} FFmpeg output:`, stderr.substring(0, 500));
      }
      
      console.log(`${logPrefix} ✅ FFmpeg execution completed`);
    } catch (error) {
      console.error(`${logPrefix} ❌ FFmpeg execution error:`, error.message);
      throw error;
    }
  }

  async downloadFile(url, filename) {
    const filepath = path.join(this.tempDir, filename);
    
    try {
      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 60000
      });

      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filepath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`Error downloading file ${url}:`, error.message);
      throw error;
    }
  }

  cleanupFiles(filePaths) {
    filePaths.forEach(filepath => {
      if (filepath && fs.existsSync(filepath)) {
        try {
          fs.unlinkSync(filepath);
        } catch (error) {
          console.error(`Error deleting file ${filepath}:`, error.message);
        }
      }
    });
  }
}

module.exports = new FFmpegService();

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
    const { audioUrl, visualAssets, duration, theme, originalTheme, publicUrl, language, thumbnailBackground, videoFormat, jobId, bgmUrl, narrationText } = config;
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

      // Download BGM if provided (default BGM always used)
      let bgmPath = null;
      if (bgmUrl) {
        console.log(`${logPrefix} Downloading custom BGM...`);
        bgmPath = await this.downloadFile(bgmUrl, 'bgm_custom.mp3');
        console.log(`${logPrefix} ✅ Custom BGM downloaded`);
      } else {
        // Use default BGM
        bgmPath = path.join(this.tempDir, 'bgm_default.mp3');
        if (fs.existsSync(bgmPath)) {
          console.log(`${logPrefix} Using default BGM`);
        } else {
          console.log(`${logPrefix} ⚠️ Default BGM not found, skipping BGM`);
          bgmPath = null;
        }
      }

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
        const bgConfig = getBackgroundConfig(thumbnailBackground, videoFormat);
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

      // Get background config for text color
      const bgConfig = getBackgroundConfig(thumbnailBackground, videoFormat);

      // Generate video with FFmpeg
      const outputPath = path.join(this.tempDir, `video_${Date.now()}.mp4`);
      
      await this.generateVideoWithFFmpeg({
        imagePaths,
        audioPath,
        bgmPath,
        titleBgPath,
        outputPath,
        width,
        height,
        titleDuration,
        contentDuration,
        totalDuration,
        theme: originalTheme || theme,
        bgConfig,
        narrationText,
        logPrefix
      });

      console.log(`${logPrefix} ✅ Video generated: ${outputPath}`);

      // Upload to temporary location and return URL
      const videoUrl = `${publicUrl}/temp/${path.basename(outputPath)}`;
      console.log(`${logPrefix} ✅ Video URL: ${videoUrl}`);

      // Cleanup downloaded files (keep bgm_default.mp3, only clean custom BGM)
      const filesToClean = [audioPath, ...imagePaths, titleBgPath];
      if (bgmPath && bgmPath.includes('bgm_custom')) {
        filesToClean.push(bgmPath);
      }
      this.cleanupFiles(filesToClean);

      return videoUrl;
    } catch (error) {
      console.error(`${logPrefix} ❌ FFmpeg error:`, error);
      throw new Error(`FFmpeg video generation failed: ${error.message}`);
    }
  }

  async generateVideoWithFFmpeg(config) {
    const { imagePaths, audioPath, bgmPath, titleBgPath, outputPath, width, height, titleDuration, contentDuration, totalDuration, theme, bgConfig, narrationText, logPrefix } = config;

    // Create filter complex for FFmpeg
    const imageCount = imagePaths.length;
    const durationPerImage = (contentDuration + 3) / imageCount; // Add safety buffer to image duration

    let filterComplex = '';
    let inputs = [];

    // Add title screen if background exists
    let videoStartIndex = 0;
    if (titleBgPath) {
      inputs.push(`-loop 1 -t ${titleDuration} -i "${titleBgPath}"`);
      
      // Prepare text overlay parameters for Japanese font
      const channelFontsize = height > 1080 ? 48 : 36; // Channel name font size
      const titleFontsize = height > 1080 ? 72 : 54; // Title font size
      const romajiFontsize = height > 1080 ? 48 : 36; // Romaji font size
      
      const escapedTheme = this.escapeFFmpegText(theme);
      const escapedChannel = this.escapeFFmpegText('Kotowaza Channel');
      
      const fillColor = bgConfig.textColor.fillColor.replace('#', '0x');
      const strokeColor = bgConfig.textColor.strokeColor.replace('#', '0x');
      const strokeWidth = bgConfig.textColor.strokeWidth;
      
      // Japanese font path
      const japaneseFont = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';
      const englishFont = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
      
      // Convert theme to romaji for subtitle
      const { toRomaji } = require('../utils/romajiConverter');
      const romajiTheme = toRomaji(theme);
      const escapedRomaji = this.escapeFFmpegText(romajiTheme);
      
      // Add multiple text overlays:
      // 1. Channel name at top
      // 2. Japanese title in center
      // 3. Romaji subtitle below title
      filterComplex += `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,`;
      filterComplex += `drawtext=text='${escapedChannel}':fontfile=${englishFont}:fontsize=${channelFontsize}:fontcolor=${fillColor}:borderw=${strokeWidth}:bordercolor=${strokeColor}:x=(w-text_w)/2:y=h*0.1,`;
      filterComplex += `drawtext=text='${escapedTheme}':fontfile=${japaneseFont}:fontsize=${titleFontsize}:fontcolor=${fillColor}:borderw=${strokeWidth}:bordercolor=${strokeColor}:x=(w-text_w)/2:y=(h-text_h)/2-${romajiFontsize},`;
      filterComplex += `drawtext=text='${escapedRomaji}':fontfile=${englishFont}:fontsize=${romajiFontsize}:fontcolor=${fillColor}:borderw=${strokeWidth}:bordercolor=${strokeColor}:x=(w-text_w)/2:y=(h+text_h)/2+${romajiFontsize*0.5},`;
      filterComplex += `setsar=1,fps=30[title];`;
      videoStartIndex = 1;
    }

    // Split narration text into chunks for subtitle display
    const narrationChunks = this.splitNarrationIntoChunks(narrationText, imageCount);
    
    // Font settings for narration subtitles
    const subtitleFontsize = height > 1080 ? 32 : 24;
    const japaneseFont = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';
    const subtitleFillColor = '0xffffff'; // White text
    const subtitleStrokeColor = '0x000000'; // Black stroke
    const subtitleStrokeWidth = 3;
    
    // Add images with subtitle overlays
    for (let i = 0; i < imagePaths.length; i++) {
      const inputIndex = videoStartIndex + i;
      inputs.push(`-loop 1 -t ${durationPerImage} -i "${imagePaths[i]}"`);
      
      // Get narration chunk for this image
      const chunkText = narrationChunks[i] || '';
      
      // Add image with subtitle overlay at bottom
      if (chunkText) {
        // Escape text for FFmpeg drawtext filter
        // Replace problematic characters that cause FFmpeg errors
        const escapedChunk = this.escapeFFmpegText(chunkText);
        
        filterComplex += `[${inputIndex}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,`;
        filterComplex += `drawtext=text='${escapedChunk}':fontfile=${japaneseFont}:fontsize=${subtitleFontsize}:fontcolor=${subtitleFillColor}:borderw=${subtitleStrokeWidth}:bordercolor=${subtitleStrokeColor}:x=(w-text_w)/2:y=h-${subtitleFontsize*3}:box=1:boxcolor=0x000000@0.5:boxborderw=10,`;
        filterComplex += `setsar=1,fps=30[img${i}];`;
      } else {
        filterComplex += `[${inputIndex}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[img${i}];`;
      }
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

    // Add audio mixing (narration + BGM)
    const audioIndex = videoStartIndex + imageCount;
    inputs.push(`-i "${audioPath}"`);
    
    if (bgmPath && fs.existsSync(bgmPath)) {
      // Add BGM as another input
      const bgmIndex = audioIndex + 1;
      inputs.push(`-i "${bgmPath}"`);
      
      // Mix narration (volume boosted) with BGM (reduced volume)
      if (titleBgPath) {
        // Delay narration to start after title screen
        filterComplex += `[${audioIndex}:a]adelay=${titleDuration * 1000}|${titleDuration * 1000},volume=10dB[narration];`;
        filterComplex += `[${bgmIndex}:a]volume=0.15[bgm];`; // BGM at 15% volume to not interfere with narration
        filterComplex += `[narration][bgm]amix=inputs=2:duration=longest:normalize=0[audio]`;
      } else {
        filterComplex += `[${audioIndex}:a]volume=10dB[narration];`;
        filterComplex += `[${bgmIndex}:a]volume=0.15[bgm];`;
        filterComplex += `[narration][bgm]amix=inputs=2:duration=longest:normalize=0[audio]`;
      }
    } else {
      // No BGM, just narration
      if (titleBgPath) {
        filterComplex += `[${audioIndex}:a]adelay=${titleDuration * 1000}|${titleDuration * 1000},volume=10dB[audio]`;
      } else {
        filterComplex += `[${audioIndex}:a]volume=10dB[audio]`;
      }
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

  splitNarrationIntoChunks(narrationText, chunkCount) {
    if (!narrationText || chunkCount === 0) {
      return [];
    }

    // Split by sentences (period, question mark, exclamation mark)
    const sentences = narrationText.split(/([。！？\.!?])/g).filter(s => s.trim());
    
    // Recombine sentence parts
    const fullSentences = [];
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      if (sentence.trim()) {
        fullSentences.push(sentence.trim());
      }
    }

    // Distribute sentences across chunks
    const chunks = [];
    const sentencesPerChunk = Math.ceil(fullSentences.length / chunkCount);
    
    for (let i = 0; i < chunkCount; i++) {
      const start = i * sentencesPerChunk;
      const end = Math.min(start + sentencesPerChunk, fullSentences.length);
      const chunkText = fullSentences.slice(start, end).join(' ');
      
      // Limit to 100 characters for readability
      if (chunkText.length > 100) {
        chunks.push(chunkText.substring(0, 97) + '...');
      } else {
        chunks.push(chunkText);
      }
    }

    return chunks;
  }

  escapeFFmpegText(text) {
    if (!text) return '';
    
    // FFmpeg drawtext filter escaping rules:
    // 1. Backslashes must be escaped first
    // 2. Single quotes need special handling
    // 3. Colons need escaping
    // 4. Replace problematic characters
    
    return text
      .replace(/\\/g, '\\\\\\\\')           // Escape backslashes
      .replace(/'/g, "'\\\\\\\\\\\\''")     // Escape single quotes (complex due to shell + FFmpeg)
      .replace(/"/g, '\\\\"')               // Escape double quotes
      .replace(/:/g, '\\:')                 // Escape colons
      .replace(/\n/g, ' ')                  // Replace newlines with spaces
      .replace(/\r/g, '')                   // Remove carriage returns
      .replace(/\[/g, '\\[')                // Escape square brackets
      .replace(/\]/g, '\\]')                // Escape square brackets
      .replace(/%/g, '\\%');                // Escape percent signs
  }
}

module.exports = new FFmpegService();

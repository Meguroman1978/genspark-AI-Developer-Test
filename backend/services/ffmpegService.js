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
    const { audioUrl, visualAssets, duration, theme, originalTheme, publicUrl, language, thumbnailBackground, videoFormat, jobId, bgmUrl, bgmPath: configBgmPath, narrationText, visualMode } = config;
    const logPrefix = jobId ? `[Job ${jobId}]` : '[FFmpeg]';

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

      // Handle BGM: use configBgmPath (local file from assets/bgm) or bgmUrl (remote file)
      let bgmPath = null;
      console.log(`${logPrefix} 🔍 BGM Configuration Debug:`);
      console.log(`${logPrefix}   - configBgmPath: ${configBgmPath}`);
      console.log(`${logPrefix}   - bgmUrl: ${bgmUrl}`);
      
      if (configBgmPath && fs.existsSync(configBgmPath)) {
        // Use provided local BGM path (from backend/assets/bgm directory)
        bgmPath = configBgmPath;
        console.log(`${logPrefix} 🎵 Using BGM track: ${path.basename(bgmPath)}`);
        console.log(`${logPrefix}   - Full path: ${bgmPath}`);
        console.log(`${logPrefix}   - File exists: ${fs.existsSync(bgmPath)}`);
        console.log(`${logPrefix}   - File size: ${fs.statSync(bgmPath).size} bytes`);
      } else if (bgmUrl) {
        // Download BGM from URL (legacy support)
        console.log(`${logPrefix} Downloading custom BGM from URL...`);
        bgmPath = await this.downloadFile(bgmUrl, 'bgm_custom.mp3');
        console.log(`${logPrefix} ✅ Custom BGM downloaded`);
      } else {
        // No BGM provided - this should not happen with new system
        console.error(`${logPrefix} ❌ ERROR: No BGM path provided! Expected bgmPath in config.`);
        console.log(`${logPrefix}   - configBgmPath is: ${configBgmPath}`);
        console.log(`${logPrefix}   - bgmUrl is: ${bgmUrl}`);
        console.log(`${logPrefix} ⚠️ Video will be created without background music`);
        bgmPath = null;
      }

      // Download images (filter out Pexels videos for now, focus on DALL-E images)
      console.log(`${logPrefix} Downloading ${visualAssets.length} visual assets...`);
      const imagePaths = [];
      for (let i = 0; i < visualAssets.length; i++) {
        const asset = visualAssets[i];
        // Only download images, skip Pexels videos (future enhancement)
        if (asset.type === 'image') {
          const imagePath = await this.downloadFile(asset.url, `image_${i}.jpg`);
          imagePaths.push(imagePath);
        } else {
          console.log(`${logPrefix} Skipping ${asset.type} asset at index ${i} (not yet supported in FFmpeg service)`);
        }
      }
      console.log(`${logPrefix} ✅ Downloaded ${imagePaths.length} images`);

      // Use local title background image (ALWAYS auto-selected based on format)
      const titleBgDir = path.join(__dirname, '../assets/title_images');
      
      // Auto-select title background if not provided or is 'none'
      let selectedTitleBg = thumbnailBackground;
      if (!thumbnailBackground || thumbnailBackground === 'none') {
        selectedTitleBg = videoFormat === 'shorts' 
          ? 'thumbnail_portrait.png'  // 縦長用 (Portrait/Vertical)
          : 'thumbnail_landscape.png';  // 横長用 (Landscape/Horizontal)
        console.log(`${logPrefix} 🖼️  Auto-selected title background: ${selectedTitleBg} for ${videoFormat} format`);
      }
      
      // Normalize Unicode (NFD/NFC) to match filesystem
      const normalizedFilename = selectedTitleBg.normalize('NFC');
      
      // Find the actual file (handles Unicode normalization issues)
      let actualTitleBgFile = normalizedFilename;
      try {
        const files = fs.readdirSync(titleBgDir);
        const matchedFile = files.find(f => f.normalize('NFC') === normalizedFilename);
        if (matchedFile) {
          actualTitleBgFile = matchedFile;
          console.log(`${logPrefix} 🖼️  Title background file matched: ${matchedFile}`);
        }
      } catch (err) {
        console.error(`${logPrefix} Error reading title images directory:`, err);
      }
      
      const localTitleBgPath = path.join(titleBgDir, actualTitleBgFile);
      let titleBgPath = null;
      if (fs.existsSync(localTitleBgPath)) {
        titleBgPath = localTitleBgPath;
        console.log(`${logPrefix} 🖼️  Using local title background: ${selectedTitleBg}`);
        console.log(`${logPrefix}   - Path: ${titleBgPath}`);
        console.log(`${logPrefix}   - File size: ${fs.statSync(titleBgPath).size} bytes`);
      } else {
        console.error(`${logPrefix} ❌ Title background not found: ${localTitleBgPath}`);
        console.log(`${logPrefix}    Checked normalized filename: ${actualTitleBgFile}`);
        console.log(`${logPrefix}    Available files:`, fs.readdirSync(titleBgDir));
        
        // CRITICAL: Try to find ANY thumbnail file as fallback
        const availableFiles = fs.readdirSync(titleBgDir);
        
        // Enhanced fallback logic: support both English and Japanese filenames
        let fallbackFile = null;
        
        if (videoFormat === 'shorts') {
          // Try multiple patterns for portrait/vertical format
          fallbackFile = availableFiles.find(f => 
            (f.includes('portrait') || f.includes('縦長')) && f.endsWith('.png')
          );
          console.log(`${logPrefix} 🔍 Searching for portrait/縦長 thumbnail...`);
        } else {
          // Try multiple patterns for landscape/horizontal format
          fallbackFile = availableFiles.find(f => 
            (f.includes('landscape') || f.includes('横長')) && f.endsWith('.png')
          );
          console.log(`${logPrefix} 🔍 Searching for landscape/横長 thumbnail...`);
        }
        
        if (fallbackFile) {
          titleBgPath = path.join(titleBgDir, fallbackFile);
          console.log(`${logPrefix} ✅ Found fallback thumbnail: ${fallbackFile}`);
          console.log(`${logPrefix}   - Fallback path: ${titleBgPath}`);
          console.log(`${logPrefix}   - File size: ${fs.statSync(titleBgPath).size} bytes`);
        } else {
          console.error(`${logPrefix} ❌❌❌ CRITICAL: No ${videoFormat} thumbnail files found!`);
          console.error(`${logPrefix}    Video format: ${videoFormat}`);
          console.error(`${logPrefix}    Required: ${videoFormat === 'shorts' ? 'portrait or 縦長' : 'landscape or 横長'}`);
          console.error(`${logPrefix}    Available files:`, availableFiles);
        }
      }
      
      // ABSOLUTE REQUIREMENT: Title background MUST be set
      if (!titleBgPath) {
        throw new Error(`CRITICAL ERROR: Title background is required but not found. Video format: ${videoFormat}, Directory: ${titleBgDir}`);
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

      // Calculate timing with proper buffer to avoid cutting off audio
      const titleDuration = titleBgPath ? 3 : 0; // 3 seconds for title screen if background exists
      const contentDuration = duration;
      const endBuffer = 3; // Minimum 3 seconds buffer at the end
      const totalDuration = titleDuration + contentDuration + endBuffer;
      
      console.log(`${logPrefix} ⏱️  Timing calculation:`);
      console.log(`${logPrefix}   - Title duration: ${titleDuration}s`);
      console.log(`${logPrefix}   - Content duration: ${contentDuration}s`);
      console.log(`${logPrefix}   - End buffer: ${endBuffer}s`);
      console.log(`${logPrefix}   - Total video duration: ${totalDuration}s`);

      console.log(`${logPrefix} Duration breakdown:`, {
        titleDuration,
        contentDuration,
        endBuffer,
        totalDuration
      });

      // Simple background config for text color (white text on dark background)
      const bgConfig = {
        textColor: {
          fillColor: 'white',
          strokeColor: 'black',
          strokeWidth: 2
        }
      };

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
        language: language || 'ja', // Pass language for font selection
        visualMode: visualMode || 'static', // Default to static if not specified
        logPrefix
      });

      console.log(`${logPrefix} ✅ Video generated: ${outputPath}`);

      // Upload to temporary location and return URL
      const videoUrl = `${publicUrl}/temp/${path.basename(outputPath)}`;
      console.log(`${logPrefix} ✅ Video URL: ${videoUrl}`);

      // Cleanup downloaded files (keep local BGM files from assets/bgm directory)
      const filesToClean = [audioPath, ...imagePaths, titleBgPath];
      // Only clean downloaded BGM files (not local assets)
      if (bgmPath && (bgmPath.includes('bgm_custom') || bgmPath.includes(this.tempDir))) {
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
    const { imagePaths, audioPath, bgmPath, titleBgPath, outputPath, width, height, titleDuration, contentDuration, totalDuration, theme, bgConfig, narrationText, language, visualMode, logPrefix } = config;

    console.log(`${logPrefix} 🎬 Starting FFmpeg video generation`);
    console.log(`${logPrefix}    Title background: ${titleBgPath ? '✅ YES' : '❌ NO'}`);
    console.log(`${logPrefix}    Title duration: ${titleDuration}s`);
    console.log(`${logPrefix}    Title bg path: ${titleBgPath || 'NOT SET'}`);

    // Create filter complex for FFmpeg
    const imageCount = imagePaths.length;
    // Extend image duration to cover full audio + buffer
    const durationPerImage = (contentDuration + 3) / imageCount;

    let filterComplex = '';
    let inputs = [];

    // Add title screen if background exists
    let videoStartIndex = 0;
    if (titleBgPath) {
      console.log(`${logPrefix} 📺 Adding title screen (${titleDuration}s) with background: ${titleBgPath}`);
      inputs.push(`-loop 1 -t ${titleDuration} -i "${titleBgPath}"`);
      
      // Prepare text overlay parameters for theme text only (NO channel name)
      const titleFontsize = height > 1080 ? 72 : 54; // Japanese theme font size
      const romajiFontsize = height > 1080 ? 48 : 36; // English/Romaji font size
      
      const escapedTheme = this.escapeFFmpegText(theme);
      
      const fillColor = bgConfig.textColor.fillColor.replace('#', '0x');
      const strokeColor = bgConfig.textColor.strokeColor.replace('#', '0x');
      const strokeWidth = bgConfig.textColor.strokeWidth;
      
      // Japanese font path
      const japaneseFont = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';
      // Use Liberation Sans for romaji to prevent garbled characters (better Unicode support than DejaVu)
      const englishFont = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
      
      // Convert theme to romaji for subtitle
      const { toRomaji } = require('../utils/romajiConverter');
      const romajiTheme = toRomaji(theme);
      const escapedRomaji = this.escapeFFmpegText(romajiTheme);
      
      // Title screen with background image and theme text overlays ONLY
      // Scale background to exact dimensions, fill screen completely (no black bars)
      filterComplex += `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},`;
      // Japanese theme text centered vertically (slightly above center)
      filterComplex += `drawtext=text='${escapedTheme}':fontfile=${japaneseFont}:fontsize=${titleFontsize}:fontcolor=${fillColor}:borderw=${strokeWidth}:bordercolor=${strokeColor}:x=(w-text_w)/2:y=(h-text_h)/2-${romajiFontsize},`;
      // English/Romaji theme text below Japanese text
      filterComplex += `drawtext=text='${escapedRomaji}':fontfile=${englishFont}:fontsize=${romajiFontsize}:fontcolor=${fillColor}:borderw=${strokeWidth}:bordercolor=${strokeColor}:x=(w-text_w)/2:y=(h+text_h)/2+${romajiFontsize*0.5},`;
      filterComplex += `setsar=1,fps=30[title];`;
      
      videoStartIndex = 1; // Only title bg (0) = images start at 1
      console.log(`${logPrefix} ✅ Title screen filter created, videoStartIndex set to ${videoStartIndex}`);
    } else {
      console.error(`${logPrefix} ❌❌❌ CRITICAL: Title screen is being SKIPPED!`);
      console.error(`${logPrefix}    This should NEVER happen as titleBgPath should always be set`);
    }

    // Split narration text into chunks for subtitle display
    const narrationChunks = this.splitNarrationIntoChunks(narrationText, imageCount, language);
    
    // Font settings for narration subtitles - DOUBLED size for better visibility
    // Previous: 39/29 → New (2x): 78/58
    const subtitleFontsize = height > 1080 ? 78 : 58; // 2x larger for better readability
    
    // Fonts: English uses handwriting font, Japanese/Chinese use IPAGothic or Noto Sans CJK JP
    const englishSubtitleFont = path.join(__dirname, '../assets/fonts/handwriting.ttf');
    // Use IPAGothic as primary Japanese font (more reliable than Noto Sans CJK)
    const japaneseSubtitleFont = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf';
    // Fallback to Noto Sans CJK JP if IPAGothic not available
    const japaneseSubtitleFontFallback = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';
    
    // Check if custom English font exists, fallback to default
    const subtitleEnglishFont = fs.existsSync(englishSubtitleFont) 
      ? englishSubtitleFont 
      : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
    
    // Check if Japanese font exists, fallback to Noto Sans CJK JP
    const subtitleJapaneseFont = fs.existsSync(japaneseSubtitleFont)
      ? japaneseSubtitleFont
      : japaneseSubtitleFontFallback;
    
    console.log(`${logPrefix}    Subtitle fonts: English=${subtitleEnglishFont}, Japanese=${subtitleJapaneseFont}`);
    
    const subtitleFillColor = '0xFFFFFF'; // Bright white text
    const subtitleStrokeColor = '0x000000'; // Black stroke
    const subtitleStrokeWidth = 6; // Even thicker stroke for contrast
    
    // Add images with subtitle overlays
    console.log(`${logPrefix} 🖼️  Processing ${imagePaths.length} images, videoStartIndex=${videoStartIndex}`);
    console.log(`${logPrefix}    Subtitle chunks: ${narrationChunks.length}`);
    
    // Check if we should use crossfade effect
    const useCrossfade = (visualMode === 'crossfade');
    console.log(`${logPrefix}    Visual mode: ${visualMode}, useCrossfade: ${useCrossfade}`);
    
    for (let i = 0; i < imagePaths.length; i++) {
      const inputIndex = videoStartIndex + i;
      inputs.push(`-loop 1 -t ${durationPerImage} -i "${imagePaths[i]}"`);
      
      // Get narration chunk for this image
      const chunkText = narrationChunks[i] || '';
      console.log(`${logPrefix}    Image ${i}: input[${inputIndex}], chunk="${chunkText.substring(0, 30)}..."`);
      
      // Add image with optional crossfade + zoom effect
      // Crossfade effect is applied if visualMode is 'crossfade'
      const useCrossfade = (visualMode === 'crossfade');
      
      let imageFilter = '';
      if (useCrossfade) {
        // Crossfade + Zoom effect: gentle zoom with smooth transitions
        const frameDuration = Math.floor(durationPerImage * 30);
        // Simple zoom in effect (1.0 to 1.08 scale over duration)
        // CRITICAL: Must output EXACTLY ${width}x${height} to avoid black bars
        // Step 1: Scale to slightly larger size, preserving aspect ratio
        // Step 2: Crop to exact dimensions
        // Step 3: Apply zoom effect with exact output size
        imageFilter = `scale=${width * 1.15}:${height * 1.15}:force_original_aspect_ratio=increase,crop=${width * 1.15}:${height * 1.15},zoompan=z='min(1.0+on*0.0008,1.08)':d=${frameDuration}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height},scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
      } else {
        // Static image mode: force exact size to fill screen completely
        // CRITICAL: Must output EXACTLY ${width}x${height} to avoid black bars
        // Use increase + crop to fill frame completely, then ensure exact dimensions
        imageFilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
      }
      
      if (chunkText) {
        // Escape text for FFmpeg drawtext filter
        const escapedChunk = this.escapeFFmpegText(chunkText);
        
        filterComplex += `[${inputIndex}:v]${imageFilter},`;
        // Position subtitle in MIDDLE of screen: y=h*0.50 (50% - centered vertically)
        // Select font based on language: English uses handwriting.ttf, Japanese/Chinese use IPAGothic
        const isEnglish = language === 'en';
        const subtitleFont = isEnglish ? subtitleEnglishFont : subtitleJapaneseFont;
        // IMPORTANT: Always use fontfile parameter (not font) for consistent behavior
        const fontParam = `fontfile='${subtitleFont}'`;
        // Darker semi-transparent box for better contrast: 0x000000@0.7 (70% opacity black)
        filterComplex += `drawtext=text='${escapedChunk}':${fontParam}:fontsize=${subtitleFontsize}:fontcolor=${subtitleFillColor}:borderw=${subtitleStrokeWidth}:bordercolor=${subtitleStrokeColor}:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=0x000000@0.7:boxborderw=20,`;
        filterComplex += `setsar=1,fps=30[img${i}];`;
      } else {
        filterComplex += `[${inputIndex}:v]${imageFilter},setsar=1,fps=30[img${i}];`;
      }
    }

    // Concatenate all video segments with optional crossfade transitions
    // Handle case when there are no images (only title)
    if (imageCount === 0) {
      if (titleBgPath) {
        // Only title, no images
        filterComplex += `[title]copy[video];`;
      } else {
        // No title, no images - this is an error condition
        throw new Error('No images or title background available for video generation');
      }
    } else if (useCrossfade) {
      // Use xfade for smooth crossfade transitions (0.5 second transition)
      const transitionDuration = 0.5;
      
      if (titleBgPath) {
        // Start with title, then xfade through images
        filterComplex += `[title][img0]xfade=transition=fade:duration=${transitionDuration}:offset=${titleDuration - transitionDuration}[v0];`;
        for (let i = 1; i < imageCount; i++) {
          const offset = titleDuration + (i * durationPerImage) - (i * transitionDuration);
          filterComplex += `[v${i-1}][img${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[v${i}];`;
        }
        filterComplex += `[v${imageCount - 1}]copy[video];`;
      } else {
        // Start with first image, then xfade through rest
        if (imageCount > 1) {
          filterComplex += `[img0][img1]xfade=transition=fade:duration=${transitionDuration}:offset=${durationPerImage - transitionDuration}[v1];`;
          for (let i = 2; i < imageCount; i++) {
            const offset = (i * durationPerImage) - (i * transitionDuration);
            filterComplex += `[v${i-1}][img${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[v${i}];`;
          }
          filterComplex += `[v${imageCount - 1}]copy[video];`;
        } else {
          filterComplex += `[img0]copy[video];`;
        }
      }
    } else {
      // Use simple concat for static mode
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
    }

    // Add audio mixing (narration + BGM)
    const audioIndex = videoStartIndex + imageCount;
    inputs.push(`-i "${audioPath}"`);
    
    if (bgmPath && fs.existsSync(bgmPath)) {
      // Add BGM as another input
      const bgmIndex = audioIndex + 1;
      inputs.push(`-i "${bgmPath}"`);
      console.log(`${logPrefix} 🎵 BGM Added to FFmpeg:`);
      console.log(`${logPrefix}   - BGM input index: ${bgmIndex}`);
      console.log(`${logPrefix}   - BGM path: ${bgmPath}`);
      console.log(`${logPrefix}   - Total duration: ${totalDuration}s`);
      
      // Mix narration (volume boosted) with BGM (reduced volume, with fadeout)
      if (titleBgPath) {
        // Delay narration to start after title screen
        filterComplex += `[${audioIndex}:a]adelay=${titleDuration * 1000}|${titleDuration * 1000},volume=10dB[narration];`;
        // BGM with fadeout in last 2 seconds
        const fadeoutStart = totalDuration - 2;
        console.log(`${logPrefix}   - BGM fadeout starts at: ${fadeoutStart}s`);
        filterComplex += `[${bgmIndex}:a]volume=0.15,afade=t=out:st=${fadeoutStart}:d=2[bgm];`;
        filterComplex += `[narration][bgm]amix=inputs=2:duration=longest:normalize=0[audio]`;
        console.log(`${logPrefix}   - Audio mixing: narration (delayed) + BGM (with fadeout)`);
      } else {
        filterComplex += `[${audioIndex}:a]volume=10dB[narration];`;
        // BGM with fadeout in last 2 seconds
        const fadeoutStart = totalDuration - 2;
        console.log(`${logPrefix}   - BGM fadeout starts at: ${fadeoutStart}s`);
        filterComplex += `[${bgmIndex}:a]volume=0.15,afade=t=out:st=${fadeoutStart}:d=2[bgm];`;
        filterComplex += `[narration][bgm]amix=inputs=2:duration=longest:normalize=0[audio]`;
        console.log(`${logPrefix}   - Audio mixing: narration + BGM (with fadeout)`);
      }
    } else {
      // No BGM, just narration
      console.log(`${logPrefix} ⚠️ No BGM found, using narration only`);
      console.log(`${logPrefix}   - bgmPath: ${bgmPath}`);
      console.log(`${logPrefix}   - File exists: ${bgmPath ? fs.existsSync(bgmPath) : 'N/A'}`);
      if (titleBgPath) {
        filterComplex += `[${audioIndex}:a]adelay=${titleDuration * 1000}|${titleDuration * 1000},volume=10dB[audio]`;
      } else {
        filterComplex += `[${audioIndex}:a]volume=10dB[audio]`;
      }
    }

    // Build FFmpeg command - dimensions are enforced in filter chain
    // CRITICAL: Output dimensions MUST be exactly ${width}x${height}
    // The filter chain now ensures exact output size, so we don't need -s flag
    const ffmpegCommand = `ffmpeg ${inputs.join(' ')} \
      -filter_complex "${filterComplex}" \
      -map "[video]" -map "[audio]" \
      -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p \
      -c:a aac -b:a 192k \
      -t ${totalDuration} \
      -y "${outputPath}"`;

    console.log(`${logPrefix} Executing FFmpeg command...`);
    console.log(`${logPrefix} Expected output dimensions: ${width}x${height}`);
    console.log(`${logPrefix} Command preview: ffmpeg [${inputs.length} inputs] -filter_complex [...] -t ${totalDuration} "${outputPath}"`);

    try {
      const { stdout, stderr } = await execPromise(ffmpegCommand, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      if (stderr && !stderr.includes('frame=')) {
        console.log(`${logPrefix} FFmpeg output:`, stderr.substring(0, 500));
      }
      
      console.log(`${logPrefix} ✅ FFmpeg execution completed`);
      
      // Verify output dimensions
      try {
        const { stdout: probeOutput } = await execPromise(`ffprobe -v quiet -print_format json -show_streams "${outputPath}"`);
        const probeData = JSON.parse(probeOutput);
        const videoStream = probeData.streams.find(s => s.codec_type === 'video');
        if (videoStream) {
          console.log(`${logPrefix} 🎬 Video output verified: ${videoStream.width}x${videoStream.height}`);
          if (videoStream.width !== width || videoStream.height !== height) {
            console.error(`${logPrefix} ⚠️  WARNING: Output dimensions ${videoStream.width}x${videoStream.height} do not match expected ${width}x${height}!`);
          }
        }
      } catch (probeError) {
        console.error(`${logPrefix} ⚠️  Could not verify output dimensions:`, probeError.message);
      }
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

  splitNarrationIntoChunks(narrationText, chunkCount, language = 'en') {
    if (!narrationText || chunkCount === 0) {
      return [];
    }

    console.log(`🔤 Splitting narration into ${chunkCount} chunks (image-based distribution)`);
    console.log(`   Language: ${language}`);
    console.log(`   Text length: ${narrationText.length} characters`);

    // Check if this is a language without clear word boundaries (Japanese, Chinese)
    const isAsianLanguage = (language === 'ja' || language === 'zh');
    
    if (isAsianLanguage) {
      // For Japanese/Chinese: Use character-based splitting
      console.log(`   Mode: Character-based (Asian language)`);
      const totalChars = narrationText.length;
      const charsPerChunk = Math.ceil(totalChars / chunkCount);
      console.log(`   Total characters: ${totalChars}`);
      console.log(`   Characters per chunk: ${charsPerChunk}`);
      
      const chunks = [];
      let currentCharIndex = 0;
      
      for (let i = 0; i < chunkCount; i++) {
        const remainingChars = totalChars - currentCharIndex;
        const charsForThisChunk = (i === chunkCount - 1) 
          ? remainingChars 
          : Math.min(charsPerChunk, remainingChars);
        
        const chunkText = narrationText.substring(currentCharIndex, currentCharIndex + charsForThisChunk);
        
        // Format into lines (10 characters per line max for Japanese/Chinese)
        const formattedChunk = this.splitTextIntoLines(chunkText, language);
        
        chunks.push(formattedChunk);
        console.log(`   Chunk ${i + 1}: ${charsForThisChunk} chars (${formattedChunk.split('\n').length} lines) - "${chunkText.substring(0, 20)}..."`);
        
        currentCharIndex += charsForThisChunk;
      }
      
      console.log(`✅ Created ${chunks.length} subtitle chunks (character-based)`);
      console.log(`   Total characters distributed: ${currentCharIndex} / ${totalChars}`);
      return chunks;
    } else {
      // For English and other word-based languages: Use word-based splitting
      console.log(`   Mode: Word-based (Western language)`);
      const allWords = narrationText.split(/\s+/).filter(w => w.trim());
      const totalWords = allWords.length;
      
      console.log(`   Total words: ${totalWords}`);
      console.log(`   Images/chunks: ${chunkCount}`);
      console.log(`   Words per image: ${(totalWords / chunkCount).toFixed(2)} (average)`);
      
      // Calculate words per chunk (evenly distributed)
      const wordsPerChunk = Math.ceil(totalWords / chunkCount);
      console.log(`   Allocated words per chunk: ${wordsPerChunk}`);
      
      const chunks = [];
      let currentWordIndex = 0;
      
      for (let i = 0; i < chunkCount; i++) {
        const remainingWords = totalWords - currentWordIndex;
        const wordsForThisChunk = (i === chunkCount - 1) 
          ? remainingWords 
          : Math.min(wordsPerChunk, remainingWords);
        
        const chunkWords = allWords.slice(currentWordIndex, currentWordIndex + wordsForThisChunk);
        const chunkText = chunkWords.join(' ');
        
        // Format the chunk text into lines (4 words per line max)
        const formattedChunk = this.splitTextIntoLines(chunkText, language);
        
        chunks.push(formattedChunk);
        console.log(`   Chunk ${i + 1}: ${chunkWords.length} words (${formattedChunk.split('\n').length} lines) - "${chunkText.substring(0, 40)}..."`);
        
        currentWordIndex += wordsForThisChunk;
      }

      console.log(`✅ Created ${chunks.length} subtitle chunks (word-based)`);
      console.log(`   Total words distributed: ${currentWordIndex} / ${totalWords}`);
      return chunks;
    }
  }

  splitTextIntoLines(text, language = 'en') {
    if (!text || text.length === 0) {
      return '';
    }
    
    const isAsianLanguage = (language === 'ja' || language === 'zh');
    
    if (isAsianLanguage) {
      // For Japanese/Chinese: Character-based splitting (10 characters per line max)
      const maxCharsPerLine = 10;
      console.log(`   📝 Formatting ${text.length} characters into lines (max ${maxCharsPerLine} chars/line)`);
      
      const lines = [];
      let currentPos = 0;
      
      while (currentPos < text.length) {
        const remainingChars = text.length - currentPos;
        const charsForLine = Math.min(maxCharsPerLine, remainingChars);
        const line = text.substring(currentPos, currentPos + charsForLine);
        
        lines.push(line);
        console.log(`      Line ${lines.length}: ${line.length} chars - "${line}"`);
        
        currentPos += charsForLine;
      }
      
      const result = lines.join('\n');
      console.log(`   ✅ Formatted into ${lines.length} line(s) (character-based)`);
      return result;
    } else {
      // For English and other languages: Word-based splitting (4 words per line max)
      const maxWordsPerLine = 4;
      const allWords = text.split(/\s+/).filter(w => w.trim());
      
      if (allWords.length === 0) {
        return '';
      }
      
      console.log(`   📝 Formatting ${allWords.length} words into lines (max ${maxWordsPerLine} words/line)`);
      
      const lines = [];
      let currentLineWords = [];
      
      for (let i = 0; i < allWords.length; i++) {
        const word = allWords[i];
        currentLineWords.push(word);
        
        const isLastWord = (i === allWords.length - 1);
        const isLineFull = currentLineWords.length >= maxWordsPerLine;
        
        if (isLineFull || isLastWord) {
          lines.push(currentLineWords.join(' '));
          console.log(`      Line ${lines.length}: ${currentLineWords.length} words - "${currentLineWords.join(' ')}"`);
          currentLineWords = [];
        }
      }
      
      const result = lines.join('\n');
      console.log(`   ✅ Formatted into ${lines.length} line(s) (word-based)`);
      return result;
    }
  }

  escapeFFmpegText(text) {
    if (!text) return '';
    
    // FFmpeg drawtext filter escaping rules:
    // 1. Backslashes must be escaped first
    // 2. Single quotes need special handling
    // 3. Colons need escaping
    // 4. Newlines need special handling for multi-line text
    
    return text
      .replace(/\\/g, '\\\\\\\\')           // Escape backslashes
      .replace(/'/g, "'\\\\\\\\\\\\''")     // Escape single quotes (complex due to shell + FFmpeg)
      .replace(/"/g, '\\\\"')               // Escape double quotes
      .replace(/:/g, '\\:')                 // Escape colons
      .replace(/\n/g, '\\n')                // Convert newlines to FFmpeg newline sequence
      .replace(/\r/g, '')                   // Remove carriage returns
      .replace(/\[/g, '\\[')                // Escape square brackets
      .replace(/\]/g, '\\]')                // Escape square brackets
      .replace(/%/g, '\\%');                // Escape percent signs
  }
}

module.exports = new FFmpegService();

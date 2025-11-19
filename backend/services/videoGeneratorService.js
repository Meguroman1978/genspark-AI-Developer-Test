const axios = require('axios');
const OpenAI = require('openai');
const searchService = require('./searchService');
const elevenlabsService = require('./elevenlabsService');
const creatomateService = require('./creatomateService');
const youtubeService = require('./youtubeService');
const pexelsService = require('./pexelsService');
const falAiService = require('./falAiService');
const { toRomaji } = require('../utils/romajiConverter');

class VideoGeneratorService {
  async generateVideo(config) {
    const { jobId, theme, themeRomaji, referenceUrl, duration, imageCount, videoTitle, videoDescription, privacyStatus, contentType, language, thumbnailBackground, videoFormat, videoService, visualMode, bgmTrack, voiceType, narrationSpeed, keys, db } = config;

    try {
      // Step 1: Web/Wikipedia Search
      await this.updateProgress(db, jobId, 'Searching for information...');
      console.log(`[Job ${jobId}] Starting web search for theme: ${theme}`);
      if (contentType) {
        console.log(`[Job ${jobId}] Content type: ${contentType}`);
      }
      
      const searchResults = await searchService.searchInformation(theme, keys.openaiKey);
      console.log(`[Job ${jobId}] Search completed, found information`);

      // Step 2: Generate Script with OpenAI
      await this.updateProgress(db, jobId, 'Creating story script...');
      console.log(`[Job ${jobId}] Generating script`);
      
      // Use themeRomaji for non-Japanese languages if provided, otherwise use theme
      const effectiveTheme = (language !== 'ja' && themeRomaji) ? themeRomaji : theme;
      console.log(`[Job ${jobId}] Effective theme for script generation: ${effectiveTheme}`);
      
      const script = await this.generateScript(effectiveTheme, duration, searchResults, keys.openaiKey, contentType, language, videoFormat, referenceUrl, imageCount);
      console.log(`[Job ${jobId}] Script generated: ${script.narration.substring(0, 100)}...`);
      
      // Store the script
      await this.updateArtifact(db, jobId, 'script_text', script.narration);
      console.log(`[Job ${jobId}] Script stored in database`);

      // Step 3: Generate Audio with ElevenLabs
      await this.updateProgress(db, jobId, 'Generating voice narration...');
      console.log(`[Job ${jobId}] Generating audio`);
      console.log(`[Job ${jobId}] Language: ${language}`);
      console.log(`[Job ${jobId}] Voice type: ${voiceType || 'female (default)'}`);
      console.log(`[Job ${jobId}] Narration speed: ${narrationSpeed || 'normal (default)'}`);
      
      const audioUrl = await elevenlabsService.generateAudio(script.narration, keys.elevenlabsKey, jobId, voiceType, narrationSpeed, language);
      console.log(`[Job ${jobId}] Audio generated: ${audioUrl}`);
      
      // Calculate ElevenLabs cost (approximate)
      const characterCount = script.narration.length;
      const elevenLabsCost = characterCount * 0.00003;  // Approximate $0.30 per 10,000 characters
      console.log(`💰 ElevenLabs cost: $${elevenLabsCost.toFixed(4)} (${characterCount}文字)`);
      
      const audioCost = {
        service: 'ElevenLabs',
        cost: elevenLabsCost,
        details: `$${elevenLabsCost.toFixed(4)} (${characterCount}文字)`
      };
      
      // Store the audio URL
      await this.updateArtifact(db, jobId, 'audio_url', audioUrl);
      console.log(`[Job ${jobId}] Audio URL stored in database`);

      // Step 4: Generate/Fetch Visual Assets
      await this.updateProgress(db, jobId, 'Preparing visual assets...');
      console.log(`[Job ${jobId}] Fetching visual assets`);
      
      const visualAssets = await this.prepareVisualAssets(script.scenes, keys.openaiKey, videoFormat, duration, visualMode, keys.stabilityAiKey, jobId, keys.falAiKey);
      console.log(`[Job ${jobId}] Visual assets prepared: ${visualAssets.length} assets`);
      
      // Store visual assets URLs
      const imageUrls = visualAssets.filter(a => a.type === 'image').map(a => a.url);
      const pexelsUrls = visualAssets.filter(a => a.type === 'video').map(a => a.url);
      
      if (imageUrls.length > 0) {
        await this.updateArtifact(db, jobId, 'image_urls', JSON.stringify(imageUrls));
        console.log(`[Job ${jobId}] Stored ${imageUrls.length} DALL-E image URLs`);
      }
      
      if (pexelsUrls.length > 0) {
        await this.updateArtifact(db, jobId, 'pexels_urls', JSON.stringify(pexelsUrls));
        console.log(`[Job ${jobId}] Stored ${pexelsUrls.length} Pexels video URLs`);
      }

      // Step 5: Create Final Video with selected service
      // Note: 'fal-ai' is for image generation, video is always created with FFmpeg
      const selectedService = videoService || 'ffmpeg'; // Default to FFmpeg (was creatomate)
      await this.updateProgress(db, jobId, `Creating final video with ${selectedService}...`);
      console.log(`[Job ${jobId}] Creating video with ${selectedService}`);
      
      // Convert theme to romaji for non-Japanese languages (for text overlay)
      let displayTheme = theme;
      if (language === 'en' || language === 'zh') {
        displayTheme = toRomaji(theme);
        console.log(`[Job ${jobId}] Theme converted to romaji: ${theme} -> ${displayTheme}`);
      }
      
      // Get public URL for title background image
      const publicUrl = 'https://5000-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai';
      console.log(`[Job ${jobId}] Using public URL: ${publicUrl}`);
      
      let videoUrl;
      
      // Set BGM path (use selected BGM track or default)
      const path = require('path');
      const fs = require('fs');
      const selectedBgm = bgmTrack || '陽だまりのリズム.mp3';  // デフォルトを陽だまりに変更
      
      // Normalize Unicode (NFD/NFC) to match filesystem
      const normalizedBgm = selectedBgm.normalize('NFC');
      const bgmDir = path.join(__dirname, '../assets/bgm');
      
      // Find the actual file (handles Unicode normalization issues)
      let actualBgmFile = normalizedBgm;
      try {
        const files = fs.readdirSync(bgmDir);
        const matchedFile = files.find(f => f.normalize('NFC') === normalizedBgm);
        if (matchedFile) {
          actualBgmFile = matchedFile;
          console.log(`[Job ${jobId}] BGM file matched: ${matchedFile}`);
        }
      } catch (err) {
        console.error(`[Job ${jobId}] Error reading BGM directory:`, err);
      }
      
      const bgmPath = path.join(bgmDir, actualBgmFile);
      console.log(`[Job ${jobId}] Using BGM track: ${selectedBgm}`);
      console.log(`[Job ${jobId}] BGM path: ${bgmPath}`);
      console.log(`[Job ${jobId}] BGM file exists: ${fs.existsSync(bgmPath)}`);
      
      // Auto-select title background image based on video format
      const autoThumbnailBackground = videoFormat === 'shorts' 
        ? 'thumbnail_portrait.png'  // 縦長用 (Portrait/Vertical)
        : 'thumbnail_landscape.png';  // 横長用 (Landscape/Horizontal)
      console.log(`[Job ${jobId}] Auto-selected title background: ${autoThumbnailBackground} for ${videoFormat} format`);
      
      const videoConfig = {
        audioUrl,
        visualAssets,
        duration,
        theme: displayTheme,
        originalTheme: theme,
        publicUrl,
        language,
        thumbnailBackground: autoThumbnailBackground,  // 自動選択されたタイトル背景画像
        videoFormat,
        bgmPath,  // Changed from bgmUrl to bgmPath (local file path)
        narrationText: script.narration,  // Add narration text for subtitles
        visualMode: visualMode || 'static',  // Pass visual mode to FFmpeg service
        jobId
      };

      // Select and call appropriate video service
      // Note: 'fal-ai' uses FFmpeg for video creation (FAL AI is only for image generation)
      if (selectedService === 'ffmpeg' || selectedService === 'fal-ai') {
        console.log(`[Job ${jobId}] Using FFmpeg (FREE) for video composition`);
        if (selectedService === 'fal-ai') {
          console.log(`[Job ${jobId}] Note: FAL AI images + FFmpeg video composition`);
        }
        const ffmpegService = require('./ffmpegService');
        videoUrl = await ffmpegService.createVideo(videoConfig);
      } else if (selectedService === 'shotstack') {
        console.log(`[Job ${jobId}] Using Shotstack (20 free/month)`);
        if (!keys.shotstackKey) {
          throw new Error('Shotstack API key not configured. Please add it in settings.');
        }
        const shotstackService = require('./shotstackService');
        videoUrl = await shotstackService.createVideo({
          ...videoConfig,
          shotstackKey: keys.shotstackKey
        });
      } else {
        // Default: Creatomate
        console.log(`[Job ${jobId}] Using Creatomate`);
        if (!keys.creatomateKey) {
          throw new Error('Creatomate API key not configured. Please add it in settings or select a different service.');
        }
        videoUrl = await creatomateService.createVideo({
          ...videoConfig,
          creatomateKey: keys.creatomateKey,
          creatomateTemplateId: keys.creatomateTemplateId,
          stabilityAiKey: keys.stabilityAiKey
        });
      }
      console.log(`[Job ${jobId}] Video created: ${videoUrl}`);

      // Step 6: Upload to YouTube
      let youtubeUrl = null;
      let completionMessage = 'Completed!';
      
      if (keys.youtubeCredentials) {
        await this.updateProgress(db, jobId, 'Uploading to YouTube...');
        console.log(`[Job ${jobId}] Uploading to YouTube`);
        
        // Use custom title or generate default with Japanese/English bilingual template
        const finalTitle = videoTitle || await this.generateDefaultTitle(theme, keys.openaiKey);
        // Use custom description or generate default with Japanese/English bilingual template
        const finalDescription = videoDescription || await this.generateDefaultDescription(theme, duration, keys.openaiKey);
        
        try {
          youtubeUrl = await youtubeService.uploadVideo({
            videoUrl,
            title: finalTitle,
            description: finalDescription,
            privacyStatus,
            youtubeCredentials: keys.youtubeCredentials,
            language: language || 'ja'  // Pass language for YouTube metadata
          });
          console.log(`[Job ${jobId}] Uploaded to YouTube: ${youtubeUrl}`);
          completionMessage = 'Video generated and uploaded to YouTube successfully!';
        } catch (error) {
          console.error(`[Job ${jobId}] YouTube upload failed:`, error.message);
          completionMessage = 'Video generated, but YouTube upload failed. Please check your YouTube credentials.';
        }
      } else {
        console.log(`[Job ${jobId}] YouTube credentials not provided, skipping upload`);
        completionMessage = 'Video generated successfully! YouTube credentials not configured - upload skipped.';
      }

      // Store BGM info for debugging
      await this.updateArtifact(db, jobId, 'bgm_track', selectedBgm);
      console.log(`[Job ${jobId}] BGM track info stored: ${selectedBgm}`);
      
      // Calculate and display total cost
      const totalCost = (script._cost?.cost || 0) + (audioCost?.cost || 0) + (visualAssets._cost?.cost || 0);
      const costSummary = [
        '\n📊 コスト詳細:',
        script._cost ? `スクリプト生成 (${script._cost.service}): ${script._cost.details}` : null,
        audioCost ? `音声合成 (${audioCost.service}): ${audioCost.details}` : null,
        visualAssets._cost ? `画像生成 (${visualAssets._cost.service}): ${visualAssets._cost.details}` : null,
        `\n💰 合計コスト: $${totalCost.toFixed(4)} (約${(totalCost * 150).toFixed(2)}円)`
      ].filter(Boolean).join('\n');
      
      console.log(`[Job ${jobId}] ${costSummary}`);
      
      // Store cost summary for display
      await this.updateArtifact(db, jobId, 'cost_summary', costSummary);
      
      // Update job as completed (save both YouTube URL and video URL)
      await this.updateProgress(db, jobId, completionMessage, 'completed', youtubeUrl, videoUrl);
      console.log(`[Job ${jobId}] Video generation completed successfully`);
      console.log(`[Job ${jobId}] Video URL: ${videoUrl}`);
      if (youtubeUrl) {
        console.log(`[Job ${jobId}] YouTube URL: ${youtubeUrl}`);
      }

      return {
        success: true,
        youtubeUrl,
        videoUrl
      };
    } catch (error) {
      console.error(`[Job ${jobId}] Error:`, error);
      await this.updateProgress(db, jobId, `Error: ${error.message}`, 'failed');
      throw error;
    }
  }

  async generateScript(theme, duration, searchInfo, openaiKey, contentType, language = 'ja', videoFormat = 'shorts', referenceUrl = null, customImageCount = null) {
    const openai = new OpenAI({ apiKey: openaiKey });
    
    // If referenceUrl is provided, fetch its content
    let referenceContent = '';
    if (referenceUrl) {
      try {
        console.log(`Fetching reference URL content: ${referenceUrl}`);
        const axios = require('axios');
        const response = await axios.get(referenceUrl, { timeout: 10000 });
        // Simple text extraction (for better extraction, could use a library like cheerio)
        referenceContent = response.data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 3000);
        console.log(`Reference content fetched: ${referenceContent.length} characters`);
      } catch (error) {
        console.error(`Failed to fetch reference URL: ${error.message}`);
        referenceContent = '';
      }
    }

    // Calculate precise character/word count based on language and speaking rate
    // Japanese: ~7-8 characters per second (420-480 chars per minute)
    // English: ~2.5 words per second (150 words per minute)
    // Chinese: ~5-6 characters per second (300-360 chars per minute)
    
    let targetLength;
    let lengthUnit;
    
    if (language === 'ja') {
      // Japanese: characters per second
      targetLength = Math.floor(duration * 7); // Conservative 7 chars/sec
      lengthUnit = 'characters';
    } else if (language === 'zh') {
      // Chinese: characters per second
      targetLength = Math.floor(duration * 5); // Conservative 5 chars/sec
      lengthUnit = 'characters';
    } else {
      // English: words per second
      targetLength = Math.floor(duration * 2.3); // Conservative 2.3 words/sec
      lengthUnit = 'words';
    }

    // Language settings
    const languageSettings = {
      ja: { name: 'Japanese', instruction: 'Write the script in Japanese (日本語).' },
      en: { name: 'English', instruction: 'Write the script in English.' },
      zh: { name: 'Chinese', instruction: 'Write the script in Chinese (中文).' }
    };
    
    const langSetting = languageSettings[language] || languageSettings['ja'];

    // Content type specific instructions
    const typeInstructions = {
      story: 'Create a narrative story format with a beginning, middle, and end. Use storytelling techniques to engage the viewer.',
      explanation: 'Create an educational explanation format. Focus on clarity, logical flow, and easy-to-understand language.',
      educational: 'Create a learning material format. Include key concepts, examples, and reinforce important points.',
      howto: 'Create a step-by-step instructional format. Be clear, practical, and action-oriented.',
      performing: 'Create a performance-focused script. Be dramatic, expressive, and emotionally engaging.',
      music: 'Create a music video (PV) style script. Focus on visual imagery, rhythm, and artistic expression.'
    };

    const typeInstruction = contentType && typeInstructions[contentType] 
      ? `\n\nVideo Style: ${typeInstructions[contentType]}`
      : '';

    // Calculate number of images needed
    // Base calculation: duration / 2.5 (each image ~2.5 seconds)
    const baseImageCount = Math.ceil(duration / 2.5);
    
    // Use custom count if provided, otherwise use base calculation
    let imageCount;
    if (customImageCount) {
      imageCount = customImageCount;
      console.log(`📸 Using user-specified image count: ${imageCount}`);
    } else {
      imageCount = baseImageCount;
      console.log(`📸 Auto-calculated image count: ${imageCount} (${duration}s ÷ 2.5s/image)`);
    }
    
    console.log(`📝 Subtitle distribution: Words will be evenly distributed across ${imageCount} images`);
    console.log(`   (Max 4 words per line, unlimited lines per image)`);
    
    // Build reference content section if available
    const referenceSection = referenceContent 
      ? `\n\nReference Material (use this information to inform your script):\n${referenceContent}\n` 
      : '';
    
    const prompt = `You are a professional video script writer. Create an engaging narration script for a ${duration}-second video about "${theme}".${typeInstruction}

Background Information:
${searchInfo}${referenceSection}

CRITICAL REQUIREMENTS - SCRIPT LENGTH:
- This is for a ${duration}-second video
- The script MUST be EXACTLY ${targetLength} ${lengthUnit} or LESS
- Count your ${lengthUnit} carefully before responding
- If your script is too long, shorten it to fit ${targetLength} ${lengthUnit}
- DO NOT exceed ${targetLength} ${lengthUnit} under any circumstances
- Better to be slightly shorter than too long

Additional Requirements:
- Write in a natural, engaging narrative style suitable for voice narration
- Include fascinating facts and details, but stay within the length limit
- Structure the content to flow smoothly
- ${langSetting.instruction}
- The narration should fill exactly ${duration} seconds when read aloud

Also, suggest EXACTLY ${imageCount} visual scenes that would accompany this narration (1 scene per 2.5 seconds). 

IMPORTANT - VISUAL VARIETY REQUIREMENTS:
- Each scene MUST be COMPLETELY DIFFERENT from the others
- Use diverse settings: indoor/outdoor, close-up/wide shot, different times of day, different locations
- Vary the subjects: people, animals, objects, nature, buildings, abstract concepts
- Each scene should represent a different aspect of the story or theme
- Ensure visual progression that tells a story

For each scene, provide:
1. A UNIQUE and SPECIFIC description (make each scene distinctly different)
2. Approximate timing in the video
3. Search terms for finding diverse stock footage

Return your response in the following JSON format:
{
  "narration": "Full script text here...",
  "scenes": [
    {
      "description": "SPECIFIC and UNIQUE scene description - be very detailed and different from other scenes",
      "timing": "0-2.5s",
      "searchQuery": "specific search terms for this unique scene"
    }
  ]
}`;

    console.log(`📝 Requesting script: ${duration}s video = ${targetLength} ${lengthUnit} maximum`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { 
          role: 'system', 
          content: `You are a professional video script writer and visual director. Always respond with valid JSON. CRITICAL: 
1. You must strictly adhere to the specified script length. Count ${lengthUnit} carefully and ensure the narration does not exceed the maximum length specified.
2. Each visual scene MUST be completely unique and different from others. Create diverse, varied scenes that progress through the story with different settings, subjects, and perspectives. Avoid repetitive or similar scene descriptions.` 
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Calculate cost based on token usage
    const usage = response.usage;
    const inputCost = (usage.prompt_tokens / 1000) * 0.01;  // $0.01 per 1K input tokens
    const outputCost = (usage.completion_tokens / 1000) * 0.03;  // $0.03 per 1K output tokens
    const totalCost = inputCost + outputCost;
    
    console.log(`💰 OpenAI cost: $${totalCost.toFixed(4)} (入力: ${usage.prompt_tokens}トークン, 出力: ${usage.completion_tokens}トークン)`);
    
    // Add cost information to result
    result._cost = {
      service: 'OpenAI GPT-4 Turbo',
      cost: totalCost,
      details: `$${totalCost.toFixed(4)} (入力: ${usage.prompt_tokens}トークン, 出力: ${usage.completion_tokens}トークン)`,
      usage: usage
    };
    
    // Validate and log script length
    const actualLength = language === 'ja' || language === 'zh' 
      ? result.narration.length 
      : result.narration.split(/\s+/).length;
    
    console.log(`📊 Script generated: ${actualLength} ${lengthUnit} (target: ${targetLength} ${lengthUnit}, ${duration}s)`);
    
    if (actualLength > targetLength * 1.2) {
      console.warn(`⚠️  WARNING: Script is ${Math.round((actualLength/targetLength - 1) * 100)}% longer than target!`);
      console.warn(`   This may cause the narration to exceed ${duration} seconds.`);
    }
    
    // Calculate required image count based on actual narration length
    // Each scene can display max 9 words (3 lines × 3 words) for English
    // For Japanese/Chinese, estimate based on character count (~ 15 chars per scene)
    let requiredImageCount;
    if (language === 'ja' || language === 'zh') {
      const maxCharsPerScene = 15; // Conservative estimate for Japanese/Chinese
      requiredImageCount = Math.ceil(actualLength / maxCharsPerScene);
    } else {
      const maxWordsPerScene = 9; // 3 lines × 3 words per line
      const wordCount = result.narration.split(/\s+/).length;
      requiredImageCount = Math.ceil(wordCount / maxWordsPerScene);
    }
    
    // Add recommended image count to result
    result._recommendedImageCount = requiredImageCount;
    console.log(`📸 Recommended image count: ${requiredImageCount} (to display all narration text)`);
    
    // If custom image count was provided, compare with required
    if (customImageCount && customImageCount < requiredImageCount) {
      console.warn(`⚠️  User requested ${customImageCount} images, but ${requiredImageCount} needed for full narration`);
      console.warn(`   Automatically increasing to ${requiredImageCount} images`);
    }
    
    return result;
  }

  async prepareVisualAssets(scenes, openaiKey, videoFormat = 'shorts', duration = 10, visualMode = 'ken-burns', stabilityAiKey = null, jobId = null, falAiKey = null) {
    const assets = [];
    
    // CRITICAL: Use EXACT pixel dimensions for video output
    // Shorts (9:16 vertical): 1080x1920 pixels
    // Normal (16:9 horizontal): 1920x1080 pixels
    const imageWidth = videoFormat === 'shorts' ? 1080 : 1920;
    const imageHeight = videoFormat === 'shorts' ? 1920 : 1080;
    const aspectRatio = videoFormat === 'shorts' ? '9:16 vertical portrait' : '16:9 horizontal landscape';
    
    console.log(`Visual mode: ${visualMode}`);
    console.log(`Generating ${scenes.length} assets in ${aspectRatio} format (${imageWidth}x${imageHeight})`);

    // Decide which image generation service to use
    const useFalAi = falAiKey && falAiKey.trim() !== '';
    
    console.log(`🔍 Image generation service selection: falAiKey=${falAiKey ? 'provided' : 'null/empty'}, useFalAi=${useFalAi}`);
    
    if (useFalAi) {
      console.log('🎨 Using FAL AI for image generation with exact dimensions');
      
      // Visual variety themes to ensure each slide looks different
      const visualThemes = [
        'vibrant colorful scene with dynamic composition',
        'serene peaceful atmosphere with soft pastel colors',
        'dramatic lighting with strong contrasts and shadows',
        'warm golden hour lighting with rich colors',
        'cool blue tones with modern aesthetic',
        'playful whimsical style with bright colors'
      ];
      
      // Use FAL AI default model (flux-pro)
      const falModelId = 'fal-ai/flux-pro';
      
      let falAiFailedCount = 0;
      
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const visualTheme = visualThemes[i % visualThemes.length];
        let imageGenerated = false;
        
        // Try FAL AI first
        try {
          console.log(`Scene ${i+1}/${scenes.length}: Generating FAL AI image with theme "${visualTheme}"`);
          
          // Create orientation-specific prompt guidance with STRONG enforcement
          const orientationGuidance = videoFormat === 'shorts' 
            ? 'CRITICAL VERTICAL COMPOSITION: This MUST be a naturally composed VERTICAL PORTRAIT image (1080x1920, 9:16 aspect ratio). REQUIREMENTS: Tall vertical framing with subjects positioned upright. Characters standing, vertical architectural elements, vertical depth in landscapes. FORBIDDEN: Wide horizontal compositions, landscape-oriented scenes, subjects arranged horizontally. The entire composition must be designed for vertical viewing from the ground up.'
            : 'Compose as a HORIZONTAL LANDSCAPE image (wider than tall). All subjects and scenery must be naturally arranged for horizontal viewing.';
          
          // Style guidance to avoid shoujo manga aesthetic
          const styleGuidance = 'STYLE REQUIREMENTS: Modern 3D CGI animation style (Pixar/DreamWorks quality). Avoid: shoujo manga style, sparkles, flower backgrounds, overly decorative elements, excessive pastels, typical manga character designs with huge eyes and tiny mouths. Prefer: realistic proportions, cinematic lighting, natural environments, subtle colors, professional CGI rendering.';
          
          const result = await falAiService.generateImage({
            modelId: falModelId,
            prompt: `${orientationGuidance}\n\n${styleGuidance}\n\nHigh-quality 3D CGI illustration with ${visualTheme}. Scene ${i+1} focus: ${scene.description}. Requirements: NO TEXT, NO LETTERS, NO WORDS in the image. Clean, polished 3D look with realistic textures. Each scene must look DISTINCTLY DIFFERENT from others.`,
            imageSize: { width: imageWidth, height: imageHeight },
            numImages: 1,
            apiKey: falAiKey
          });

          if (result.success && result.images.length > 0) {
            console.log(`Scene ${i+1}/${scenes.length}: FAL AI image generated successfully (${result.images[0].width}x${result.images[0].height})`);
            assets.push({
              type: 'image',
              url: result.images[0].url,
              description: scene.description,
              timing: scene.timing,
              source: 'FAL AI'
            });
            imageGenerated = true;
          } else {
            throw new Error('FAL AI returned no images');
          }
        } catch (error) {
          console.error(`❌ Scene ${i+1}/${scenes.length}: FAL AI failed:`, error.message);
          falAiFailedCount++;
          
          // Fallback to DALL-E 3
          try {
            console.log(`🔄 Scene ${i+1}/${scenes.length}: Falling back to DALL-E 3...`);
            
            const dalleSize = videoFormat === 'shorts' ? '1024x1792' : '1792x1024';
            
            const orientationGuidance = videoFormat === 'shorts' 
              ? 'CRITICAL VERTICAL COMPOSITION: This MUST be a naturally composed VERTICAL PORTRAIT image (1024x1792, 9:16 aspect ratio). REQUIREMENTS: Tall vertical framing with subjects positioned upright. Characters standing, vertical architectural elements, vertical depth in landscapes. FORBIDDEN: Wide horizontal compositions, landscape-oriented scenes, subjects arranged horizontally. The entire composition must be designed for vertical viewing from the ground up.'
              : 'Compose as a HORIZONTAL LANDSCAPE image (wider than tall). All subjects and scenery must be naturally arranged for horizontal viewing.';
            
            const styleGuidance = 'STYLE REQUIREMENTS: Modern 3D CGI animation style (Pixar/DreamWorks quality). Avoid: shoujo manga style, sparkles, flower backgrounds, overly decorative elements, excessive pastels, typical manga character designs with huge eyes and tiny mouths. Prefer: realistic proportions, cinematic lighting, natural environments, subtle colors, professional CGI rendering.';
            
            const openai = new OpenAI({ apiKey: openaiKey });
            const imageResponse = await openai.images.generate({
              model: 'dall-e-3',
              prompt: `${orientationGuidance}\n\n${styleGuidance}\n\nHigh-quality 3D CGI illustration with ${visualTheme}. Scene ${i+1} focus: ${scene.description}. Requirements: NO TEXT, NO LETTERS, NO WORDS in the image. Clean, polished 3D look with realistic textures. Each scene must look DISTINCTLY DIFFERENT from others.`,
              n: 1,
              size: dalleSize
            });

            console.log(`✅ Scene ${i+1}/${scenes.length}: DALL-E 3 fallback succeeded`);
            assets.push({
              type: 'image',
              url: imageResponse.data[0].url,
              description: scene.description,
              timing: scene.timing,
              source: 'DALL-E 3 (fallback)'
            });
            imageGenerated = true;
          } catch (dalleError) {
            console.error(`❌ Scene ${i+1}/${scenes.length}: DALL-E 3 fallback also failed:`, dalleError.message);
            // Continue with next scene
          }
        }
        
        if (!imageGenerated) {
          console.warn(`⚠️  Scene ${i+1}/${scenes.length}: No image generated (both FAL AI and DALL-E 3 failed)`);
        }
      }
      
      if (falAiFailedCount > 0) {
        console.log(`📊 FAL AI Summary: ${falAiFailedCount}/${scenes.length} scenes failed, fell back to DALL-E 3`);
      }
    } else {
      console.log('🎬 Using DALL-E 3 for image generation (fallback)');
      console.log('⚠️  Note: DALL-E 3 may generate incorrect aspect ratios. Consider using FAL AI for reliable dimensions.');
      
      // DALL-E 3 fallback - uses fixed sizes (may not always honor aspect ratio)
      const dalleSize = videoFormat === 'shorts' ? '1024x1792' : '1792x1024';
      
      // Visual variety themes
      const visualThemes = [
        'vibrant colorful scene with dynamic composition',
        'serene peaceful atmosphere with soft pastel colors',
        'dramatic lighting with strong contrasts and shadows',
        'warm golden hour lighting with rich colors',
        'cool blue tones with modern aesthetic',
        'playful whimsical style with bright colors'
      ];
      
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        try {
          const visualTheme = visualThemes[i % visualThemes.length];
          console.log(`Scene ${i+1}/${scenes.length}: Generating DALL-E 3 image with theme "${visualTheme}"`);
          
          // Create orientation-specific prompt guidance with STRONG enforcement
          const orientationGuidance = videoFormat === 'shorts' 
            ? 'CRITICAL VERTICAL COMPOSITION: This MUST be a naturally composed VERTICAL PORTRAIT image (1024x1792, 9:16 aspect ratio). REQUIREMENTS: Tall vertical framing with subjects positioned upright. Characters standing, vertical architectural elements, vertical depth in landscapes. FORBIDDEN: Wide horizontal compositions, landscape-oriented scenes, subjects arranged horizontally. The entire composition must be designed for vertical viewing from the ground up.'
            : 'Compose as a HORIZONTAL LANDSCAPE image (wider than tall). All subjects and scenery must be naturally arranged for horizontal viewing.';
          
          // Style guidance to avoid shoujo manga aesthetic
          const styleGuidance = 'STYLE REQUIREMENTS: Modern 3D CGI animation style (Pixar/DreamWorks quality). Avoid: shoujo manga style, sparkles, flower backgrounds, overly decorative elements, excessive pastels, typical manga character designs with huge eyes and tiny mouths. Prefer: realistic proportions, cinematic lighting, natural environments, subtle colors, professional CGI rendering.';
          
          const openai = new OpenAI({ apiKey: openaiKey });
          const imageResponse = await openai.images.generate({
            model: 'dall-e-3',
            prompt: `${orientationGuidance}\n\n${styleGuidance}\n\nHigh-quality 3D CGI illustration with ${visualTheme}. Scene ${i+1} focus: ${scene.description}. Requirements: NO TEXT, NO LETTERS, NO WORDS in the image. Clean, polished 3D look with realistic textures. Each scene must look DISTINCTLY DIFFERENT from others.`,
            n: 1,
            size: dalleSize
          });

          console.log(`Scene ${i+1}/${scenes.length}: DALL-E 3 image generated successfully`);
          assets.push({
            type: 'image',
            url: imageResponse.data[0].url,
            description: scene.description,
            timing: scene.timing
          });
        } catch (error) {
          console.error(`❌ Scene ${i+1}/${scenes.length}: Error generating DALL-E 3 image:`, error.message);
          console.error(`   Full error:`, error);
          // Continue with next scene even if one fails
        }
      }
    }

    // Calculate image generation cost (handle mixed FAL AI + DALL-E 3)
    const falAiImages = assets.filter(a => a.type === 'image' && a.source === 'FAL AI');
    const dalleImages = assets.filter(a => a.type === 'image' && (a.source === 'DALL-E 3 (fallback)' || !a.source));
    
    const falAiCost = falAiImages.length * 0.055;  // $0.055 per image for FAL AI Flux Pro v1.1
    const dalleCost = dalleImages.length * 0.040;  // $0.040 per image for DALL-E 3
    const totalImageCost = falAiCost + dalleCost;
    
    let imageService = '';
    if (falAiImages.length > 0 && dalleImages.length > 0) {
      imageService = `Mixed: FAL AI (${falAiImages.length}枚) + DALL-E 3 (${dalleImages.length}枚)`;
      console.log(`💰 画像生成コスト: $${totalImageCost.toFixed(4)}`);
      console.log(`   - FAL AI: $${falAiCost.toFixed(4)} (${falAiImages.length}枚 × $0.055)`);
      console.log(`   - DALL-E 3: $${dalleCost.toFixed(4)} (${dalleImages.length}枚 × $0.040)`);
    } else if (falAiImages.length > 0) {
      imageService = 'FAL AI (Flux Pro v1.1)';
      console.log(`💰 FAL AI cost: $${totalImageCost.toFixed(4)} (${falAiImages.length}枚 × $0.055)`);
    } else if (dalleImages.length > 0) {
      imageService = 'DALL-E 3';
      console.log(`💰 DALL-E 3 cost: $${totalImageCost.toFixed(4)} (${dalleImages.length}枚 × $0.040)`);
    } else {
      imageService = 'None (0 images generated)';
      console.log(`💰 画像生成 (${imageService}): $0.0000 (0枚)`);
    }
    
    // Add cost metadata to assets
    assets._cost = {
      service: imageService,
      cost: totalImageCost,
      details: `$${totalImageCost.toFixed(4)} (FAL AI: ${falAiImages.length}枚, DALL-E 3: ${dalleImages.length}枚)`
    };

    return assets;
  }

  async generateDefaultTitle(theme, openaiKey) {
    // Bilingual title template: Japanese + English translation
    try {
      const englishTranslation = await this.translateToEnglish(theme, openaiKey);
      return `${theme}　${englishTranslation}`;
    } catch (error) {
      console.error('Translation error for title:', error.message);
      // Fallback to Japanese only if translation fails
      return theme;
    }
  }

  async generateDefaultDescription(theme, duration, openaiKey) {
    // Bilingual description template: Japanese + English translation
    try {
      const englishTranslation = await this.translateToEnglish(theme, openaiKey);
      return `${theme}という諺の意味について解説します。

This video explains the meaning of the proverb "${englishTranslation}".`;
    } catch (error) {
      console.error('Translation error for description:', error.message);
      // Fallback to Japanese only if translation fails
      return `${theme}という諺の意味について解説します。`;
    }
  }

  async translateToEnglish(japaneseText, openaiKey) {
    // Use OpenAI GPT-4 to translate Japanese proverb to natural English
    const openai = new OpenAI({ apiKey: openaiKey });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You are a professional Japanese-to-English translator specializing in proverbs and idioms. Translate Japanese proverbs to natural, readable English while preserving their meaning and cultural nuance. Provide only the translation, no explanations.' 
        },
        { 
          role: 'user', 
          content: `Translate this Japanese proverb to English: ${japaneseText}` 
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });
    
    return response.choices[0].message.content.trim();
  }

  generateDescription(theme, duration) {
    // Legacy method for backward compatibility
    return this.generateDefaultDescription(theme, duration);
  }

  async updateProgress(db, jobId, progress, status = null, youtubeUrl = null, videoUrl = null) {
    const updates = ['progress = ?', 'updated_at = ?'];
    const values = [progress, new Date().toISOString()];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (youtubeUrl) {
      updates.push('youtube_url = ?');
      values.push(youtubeUrl);
    }

    if (videoUrl) {
      updates.push('video_url = ?');
      values.push(videoUrl);
    }

    values.push(jobId);

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE video_jobs SET ${updates.join(', ')} WHERE id = ?`,
        values,
        (err) => {
          if (err) {
            console.error('Error updating progress:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async updateArtifact(db, jobId, columnName, value) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE video_jobs SET ${columnName} = ?, updated_at = ? WHERE id = ?`,
        [value, new Date().toISOString(), jobId],
        (err) => {
          if (err) {
            console.error(`Error updating ${columnName}:`, err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
}

module.exports = new VideoGeneratorService();

const axios = require('axios');
const OpenAI = require('openai');
const searchService = require('./searchService');
const elevenlabsService = require('./elevenlabsService');
const creatomateService = require('./creatomateService');
const youtubeService = require('./youtubeService');
const pexelsService = require('./pexelsService');
const { toRomaji } = require('../utils/romajiConverter');

class VideoGeneratorService {
  async generateVideo(config) {
    const { jobId, theme, duration, videoTitle, videoDescription, privacyStatus, contentType, language, thumbnailBackground, videoFormat, videoService, keys, db } = config;

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
      
      const script = await this.generateScript(theme, duration, searchResults, keys.openaiKey, contentType, language, videoFormat);
      console.log(`[Job ${jobId}] Script generated: ${script.narration.substring(0, 100)}...`);
      
      // Store the script
      await this.updateArtifact(db, jobId, 'script_text', script.narration);
      console.log(`[Job ${jobId}] Script stored in database`);

      // Step 3: Generate Audio with ElevenLabs
      await this.updateProgress(db, jobId, 'Generating voice narration...');
      console.log(`[Job ${jobId}] Generating audio`);
      
      const audioUrl = await elevenlabsService.generateAudio(script.narration, keys.elevenlabsKey, jobId);
      console.log(`[Job ${jobId}] Audio generated: ${audioUrl}`);
      
      // Store the audio URL
      await this.updateArtifact(db, jobId, 'audio_url', audioUrl);
      console.log(`[Job ${jobId}] Audio URL stored in database`);

      // Step 4: Generate/Fetch Visual Assets
      await this.updateProgress(db, jobId, 'Preparing visual assets...');
      console.log(`[Job ${jobId}] Fetching visual assets`);
      
      const visualAssets = await this.prepareVisualAssets(script.scenes, keys.openaiKey, videoFormat, duration);
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
      const selectedService = videoService || 'creatomate'; // Default to Creatomate
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
      
      // Set BGM URL (use default BGM stored in temp directory)
      const bgmUrl = `${publicUrl}/temp/bgm_default.mp3`;
      
      const videoConfig = {
        audioUrl,
        visualAssets,
        duration,
        theme: displayTheme,
        originalTheme: theme,
        publicUrl,
        language,
        thumbnailBackground,
        videoFormat,
        bgmUrl,
        jobId
      };

      // Select and call appropriate video service
      if (selectedService === 'ffmpeg') {
        console.log(`[Job ${jobId}] Using FFmpeg (FREE)`);
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
            youtubeCredentials: keys.youtubeCredentials
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

  async generateScript(theme, duration, searchInfo, openaiKey, contentType, language = 'ja', videoFormat = 'shorts') {
    const openai = new OpenAI({ apiKey: openaiKey });

    // Calculate approximate word count (average speaking rate: 150 words/minute)
    const targetWords = Math.floor((duration / 60) * 150);

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

    // Calculate number of images needed (1 image per 2.5 seconds)
    const imageCount = Math.ceil(duration / 2.5);
    
    const prompt = `You are a professional video script writer. Create an engaging narration script for a ${duration}-second video about "${theme}".${typeInstruction}

Background Information:
${searchInfo}

Requirements:
- Target length: approximately ${targetWords} words (for ${duration} seconds)
- Write in a natural, engaging narrative style
- Include fascinating facts and details
- Structure the content to flow smoothly
- ${langSetting.instruction}
- Make it suitable for voice narration

Also, suggest EXACTLY ${imageCount} visual scenes that would accompany this narration (1 scene per 2.5 seconds). For each scene, provide:
1. A brief description (for searching stock footage)
2. Approximate timing in the video

Return your response in the following JSON format:
{
  "narration": "Full script text here...",
  "scenes": [
    {
      "description": "Scene description for visual search",
      "timing": "0-10s",
      "searchQuery": "search terms for stock footage"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a professional video script writer. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  }

  async prepareVisualAssets(scenes, openaiKey, videoFormat = 'shorts', duration = 10) {
    const assets = [];
    
    // Determine image size based on video format
    // Shorts (9:16): 1024x1792 (vertical)
    // Normal (16:9): 1792x1024 (horizontal)
    const imageSize = videoFormat === 'shorts' ? '1024x1792' : '1792x1024';
    const aspectRatio = videoFormat === 'shorts' ? '9:16 vertical' : '16:9 horizontal';
    
    console.log(`Generating ${scenes.length} images in ${aspectRatio} format (${imageSize})`);

    // For each scene, try to get stock footage from Pexels
    for (const scene of scenes) {
      try {
        // Try Pexels first (free API, no key needed)
        const videoClips = await pexelsService.searchVideos(scene.searchQuery);
        
        if (videoClips && videoClips.length > 0) {
          assets.push({
            type: 'video',
            url: videoClips[0].url,
            description: scene.description,
            timing: scene.timing
          });
        } else {
          // Fallback: Generate image with DALL-E in correct aspect ratio
          const openai = new OpenAI({ apiKey: openaiKey });
          const imageResponse = await openai.images.generate({
            model: 'dall-e-3',
            prompt: `High-quality 3D anime style illustration with soft lighting and smooth rendering. Style: modern 3D animation similar to Pixar or Japanese anime CGI, with appealing character designs and beautiful environments. Subject: ${scene.description}. Requirements: NO TEXT, NO LETTERS, NO WORDS in the image. Clean, polished 3D look with realistic textures. Aspect ratio: ${aspectRatio}.`,
            n: 1,
            size: imageSize
          });

          assets.push({
            type: 'image',
            url: imageResponse.data[0].url,
            description: scene.description,
            timing: scene.timing
          });
        }
      } catch (error) {
        console.error('Error fetching visual asset:', error);
        // Continue with next scene
      }
    }

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

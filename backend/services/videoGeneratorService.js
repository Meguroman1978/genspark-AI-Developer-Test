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
    const { jobId, theme, duration, channelName, privacyStatus, contentType, language, thumbnailBackground, videoFormat, keys, db } = config;

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
      
      const script = await this.generateScript(theme, duration, searchResults, keys.openaiKey, contentType, language);
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
      
      const visualAssets = await this.prepareVisualAssets(script.scenes, keys.openaiKey);
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

      // Step 5: Create Final Video with Creatomate
      await this.updateProgress(db, jobId, 'Creating final video...');
      console.log(`[Job ${jobId}] Creating video with Creatomate`);
      
      // Convert theme to romaji for non-Japanese languages (for text overlay)
      let displayTheme = theme;
      if (language === 'en' || language === 'zh') {
        displayTheme = toRomaji(theme);
        console.log(`[Job ${jobId}] Theme converted to romaji: ${theme} -> ${displayTheme}`);
      }
      
      // Get public URL for title background image
      const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5000';
      
      let videoUrl;
      if (keys.creatomateKey) {
        videoUrl = await creatomateService.createVideo({
          audioUrl,
          visualAssets,
          duration,
          theme: displayTheme,  // Use romaji-converted theme for display
          originalTheme: theme,  // Original Japanese theme for title
          creatomateKey: keys.creatomateKey,
          creatomateTemplateId: keys.creatomateTemplateId,
          stabilityAiKey: keys.stabilityAiKey,
          publicUrl,  // Pass public URL for title background
          language,   // Pass language for title screen
          thumbnailBackground,  // サムネイル背景の選択
          videoFormat,  // 'normal' (16:9) or 'shorts' (9:16)
          jobId
        });
      } else {
        // Fallback: Create a simple video reference
        videoUrl = `https://example.com/video-${jobId}.mp4`;
        console.log(`[Job ${jobId}] Creatomate key not provided, using mock video URL`);
      }
      console.log(`[Job ${jobId}] Video created: ${videoUrl}`);

      // Step 6: Upload to YouTube
      let youtubeUrl = null;
      let completionMessage = 'Completed!';
      
      if (keys.youtubeCredentials) {
        await this.updateProgress(db, jobId, 'Uploading to YouTube...');
        console.log(`[Job ${jobId}] Uploading to YouTube`);
        
        try {
          youtubeUrl = await youtubeService.uploadVideo({
            videoUrl,
            title: `${theme} - AI Generated Video`,
            description: this.generateDescription(theme, duration, channelName),
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

  async generateScript(theme, duration, searchInfo, openaiKey, contentType, language = 'ja') {
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

Also, suggest 3-5 visual scenes that would accompany this narration. For each scene, provide:
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

  async prepareVisualAssets(scenes, openaiKey) {
    const assets = [];

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
          // Fallback: Generate image with DALL-E
          const openai = new OpenAI({ apiKey: openaiKey });
          const imageResponse = await openai.images.generate({
            model: 'dall-e-3',
            prompt: `Vibrant, poppy, and artistic illustration with bold colors and creative composition. Style: modern pop art with eye-catching aesthetics. Subject: ${scene.description}. Important: NO TEXT, NO LETTERS, NO WORDS in the image.`,
            n: 1,
            size: '1792x1024'
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

  generateDescription(theme, duration, channelName) {
    return `This is an AI-generated video about "${theme}".

Video Length: ${duration} seconds
${channelName ? `Channel: ${channelName}` : ''}

This video was automatically created using:
- AI-powered web research
- GPT-4 script generation
- ElevenLabs voice synthesis
- Professional video editing
- Automated YouTube upload

Generated by AI Video Generator Application`;
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

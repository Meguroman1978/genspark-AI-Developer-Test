const axios = require('axios');

class CreatomateService {
  constructor() {
    this.baseUrl = 'https://api.creatomate.com/v1';
    // Using the template ID from the provided cURL example
    this.defaultTemplateId = '8739fb2c-b1a4-4809-830a-3c10e5a622e0';
  }

  async createVideo(config) {
    const { audioUrl, visualAssets, duration, theme, originalTheme, creatomateKey, creatomateTemplateId, stabilityAiKey, jobId, publicUrl, language, thumbnailBackground, videoFormat } = config;
    const logPrefix = jobId ? `[Job ${jobId}]` : '[Creatomate]';
    const { getBackgroundConfig } = require('../config/backgroundConfig');

    try {
      console.log(`${logPrefix} 🎬 Creating video with Creatomate...`);
      console.log(`${logPrefix} Audio URL: ${audioUrl}`);
      console.log(`${logPrefix} Visual assets: ${visualAssets.length}`);
      console.log(`${logPrefix} Duration: ${duration} seconds`);
      console.log(`${logPrefix} Theme: ${theme}`);

      // Verify API key first
      try {
        console.log(`${logPrefix} Verifying API key...`);
        const templatesResponse = await axios.get(
          `${this.baseUrl}/templates`,
          {
            headers: {
              'Authorization': `Bearer ${creatomateKey}`
            },
            timeout: 10000
          }
        );
        console.log(`${logPrefix} ✅ API key verified. Available templates: ${templatesResponse.data.length}`);
      } catch (verifyError) {
        const errorDetail = this.parseError(verifyError);
        console.error(`${logPrefix} ❌ API key verification failed:`, errorDetail);
        throw new Error(`Creatomate API key verification failed: ${errorDetail.message}`);
      }

      // Build custom composition WITHOUT template
      // This ensures our assets are actually used
      // Now includes title screen, volume boost, and aspect ratio support
      const composition = this.buildCustomComposition(
        audioUrl, 
        visualAssets, 
        duration, 
        theme, 
        originalTheme,  // Pass original theme for Japanese title
        publicUrl, 
        language, 
        thumbnailBackground,
        videoFormat,  // 'normal' or 'shorts'
        jobId  // Pass jobId for logging
      );
      console.log(`${logPrefix} Custom composition prepared (background: ${thumbnailBackground}, format: ${videoFormat})`);
      console.log(`${logPrefix} Composition structure:`, JSON.stringify(composition, null, 2));

      // Create render using v2 API with 'elements' parameter (not template)
      // Creatomate requires 'elements' array for non-template renders
      // Support for both normal (16:9) and YouTube Shorts (9:16) formats
      
      let width, height;
      if (videoFormat === 'shorts') {
        // YouTube Shorts: 9:16 vertical format (1080x1920) - Full HD
        width = 1080;
        height = 1920;
        console.log(`${logPrefix} Using YouTube Shorts format: ${width}x${height} (9:16)`);
      } else {
        // Normal: 16:9 horizontal format (1920x1080) - Full HD
        width = 1920;
        height = 1080;
        console.log(`${logPrefix} Using normal format: ${width}x${height} (16:9)`);
      }
      
      // Creatomate render request with EXPLICIT resolution settings
      // Multiple approaches to force Full HD resolution:
      // 1. Direct width/height specification (primary method)
      // 2. Resolution preset as fallback (1080p)
      // 3. Explicit render_scale set to maximum (1.0)
      // IMPORTANT: Use totalDuration (title + content) so video plays completely
      const renderRequest = {
        elements: composition.elements,
        output_format: 'mp4',
        width: width,           // Primary: Direct pixel specification for Full HD
        height: height,         // Primary: Direct pixel specification for Full HD
        duration: composition.totalDuration || duration,  // Use totalDuration (includes title screen)
        frame_rate: 30,
        resolution: '1080p',    // Fallback: Preset resolution (Full HD)
        render_scale: 1.0       // Fallback: Maximum render scale (100%, no downscaling)
      };
      
      console.log(`${logPrefix} Sending render request...`);
      console.log(`${logPrefix} Request structure:`, JSON.stringify(renderRequest, null, 2));
      
      const response = await axios.post(
        `https://api.creatomate.com/v2/renders`,
        renderRequest,
        {
          headers: {
            'Authorization': `Bearer ${creatomateKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log(`${logPrefix} ✅ Render created successfully`);
      console.log(`${logPrefix} Render ID: ${response.data.id}`);
      console.log(`${logPrefix} Status: ${response.data.status}`);

      // Wait for completion
      const videoUrl = await this.waitForRender(response.data.id, creatomateKey, jobId);
      console.log(`${logPrefix} ✅ Video completed: ${videoUrl}`);
      
      return videoUrl;
    } catch (error) {
      const errorDetail = this.parseError(error);
      console.error(`${logPrefix} ❌ Creatomate error:`, errorDetail);
      
      throw new Error(`Creatomate API failed: ${errorDetail.message} (Code: ${errorDetail.code})`);
    }
  }

  buildCustomComposition(audioUrl, visualAssets, duration, theme, originalTheme, publicUrl, language, thumbnailBackground, videoFormat, jobId) {
    // Build elements array for Creatomate API
    // API requires 'elements' parameter (not composition/children)
    // Error: "The parameter 'template_id' or 'elements' should be provided"
    
    const { getBackgroundConfig } = require('../config/backgroundConfig');
    const logPrefix = jobId ? `[Job ${jobId}]` : '[Creatomate]';  // Define logPrefix
    
    const elements = [];
    const titleDuration = 2; // Title screen duration (2 seconds)
    const contentDuration = duration; // Content duration (audio/video) - NOT reduced
    const safetyBuffer = 3; // Safety buffer to ensure content doesn't cut off
    const totalDuration = titleDuration + contentDuration + safetyBuffer; // Total: title + content + safety buffer
    
    console.log(`${logPrefix || '[Creatomate]'} Duration breakdown:`, {
      titleDuration,
      contentDuration,
      safetyBuffer,
      totalDuration
    });
    
    // Get background configuration with text color settings
    const bgConfig = getBackgroundConfig(thumbnailBackground, videoFormat);
    console.log(`Using background: ${bgConfig.name.ja} with text color: ${bgConfig.textColor.fillColor}`);
    
    // Add title screen (first 2 seconds) if thumbnailBackground is not 'none'
    if (thumbnailBackground && thumbnailBackground !== 'none') {
      // Determine background image path
      let titleBgUrl;
      if (bgConfig.filename === 'title_bg.jpg') {
        // Legacy cherry blossom
        titleBgUrl = `${publicUrl}/temp/title_bg.jpg`;
      } else if (bgConfig.filename) {
        // New backgrounds
        titleBgUrl = `${publicUrl}/temp/backgrounds/${bgConfig.filename}`;
      }
      
      if (titleBgUrl) {
        // Ensure publicUrl is not localhost for Creatomate
        // Creatomate cannot access localhost URLs
        if (titleBgUrl.includes('localhost')) {
          console.log(`Warning: Background URL contains localhost, attempting to fix...`);
          titleBgUrl = titleBgUrl.replace('http://localhost:5000', publicUrl);
          console.log(`Fixed background URL: ${titleBgUrl}`);
        }
        
        elements.push({
          type: 'image',
          source: titleBgUrl,
          x: '0%',
          y: '0%',
          width: '100%',
          height: '100%',
          time: 0,
          duration: titleDuration,
          fit: 'cover'
        });
      }
    }
    
    // Add title text - Line 1: Japanese (use originalTheme if available, fallback to theme)
    const japaneseTitle = originalTheme || theme;
    elements.push({
      type: 'text',
      text: japaneseTitle,
      fontFamily: 'Noto Sans JP, Arial',
      fontSize: videoFormat === 'shorts' ? 56 : 64,  // Smaller font for vertical format
      fontWeight: 'bold',
      fillColor: bgConfig.textColor.fillColor,  // Auto-adjusted based on background brightness
      strokeColor: bgConfig.textColor.strokeColor,
      strokeWidth: bgConfig.textColor.strokeWidth,
      x: '50%',
      y: videoFormat === 'shorts' ? '45%' : '42%',  // Centered vertically (closer to middle)
      xAnchor: '50%',
      yAnchor: '50%',
      time: 0,
      duration: titleDuration
    });
    
    // Add title text - Line 2: Romaji (for all languages)
    const { toRomaji } = require('../utils/romajiConverter');
    const romajiTitle = toRomaji(japaneseTitle);
    
    // Capitalize first letter of each word in romaji
    const capitalizedRomaji = romajiTitle
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    elements.push({
      type: 'text',
      text: capitalizedRomaji,
      fontFamily: 'Arial, sans-serif',
      fontSize: videoFormat === 'shorts' ? 36 : 42,  // Smaller font for vertical format
      fontWeight: 'normal',
      fillColor: bgConfig.textColor.fillColor,  // Same color as Japanese title
      strokeColor: bgConfig.textColor.strokeColor,
      strokeWidth: bgConfig.textColor.strokeWidth - 1,  // Slightly thinner stroke
      x: '50%',
      y: videoFormat === 'shorts' ? '55%' : '52%',  // Positioned just below Japanese title
      xAnchor: '50%',
      yAnchor: '50%',
      time: 0,
      duration: titleDuration
    });
    
    // Add language indicator (if not Japanese narration)
    if (language !== 'ja') {
      const languageNames = {
        'en': 'English Narration',
        'zh': 'Chinese Narration'
      };
      elements.push({
        type: 'text',
        text: `(${languageNames[language] || language})`,
        fontFamily: 'Arial',
        fontSize: videoFormat === 'shorts' ? 24 : 28,  // Smaller for vertical format
        fillColor: bgConfig.textColor.fillColor,  // Same color as title
        strokeColor: bgConfig.textColor.strokeColor,
        strokeWidth: 2,
        x: '50%',
        y: videoFormat === 'shorts' ? '63%' : '60%',  // Positioned below romaji
        xAnchor: '50%',
        yAnchor: '50%',
        time: 0,
        duration: titleDuration
      });
    }
    
    // Calculate duration per image (divide content + buffer by number of images)
    // Images should also extend to cover the safety buffer period
    const imageCount = visualAssets.filter(a => a.type === 'image').length;
    const imageTotalDuration = contentDuration + safetyBuffer; // Images cover content + buffer
    const durationPerImage = imageCount > 0 ? imageTotalDuration / imageCount : imageTotalDuration;
    
    console.log(`${logPrefix || '[Creatomate]'} Building composition:`, {
      titleDuration: `${titleDuration}s`,
      imageCount,
      imageTotalDuration: `${imageTotalDuration}s`,
      durationPerImage: `${durationPerImage.toFixed(2)}s per image`
    });
    
    // Add each image as a sequential element (starting after title)
    let currentTime = titleDuration;
    visualAssets.forEach((asset, index) => {
      if (asset.type === 'image') {
        elements.push({
          type: 'image',
          source: asset.url,
          x: '0%',
          y: '0%',
          width: '100%',
          height: '100%',
          time: currentTime,
          duration: durationPerImage,
          fit: 'cover'  // Full screen coverage
        });
        currentTime += durationPerImage;
        
        console.log(`${logPrefix || '[Creatomate]'} Added image ${index + 1}/${imageCount}:`, {
          startTime: `${(currentTime - durationPerImage).toFixed(2)}s`,
          endTime: `${currentTime.toFixed(2)}s`,
          duration: `${durationPerImage.toFixed(2)}s`
        });
      }
    });
    
    // Add audio track (starts after title, includes safety buffer)
    // Audio should extend beyond actual content to prevent cutoff
    elements.push({
      type: 'audio',
      source: audioUrl,
      time: titleDuration,  // Start audio after title screen (at 2 seconds)
      duration: contentDuration + safetyBuffer,  // Audio duration includes safety buffer to prevent cutoff
      volume: 10.0  // Maximum recommended volume for YouTube standard
    });
    
    console.log(`${logPrefix || '[Creatomate]'} Audio configuration:`, {
      audioStartTime: titleDuration,
      audioDuration: contentDuration + safetyBuffer,
      audioEndTime: titleDuration + contentDuration + safetyBuffer
    });
    
    // Remove this section - title is now shown on title screen only
    
    // Return elements array and total duration (required by Creatomate API)
    return {
      elements: elements,
      totalDuration: totalDuration  // Total video duration (title + content)
    };
  }

  async waitForRender(renderId, apiKey, jobId, maxAttempts = 60) {
    const logPrefix = jobId ? `[Job ${jobId}]` : '[Creatomate]';
    
    console.log(`${logPrefix} ⏳ Waiting for render to complete...`);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(
          `https://api.creatomate.com/v2/renders/${renderId}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          }
        );

        const status = response.data.status;
        const progress = response.data.progress || 0;
        console.log(`${logPrefix} Render status (${i + 1}/${maxAttempts}): ${status} (${progress}%)`);
        
        // Log full response every 10 checks for debugging
        if (i % 10 === 0) {
          console.log(`${logPrefix} Full status response:`, JSON.stringify(response.data, null, 2));
        }
        
        if (status === 'succeeded') {
          console.log(`${logPrefix} ✅ Render succeeded!`);
          console.log(`${logPrefix} Video URL: ${response.data.url}`);
          return response.data.url;
        } else if (status === 'failed') {
          const errorMsg = response.data.error_message || 'Unknown error';
          console.error(`${logPrefix} ❌ Render failed: ${errorMsg}`);
          
          // Check if it's a Stability AI integration error
          if (errorMsg.includes('Stability AI') || errorMsg.includes('third-party integration')) {
            throw new Error(`Creatomate template requires Stability AI integration. Please:\n1. Go to Creatomate Dashboard (https://creatomate.com/projects)\n2. Select your project\n3. Go to Settings → Integrations\n4. Add Stability AI integration with your API key\n5. Or use a template without AI image generation\n\nOriginal error: ${errorMsg}`);
          }
          
          throw new Error(`Render failed: ${errorMsg}`);
        }

        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`${logPrefix} ⚠️ Error checking render status (attempt ${i + 1}/${maxAttempts}):`, error.message);
        
        if (error.response) {
          console.error(`${logPrefix} Response status: ${error.response.status}`);
          console.error(`${logPrefix} Response data:`, error.response.data);
        }
        
        if (i === maxAttempts - 1) {
          throw error;
        }
        
        // Wait before retry
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
        message = data.hint || data.message || data.error || JSON.stringify(data);
      } else {
        message = String(data);
      }

      switch (status) {
        case 401:
          return { 
            code: 401, 
            message: 'Invalid API key. Please check your Creatomate API key.',
            technical: message
          };
        case 403:
          return { 
            code: 403, 
            message: 'Access forbidden. Please verify your Creatomate subscription status.',
            technical: message
          };
        case 404:
          return { 
            code: 404, 
            message: 'Template not found. The template ID may be invalid.',
            technical: message
          };
        case 422:
          return { 
            code: 422, 
            message: 'Invalid request. Check that all required template fields are provided.',
            technical: message
          };
        case 429:
          return { 
            code: 429, 
            message: 'Rate limit exceeded. Please wait and try again.',
            technical: message
          };
        case 500:
        case 502:
        case 503:
          return { 
            code: status, 
            message: 'Creatomate service temporarily unavailable.',
            technical: message
          };
        default:
          return { 
            code: status, 
            message: `Creatomate API error (${status}): ${message}`,
            technical: message
          };
      }
    } else if (error.request) {
      return { 
        code: 'NETWORK_ERROR', 
        message: 'Network error: Could not connect to Creatomate API.',
        technical: error.message
      };
    } else {
      return { 
        code: 'UNKNOWN_ERROR', 
        message: error.message || 'Unknown error occurred',
        technical: error.stack
      };
    }
  }
}

module.exports = new CreatomateService();

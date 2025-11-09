const axios = require('axios');

class CreatomateService {
  constructor() {
    this.baseUrl = 'https://api.creatomate.com/v1';
    // Using the template ID from the provided cURL example
    this.defaultTemplateId = '8739fb2c-b1a4-4809-830a-3c10e5a622e0';
  }

  async createVideo(config) {
    const { audioUrl, visualAssets, duration, theme, creatomateKey, creatomateTemplateId, stabilityAiKey, jobId, publicUrl, language } = config;
    const logPrefix = jobId ? `[Job ${jobId}]` : '[Creatomate]';

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
      // Now includes title screen and volume boost
      const composition = this.buildCustomComposition(audioUrl, visualAssets, duration, theme, publicUrl, language);
      console.log(`${logPrefix} Custom composition prepared (with title screen)`);
      console.log(`${logPrefix} Composition structure:`, JSON.stringify(composition, null, 2));

      // Create render using v2 API with 'elements' parameter (not template)
      // Creatomate requires 'elements' array for non-template renders
      const renderRequest = {
        elements: composition.elements,
        output_format: 'mp4',
        width: 1920,
        height: 1080,
        duration: duration,
        frame_rate: 30
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

  buildCustomComposition(audioUrl, visualAssets, duration, theme, publicUrl, language) {
    // Build elements array for Creatomate API
    // API requires 'elements' parameter (not composition/children)
    // Error: "The parameter 'template_id' or 'elements' should be provided"
    
    const elements = [];
    const titleDuration = 2; // Title screen duration
    const contentDuration = duration - titleDuration; // Remaining time for content
    
    // Add title screen (first 2 seconds)
    // Using the provided cherry blossom background image
    const titleBgUrl = `${publicUrl}/temp/title_bg.jpg`;
    
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
    
    // Add title text (Japanese theme)
    elements.push({
      type: 'text',
      text: theme,
      fontFamily: 'Noto Sans JP, Arial',
      fontSize: 72,
      fontWeight: 'bold',
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 4,
      x: '50%',
      y: '40%',
      xAnchor: '50%',
      yAnchor: '50%',
      time: 0,
      duration: titleDuration
    });
    
    // Add English translation (if not Japanese language)
    if (language !== 'ja') {
      const languageNames = {
        'en': 'English',
        'zh': 'Chinese'
      };
      elements.push({
        type: 'text',
        text: `(${languageNames[language] || language} narration)`,
        fontFamily: 'Arial',
        fontSize: 36,
        fillColor: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 2,
        x: '50%',
        y: '60%',
        xAnchor: '50%',
        yAnchor: '50%',
        time: 0,
        duration: titleDuration
      });
    }
    
    // Calculate duration per image (divide remaining duration by number of images)
    const imageCount = visualAssets.filter(a => a.type === 'image').length;
    const durationPerImage = imageCount > 0 ? contentDuration / imageCount : contentDuration;
    
    console.log(`Building composition: Title ${titleDuration}s + ${imageCount} images x ${durationPerImage}s per image`);
    
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
          fit: 'cover'  // Changed from 'contain' to 'cover' for full screen
        });
        currentTime += durationPerImage;
      }
    });
    
    // Add audio track (spans entire video, starts after title)
    elements.push({
      type: 'audio',
      source: audioUrl,
      time: titleDuration,  // Start audio after title screen
      duration: contentDuration,  // Duration matches content (not including title)
      volume: 2.0  // Increased volume from 1.0 to 2.0 for louder audio
    });
    
    // Remove this section - title is now shown on title screen only
    
    // Return elements array (required by Creatomate API)
    return {
      elements: elements
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

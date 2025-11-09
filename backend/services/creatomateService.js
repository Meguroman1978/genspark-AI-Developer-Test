const axios = require('axios');

class CreatomateService {
  constructor() {
    this.baseUrl = 'https://api.creatomate.com/v1';
    // Using the template ID from the provided cURL example
    this.defaultTemplateId = '8739fb2c-b1a4-4809-830a-3c10e5a622e0';
  }

  async createVideo(config) {
    const { audioUrl, visualAssets, duration, theme, creatomateKey, creatomateTemplateId, stabilityAiKey, jobId } = config;
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
      const composition = this.buildCustomComposition(audioUrl, visualAssets, duration, theme);
      console.log(`${logPrefix} Custom composition prepared`);
      console.log(`${logPrefix} Composition structure:`, JSON.stringify(composition, null, 2));

      // Create render using v2 API endpoint with source (composition) instead of template
      console.log(`${logPrefix} Sending render request...`);
      const response = await axios.post(
        `https://api.creatomate.com/v2/renders`,
        {
          source: composition
        },
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

  buildCustomComposition(audioUrl, visualAssets, duration, theme) {
    // Build a custom composition from scratch
    // This guarantees our assets will be used
    
    const elements = [];
    
    // Calculate duration per image (divide total duration by number of images)
    const imageCount = visualAssets.filter(a => a.type === 'image').length;
    const durationPerImage = imageCount > 0 ? duration / imageCount : duration;
    
    console.log(`Building composition: ${imageCount} images, ${durationPerImage}s per image`);
    
    // Add each image as a sequential element
    let currentTime = 0;
    visualAssets.forEach((asset, index) => {
      if (asset.type === 'image') {
        elements.push({
          type: 'image',
          source: asset.url,
          time: currentTime,
          duration: durationPerImage,
          width: '100%',
          height: '100%',
          fit: 'cover',
          animations: [
            {
              type: 'fade',
              fade: 'in',
              duration: 0.5,
              easing: 'linear'
            },
            {
              type: 'fade',
              fade: 'out',
              duration: 0.5,
              easing: 'linear',
              time: durationPerImage - 0.5
            }
          ]
        });
        currentTime += durationPerImage;
      }
    });
    
    // Add audio track (spans entire video)
    elements.push({
      type: 'audio',
      source: audioUrl,
      time: 0,
      duration: duration,
      volume: 1.0
    });
    
    // Add theme text overlay at the start
    elements.push({
      type: 'text',
      text: theme,
      time: 0,
      duration: 3,
      x: '50%',
      y: '10%',
      width: '80%',
      height: 'auto',
      'font-family': 'Noto Sans JP',
      'font-size': '48px',
      'font-weight': 'bold',
      color: '#ffffff',
      'text-align': 'center',
      'background-color': 'rgba(0, 0, 0, 0.7)',
      'border-radius': '10px',
      padding: '20px',
      animations: [
        {
          type: 'fade',
          fade: 'in',
          duration: 0.5
        },
        {
          type: 'fade',
          fade: 'out',
          duration: 0.5,
          time: 2.5
        }
      ]
    });
    
    return {
      output_format: 'mp4',
      width: 1920,
      height: 1080,
      frame_rate: 30,
      duration: duration,
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

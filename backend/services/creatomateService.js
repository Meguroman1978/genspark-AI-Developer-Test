const axios = require('axios');

class CreatomateService {
  constructor() {
    this.baseUrl = 'https://api.creatomate.com/v1';
    // Using the template ID from the provided cURL example
    this.defaultTemplateId = '8739fb2c-b1a4-4809-830a-3c10e5a622e0';
  }

  async createVideo(config) {
    const { audioUrl, visualAssets, duration, theme, creatomateKey, jobId } = config;
    const logPrefix = jobId ? `[Job ${jobId}]` : '[Creatomate]';

    try {
      console.log(`${logPrefix} 🎬 Creating video with Creatomate...`);
      console.log(`${logPrefix} Template ID: ${this.defaultTemplateId}`);
      console.log(`${logPrefix} Audio URL: ${audioUrl}`);
      console.log(`${logPrefix} Visual assets: ${visualAssets.length}`);

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

      // Build modifications based on template structure
      const modifications = this.buildModifications(audioUrl, visualAssets);
      console.log(`${logPrefix} Modifications prepared:`, JSON.stringify(modifications, null, 2));

      // Create render using v2 API endpoint
      console.log(`${logPrefix} Sending render request...`);
      const response = await axios.post(
        `https://api.creatomate.com/v2/renders`,
        {
          template_id: this.defaultTemplateId,
          modifications: modifications
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

  buildModifications(audioUrl, visualAssets) {
    // Build modifications matching the template structure
    // Template has: Image-1 through Image-6 and Voiceover-1 through Voiceover-6
    const modifications = {};

    // Add up to 6 images
    for (let i = 0; i < 6; i++) {
      const imageKey = `Image-${i + 1}.source`;
      
      if (i < visualAssets.length && visualAssets[i].type === 'image') {
        modifications[imageKey] = visualAssets[i].url;
      } else {
        // Use a placeholder or the first image
        modifications[imageKey] = visualAssets[0]?.url || '';
      }
    }

    // Add the audio URL to all voiceover slots
    // In a real scenario, you might want to split the audio or use different segments
    for (let i = 0; i < 6; i++) {
      const voiceoverKey = `Voiceover-${i + 1}.source`;
      // Only add audio to the first voiceover slot
      modifications[voiceoverKey] = i === 0 ? audioUrl : '';
    }

    return modifications;
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
        console.log(`${logPrefix} Render status (${i + 1}/${maxAttempts}): ${status}`);
        
        if (status === 'succeeded') {
          console.log(`${logPrefix} ✅ Render succeeded!`);
          return response.data.url;
        } else if (status === 'failed') {
          const errorMsg = response.data.error_message || 'Unknown error';
          console.error(`${logPrefix} ❌ Render failed: ${errorMsg}`);
          throw new Error(`Render failed: ${errorMsg}`);
        }

        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw error;
        }
        console.error(`${logPrefix} Error checking render status:`, error.message);
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

const axios = require('axios');

class CreatomateService {
  constructor() {
    this.baseUrl = 'https://api.creatomate.com/v1';
    // Template ID from your cURL example
    this.defaultTemplateId = '8739fb2c-b1a4-4809-830a-3c10e5a622e0';
  }

  async createVideo(config) {
    const { audioUrl, visualAssets, duration, theme, creatomateKey, jobId = null } = config;
    const logPrefix = jobId ? `[Job ${jobId}]` : '[Creatomate]';

    try {
      console.log(`${logPrefix} 🎬 Creating video with Creatomate...`);
      console.log(`${logPrefix} Template ID: ${this.defaultTemplateId}`);
      console.log(`${logPrefix} Audio URL: ${audioUrl}`);
      console.log(`${logPrefix} Visual assets: ${visualAssets.length}`);

      // Build modifications object based on template structure
      const modifications = this.buildModifications(audioUrl, visualAssets, theme);
      console.log(`${logPrefix} Modifications:`, JSON.stringify(modifications, null, 2));

      // Create render
      console.log(`${logPrefix} Sending render request...`);
      const response = await axios.post(
        `${this.baseUrl}/renders`,
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

      const renderId = response.data.id;
      console.log(`${logPrefix} ✅ Render created: ${renderId}`);
      console.log(`${logPrefix} Status: ${response.data.status}`);

      // Wait for completion
      console.log(`${logPrefix} Waiting for render to complete...`);
      const videoUrl = await this.waitForRender(renderId, creatomateKey, logPrefix);
      
      console.log(`${logPrefix} ✅ Video completed: ${videoUrl}`);
      return videoUrl;
    } catch (error) {
      const errorDetail = this.parseError(error);
      console.error(`${logPrefix} ❌ Creatomate error:`, errorDetail);
      
      // Throw detailed error
      throw new Error(`Creatomate API failed: ${errorDetail.message} (Code: ${errorDetail.code})`);
    }
  }

  buildModifications(audioUrl, visualAssets, theme) {
    const modifications = {};

    // Add images and voiceovers based on available assets
    // Template supports up to 6 image-voiceover pairs
    const maxPairs = 6;
    
    for (let i = 0; i < maxPairs; i++) {
      const imageKey = `Image-${i + 1}`;
      const voiceoverKey = `Voiceover-${i + 1}`;
      
      if (i < visualAssets.length) {
        // Use actual asset
        modifications[`${imageKey}.source`] = visualAssets[i].url;
        modifications[`${voiceoverKey}.source`] = audioUrl;
      } else {
        // Use empty strings for unused slots
        modifications[`${imageKey}.source`] = '';
        modifications[`${voiceoverKey}.source`] = '';
      }
    }

    return modifications;
  }

  async waitForRender(renderId, apiKey, logPrefix = '[Creatomate]', maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/renders/${renderId}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            },
            timeout: 10000
          }
        );

        const status = response.data.status;
        const progress = response.data.progress || 0;
        
        console.log(`${logPrefix} Render status: ${status} (${Math.round(progress * 100)}%)`);
        
        if (status === 'succeeded') {
          return response.data.url;
        } else if (status === 'failed') {
          const errorMsg = response.data.error_message || 'Render failed';
          throw new Error(`Render failed: ${errorMsg}`);
        }

        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw error;
        }
        // Continue polling
      }
    }

    throw new Error('Render timeout: Video generation took too long (5 minutes)');
  }

  parseError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      let message = 'Unknown error';
      let technical = '';

      if (typeof data === 'object') {
        message = data.message || data.error || data.hint || JSON.stringify(data);
        technical = JSON.stringify(data);
      } else {
        message = String(data);
        technical = message;
      }

      switch (status) {
        case 401:
          return {
            code: 401,
            message: 'Invalid API key. Please check your Creatomate API key in settings.',
            technical: technical
          };
        case 403:
          return {
            code: 403,
            message: 'Access forbidden. Your Creatomate plan may not support this feature.',
            technical: technical
          };
        case 404:
          return {
            code: 404,
            message: 'Template not found. The template ID may be invalid.',
            technical: technical
          };
        case 422:
          return {
            code: 422,
            message: 'Invalid request. Check that all required fields are provided correctly.',
            technical: technical
          };
        case 429:
          return {
            code: 429,
            message: 'Rate limit exceeded. Please wait and try again.',
            technical: technical
          };
        case 500:
        case 502:
        case 503:
          return {
            code: status,
            message: 'Creatomate service is temporarily unavailable. Please try again later.',
            technical: technical
          };
        default:
          return {
            code: status,
            message: `Creatomate API error (${status}): ${message}`,
            technical: technical
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

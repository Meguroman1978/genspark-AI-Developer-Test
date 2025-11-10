const axios = require('axios');
const fs = require('fs');
const path = require('path');

class StabilityAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.stability.ai';
  }

  /**
   * Generate a video from an image using Stable Video Diffusion
   * @param {string} imagePath - Path to the input image file
   * @param {Object} options - Generation options
   * @returns {Promise<Buffer>} - Video buffer (MP4)
   */
  async generateVideoFromImage(imagePath, options = {}) {
    try {
      const {
        cfg_scale = 1.8,
        motion_bucket_id = 127,
        seed = 0
      } = options;

      // Read image file
      const imageBuffer = fs.readFileSync(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      console.log('[StabilityAI] Generating video from image...');
      console.log(`[StabilityAI] Image size: ${imageBuffer.length} bytes`);
      console.log(`[StabilityAI] Options:`, { cfg_scale, motion_bucket_id, seed });

      // Call Stable Video Diffusion API
      const response = await axios.post(
        `${this.baseURL}/v2beta/image-to-video`,
        {
          image: imageBase64,
          cfg_scale,
          motion_bucket_id,
          seed
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'video/mp4'
          },
          responseType: 'arraybuffer',
          timeout: 120000 // 2 minutes timeout
        }
      );

      console.log('[StabilityAI] Video generated successfully');
      return Buffer.from(response.data);
    } catch (error) {
      console.error('[StabilityAI] Error generating video:', error.message);
      if (error.response) {
        console.error('[StabilityAI] Response status:', error.response.status);
        console.error('[StabilityAI] Response data:', error.response.data);
      }
      throw new Error(`Stability AI video generation failed: ${error.message}`);
    }
  }

  /**
   * Generate an image using Stable Diffusion
   * @param {string} prompt - Text prompt for image generation
   * @param {Object} options - Generation options
   * @returns {Promise<Buffer>} - Image buffer
   */
  async generateImage(prompt, options = {}) {
    try {
      const {
        aspect_ratio = '16:9',
        model = 'sd3-large-turbo',
        seed = 0,
        output_format = 'png'
      } = options;

      console.log('[StabilityAI] Generating image...');
      console.log(`[StabilityAI] Prompt: ${prompt}`);
      console.log(`[StabilityAI] Options:`, { aspect_ratio, model, seed, output_format });

      const response = await axios.post(
        `${this.baseURL}/v2beta/stable-image/generate/sd3`,
        {
          prompt,
          aspect_ratio,
          model,
          seed,
          output_format
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'image/*'
          },
          responseType: 'arraybuffer',
          timeout: 60000 // 1 minute timeout
        }
      );

      console.log('[StabilityAI] Image generated successfully');
      return Buffer.from(response.data);
    } catch (error) {
      console.error('[StabilityAI] Error generating image:', error.message);
      if (error.response) {
        console.error('[StabilityAI] Response status:', error.response.status);
        console.error('[StabilityAI] Response data:', error.response.data);
      }
      throw new Error(`Stability AI image generation failed: ${error.message}`);
    }
  }

  /**
   * Save video buffer to file
   * @param {Buffer} videoBuffer - Video data
   * @param {string} outputPath - Output file path
   * @returns {Promise<string>} - Saved file path
   */
  async saveVideo(videoBuffer, outputPath) {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, videoBuffer);
      console.log(`[StabilityAI] Video saved to: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('[StabilityAI] Error saving video:', error.message);
      throw error;
    }
  }

  /**
   * Save image buffer to file
   * @param {Buffer} imageBuffer - Image data
   * @param {string} outputPath - Output file path
   * @returns {Promise<string>} - Saved file path
   */
  async saveImage(imageBuffer, outputPath) {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`[StabilityAI] Image saved to: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('[StabilityAI] Error saving image:', error.message);
      throw error;
    }
  }
}

module.exports = StabilityAIService;
